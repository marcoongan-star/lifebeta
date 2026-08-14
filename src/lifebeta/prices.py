from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal, ROUND_HALF_UP

from .catalog import Product


ALLOWED_PROVENANCE = frozenset({"verified", "user_entered", "seeded", "synthetic"})


@dataclass(frozen=True)
class PriceObservation:
    product_id: str
    observed_on: date
    package_price: Decimal
    currency: str
    source_label: str
    provenance_status: str

    def __post_init__(self) -> None:
        if self.package_price < 0:
            raise ValueError("package_price cannot be negative")
        if len(self.currency) != 3:
            raise ValueError("currency must be a three-letter code")
        if not self.source_label.strip() or not self.provenance_status.strip():
            raise ValueError("source and provenance are required")
        if self.provenance_status not in ALLOWED_PROVENANCE:
            raise ValueError(f"unsupported provenance status: {self.provenance_status}")


def comparable_unit_price(product: Product, observation: PriceObservation) -> Decimal:
    if product.product_id != observation.product_id:
        raise ValueError("observation does not belong to product")
    return (observation.package_price / product.units_per_package).quantize(
        Decimal("0.0001"), rounding=ROUND_HALF_UP
    )
