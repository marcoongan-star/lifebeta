from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from datetime import date, datetime, timezone
from decimal import Decimal
from pathlib import Path

from .catalog import Category, Product, Unit
from .index import BasketItem
from .prices import PriceObservation


@dataclass(frozen=True)
class StoredBasket:
    basket_id: str
    name: str
    items: tuple[BasketItem, ...]


@dataclass(frozen=True)
class PortfolioTotals:
    analysis_id: str
    base_value: Decimal
    current_value: Decimal
    personal_index_level: Decimal
    created_at: datetime


class LifeBetaStore:
    """Durable normalized data only; raw imports never enter this boundary."""

    def __init__(self, path: str | Path) -> None:
        self.path = str(path)
        self._create_schema()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.path)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        return connection

    def _create_schema(self) -> None:
        with self._connect() as connection:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS products (
                    product_id TEXT PRIMARY KEY,
                    display_name TEXT NOT NULL,
                    category TEXT NOT NULL,
                    comparable_unit TEXT NOT NULL,
                    units_per_package INTEGER NOT NULL CHECK (units_per_package > 0)
                );
                CREATE TABLE IF NOT EXISTS baskets (
                    basket_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS basket_items (
                    basket_id TEXT NOT NULL REFERENCES baskets(basket_id),
                    product_id TEXT NOT NULL REFERENCES products(product_id),
                    quantity TEXT NOT NULL,
                    PRIMARY KEY (basket_id, product_id)
                );
                CREATE TABLE IF NOT EXISTS price_observations (
                    observation_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id TEXT NOT NULL REFERENCES products(product_id),
                    observed_on TEXT NOT NULL,
                    package_price TEXT NOT NULL,
                    currency TEXT NOT NULL,
                    source_label TEXT NOT NULL,
                    provenance_status TEXT NOT NULL,
                    UNIQUE (product_id, observed_on, currency, source_label)
                );
                CREATE TABLE IF NOT EXISTS portfolio_totals (
                    analysis_id TEXT PRIMARY KEY,
                    base_value TEXT NOT NULL,
                    current_value TEXT NOT NULL,
                    personal_index_level TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                """
            )

    def upsert_products(self, products: tuple[Product, ...]) -> None:
        with self._connect() as connection:
            connection.executemany(
                """
                INSERT INTO products VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(product_id) DO UPDATE SET
                    display_name = excluded.display_name,
                    category = excluded.category,
                    comparable_unit = excluded.comparable_unit,
                    units_per_package = excluded.units_per_package
                """,
                [
                    (
                        product.product_id,
                        product.display_name,
                        product.category.value,
                        product.comparable_unit.value,
                        product.units_per_package,
                    )
                    for product in products
                ],
            )

    def products(self) -> tuple[Product, ...]:
        with self._connect() as connection:
            rows = connection.execute(
                "SELECT * FROM products ORDER BY product_id"
            ).fetchall()
        return tuple(
            Product(
                row["product_id"],
                row["display_name"],
                Category(row["category"]),
                Unit(row["comparable_unit"]),
                row["units_per_package"],
            )
            for row in rows
        )

    def create_basket(
        self, basket_id: str, name: str, items: tuple[BasketItem, ...]
    ) -> StoredBasket:
        if not basket_id.strip() or not name.strip() or not items:
            raise ValueError("basket_id, name, and at least one item are required")
        if len({item.product_id for item in items}) != len(items):
            raise ValueError("a product can appear only once per basket")
        if any(item.quantity <= 0 for item in items):
            raise ValueError("basket quantities must be positive")
        try:
            with self._connect() as connection:
                connection.execute(
                    "INSERT INTO baskets VALUES (?, ?, ?)",
                    (basket_id, name, datetime.now(timezone.utc).isoformat()),
                )
                connection.executemany(
                    "INSERT INTO basket_items VALUES (?, ?, ?)",
                    [
                        (basket_id, item.product_id, str(item.quantity))
                        for item in items
                    ],
                )
        except sqlite3.IntegrityError as error:
            raise ValueError("basket already exists or contains an unknown product") from error
        return StoredBasket(basket_id, name, items)

    def basket(self, basket_id: str) -> StoredBasket:
        with self._connect() as connection:
            basket_row = connection.execute(
                "SELECT basket_id, name FROM baskets WHERE basket_id = ?", (basket_id,)
            ).fetchone()
            item_rows = connection.execute(
                "SELECT product_id, quantity FROM basket_items "
                "WHERE basket_id = ? ORDER BY product_id",
                (basket_id,),
            ).fetchall()
        if basket_row is None:
            raise KeyError(basket_id)
        return StoredBasket(
            basket_row["basket_id"],
            basket_row["name"],
            tuple(
                BasketItem(row["product_id"], Decimal(row["quantity"]))
                for row in item_rows
            ),
        )

    def add_price_observation(self, observation: PriceObservation) -> None:
        try:
            with self._connect() as connection:
                connection.execute(
                    """
                    INSERT INTO price_observations
                    (product_id, observed_on, package_price, currency, source_label, provenance_status)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        observation.product_id,
                        observation.observed_on.isoformat(),
                        str(observation.package_price),
                        observation.currency.upper(),
                        observation.source_label,
                        observation.provenance_status,
                    ),
                )
        except sqlite3.IntegrityError as error:
            raise ValueError("duplicate observation or unknown product") from error

    def price_observations(self, product_id: str | None = None) -> tuple[PriceObservation, ...]:
        query = "SELECT * FROM price_observations"
        parameters: tuple[str, ...] = ()
        if product_id is not None:
            query += " WHERE product_id = ?"
            parameters = (product_id,)
        query += " ORDER BY observed_on, observation_id"
        with self._connect() as connection:
            rows = connection.execute(query, parameters).fetchall()
        return tuple(
            PriceObservation(
                product_id=row["product_id"],
                observed_on=date.fromisoformat(row["observed_on"]),
                package_price=Decimal(row["package_price"]),
                currency=row["currency"],
                source_label=row["source_label"],
                provenance_status=row["provenance_status"],
            )
            for row in rows
        )

    def save_portfolio_totals(
        self,
        analysis_id: str,
        *,
        base_value: Decimal,
        current_value: Decimal,
        personal_index_level: Decimal,
        consent: bool = False,
    ) -> PortfolioTotals:
        if not consent:
            raise PermissionError("explicit consent is required to save portfolio totals")
        if not analysis_id.strip() or base_value <= 0 or current_value < 0:
            raise ValueError("valid analysis_id and portfolio totals are required")
        if personal_index_level <= 0:
            raise ValueError("personal_index_level must be positive")
        created_at = datetime.now(timezone.utc)
        try:
            with self._connect() as connection:
                connection.execute(
                    "INSERT INTO portfolio_totals VALUES (?, ?, ?, ?, ?)",
                    (
                        analysis_id,
                        str(base_value),
                        str(current_value),
                        str(personal_index_level),
                        created_at.isoformat(),
                    ),
                )
        except sqlite3.IntegrityError as error:
            raise ValueError("analysis_id already exists") from error
        return PortfolioTotals(
            analysis_id,
            base_value,
            current_value,
            personal_index_level,
            created_at,
        )

    def portfolio_totals(self, analysis_id: str) -> PortfolioTotals:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT * FROM portfolio_totals WHERE analysis_id = ?", (analysis_id,)
            ).fetchone()
        if row is None:
            raise KeyError(analysis_id)
        return PortfolioTotals(
            analysis_id=row["analysis_id"],
            base_value=Decimal(row["base_value"]),
            current_value=Decimal(row["current_value"]),
            personal_index_level=Decimal(row["personal_index_level"]),
            created_at=datetime.fromisoformat(row["created_at"]),
        )

    def table_names(self) -> frozenset[str]:
        with self._connect() as connection:
            rows = connection.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table'"
            ).fetchall()
        return frozenset(row["name"] for row in rows if not row["name"].startswith("sqlite_"))
