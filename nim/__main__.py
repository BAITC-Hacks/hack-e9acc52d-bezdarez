"""Проверка подключения к NVIDIA NIM и сводка расхода.

    python3 -m nim check     # ключ, список моделей, тестовый вызов
    python3 -m nim models    # все доступные модели
    python3 -m nim usage     # сколько токенов потрачено по моделям
"""

import json
import sys
from collections import defaultdict

from .client import USAGE_LOG, NimClient, NimError


def check(client: NimClient) -> int:
    if not client.enabled:
        print("NVIDIA_API_KEY не найден. Скопируйте .env.example в .env и впишите ключ.")
        return 2
    print(f"endpoint: {client.base_url}\nmodel:    {client.model}")
    models = client.list_models()
    print(f"доступно моделей: {len(models)}")
    answer = client.chat([{"role": "user", "content": "Ответь одним словом: работает?"}], max_tokens=10)
    print(f"тестовый ответ: {answer.strip()}")
    return 0


def usage() -> int:
    if not USAGE_LOG.is_file():
        print("вызовов ещё не было")
        return 0
    totals = defaultdict(lambda: [0, 0, 0])
    for line in USAGE_LOG.read_text(encoding="utf-8").splitlines():
        rec = json.loads(line)
        t = totals[rec["model"]]
        t[0] += 1
        t[1] += rec["prompt_tokens"]
        t[2] += rec["completion_tokens"]
    print(f"{'модель':45} {'вызовов':>8} {'вход':>10} {'выход':>10}")
    for model, (calls, pin, pout) in sorted(totals.items()):
        print(f"{model:45} {calls:>8} {pin:>10} {pout:>10}")
    return 0


def main() -> int:
    cmd = sys.argv[1] if len(sys.argv) > 1 else "check"
    client = NimClient()
    try:
        if cmd == "check":
            return check(client)
        if cmd == "models":
            print("\n".join(client.list_models()))
            return 0
        if cmd == "usage":
            return usage()
    except NimError as e:
        print(f"ошибка NIM: {e}", file=sys.stderr)
        return 1
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main())
