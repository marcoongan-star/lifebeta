from fastapi.testclient import TestClient

from lifebeta.api import create_app


def test_basket_and_observation_survive_api_restart(tmp_path) -> None:
    database = tmp_path / "lifebeta.db"
    first_client = TestClient(create_app(database))

    basket = first_client.post(
        "/v1/baskets",
        json={
            "basket_id": "matchday",
            "name": "Matchday costs",
            "items": [
                {"product_id": "liverpool-home", "quantity": "0.25"},
                {"product_id": "chipotle-marco-bowl", "quantity": "1"},
            ],
        },
    )
    assert basket.status_code == 201
    observation = first_client.post(
        "/v1/price-observations",
        json={
            "product_id": "liverpool-home",
            "observed_on": "2026-08-17",
            "package_price": "99.99",
            "currency": "USD",
            "source_label": "manual store check",
            "provenance_status": "user_entered",
        },
    )
    assert observation.status_code == 201

    restarted_client = TestClient(create_app(database))
    saved_basket = restarted_client.get("/v1/baskets/matchday")
    saved_prices = restarted_client.get(
        "/v1/price-observations", params={"product_id": "liverpool-home"}
    )
    assert saved_basket.status_code == 200
    assert saved_basket.json()["items"][1]["quantity"] == "0.25"
    assert saved_prices.json()[0]["package_price"] == "99.99"


def test_portfolio_storage_is_opt_in_and_aggregate_only(tmp_path) -> None:
    client = TestClient(create_app(tmp_path / "lifebeta.db"))
    payload = {
        "analysis_id": "summer-check",
        "base_portfolio_value": "10000",
        "current_portfolio_value": "10600",
        "personal_index_level": "108",
    }

    refused = client.post("/v1/portfolio-totals", json=payload)
    assert refused.status_code == 403
    assert "session-only" in refused.json()["detail"]

    saved = client.post(
        "/v1/portfolio-totals", json={**payload, "save_totals": True}
    )
    assert saved.status_code == 201
    assert saved.json()["current_portfolio_value"] == "10600"
    assert "raw Fidelity rows were not retained" in saved.json()["privacy"]
