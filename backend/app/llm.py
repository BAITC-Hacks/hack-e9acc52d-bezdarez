"""OpenAI-совместимый клиент LLM на urllib: NVIDIA NIM (build.nvidia.com),
vLLM/NIM на GPU-инстансе Brev или любой другой совместимый endpoint.

Настройка только через окружение сервера (п. 18 ТЗ):
    LLM_API_KEY, LLM_API_URL, LLM_MODEL
Ключ никогда не логируется и не уходит на клиент.
"""

from __future__ import annotations

import json
import logging
import os
import time
import urllib.error
import urllib.parse
import urllib.request

log = logging.getLogger(__name__)

DEFAULT_API_URL = "https://integrate.api.nvidia.com/v1"
DEFAULT_MODEL = "meta/llama-3.3-70b-instruct"
RETRY_STATUSES = {429, 500, 502, 503, 504}


class LLMError(RuntimeError):
    """Любой сбой LLM — вызывающий код уходит на шаблонное объяснение."""


class LLMClient:
    def __init__(
        self,
        api_key: str | None = None,
        api_url: str | None = None,
        model: str | None = None,
        timeout: float | None = None,
        retries: int = 2,
    ) -> None:
        self.api_key = api_key if api_key is not None else (os.getenv("LLM_API_KEY") or os.getenv("NVIDIA_API_KEY") or "")
        self.explicit_api_url = api_url or os.getenv("LLM_API_URL") or ""
        self.api_url = (api_url or os.getenv("LLM_API_URL") or DEFAULT_API_URL).rstrip("/")
        self.model = model or os.getenv("LLM_MODEL") or DEFAULT_MODEL
        self.timeout = timeout if timeout is not None else float(os.getenv("LLM_TIMEOUT_SECONDS", "25"))
        self.retries = retries

    @property
    def configured(self) -> bool:
        # Свой инстанс может работать без ключа. Публичный NVIDIA endpoint его требует,
        # даже если адрес скопирован из .env.example.
        return bool(self.api_key) or bool(
            self.explicit_api_url and urllib.parse.urlsplit(self.api_url).hostname != "integrate.api.nvidia.com"
        )

    def chat_json(self, messages: list[dict], temperature: float = 0.2, max_tokens: int = 1200,
                  response_schema: dict | None = None) -> dict:
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "response_format": {"type": "json_object"},
        }
        if response_schema is not None:
            if urllib.parse.urlsplit(self.api_url).hostname in {'127.0.0.1', 'localhost', '::1'}:
                # llama.cpp accepts schema-constrained json_object generation.
                payload['response_format'] = {'type': 'json_object', 'schema': response_schema}
            else:
                payload['response_format'] = {'type': 'json_schema', 'json_schema': {
                    'name': 'assistant_reply', 'schema': response_schema, 'strict': True,
                }}
        while True:
            try:
                resp = self._post("/chat/completions", payload)
                break
            except LLMError as e:
                # Only format-related request errors can use a less strict format.
                # Authentication, rate limits, timeouts and server errors fail normally.
                if str(e) not in {'HTTP 400', 'HTTP 422'} or 'response_format' not in payload:
                    raise
                if payload['response_format'] != {'type': 'json_object'}:
                    payload['response_format'] = {'type': 'json_object'}
                else:
                    payload.pop('response_format')
        try:
            if resp["choices"][0].get("finish_reason") in {"length", "content_filter"}:
                raise LLMError("неполный ответ модели")
            text = resp["choices"][0]["message"]["content"] or ""
        except (KeyError, IndexError, TypeError, AttributeError) as e:
            raise LLMError(f"неожиданный формат ответа: {e}") from e
        usage = resp.get("usage")
        if not isinstance(usage, dict):
            usage = {}
        log.info("llm ok model=%s in=%s out=%s", self.model, usage.get("prompt_tokens"), usage.get("completion_tokens"))
        return extract_json(text)

    def _post(self, path: str, payload: dict) -> dict:
        headers = {"Content-Type": "application/json", "Accept": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        req = urllib.request.Request(
            f"{self.api_url}{path}", data=json.dumps(payload).encode(), headers=headers, method="POST"
        )
        last: LLMError | None = None
        for attempt in range(self.retries + 1):
            try:
                with urllib.request.urlopen(req, timeout=self.timeout) as r:
                    return json.loads(r.read().decode("utf-8"))
            except urllib.error.HTTPError as e:
                # Provider bodies and exception URLs may echo credentials or prompts.
                # Only the status is needed for retry decisions and diagnostics.
                last = LLMError(f"HTTP {e.code}")
                e.close()
                if e.code not in RETRY_STATUSES:
                    break
            except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError) as e:
                last = LLMError(type(e).__name__)
            if attempt < self.retries:
                time.sleep(0.8 * (attempt + 1))
        raise last or LLMError("неизвестная ошибка")


def extract_json(text: str) -> dict:
    """Терпит ```json-обёртку, <think>-блоки reasoning-моделей и текст вокруг объекта."""
    if not isinstance(text, str):
        raise LLMError("ответ модели не является текстом")
    if "</think>" in text:
        text = text.split("</think>", 1)[1]
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end <= start:
        raise LLMError("в ответе нет JSON-объекта")
    try:
        data = json.loads(text[start : end + 1])
    except json.JSONDecodeError as e:
        raise LLMError(f"невалидный JSON: {e}") from e
    if not isinstance(data, dict):
        raise LLMError("JSON не является объектом")
    return data


class LLMChain:
    """Цепочка провайдеров: локальная модель (Ollama на GPU ноутбука) → NVIDIA API Catalog.

    Первый провайдер — LLM_API_URL / LLM_MODEL / LLM_API_KEY (например, http://127.0.0.1:11434/v1).
    Резервный — NVIDIA_API_KEY (+ NVIDIA_MODEL), если задан. Если все упали — LLMError,
    и вызывающий код показывает системную аналитику.
    """

    def __init__(self) -> None:
        self.providers: list[LLMClient] = []
        if os.getenv("LLM_API_URL") or os.getenv("LLM_API_KEY"):
            # ключ основного провайдера — только LLM_API_KEY: ключ NVIDIA не уходит на локальный сервер
            primary = LLMClient(api_key=os.getenv("LLM_API_KEY", ""), retries=0)
            if primary.configured:
                self.providers.append(primary)
        nv_key = os.getenv("NVIDIA_API_KEY", "")
        if nv_key and not any(p.api_key == nv_key for p in self.providers):
            self.providers.append(
                LLMClient(api_key=nv_key, api_url=DEFAULT_API_URL, model=os.getenv("NVIDIA_MODEL") or DEFAULT_MODEL, timeout=30)
            )
        self.model: str | None = self.providers[0].model if self.providers else None

    @property
    def configured(self) -> bool:
        return bool(self.providers)

    @property
    def models(self) -> list[str]:
        return [p.model for p in self.providers]

    def probe_available(self) -> bool | None:
        """Check local model readiness without generating tokens or probing cloud APIs."""
        unknown = False
        for provider in self.providers:
            if urllib.parse.urlsplit(provider.api_url).hostname not in {'127.0.0.1', 'localhost', '::1'}:
                unknown = True
                continue
            headers = {'Accept': 'application/json'}
            if provider.api_key:
                headers['Authorization'] = f'Bearer {provider.api_key}'
            try:
                request = urllib.request.Request(provider.api_url + '/models', headers=headers)
                with urllib.request.urlopen(request, timeout=1.5) as response:
                    body = json.load(response)
                if any(item.get('id') == provider.model for item in body.get('data', []) if isinstance(item, dict)):
                    return True
            except (OSError, ValueError, TypeError, AttributeError):
                pass
        return None if unknown else False

    def chat_json(self, messages: list[dict], **kw) -> dict:
        last: LLMError | None = None
        for p in self.providers:
            try:
                data = p.chat_json(messages, **kw)
                self.model = p.model
                return data
            except LLMError as e:
                log.warning("провайдер %s недоступен: %s", p.model, type(e).__name__)
                last = e
        raise last or LLMError("LLM не настроен")
