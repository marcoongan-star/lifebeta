from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from .analytics import (
    InflationDriver,
    PriceSnapshot,
    category_point_contributions,
    rank_inflation_drivers,
    select_price_snapshot,
)
from .catalog import Category
from .index import IndexResult, fixed_basket_index
from .prices import ALLOWED_PROVENANCE
from .store import LifeBetaStore, StoredBasket


@dataclass(frozen=True)
class SavedBasketAnalysis:
    basket: StoredBasket
    base_as_of: date
    current_as_of: date
    currency: str
    base_snapshot: PriceSnapshot
    current_snapshot: PriceSnapshot
    index_result: IndexResult
    category_contributions: dict[Category, Decimal]
    ranked_drivers: tuple[InflationDriver, ...]


def analyze_saved_basket(
    store: LifeBetaStore,
    basket_id: str,
    *,
    base_as_of: date,
    current_as_of: date,
    currency: str = "USD",
    eligible_provenance: frozenset[str] = frozenset({"verified", "user_entered"}),
    stale_after_days: int = 45,
) -> SavedBasketAnalysis:
    """Run the trusted index pipeline using only normalized persisted inputs."""
    if base_as_of >= current_as_of:
        raise ValueError("base_as_of must be before current_as_of")
    if not eligible_provenance <= ALLOWED_PROVENANCE:
        unsupported = eligible_provenance - ALLOWED_PROVENANCE
        raise ValueError(f"unsupported provenance: {', '.join(sorted(unsupported))}")
    basket = store.basket(basket_id)
    product_ids = {item.product_id for item in basket.items}
    catalog = {
        product.product_id: product
        for product in store.products()
        if product.product_id in product_ids
    }
    missing_products = product_ids - catalog.keys()
    if missing_products:
        raise ValueError(f"unknown basket products: {', '.join(sorted(missing_products))}")
    observations = store.price_observations()
    options = {
        "currency": currency.upper(),
        "eligible_provenance": eligible_provenance,
        "stale_after_days": stale_after_days,
    }
    base = select_price_snapshot(
        catalog, observations, as_of=base_as_of, **options
    )
    current = select_price_snapshot(
        catalog, observations, as_of=current_as_of, **options
    )
    result = fixed_basket_index(basket.items, base.unit_prices, current.unit_prices)
    contributions = category_point_contributions(result, catalog)
    drivers = rank_inflation_drivers(
        contributions, total_point_change=result.level - Decimal("100")
    )
    return SavedBasketAnalysis(
        basket=basket,
        base_as_of=base_as_of,
        current_as_of=current_as_of,
        currency=currency.upper(),
        base_snapshot=base,
        current_snapshot=current,
        index_result=result,
        category_contributions=contributions,
        ranked_drivers=drivers,
    )
