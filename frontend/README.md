# Аким на 5 часов — frontend

React + TypeScript + Vite + Tailwind CSS. Тёмный городской командный центр: обзор пяти районов, выбор пяти мероприятий, проверка бюджета и конфликтов, результаты, аналитический отчёт и сравнение альтернатив.

Полное описание, правила, API, Docker и демо: [README проекта](../README.md).

Из корня репозитория приложение запускается одной командой:

```sh
docker compose up --build
```

Открыть <http://localhost:8080>.

Для разработки нужен Node.js 22.12+ и запущенный backend на порту 8000:

```sh
cd frontend
npm ci
npm run dev
```

Открыть <http://localhost:5173>. Vite проксирует `/api` на `http://localhost:8000`; адрес backend можно переопределить переменной процесса `VITE_PROXY_TARGET`. При стандартном запуске `VITE_API_URL` не требуется: браузер обращается к API через текущий origin. Docker использует nginx с таким же `/api` proxy.

```sh
npm run lint
npm run build
```

Сборка выполняет проверку TypeScript и создаёт `dist/`. Статический `vite preview` не заменяет nginx proxy; для полного production flow используйте Compose.

Числа итогового Score и правила доступности приходят из FastAPI. Предпросмотр показывает реализованные эффекты с учётом лага; неполный сценарий не получает итоговый Score. LLM credentials задаются только в backend, никогда в переменных `VITE_*`.
