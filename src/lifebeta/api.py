from __future__ import annotations

import os
from datetime import date
from decimal import Decimal
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from .benchmark import BenchmarkObservation, compare_with_benchmark
from .analytics import (
    MissingPriceError,
    category_point_contributions,
    rank_inflation_drivers,
    select_price_snapshot,
)
from .catalog import Category, marco_catalog
from .index import BasketItem, fixed_basket_index
from .prices import ALLOWED_PROVENANCE, PriceObservation
from .purchasing_power import analyze_purchasing_power
from .store import LifeBetaStore, StoredBasket


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
    ranked_drivers: list["InflationDriverView"]
    current_observation_dates: dict[str, date]
    stale_product_ids: list[str]
    data_status: str


class InflationDriverView(BaseModel):
    category: Category
    point_contribution: Decimal
    share_of_net_change: Decimal | None
    direction: str


class BenchmarkObservationInput(BaseModel):
    series_id: str = Field(min_length=1)
    period_end: date
    released_on: date
    level: Decimal = Field(gt=0)
    source_label: str = Field(min_length=1)
    source_url: str = Field(min_length=1)


class BenchmarkComparisonRequest(BaseModel):
    personal_percent_change: Decimal
    base_as_of: date
    current_as_of: date
    series_id: str = Field(min_length=1)
    observations: list[BenchmarkObservationInput] = Field(min_length=1)


class BenchmarkSnapshotView(BaseModel):
    as_of: date
    period_end: date
    released_on: date
    level: Decimal
    source_label: str
    source_url: str


class BenchmarkComparisonResponse(BaseModel):
    series_id: str
    personal_percent_change: Decimal
    benchmark_percent_change: Decimal
    personal_minus_benchmark: Decimal
    base_snapshot: BenchmarkSnapshotView
    current_snapshot: BenchmarkSnapshotView
    data_status: str


class PurchasingPowerRequest(BaseModel):
    base_portfolio_value: Decimal = Field(gt=0)
    current_portfolio_value: Decimal = Field(ge=0)
    personal_index_level: Decimal = Field(gt=0)


class PurchasingPowerResponse(BaseModel):
    base_portfolio_value: Decimal
    current_portfolio_value: Decimal
    nominal_return_percent: Decimal
    personal_inflation_percent: Decimal
    real_return_percent: Decimal
    inflation_adjusted_required_value: Decimal
    purchasing_power_gap: Decimal
    current_value_in_base_dollars: Decimal
    preserved_purchasing_power: bool
    data_status: str


class BasketSaveInput(BaseModel):
    basket_id: str = Field(min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=200)
    items: list[BasketItemInput] = Field(min_length=1)


class PortfolioSaveInput(BaseModel):
    analysis_id: str = Field(min_length=1, max_length=100)
    base_portfolio_value: Decimal = Field(gt=0)
    current_portfolio_value: Decimal = Field(ge=0)
    personal_index_level: Decimal = Field(gt=0)
    save_totals: bool = False


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
    contributions = category_point_contributions(result, catalog)
    drivers = rank_inflation_drivers(
        contributions, total_point_change=result.level - Decimal("100")
    )
    return IndexResponse(
        base_as_of=payload.base_as_of,
        current_as_of=payload.current_as_of,
        currency=payload.currency.upper(),
        level=result.level,
        percent_change=result.level - Decimal("100"),
        base_cost=result.base_cost,
        current_cost=result.current_cost,
        category_point_contributions=contributions,
        ranked_drivers=[
            InflationDriverView(
                category=driver.category,
                point_contribution=driver.point_contribution,
                share_of_net_change=driver.share_of_net_change,
                direction=driver.direction,
            )
            for driver in drivers
        ],
        current_observation_dates=current.observation_dates,
        stale_product_ids=list(current.stale_product_ids),
        data_status="Calculated from caller-supplied observations; no live prices implied.",
    )


def _basket_json(basket: StoredBasket) -> dict[str, object]:
    return {
        "basket_id": basket.basket_id,
        "name": basket.name,
        "items": [
            {"product_id": item.product_id, "quantity": str(item.quantity)}
            for item in basket.items
        ],
    }


def create_app(database_path: str | Path | None = None) -> FastAPI:
    resolved_path = database_path or os.getenv("LIFEBETA_DATABASE_PATH", "lifebeta.db")
    store = LifeBetaStore(resolved_path)
    store.upsert_products(tuple(marco_catalog().values()))
    app = FastAPI(
        title="LifeBeta API",
        version="0.2.0",
        description="Provenance-aware personal inflation analytics with privacy-bounded storage.",
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

    @app.post("/v1/baskets", status_code=201)
    def save_basket(payload: BasketSaveInput) -> dict[str, object]:
        try:
            basket = store.create_basket(
                payload.basket_id,
                payload.name,
                tuple(
                    BasketItem(item.product_id, item.quantity) for item in payload.items
                ),
            )
        except ValueError as error:
            raise HTTPException(status_code=409, detail=str(error)) from error
        return {
            **_basket_json(basket),
            "privacy": "Only normalized product identifiers and quantities were saved.",
        }

    @app.get("/v1/baskets/{basket_id}")
    def saved_basket(basket_id: str) -> dict[str, object]:
        try:
            return _basket_json(store.basket(basket_id))
        except KeyError as error:
            raise HTTPException(status_code=404, detail="basket not found") from error

    @app.post("/v1/price-observations", status_code=201)
    def save_price_observation(payload: ObservationInput) -> dict[str, object]:
        try:
            observation = PriceObservation(
                product_id=payload.product_id,
                observed_on=payload.observed_on,
                package_price=payload.package_price,
                currency=payload.currency.upper(),
                source_label=payload.source_label,
                provenance_status=payload.provenance_status,
            )
            store.add_price_observation(observation)
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error
        return {
            "product_id": observation.product_id,
            "observed_on": observation.observed_on.isoformat(),
            "package_price": str(observation.package_price),
            "currency": observation.currency,
            "source_label": observation.source_label,
            "provenance_status": observation.provenance_status,
            "privacy": "Only the normalized observation and its provenance were saved.",
        }

    @app.get("/v1/price-observations")
    def saved_price_observations(product_id: str | None = None) -> list[dict[str, str]]:
        return [
            {
                "product_id": item.product_id,
                "observed_on": item.observed_on.isoformat(),
                "package_price": str(item.package_price),
                "currency": item.currency,
                "source_label": item.source_label,
                "provenance_status": item.provenance_status,
            }
            for item in store.price_observations(product_id)
        ]

    @app.post("/v1/index", response_model=IndexResponse)
    def personal_index(payload: IndexRequest) -> IndexResponse:
        try:
            return calculate_index(payload)
        except MissingPriceError:
            raise
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error

    @app.post("/v1/benchmark/compare", response_model=BenchmarkComparisonResponse)
    def benchmark_comparison(
        payload: BenchmarkComparisonRequest,
    ) -> BenchmarkComparisonResponse:
        try:
            result = compare_with_benchmark(
                personal_percent_change=payload.personal_percent_change,
                base_as_of=payload.base_as_of,
                current_as_of=payload.current_as_of,
                series_id=payload.series_id,
                observations=tuple(
                    BenchmarkObservation(
                        series_id=item.series_id,
                        period_end=item.period_end,
                        released_on=item.released_on,
                        level=item.level,
                        source_label=item.source_label,
                        source_url=item.source_url,
                    )
                    for item in payload.observations
                ),
            )
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error

        def snapshot_view(snapshot) -> BenchmarkSnapshotView:  # type: ignore[no-untyped-def]
            observation = snapshot.observation
            return BenchmarkSnapshotView(
                as_of=snapshot.as_of,
                period_end=observation.period_end,
                released_on=observation.released_on,
                level=observation.level,
                source_label=observation.source_label,
                source_url=observation.source_url,
            )

        return BenchmarkComparisonResponse(
            series_id=result.series_id,
            personal_percent_change=result.personal_percent_change,
            benchmark_percent_change=result.benchmark_percent_change,
            personal_minus_benchmark=result.personal_minus_benchmark,
            base_snapshot=snapshot_view(result.base_snapshot),
            current_snapshot=snapshot_view(result.current_snapshot),
            data_status="Compared only with caller-supplied, release-dated benchmark observations.",
        )

    @app.post("/v1/purchasing-power", response_model=PurchasingPowerResponse)
    def purchasing_power(payload: PurchasingPowerRequest) -> PurchasingPowerResponse:
        try:
            result = analyze_purchasing_power(
                base_portfolio_value=payload.base_portfolio_value,
                current_portfolio_value=payload.current_portfolio_value,
                personal_index_level=payload.personal_index_level,
            )
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error
        return PurchasingPowerResponse(
            base_portfolio_value=result.base_portfolio_value,
            current_portfolio_value=result.current_portfolio_value,
            nominal_return_percent=result.nominal_return_percent,
            personal_inflation_percent=result.personal_inflation_percent,
            real_return_percent=result.real_return_percent,
            inflation_adjusted_required_value=result.inflation_adjusted_required_value,
            purchasing_power_gap=result.purchasing_power_gap,
            current_value_in_base_dollars=result.current_value_in_base_dollars,
            preserved_purchasing_power=result.preserved_purchasing_power,
            data_status="Educational calculation from caller-supplied values; not investment advice.",
        )

    @app.post("/v1/portfolio-totals", status_code=201)
    def save_portfolio_totals(payload: PortfolioSaveInput) -> dict[str, object]:
        if not payload.save_totals:
            raise HTTPException(
                status_code=403,
                detail="Portfolio totals remain session-only unless save_totals is explicitly true.",
            )
        try:
            saved = store.save_portfolio_totals(
                payload.analysis_id,
                base_value=payload.base_portfolio_value,
                current_value=payload.current_portfolio_value,
                personal_index_level=payload.personal_index_level,
                consent=payload.save_totals,
            )
        except ValueError as error:
            raise HTTPException(status_code=409, detail=str(error)) from error
        return {
            "analysis_id": saved.analysis_id,
            "base_portfolio_value": str(saved.base_value),
            "current_portfolio_value": str(saved.current_value),
            "personal_index_level": str(saved.personal_index_level),
            "created_at": saved.created_at.isoformat(),
            "privacy": "Only aggregate totals were saved; raw Fidelity rows were not retained.",
        }

    return app


app = create_app()
