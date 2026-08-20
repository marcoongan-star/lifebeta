from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal, ROUND_HALF_UP

from .prices import ALLOWED_PROVENANCE
from .store import LifeBetaStore


@dataclass(frozen=True)
class ProductCoverage:
    product_id: str
    eligible_observation_count: int
    distinct_source_count: int
    first_observed_on: date | None
    last_observed_on: date | None
    current_age_days: int | None
    issues: tuple[str, ...]

    @property
    def ready(self) -> bool:
        return not any(
            issue in {"missing", "insufficient_history", "stale"} for issue in self.issues
        )


@dataclass(frozen=True)
class BasketDataQuality:
    basket_id: str
    as_of: date
    minimum_observations: int
    product_count: int
    ready_product_count: int
    coverage_percent: Decimal
    status: str
    products: tuple[ProductCoverage, ...]


def assess_basket_quality(
    store: LifeBetaStore,
    basket_id: str,
    *,
    as_of: date,
    currency: str = "USD",
    eligible_provenance: frozenset[str] = frozenset({"verified", "user_entered"}),
    minimum_observations: int = 2,
    stale_after_days: int = 45,
) -> BasketDataQuality:
    if minimum_observations < 1:
        raise ValueError("minimum_observations must be positive")
    if stale_after_days < 0:
        raise ValueError("stale_after_days cannot be negative")
    if not eligible_provenance <= ALLOWED_PROVENANCE:
        raise ValueError("eligible_provenance contains an unsupported status")
    basket = store.basket(basket_id)
    all_observations = store.price_observations()
    coverage: list[ProductCoverage] = []
    for item in basket.items:
        eligible = sorted(
            (
                observation
                for observation in all_observations
                if observation.product_id == item.product_id
                and observation.currency == currency.upper()
                and observation.provenance_status in eligible_provenance
                and observation.observed_on <= as_of
            ),
            key=lambda observation: observation.observed_on,
        )
        issues: list[str] = []
        if not eligible:
            issues.append("missing")
            first = last = None
            age = None
            source_count = 0
        else:
            first = eligible[0].observed_on
            last = eligible[-1].observed_on
            age = (as_of - last).days
            source_count = len({observation.source_label for observation in eligible})
            if len(eligible) < minimum_observations:
                issues.append("insufficient_history")
            if age > stale_after_days:
                issues.append("stale")
            if source_count == 1:
                issues.append("single_source")
        coverage.append(
            ProductCoverage(
                product_id=item.product_id,
                eligible_observation_count=len(eligible),
                distinct_source_count=source_count,
                first_observed_on=first,
                last_observed_on=last,
                current_age_days=age,
                issues=tuple(issues),
            )
        )
    ready_count = sum(item.ready for item in coverage)
    coverage_percent = (
        Decimal("100") * Decimal(ready_count) / Decimal(len(coverage))
    ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return BasketDataQuality(
        basket_id=basket_id,
        as_of=as_of,
        minimum_observations=minimum_observations,
        product_count=len(coverage),
        ready_product_count=ready_count,
        coverage_percent=coverage_percent,
        status="ready" if ready_count == len(coverage) else "incomplete",
        products=tuple(coverage),
    )
