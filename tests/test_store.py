from datetime import date
from decimal import Decimal

import pytest

from lifebeta import BasketItem, LifeBetaStore, PriceObservation, marco_catalog


def test_normalized_basket_and_prices_survive_restart(tmp_path) -> None:
    database = tmp_path / "lifebeta.db"
    store = LifeBetaStore(database)
    store.upsert_products(tuple(marco_catalog().values()))
    store.create_basket(
        "marco-core",
        "Marco's core basket",
        (
            BasketItem("chipotle-marco-bowl", Decimal("2")),
            BasketItem("liverpool-home", Decimal("0.25")),
        ),
    )
    store.add_price_observation(
        PriceObservation(
            "chipotle-marco-bowl",
            date(2026, 8, 17),
            Decimal("12.85"),
            "USD",
            "manual receipt",
            "user_entered",
        )
    )

    restarted = LifeBetaStore(database)
    assert restarted.basket("marco-core").items[1].quantity == Decimal("0.25")
    observation = restarted.price_observations("chipotle-marco-bowl")[0]
    assert observation.package_price == Decimal("12.85")
    assert observation.source_label == "manual receipt"


def test_portfolio_totals_require_explicit_consent(tmp_path) -> None:
    store = LifeBetaStore(tmp_path / "lifebeta.db")

    with pytest.raises(PermissionError, match="explicit consent"):
        store.save_portfolio_totals(
            "august-review",
            base_value=Decimal("10000"),
            current_value=Decimal("10600"),
            personal_index_level=Decimal("108"),
        )

    saved = store.save_portfolio_totals(
        "august-review",
        base_value=Decimal("10000"),
        current_value=Decimal("10600"),
        personal_index_level=Decimal("108"),
        consent=True,
    )
    assert saved.current_value == Decimal("10600")
    assert LifeBetaStore(store.path).portfolio_totals("august-review") == saved


def test_schema_has_no_raw_import_storage(tmp_path) -> None:
    store = LifeBetaStore(tmp_path / "lifebeta.db")

    assert store.table_names() == {
        "products",
        "baskets",
        "basket_items",
        "price_observations",
        "portfolio_totals",
    }
