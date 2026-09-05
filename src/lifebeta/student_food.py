from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True)
class StudentFoodPlace:
    place_id: str
    name: str
    cuisine: str
    typical_meal_price: Decimal
    distance_miles: Decimal
    student_discount: bool
    meal_note: str
    map_x: int
    map_y: int
    provenance_status: str = "seeded_demo"


SEEDED_BAROKE_PLACES = (
    StudentFoodPlace("slice", "Lexington Slice", "Pizza", Decimal("6.50"), Decimal("0.2"), True, "2 slices + drink", 47, 42),
    StudentFoodPlace("deli", "23rd Street Deli", "Deli", Decimal("9.50"), Decimal("0.1"), True, "Egg sandwich + coffee", 57, 57),
    StudentFoodPlace("falafel", "Gramercy Falafel", "Mediterranean", Decimal("9.00"), Decimal("0.4"), False, "Falafel pita", 35, 64),
    StudentFoodPlace("bento", "Madison Bento", "Japanese", Decimal("12.50"), Decimal("0.3"), True, "Lunch bento", 44, 27),
    StudentFoodPlace("taco", "Taco Bell Cantina", "Fast food", Decimal("8.50"), Decimal("0.8"), False, "Value-menu meal", 72, 29),
    StudentFoodPlace("curry", "Curry Hill Express", "Indian", Decimal("11.00"), Decimal("0.9"), False, "Rice + curry special", 76, 70),
)


def search_student_food(
    *,
    max_price: Decimal,
    max_distance: Decimal,
    student_discount_only: bool = False,
    places: tuple[StudentFoodPlace, ...] = SEEDED_BAROKE_PLACES,
) -> tuple[StudentFoodPlace, ...]:
    if max_price <= 0:
        raise ValueError("max_price must be positive")
    if max_distance <= 0:
        raise ValueError("max_distance must be positive")
    matches = (
        place
        for place in places
        if place.typical_meal_price <= max_price
        and place.distance_miles <= max_distance
        and (not student_discount_only or place.student_discount)
    )
    return tuple(
        sorted(matches, key=lambda place: (place.typical_meal_price, place.distance_miles, place.place_id))
    )
