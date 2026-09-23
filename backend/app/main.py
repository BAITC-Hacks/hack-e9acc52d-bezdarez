import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# .env в корне репозитория (локальный запуск) или рядом с backend.
load_dotenv(Path(__file__).resolve().parents[2] / ".env")
load_dotenv()

from app.explain import router  # noqa: E402

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))

app = FastAPI(
    title="Аким на 5 часов — AI Explanation API",
    description="Объяснение результатов детерминированного симулятора. Баллы считает клиентский Simulation Engine; LLM только объясняет.",
    version="2.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:8080").split(","),
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)
app.include_router(router)
