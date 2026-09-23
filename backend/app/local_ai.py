"""Optional project-local llama.cpp process; only the process we start is stopped.

No installation, download, scheduled task or system service is performed here.
"""
from __future__ import annotations

from contextlib import contextmanager
import logging
import os
from pathlib import Path
import socket
import subprocess
from urllib.parse import urlsplit

log = logging.getLogger(__name__)
PROJECT_ROOT = Path(__file__).resolve().parents[2]
MODEL_FILE = 'Qwen3.5-9B-Kazakh.Q4_K_M.gguf'


@contextmanager
def local_runtime():
    process = None
    output = None
    try:
        if os.getenv('LOCAL_AI_AUTOSTART') == '1':
            endpoint = urlsplit(os.getenv('LLM_API_URL', ''))
            # Startup is opt-in and can only bind the loopback endpoint from .env.
            if endpoint.scheme == 'http' and endpoint.hostname in {'127.0.0.1', 'localhost'} and endpoint.port:
                runtime = PROJECT_ROOT / '.local-ai' / 'runtime'
                binaries = list(runtime.rglob('llama-server.exe')) if runtime.exists() else []
                model = PROJECT_ROOT / '.local-ai' / MODEL_FILE
                if not binaries or not model.is_file():
                    log.warning('Local AI files missing; run python scripts/setup_local_ai.py')
                else:
                    try:
                        with socket.create_connection(('127.0.0.1', endpoint.port), timeout=0.3):
                            log.info('Local AI port is already in use; reusing without taking ownership')
                    except OSError:
                        logs = PROJECT_ROOT / '.local-ai' / 'logs'
                        logs.mkdir(exist_ok=True)
                        output = (logs / 'server.log').open('a', encoding='utf-8')
                        process = subprocess.Popen(
                            [str(binaries[0]), '--model', str(model),
                             '--alias', os.getenv('LLM_MODEL', 'Qwen3.5-9B-Kazakh'),
                             '--host', '127.0.0.1', '--port', str(endpoint.port),
                             '--ctx-size', '16384', '--parallel', '1',
                             '--n-gpu-layers', '99', '--batch-size', '256', '--ubatch-size', '128',
                             '--jinja', '--reasoning', 'off',
                             '--chat-template-kwargs', '{"enable_thinking":false}', '--no-ui',
                             '--cors-origins', 'localhost'],
                            cwd=binaries[0].parent,
                            stdin=subprocess.DEVNULL, stdout=output, stderr=output,
                            env={**os.environ, 'LLAMA_API_KEY': os.getenv('LLM_API_KEY', '')},
                            creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0,
                        )
                        log.info('Starting project-local AI model (pid=%s)', process.pid)
            else:
                log.warning('LOCAL_AI_AUTOSTART requires an explicit loopback HTTP port')
    except (OSError, ValueError):
        log.warning('Local AI startup failed; see project-local model files and configuration')
    try:
        yield process
    finally:
        try:
            if process is not None and process.poll() is None:
                process.terminate()
                try:
                    process.wait(timeout=8)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait(timeout=3)
        except (OSError, subprocess.TimeoutExpired):
            log.warning('Local AI process did not stop cleanly')
        finally:
            if output is not None:
                output.close()
