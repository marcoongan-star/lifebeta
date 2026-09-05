from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP


FOUR_PLACES = Decimal("0.0001")
TWO_PLACES = Decimal("0.01")


@dataclass(frozen=True)
class FoodAffordabilityResult:
    base_meal_price: Decimal
    current_meal_price: Decimal
    weekly_food_budget: Decimal
    planned_meals_per_week: int
    meal_price_change_percent: Decimal
    base_meals_affordable: Decimal
    current_meals_affordable: Decimal
    meals_lost_per_week: Decimal
    planned_weekly_cost: Decimal
    weekly_shortfall: Decimal
    current_budget_share_percent: Decimal
    budget_covers_plan: bool


def analyze_food_affordability(
    *,
    base_meal_price: Decimal,
    current_meal_price: Decimal,
    weekly_food_budget: Decimal,
    planned_meals_per_week: int,
) -> FoodAffordabilityResult:
    """Translate meal-price inflation into a student's weekly budget constraint."""
    if base_meal_price <= 0 or current_meal_price <= 0:
        raise ValueError("meal prices must be positive")
    if weekly_food_budget <= 0:
        raise ValueError("weekly food budget must be positive")
    if planned_meals_per_week < 1:
        raise ValueError("planned meals per week must be at least one")

    base_meals = (weekly_food_budget / base_meal_price).quantize(
        TWO_PLACES, rounding=ROUND_HALF_UP
    )
    current_meals = (weekly_food_budget / current_meal_price).quantize(
        TWO_PLACES, rounding=ROUND_HALF_UP
    )
    planned_cost = (current_meal_price * planned_meals_per_week).quantize(
        TWO_PLACES, rounding=ROUND_HALF_UP
    )
    shortfall = max(Decimal("0"), planned_cost - weekly_food_budget).quantize(
        TWO_PLACES, rounding=ROUND_HALF_UP
    )

    return FoodAffordabilityResult(
        base_meal_price=base_meal_price.quantize(TWO_PLACES),
        current_meal_price=current_meal_price.quantize(TWO_PLACES),
        weekly_food_budget=weekly_food_budget.quantize(TWO_PLACES),
        planned_meals_per_week=planned_meals_per_week,
        meal_price_change_percent=(
            (current_meal_price / base_meal_price - Decimal("1")) * Decimal("100")
        ).quantize(FOUR_PLACES, rounding=ROUND_HALF_UP),
        base_meals_affordable=base_meals,
        current_meals_affordable=current_meals,
        meals_lost_per_week=(base_meals - current_meals).quantize(
            TWO_PLACES, rounding=ROUND_HALF_UP
        ),
        planned_weekly_cost=planned_cost,
        weekly_shortfall=shortfall,
        current_budget_share_percent=(
            planned_cost / weekly_food_budget * Decimal("100")
        ).quantize(TWO_PLACES, rounding=ROUND_HALF_UP),
        budget_covers_plan=shortfall == 0,
    )
