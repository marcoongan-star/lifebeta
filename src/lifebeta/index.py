from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP


@dataclass(frozen=True)
class BasketItem:
    product_id: str
    quantity: Decimal

    def __post_init__(self) -> None:
        if self.quantity <= 0:
            raise ValueError("basket quantity must be positive")


@dataclass(frozen=True)
class IndexResult:
    level: Decimal
    base_cost: Decimal
    current_cost: Decimal
    point_contributions: dict[str, Decimal]


def fixed_basket_index(
    basket: tuple[BasketItem, ...],
    base_unit_prices: dict[str, Decimal],
    current_unit_prices: dict[str, Decimal],
) -> IndexResult:
    if not basket:
        raise ValueError("basket cannot be empty")
    product_ids = [item.product_id for item in basket]
    if len(product_ids) != len(set(product_ids)):
        raise ValueError("basket products must be unique")
    missing = set(product_ids) - (base_unit_prices.keys() & current_unit_prices.keys())
    if missing:
        raise ValueError(f"missing prices for: {', '.join(sorted(missing))}")

    base_cost = sum(
        (item.quantity * base_unit_prices[item.product_id] for item in basket),
        start=Decimal("0"),
    )
    current_cost = sum(
        (item.quantity * current_unit_prices[item.product_id] for item in basket),
        start=Decimal("0"),
    )
    if base_cost <= 0:
        raise ValueError("base basket cost must be positive")

    quantizer = Decimal("0.0001")
    level = (Decimal("100") * current_cost / base_cost).quantize(
        quantizer, rounding=ROUND_HALF_UP
    )
    raw_contributions = {
        item.product_id: Decimal("100")
        * item.quantity
        * (current_unit_prices[item.product_id] - base_unit_prices[item.product_id])
        / base_cost
        for item in basket
    }
    contributions = {
        product_id: value.quantize(quantizer, rounding=ROUND_HALF_UP)
        for product_id, value in raw_contributions.items()
    }
    rounding_residual = (level - Decimal("100")) - sum(
        contributions.values(), start=Decimal("0")
    )
    if rounding_residual:
        largest = max(contributions, key=lambda product_id: abs(raw_contributions[product_id]))
        contributions[largest] += rounding_residual

    return IndexResult(level, base_cost, current_cost, contributions)

