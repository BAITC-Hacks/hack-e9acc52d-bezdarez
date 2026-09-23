"""Download the pinned portable Windows runtime and model into this project only.

Run: python scripts/setup_local_ai.py
The model is data (GGUF); no Hugging Face Python code is imported or executed.
"""
from __future__ import annotations

import hashlib
from pathlib import Path
import time
import urllib.request
import zipfile
import zlib

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / '.local-ai'
MODEL_NAME = 'Qwen3.5-9B-Kazakh.Q4_K_M.gguf'
ASSETS = [
    (
        'llama-b10964-bin-win-vulkan-x64.zip',
        'https://github.com/ggml-org/llama.cpp/releases/download/b10964/llama-b10964-bin-win-vulkan-x64.zip',
        '1ee3ad952f4ba71f438bd6d7bebef19e1c7af04adcaa35d08b4ddabb27d4c642',
        31674542,
    ),
    (
        MODEL_NAME,
        'https://huggingface.co/mradermacher/Qwen3.5-9B-Kazakh-GGUF/resolve/main/' + MODEL_NAME,
        '4e3ca9f6cb59d9ffb00d0301ae5dd59e47ee2a818153a7d5caa76c74f02021e2',
        5719436672,
    ),
]


def sha256(path: Path) -> str:
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


def download(name: str, url: str, checksum: str, size: int) -> Path:
    target = DEST / name
    if target.exists() and target.stat().st_size == size and sha256(target) == checksum:
        print(f'Already verified: {name}', flush=True)
        return target
    partial = target.with_suffix(target.suffix + '.part')
    for attempt in range(4):
        offset = partial.stat().st_size if partial.exists() else 0
        if offset == size and sha256(partial) == checksum:
            break
        if offset >= size:
            offset = 0
        request = urllib.request.Request(url, headers={
            'User-Agent': 'QalaBalance-local-setup',
            **({'Range': f'bytes={offset}-'} if offset else {}),
        })
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                append = offset > 0 and response.status == 206
                if not append:
                    offset = 0
                print(f'Downloading {name} ({size / 1024**3:.2f} GiB), resume at {offset // 1024**2} MiB', flush=True)
                last_report = time.monotonic()
                with partial.open('ab' if append else 'wb') as output:
                    while chunk := response.read(4 * 1024**2):
                        output.write(chunk)
                        offset += len(chunk)
                        if offset > size:
                            raise ValueError('Unexpected asset size')
                        if time.monotonic() - last_report > 10:
                            print(f'{name}: {offset / size:.0%}', flush=True)
                            last_report = time.monotonic()
            if partial.stat().st_size == size and sha256(partial) == checksum:
                break
            raise ValueError('Asset checksum mismatch; file was not installed')
        except (OSError, TimeoutError) as error:
            if attempt == 3:
                raise
            print(f'Download interrupted ({type(error).__name__}); retrying', flush=True)
            time.sleep(1)
    else:
        raise RuntimeError('Download failed')
    partial.replace(target)
    print(f'SHA-256 verified: {name}', flush=True)
    return target


def main() -> None:
    if not DEST.resolve().is_relative_to(ROOT):
        raise ValueError('Runtime directory must stay inside the project')
    DEST.mkdir(exist_ok=True)
    files = [download(*asset) for asset in ASSETS]
    runtime = DEST / 'runtime'
    runtime.mkdir(exist_ok=True)
    with zipfile.ZipFile(files[0]) as archive:
        for item in archive.infolist():
            if not (runtime / item.filename).resolve().is_relative_to(runtime.resolve()):
                raise ValueError('Unsafe archive path')
        for item in archive.infolist():
            target = runtime / item.filename
            # A running Windows process locks its DLLs. Reinstalling identical
            # verified files is unnecessary and must not interrupt that process.
            if target.is_file() and target.stat().st_size == item.file_size:
                checksum = 0
                with target.open('rb') as source:
                    while chunk := source.read(1024**2):
                        checksum = zlib.crc32(chunk, checksum)
                if checksum == item.CRC:
                    continue
            archive.extract(item, runtime)
    print('Local AI files are ready. Restart the backend to load the model.', flush=True)


if __name__ == '__main__':
    main()
