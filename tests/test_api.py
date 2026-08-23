from fastapi.testclient import TestClient

from lifebeta.api import create_app


client = TestClient(create_app())


def test_catalog_exposes_the_nine_approved_products() -> None:
    response = client.get("/v1/catalog")
    assert response.status_code == 200
    assert len(response.json()) == 9
    assert {product["product_id"] for product in response.json()} >= {
        "chipotle-marco-bowl",
        "liverpool-home",
        "la-fitness-monthly",
    }


def test_index_endpoint_runs_the_trusted_snapshot_pipeline() -> None:
    response = client.post(
        "/v1/index",
        json={
            "base_as_of": "2026-01-31",
            "current_as_of": "2026-02-28",
            "basket": [
                {"product_id": "built-bar-4", "quantity": "4"},
                {"product_id": "la-fitness-monthly", "quantity": "1"},
            ],
            "observations": [
                {
                    "product_id": "built-bar-4",
                    "observed_on": "2026-01-01",
                    "package_price": "8.00",
                    "currency": "USD",
                    "source_label": "manual receipt",
                    "provenance_status": "user_entered",
                },
                {
                    "product_id": "built-bar-4",
                    "observed_on": "2026-02-01",
                    "package_price": "10.00",
                    "currency": "USD",
                    "source_label": "manual receipt",
                    "provenance_status": "user_entered",
                },
                {
                    "product_id": "la-fitness-monthly",
                    "observed_on": "2026-01-01",
                    "package_price": "30.00",
                    "currency": "USD",
                    "source_label": "manual bill",
                    "provenance_status": "user_entered",
                },
                {
                    "product_id": "la-fitness-monthly",
                    "observed_on": "2026-02-01",
                    "package_price": "33.00",
                    "currency": "USD",
                    "source_label": "manual bill",
                    "provenance_status": "user_entered",
                },
            ],
        },
    )
    assert response.status_code == 200
    result = response.json()
    assert float(result["level"]) > 100
    assert set(result["category_point_contributions"]) == {"protein_bars", "gym"}
    assert [driver["category"] for driver in result["ranked_drivers"]] == [
        "gym",
        "protein_bars",
    ]
    assert all(driver["direction"] == "inflationary" for driver in result["ranked_drivers"])
    assert "no live prices implied" in result["data_status"]


def test_index_endpoint_reports_missing_prices_without_fabricating_them() -> None:
    response = client.post(
        "/v1/index",
        json={
            "base_as_of": "2026-01-31",
            "current_as_of": "2026-02-28",
            "basket": [{"product_id": "liverpool-home", "quantity": "1"}],
            "observations": [
                {
                    "product_id": "liverpool-home",
                    "observed_on": "2026-02-01",
                    "package_price": "99.00",
                    "currency": "USD",
                    "source_label": "future observation",
                    "provenance_status": "verified",
                }
            ],
        },
    )
    assert response.status_code == 422
    assert response.json()["code"] == "missing_price"
    assert response.json()["product_ids"] == ["liverpool-home"]


def test_benchmark_endpoint_returns_sources_and_personal_gap() -> None:
    response = client.post(
        "/v1/benchmark/compare",
        json={
            "personal_percent_change": "5",
            "base_as_of": "2026-02-15",
            "current_as_of": "2026-03-15",
            "series_id": "CPI-U",
            "observations": [
                {
                    "series_id": "CPI-U",
                    "period_end": "2026-01-31",
                    "released_on": "2026-02-10",
                    "level": "100",
                    "source_label": "official January release",
                    "source_url": "https://example.gov/cpi/january",
                },
                {
                    "series_id": "CPI-U",
                    "period_end": "2026-02-28",
                    "released_on": "2026-03-10",
                    "level": "102",
                    "source_label": "official February release",
                    "source_url": "https://example.gov/cpi/february",
                },
            ],
        },
    )
    assert response.status_code == 200
    assert response.json()["personal_minus_benchmark"] == "3.0000"
    assert response.json()["current_snapshot"]["released_on"] == "2026-03-10"


def test_purchasing_power_endpoint_explains_a_nominal_gain() -> None:
    response = client.post(
        "/v1/purchasing-power",
        json={
            "base_portfolio_value": "10000",
            "current_portfolio_value": "10600",
            "personal_index_level": "108",
        },
    )
    assert response.status_code == 200
    result = response.json()
    assert result["nominal_return_percent"] == "6.0000"
    assert result["real_return_percent"] == "-1.8519"
    assert result["purchasing_power_gap"] == "-200.00"
    assert result["preserved_purchasing_power"] is False
    assert "not investment advice" in result["data_status"]


def test_food_affordability_endpoint_exposes_the_student_budget_tradeoff() -> None:
    response = client.post(
        "/v1/food-affordability",
        json={
            "base_meal_price": "10.00",
            "current_meal_price": "12.50",
            "weekly_food_budget": "75.00",
            "planned_meals_per_week": 7,
        },
    )

    assert response.status_code == 200
    result = response.json()
    assert result["meal_price_change_percent"] == "25.0000"
    assert result["current_meals_affordable"] == "6.00"
    assert result["weekly_shortfall"] == "12.50"
    assert result["budget_covers_plan"] is False
    assert "no live restaurant price implied" in result["data_status"]
