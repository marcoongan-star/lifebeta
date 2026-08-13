from decimal import Decimal

import pytest

from lifebeta import parse_fidelity_holdings


def test_fidelity_parser_returns_only_normalized_session_values() -> None:
    raw = "Symbol,Quantity,Current Value,Account Name\nQQQ,2,$1000.00,Private account\nNVDA,3,$450.00,Private account\n"
    holdings = parse_fidelity_holdings(raw)

    assert [(item.symbol, item.quantity, item.market_value) for item in holdings] == [
        ("QQQ", Decimal("2"), Decimal("1000.00")),
        ("NVDA", Decimal("3"), Decimal("450.00")),
    ]
    assert all(not hasattr(item, "raw_row") for item in holdings)
    assert "Private account" not in repr(holdings)


def test_parser_rejects_unknown_schema() -> None:
    with pytest.raises(ValueError, match="market_value"):
        parse_fidelity_holdings("Symbol,Quantity\nQQQ,2\n")

