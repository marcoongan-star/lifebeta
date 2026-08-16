from decimal import Decimal

import pytest

from lifebeta import analyze_purchasing_power


def test_nominal_gain_can_still_lose_personal_purchasing_power() -> None:
    result = analyze_purchasing_power(
        base_portfolio_value=Decimal("10000"),
        current_portfolio_value=Decimal("10600"),
        personal_index_level=Decimal("108"),
    )

    assert result.nominal_return_percent == Decimal("6.0000")
    assert result.personal_inflation_percent == Decimal("8.0000")
    assert result.real_return_percent == Decimal("-1.8519")
    assert result.inflation_adjusted_required_value == Decimal("10800.00")
    assert result.purchasing_power_gap == Decimal("-200.00")
    assert result.current_value_in_base_dollars == Decimal("9814.81")
    assert not result.preserved_purchasing_power


def test_real_return_uses_growth_factors_not_simple_subtraction() -> None:
    result = analyze_purchasing_power(
        base_portfolio_value=Decimal("100"),
        current_portfolio_value=Decimal("110"),
        personal_index_level=Decimal("105"),
    )
    assert result.real_return_percent == Decimal("4.7619")
    assert result.real_return_percent != Decimal("5.0000")
    assert result.preserved_purchasing_power


def test_invalid_portfolio_or_index_inputs_are_rejected() -> None:
    with pytest.raises(ValueError, match="base portfolio"):
        analyze_purchasing_power(
            base_portfolio_value=Decimal("0"),
            current_portfolio_value=Decimal("100"),
            personal_index_level=Decimal("105"),
        )
