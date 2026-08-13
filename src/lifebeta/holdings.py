from __future__ import annotations

import csv
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from io import StringIO


@dataclass(frozen=True)
class Holding:
    symbol: str
    quantity: Decimal
    market_value: Decimal


_COLUMN_ALIASES = {
    "symbol": ("symbol", "ticker"),
    "quantity": ("quantity", "shares"),
    "market_value": ("current value", "market value", "current_value", "market_value"),
}


def _resolve_columns(fieldnames: list[str]) -> dict[str, str]:
    normalized = {name.strip().lower(): name for name in fieldnames}
    resolved: dict[str, str] = {}
    for canonical, aliases in _COLUMN_ALIASES.items():
        match = next((normalized[alias] for alias in aliases if alias in normalized), None)
        if match is None:
            raise ValueError(f"missing required Fidelity column: {canonical}")
        resolved[canonical] = match
    return resolved


def _decimal(value: str) -> Decimal:
    cleaned = value.strip().replace("$", "").replace(",", "")
    try:
        return Decimal(cleaned)
    except InvalidOperation as error:
        raise ValueError(f"invalid numeric value: {value}") from error


def parse_fidelity_holdings(csv_text: str) -> tuple[Holding, ...]:
    """Normalize a Fidelity-style export without retaining the raw input."""

    reader = csv.DictReader(StringIO(csv_text))
    if not reader.fieldnames:
        raise ValueError("holdings file has no header")
    columns = _resolve_columns(reader.fieldnames)
    holdings: list[Holding] = []
    for row in reader:
        symbol = row[columns["symbol"]].strip().upper()
        if not symbol or symbol in {"PENDING ACTIVITY", "CASH"}:
            continue
        quantity = _decimal(row[columns["quantity"]])
        market_value = _decimal(row[columns["market_value"]])
        if quantity < 0 or market_value < 0:
            raise ValueError("short or negative holdings are outside the MVP")
        holdings.append(Holding(symbol, quantity, market_value))
    if not holdings:
        raise ValueError("holdings file contains no supported positions")
    return tuple(holdings)

