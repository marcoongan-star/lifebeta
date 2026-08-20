from datetime import date
from decimal import Decimal

from lifebeta import (
    BasketItem,
    LifeBetaStore,
    PriceObservation,
    analyze_saved_basket,
    marco_catalog,
)


def test_saved_basket_runs_without_resubmitting_prices(tmp_path) -> None:
    store = LifeBetaStore(tmp_path / "lifebeta.db")
    store.upsert_products(tuple(marco_catalog().values()))
    store.create_basket(
        "training-day",
        "Training day costs",
        (
            BasketItem("built-bar-4", Decimal("4")),
            BasketItem("la-fitness-monthly", Decimal("1")),
        ),
    )
    for observation in (
        PriceObservation("built-bar-4", date(2026, 1, 1), Decimal("8"), "USD", "receipt", "user_entered"),
        PriceObservation("built-bar-4", date(2026, 2, 1), Decimal("10"), "USD", "receipt", "user_entered"),
        PriceObservation("la-fitness-monthly", date(2026, 1, 1), Decimal("30"), "USD", "bill", "verified"),
        PriceObservation("la-fitness-monthly", date(2026, 2, 1), Decimal("33"), "USD", "bill", "verified"),
    ):
        store.add_price_observation(observation)

    analysis = analyze_saved_basket(
        store,
        "training-day",
        base_as_of=date(2026, 1, 31),
        current_as_of=date(2026, 2, 28),
    )

    assert analysis.basket.name == "Training day costs"
    assert analysis.index_result.level == Decimal("113.1579")
    assert sum(analysis.category_contributions.values(), Decimal("0")) == Decimal("13.1579")
    assert analysis.current_snapshot.observation_dates == {
        "built-bar-4": date(2026, 2, 1),
        "la-fitness-monthly": date(2026, 2, 1),
    }
