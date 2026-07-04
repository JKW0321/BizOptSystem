from __future__ import annotations

import re


def money(value: float | int | None) -> float:
    return round(float(value or 0), 1)


def period_meta(period: str | None) -> dict:
    if not period:
        return {"type": "全部", "label": "全部周期", "start": None, "end": None, "sort": "0"}
    if re.fullmatch(r"\d{4}", period):
        return {"type": "年度", "label": f"{period} 年", "start": f"{period}-01", "end": f"{period}-12", "sort": f"{period}-0-00"}
    quarter = re.fullmatch(r"(\d{4})-Q([1-4])", period)
    if quarter:
        year = quarter.group(1)
        q = int(quarter.group(2))
        start_month = (q - 1) * 3 + 1
        end_month = start_month + 2
        return {
            "type": "季度",
            "label": f"{year} Q{q}",
            "start": f"{year}-{start_month:02d}",
            "end": f"{year}-{end_month:02d}",
            "sort": f"{year}-{q}-00",
        }
    monthly = re.fullmatch(r"(\d{4})-(\d{2})", period)
    if monthly:
        return {"type": "月度", "label": period, "start": period, "end": period, "sort": f"{monthly.group(1)}-9-{monthly.group(2)}"}
    return {"type": "月度", "label": period, "start": period, "end": period, "sort": period}


def group_count(rows: list[dict], key: str) -> list[dict]:
    result: dict[str, int] = {}
    for row in rows:
        result[row[key]] = result.get(row[key], 0) + 1
    return [{"name": name, "value": value} for name, value in result.items()]


def group_sum(rows: list[dict], key: str, value_key: str) -> list[dict]:
    result: dict[str, float] = {}
    for row in rows:
        result[row[key]] = result.get(row[key], 0) + float(row[value_key] or 0)
    return [{"name": name, "value": money(value)} for name, value in result.items()]

