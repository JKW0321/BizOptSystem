from __future__ import annotations

import sqlite3

from .config import DATA_DIR, DB_PATH


def dict_factory(cursor: sqlite3.Cursor, row: sqlite3.Row) -> dict:
    return {col[0]: row[idx] for idx, col in enumerate(cursor.description)}


def connect() -> sqlite3.Connection:
    DATA_DIR.mkdir(exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = dict_factory
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def query_all(conn: sqlite3.Connection, sql: str, params: list | tuple = ()) -> list[dict]:
    return list(conn.execute(sql, params).fetchall())


def update_row(conn: sqlite3.Connection, table: str, row_id: int, allowed: set[str], payload: dict) -> dict:
    updates = {k: v for k, v in payload.items() if k in allowed}
    if not updates:
        raise ValueError("No allowed fields to update")
    assignments = ", ".join([f"{key} = ?" for key in updates])
    conn.execute(f"UPDATE {table} SET {assignments} WHERE id = ?", [*updates.values(), row_id])
    conn.commit()
    return conn.execute(f"SELECT * FROM {table} WHERE id = ?", [row_id]).fetchone()

