from datetime import date
from decimal import Decimal

from fastapi.testclient import TestClient

from lifebeta import BasketItem, LifeBetaStore, PriceObservation, assess_basket_quality, marco_catalog
from lifebeta.api import create_app


def _quality_store(tmp_path) -> LifeBetaStore:
    store = LifeBetaStore(tmp_path / "lifebeta.db")
    store.upsert_products(tuple(marco_catalog().values()))
    store.create_basket(
        "matchday",
        "Matchday basket",
        (
            BasketItem("chipotle-marco-bowl", Decimal("1")),
            BasketItem("liverpool-home", Decimal("0.25")),
        ),
    )
    for observation in (
        PriceObservation("chipotle-marco-bowl", date(2026, 7, 1), Decimal("12"), "USD", "receipt", "user_entered"),
        PriceObservation("chipotle-marco-bowl", date(2026, 8, 10), Decimal("13"), "USD", "menu check", "verified"),
        PriceObservation("liverpool-home", date(2026, 5, 1), Decimal("90"), "USD", "club store", "verified"),
        PriceObservation("liverpool-home", date(2026, 9, 1), Decimal("100"), "USD", "future check", "verified"),
    ):
        store.add_price_observation(observation)
    return store


def test_quality_enforces_minimum_history_staleness_and_no_lookahead(tmp_path) -> None:
    report = assess_basket_quality(
        _quality_store(tmp_path),
        "matchday",
        as_of=date(2026, 8, 20),
        minimum_observations=2,
        stale_after_days=45,
    )

    by_product = {item.product_id: item for item in report.products}
    assert by_product["chipotle-marco-bowl"].ready is True
    assert by_product["liverpool-home"].eligible_observation_count == 1
    assert by_product["liverpool-home"].issues == (
        "insufficient_history",
        "stale",
        "single_source",
    )
    assert report.coverage_percent == Decimal("50.00")
    assert report.status == "incomplete"


def test_quality_report_is_exposed_without_raw_input_data(tmp_path) -> None:
    store = _quality_store(tmp_path)
    client = TestClient(create_app(store.path))
    response = client.post(
        "/v1/baskets/matchday/quality",
        json={"as_of": "2026-08-20", "minimum_observations": 2},
    )

    assert response.status_code == 200
    assert response.json()["coverage_percent"] == "50.00"
    assert response.json()["products"][1]["ready"] is False
    assert "requested date" in response.json()["data_status"]
