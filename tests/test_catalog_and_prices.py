from datetime import date
from decimal import Decimal

from lifebeta import PriceObservation, comparable_unit_price, marco_catalog


def test_marco_catalog_contains_the_approved_personal_basket() -> None:
    catalog = marco_catalog()
    assert set(catalog) == {
        "chipotle-marco-bowl",
        "built-bar-4",
        "barebells-4",
        "built-bar-14",
        "la-fitness-monthly",
        "common-zip-up",
        "liverpool-home",
        "barcelona-home",
        "spain-home",
    }
    assert "fajita vegetables" in catalog["chipotle-marco-bowl"].display_name


def test_package_prices_are_normalized_per_bar() -> None:
    catalog = marco_catalog()
    four_pack = PriceObservation(
        "built-bar-4", date(2026, 1, 1), Decimal("10.00"), "USD", "seeded test", "synthetic"
    )
    fourteen_pack = PriceObservation(
        "built-bar-14", date(2026, 1, 1), Decimal("28.00"), "USD", "seeded test", "synthetic"
    )
    assert comparable_unit_price(catalog["built-bar-4"], four_pack) == Decimal("2.5000")
    assert comparable_unit_price(catalog["built-bar-14"], fourteen_pack) == Decimal("2.0000")

