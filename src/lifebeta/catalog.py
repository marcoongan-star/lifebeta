from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum


class Category(StrEnum):
    FAST_CASUAL = "fast_casual"
    PROTEIN_BARS = "protein_bars"
    GYM = "gym"
    CLOTHING = "clothing"
    SOCCER_JERSEYS = "soccer_jerseys"


class Unit(StrEnum):
    BOWL = "bowl"
    BAR = "bar"
    MONTH = "month"
    ITEM = "item"
    JERSEY = "jersey"


@dataclass(frozen=True)
class Product:
    product_id: str
    display_name: str
    category: Category
    comparable_unit: Unit
    units_per_package: int = 1

    def __post_init__(self) -> None:
        if self.units_per_package <= 0:
            raise ValueError("units_per_package must be positive")


def marco_catalog() -> dict[str, Product]:
    products = (
        Product(
            "chipotle-marco-bowl",
            "Chipotle chicken bowl — rice, black beans, fajita vegetables, lettuce, pico, sour cream",
            Category.FAST_CASUAL,
            Unit.BOWL,
        ),
        Product("built-bar-4", "Built Bar 4-pack", Category.PROTEIN_BARS, Unit.BAR, 4),
        Product("barebells-4", "Barebells 4-pack", Category.PROTEIN_BARS, Unit.BAR, 4),
        Product("built-bar-14", "Built Bar 14-pack", Category.PROTEIN_BARS, Unit.BAR, 14),
        Product("la-fitness-monthly", "LA Fitness monthly membership", Category.GYM, Unit.MONTH),
        Product("common-zip-up", "Common zip-up sweatshirt", Category.CLOTHING, Unit.ITEM),
        Product("liverpool-home", "Liverpool home jersey", Category.SOCCER_JERSEYS, Unit.JERSEY),
        Product("barcelona-home", "Barcelona home jersey", Category.SOCCER_JERSEYS, Unit.JERSEY),
        Product("spain-home", "Spain home jersey", Category.SOCCER_JERSEYS, Unit.JERSEY),
    )
    return {product.product_id: product for product in products}

