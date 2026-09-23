"""Клиент NVIDIA NIM (build.nvidia.com): OpenAI-совместимый API на чистом urllib.

Ключ читается из .env в корне проекта (NVIDIA_API_KEY). Каждый вызов пишется
в logs/usage.jsonl — модель, токены, задержка — чтобы видеть расход кредитов.
Сам ключ никогда не логируется и не печатается.
"""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_BASE_URL = "https://integrate.api.nvidia.com/v1"
DEFAULT_MODEL = "meta/llama-3.3-70b-instruct"
USAGE_LOG = ROOT / "logs" / "usage.jsonl"
RETRY_STATUSES = {429, 500, 502, 503, 504}


class NimError(RuntimeError):
    """Ошибка обращения к NIM, после которой вызывающий код должен уйти на фолбэк."""


def load_env(path: Path = ROOT / ".env") -> list[str]:
    """Загружает KEY=VALUE из .env, не перетирая уже заданное окружение.

    Возвращает только имена загруженных переменных, никогда значения.
    """
    if not path.is_file():
        return []
    loaded = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key, value = key.strip(), value.strip().strip("'\"")
        if key and value and key not in os.environ:
            os.environ[key] = value
            loaded.append(key)
    return loaded


class NimClient:
    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        model: str | None = None,
        timeout: float = 60.0,
        retries: int = 3,
    ) -> None:
        load_env()
        self.api_key = api_key or os.environ.get("NVIDIA_API_KEY", "")
        self.base_url = (base_url or os.environ.get("NIM_BASE_URL") or DEFAULT_BASE_URL).rstrip("/")
        self.model = model or os.environ.get("NIM_MODEL") or DEFAULT_MODEL
        self.timeout = timeout
        self.retries = retries

    @property
    def enabled(self) -> bool:
        return bool(self.api_key)

    def _request(self, method: str, path: str, payload: dict | None = None) -> dict:
        if not self.enabled:
            raise NimError("NVIDIA_API_KEY не задан (см. .env.example)")
        data = json.dumps(payload).encode("utf-8") if payload is not None else None
        req = urllib.request.Request(
            f"{self.base_url}{path}",
            data=data,
            method=method,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
        )
        last_error: Exception | None = None
        for attempt in range(self.retries):
            try:
                with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                    return json.loads(resp.read().decode("utf-8"))
            except urllib.error.HTTPError as e:
                body = e.read().decode("utf-8", errors="replace")[:300]
                last_error = NimError(f"HTTP {e.code}: {body}")
                if e.code not in RETRY_STATUSES:
                    break
            except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
                last_error = NimError(f"{type(e).__name__}: {e}")
            time.sleep(2**attempt)
        raise last_error or NimError("неизвестная ошибка")

    def list_models(self) -> list[str]:
        return sorted(m["id"] for m in self._request("GET", "/models").get("data", []))

    def chat(
        self,
        messages: list[dict],
        model: str | None = None,
        temperature: float = 0.2,
        max_tokens: int = 1024,
        json_mode: bool = False,
        **extra,
    ) -> str:
        """Один вызов chat/completions; возвращает текст ответа."""
        payload = {
            "model": model or self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            **extra,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}
        started = time.monotonic()
        try:
            resp = self._request("POST", "/chat/completions", payload)
        except NimError as e:
            # Часть моделей NIM не принимает response_format — повторяем без него.
            if not json_mode or "HTTP 4" not in str(e):
                raise
            payload.pop("response_format")
            resp = self._request("POST", "/chat/completions", payload)
        self._log_usage(payload["model"], resp.get("usage", {}), time.monotonic() - started)
        try:
            return resp["choices"][0]["message"]["content"] or ""
        except (KeyError, IndexError) as e:
            raise NimError(f"неожиданный формат ответа: {e}") from e

    def chat_json(self, messages: list[dict], **kw) -> dict:
        """chat() со строгим JSON: терпит ```-обёртку и текст вокруг объекта."""
        text = self.chat(messages, json_mode=True, **kw)
        start, end = text.find("{"), text.rfind("}")
        if start == -1 or end <= start:
            raise NimError("в ответе нет JSON-объекта")
        try:
            return json.loads(text[start : end + 1])
        except json.JSONDecodeError as e:
            raise NimError(f"невалидный JSON: {e}") from e

    def embed(self, texts: list[str], model: str = "nvidia/nv-embedqa-e5-v5", input_type: str = "passage") -> list[list[float]]:
        resp = self._request(
            "POST",
            "/embeddings",
            {"model": model, "input": texts, "input_type": input_type, "encoding_format": "float"},
        )
        self._log_usage(model, resp.get("usage", {}), 0.0)
        return [d["embedding"] for d in resp["data"]]

    @staticmethod
    def _log_usage(model: str, usage: dict, seconds: float) -> None:
        try:
            USAGE_LOG.parent.mkdir(exist_ok=True)
            with USAGE_LOG.open("a", encoding="utf-8") as f:
                f.write(json.dumps({
                    "ts": time.strftime("%Y-%m-%dT%H:%M:%S"),
                    "model": model,
                    "prompt_tokens": usage.get("prompt_tokens", 0),
                    "completion_tokens": usage.get("completion_tokens", 0),
                    "seconds": round(seconds, 2),
                }, ensure_ascii=False) + "\n")
        except OSError:
            pass  # учёт расхода не повод ронять основной сценарий
