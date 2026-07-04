from __future__ import annotations

import os
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "static"
DATA_DIR = BASE_DIR / "data"
DB_PATH = Path(os.environ.get("PROJECT_BI_DB", DATA_DIR / "mvp.sqlite"))


def today_iso() -> str:
    return os.environ.get("PROJECT_BI_TODAY", "2026-07-03")

