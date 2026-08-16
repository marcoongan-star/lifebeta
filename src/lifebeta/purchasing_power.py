from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP


CENT = Decimal("0.01")
FOUR_PLACES = Decimal("0.0001")


@dataclass(frozen=True)
class PurchasingPowerResult:
    base_portfolio_value: Decimal
    current_portfolio_value: Decimal
    nominal_return_percent: Decimal
    personal_inflation_percent: Decimal
    real_return_percent: Decimal
    inflation_adjusted_required_value: Decimal
    purchasing_power_gap: Decimal
    current_value_in_base_dollars: Decimal

    @property
    def preserved_purchasing_power(self) -> bool:
        return self.purchasing_power_gap >= 0


def analyze_purchasing_power(
    *,
    base_portfolio_value: Decimal,
    current_portfolio_value: Decimal,
    personal_index_level: Decimal,
) -> PurchasingPowerResult:
    """Compare nominal portfolio growth with a user's personal price index."""
    if base_portfolio_value <= 0:
        raise ValueError("base portfolio value must be positive")
    if current_portfolio_value < 0:
        raise ValueError("current portfolio value cannot be negative")
    if personal_index_level <= 0:
        raise ValueError("personal index level must be positive")

    growth_factor = current_portfolio_value / base_portfolio_value
    inflation_factor = personal_index_level / Decimal("100")
    nominal_return = Decimal("100") * (growth_factor - Decimal("1"))
    personal_inflation = personal_index_level - Decimal("100")
    real_return = Decimal("100") * (growth_factor / inflation_factor - Decimal("1"))
    required_value = base_portfolio_value * inflation_factor
    purchasing_power_gap = current_portfolio_value - required_value
    current_value_in_base_dollars = current_portfolio_value / inflation_factor

    return PurchasingPowerResult(
        base_portfolio_value=base_portfolio_value.quantize(CENT, rounding=ROUND_HALF_UP),
        current_portfolio_value=current_portfolio_value.quantize(CENT, rounding=ROUND_HALF_UP),
        nominal_return_percent=nominal_return.quantize(FOUR_PLACES, rounding=ROUND_HALF_UP),
        personal_inflation_percent=personal_inflation.quantize(
            FOUR_PLACES, rounding=ROUND_HALF_UP
        ),
        real_return_percent=real_return.quantize(FOUR_PLACES, rounding=ROUND_HALF_UP),
        inflation_adjusted_required_value=required_value.quantize(
            CENT, rounding=ROUND_HALF_UP
        ),
        purchasing_power_gap=purchasing_power_gap.quantize(CENT, rounding=ROUND_HALF_UP),
        current_value_in_base_dollars=current_value_in_base_dollars.quantize(
            CENT, rounding=ROUND_HALF_UP
        ),
    )
