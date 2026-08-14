from datetime import date
from decimal import Decimal

import pytest

from lifebeta import (
    BasketItem,
    Category,
    MissingPriceError,
    PriceObservation,
    category_point_contributions,
    fixed_basket_index,
    marco_catalog,
    select_price_snapshot,
)


def observation(
    product_id: str,
    observed_on: date,
    price: str,
    provenance: str = "verified",
) -> PriceObservation:
    return PriceObservation(
        product_id,
        observed_on,
        Decimal(price),
        "USD",
        "test source",
        provenance,
    )


def test_snapshot_uses_latest_eligible_price_and_reports_staleness() -> None:
    catalog = {"built-bar-4": marco_catalog()["built-bar-4"]}
    observations = (
        observation("built-bar-4", date(2026, 1, 1), "8.00"),
        observation("built-bar-4", date(2026, 2, 1), "12.00"),
        observation("built-bar-4", date(2026, 3, 1), "99.00", "synthetic"),
    )

    snapshot = select_price_snapshot(
        catalog,
        observations,
        as_of=date(2026, 4, 1),
        stale_after_days=30,
    )

    assert snapshot.unit_prices["built-bar-4"] == Decimal("3.0000")
    assert snapshot.observation_dates["built-bar-4"] == date(2026, 2, 1)
    assert snapshot.stale_product_ids == ("built-bar-4",)


def test_snapshot_refuses_to_silently_fill_missing_real_prices() -> None:
    catalog = {
        product_id: marco_catalog()[product_id]
        for product_id in ("built-bar-4", "la-fitness-monthly")
    }
    with pytest.raises(MissingPriceError) as error:
        select_price_snapshot(
            catalog,
            (observation("built-bar-4", date(2026, 1, 1), "8.00"),),
            as_of=date(2026, 1, 15),
        )
    assert error.value.product_ids == ("la-fitness-monthly",)


def test_product_contributions_roll_up_to_categories_without_losing_points() -> None:
    catalog = marco_catalog()
    basket = (
        BasketItem("built-bar-4", Decimal("4")),
        BasketItem("la-fitness-monthly", Decimal("1")),
    )
    result = fixed_basket_index(
        basket,
        {"built-bar-4": Decimal("2"), "la-fitness-monthly": Decimal("30")},
        {"built-bar-4": Decimal("2.50"), "la-fitness-monthly": Decimal("33")},
    )

    categories = category_point_contributions(result, catalog)

    assert categories[Category.PROTEIN_BARS] > 0
    assert categories[Category.GYM] > 0
    assert sum(categories.values(), start=Decimal("0")) == result.level - Decimal("100")
