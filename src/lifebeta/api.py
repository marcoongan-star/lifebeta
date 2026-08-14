from __future__ import annotations

from datetime import date
from decimal import Decimal

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from .analytics import (
    MissingPriceError,
    category_point_contributions,
    select_price_snapshot,
)
from .catalog import Category, marco_catalog
from .index import BasketItem, fixed_basket_index
from .prices import ALLOWED_PROVENANCE, PriceObservation


class ProductView(BaseModel):
    product_id: str
    display_name: str
    category: Category
    comparable_unit: str
    units_per_package: int


class BasketItemInput(BaseModel):
    product_id: str = Field(min_length=1)
    quantity: Decimal = Field(gt=0)


class ObservationInput(BaseModel):
    product_id: str = Field(min_length=1)
    observed_on: date
    package_price: Decimal = Field(ge=0)
    currency: str = Field(min_length=3, max_length=3)
    source_label: str = Field(min_length=1)
    provenance_status: str = Field(min_length=1)


class IndexRequest(BaseModel):
    base_as_of: date
    current_as_of: date
    basket: list[BasketItemInput] = Field(min_length=1)
    observations: list[ObservationInput] = Field(min_length=1)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    eligible_provenance: set[str] = Field(default_factory=lambda: {"verified", "user_entered"})
    stale_after_days: int = Field(default=45, ge=0)


class IndexResponse(BaseModel):
    base_as_of: date
    current_as_of: date
    currency: str
    level: Decimal
    percent_change: Decimal
    base_cost: Decimal
    current_cost: Decimal
    category_point_contributions: dict[Category, Decimal]
    current_observation_dates: dict[str, date]
    stale_product_ids: list[str]
    data_status: str


def calculate_index(payload: IndexRequest) -> IndexResponse:
    if payload.base_as_of >= payload.current_as_of:
        raise ValueError("base_as_of must be before current_as_of")
    if not payload.eligible_provenance <= ALLOWED_PROVENANCE:
        unsupported = payload.eligible_provenance - ALLOWED_PROVENANCE
        raise ValueError(f"unsupported provenance: {', '.join(sorted(unsupported))}")

    full_catalog = marco_catalog()
    product_ids = {item.product_id for item in payload.basket}
    unknown = product_ids - full_catalog.keys()
    if unknown:
        raise ValueError(f"unknown basket products: {', '.join(sorted(unknown))}")
    catalog = {product_id: full_catalog[product_id] for product_id in product_ids}
    observations = tuple(
        PriceObservation(
            product_id=item.product_id,
            observed_on=item.observed_on,
            package_price=item.package_price,
            currency=item.currency.upper(),
            source_label=item.source_label,
            provenance_status=item.provenance_status,
        )
        for item in payload.observations
    )
    snapshot_options = {
        "currency": payload.currency.upper(),
        "eligible_provenance": frozenset(payload.eligible_provenance),
        "stale_after_days": payload.stale_after_days,
    }
    base = select_price_snapshot(
        catalog, observations, as_of=payload.base_as_of, **snapshot_options
    )
    current = select_price_snapshot(
        catalog, observations, as_of=payload.current_as_of, **snapshot_options
    )
    result = fixed_basket_index(
        tuple(BasketItem(item.product_id, item.quantity) for item in payload.basket),
        base.unit_prices,
        current.unit_prices,
    )
    return IndexResponse(
        base_as_of=payload.base_as_of,
        current_as_of=payload.current_as_of,
        currency=payload.currency.upper(),
        level=result.level,
        percent_change=result.level - Decimal("100"),
        base_cost=result.base_cost,
        current_cost=result.current_cost,
        category_point_contributions=category_point_contributions(result, catalog),
        current_observation_dates=current.observation_dates,
        stale_product_ids=list(current.stale_product_ids),
        data_status="Calculated from caller-supplied observations; no live prices implied.",
    )


def create_app() -> FastAPI:
    app = FastAPI(
        title="LifeBeta API",
        version="0.1.0",
        description="Provenance-aware personal inflation analytics.",
    )

    @app.exception_handler(MissingPriceError)
    async def missing_price_handler(_request, error: MissingPriceError):  # type: ignore[no-untyped-def]
        return JSONResponse(
            status_code=422,
            content={
                "detail": str(error),
                "code": "missing_price",
                "product_ids": list(error.product_ids),
            },
        )

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/v1/catalog", response_model=list[ProductView])
    def catalog() -> list[ProductView]:
        return [
            ProductView(
                product_id=product.product_id,
                display_name=product.display_name,
                category=product.category,
                comparable_unit=product.comparable_unit.value,
                units_per_package=product.units_per_package,
            )
            for product in marco_catalog().values()
        ]

    @app.post("/v1/index", response_model=IndexResponse)
    def personal_index(payload: IndexRequest) -> IndexResponse:
        try:
            return calculate_index(payload)
        except MissingPriceError:
            raise
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error

    return app


app = create_app()
