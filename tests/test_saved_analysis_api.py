from fastapi.testclient import TestClient

from lifebeta.api import create_app


def test_saved_basket_analysis_uses_persisted_prices_and_released_cpi(tmp_path) -> None:
    client = TestClient(create_app(tmp_path / "lifebeta.db"))
    assert client.post(
        "/v1/baskets",
        json={
            "basket_id": "protein-and-gym",
            "name": "Protein and gym",
            "items": [
                {"product_id": "built-bar-4", "quantity": "4"},
                {"product_id": "la-fitness-monthly", "quantity": "1"},
            ],
        },
    ).status_code == 201
    for observation in (
        ("built-bar-4", "2026-01-01", "8", "receipt", "user_entered"),
        ("built-bar-4", "2026-02-01", "10", "receipt", "user_entered"),
        ("la-fitness-monthly", "2026-01-01", "30", "bill", "verified"),
        ("la-fitness-monthly", "2026-02-01", "33", "bill", "verified"),
    ):
        product_id, observed_on, price, source, provenance = observation
        assert client.post(
            "/v1/price-observations",
            json={
                "product_id": product_id,
                "observed_on": observed_on,
                "package_price": price,
                "currency": "USD",
                "source_label": source,
                "provenance_status": provenance,
            },
        ).status_code == 201
    for period_end, released_on, level in (
        ("2025-12-31", "2026-01-15", "100"),
        ("2026-01-31", "2026-02-15", "102"),
    ):
        assert client.post(
            "/v1/benchmark-observations",
            json={
                "series_id": "CPI-U-DEMO",
                "period_end": period_end,
                "released_on": released_on,
                "level": level,
                "source_label": "caller-supplied CPI demonstration",
                "source_url": "https://example.gov/cpi",
            },
        ).status_code == 201

    response = client.post(
        "/v1/baskets/protein-and-gym/analysis",
        json={
            "base_as_of": "2026-01-31",
            "current_as_of": "2026-02-28",
            "benchmark_series_id": "CPI-U-DEMO",
        },
    )
    assert response.status_code == 200
    result = response.json()
    assert result["level"] == "113.1579"
    assert result["benchmark"]["benchmark_percent_change"] == "2.0000"
    assert result["benchmark"]["personal_minus_benchmark"] == "11.1579"
    assert result["benchmark"]["current_source_url"] == "https://example.gov/cpi"
    assert "no live prices implied" in result["data_status"]
