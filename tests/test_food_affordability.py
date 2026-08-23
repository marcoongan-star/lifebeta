from decimal import Decimal

import pytest

from lifebeta.food_affordability import analyze_food_affordability


def test_meal_inflation_is_translated_into_budget_capacity() -> None:
    result = analyze_food_affordability(
        base_meal_price=Decimal("10"),
        current_meal_price=Decimal("12.50"),
        weekly_food_budget=Decimal("75"),
        planned_meals_per_week=7,
    )

    assert result.meal_price_change_percent == Decimal("25.0000")
    assert result.base_meals_affordable == Decimal("7.50")
    assert result.current_meals_affordable == Decimal("6.00")
    assert result.meals_lost_per_week == Decimal("1.50")
    assert result.planned_weekly_cost == Decimal("87.50")
    assert result.weekly_shortfall == Decimal("12.50")
    assert result.current_budget_share_percent == Decimal("116.67")
    assert result.budget_covers_plan is False


def test_affordability_requires_positive_real_inputs() -> None:
    with pytest.raises(ValueError, match="meal prices must be positive"):
        analyze_food_affordability(
            base_meal_price=Decimal("0"),
            current_meal_price=Decimal("12"),
            weekly_food_budget=Decimal("75"),
            planned_meals_per_week=5,
        )
