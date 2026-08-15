from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from .catalog import Category, Product
from .index import IndexResult
from .prices import PriceObservation, comparable_unit_price


@dataclass(frozen=True)
class PriceSnapshot:
    as_of: date
    currency: str
    unit_prices: dict[str, Decimal]
    observation_dates: dict[str, date]
    stale_product_ids: tuple[str, ...]


class MissingPriceError(ValueError):
    def __init__(self, product_ids: list[str]) -> None:
        self.product_ids = tuple(sorted(product_ids))
        super().__init__(f"missing eligible prices for: {', '.join(self.product_ids)}")


@dataclass(frozen=True)
class InflationDriver:
    category: Category
    point_contribution: Decimal
    share_of_net_change: Decimal | None
    direction: str


def select_price_snapshot(
    catalog: dict[str, Product],
    observations: tuple[PriceObservation, ...],
    *,
    as_of: date,
    currency: str = "USD",
    eligible_provenance: frozenset[str] = frozenset({"verified", "user_entered"}),
    stale_after_days: int = 45,
) -> PriceSnapshot:
    """Select the latest trustworthy observation available on an analysis date."""
    if stale_after_days < 0:
        raise ValueError("stale_after_days cannot be negative")

    selected: dict[str, PriceObservation] = {}
    for observation in observations:
        if observation.product_id not in catalog:
            raise ValueError(f"unknown product: {observation.product_id}")
        if (
            observation.currency == currency
            and observation.provenance_status in eligible_provenance
            and observation.observed_on <= as_of
        ):
            previous = selected.get(observation.product_id)
            if previous is None or observation.observed_on > previous.observed_on:
                selected[observation.product_id] = observation

    missing = [product_id for product_id in catalog if product_id not in selected]
    if missing:
        raise MissingPriceError(missing)

    stale = tuple(
        sorted(
            product_id
            for product_id, observation in selected.items()
            if (as_of - observation.observed_on).days > stale_after_days
        )
    )
    return PriceSnapshot(
        as_of=as_of,
        currency=currency,
        unit_prices={
            product_id: comparable_unit_price(catalog[product_id], observation)
            for product_id, observation in selected.items()
        },
        observation_dates={
            product_id: observation.observed_on
            for product_id, observation in selected.items()
        },
        stale_product_ids=stale,
    )


def category_point_contributions(
    index_result: IndexResult,
    catalog: dict[str, Product],
) -> dict[Category, Decimal]:
    """Roll exact product-level index contributions into understandable categories."""
    unknown = set(index_result.point_contributions) - catalog.keys()
    if unknown:
        raise ValueError(f"unknown products in index result: {', '.join(sorted(unknown))}")

    contributions: dict[Category, Decimal] = {}
    for product_id, points in index_result.point_contributions.items():
        category = catalog[product_id].category
        contributions[category] = contributions.get(category, Decimal("0")) + points
    return contributions


def rank_inflation_drivers(
    category_contributions: dict[Category, Decimal],
    *,
    total_point_change: Decimal,
) -> tuple[InflationDriver, ...]:
    """Rank category effects while preserving deflationary offsets."""
    if sum(category_contributions.values(), start=Decimal("0")) != total_point_change:
        raise ValueError("category contributions must reconcile to the total point change")

    drivers = []
    for category, contribution in category_contributions.items():
        if contribution > 0:
            direction = "inflationary"
        elif contribution < 0:
            direction = "deflationary"
        else:
            direction = "neutral"
        share = None
        if total_point_change != 0:
            share = (Decimal("100") * contribution / total_point_change).quantize(
                Decimal("0.01")
            )
        drivers.append(InflationDriver(category, contribution, share, direction))
    return tuple(sorted(drivers, key=lambda driver: abs(driver.point_contribution), reverse=True))
