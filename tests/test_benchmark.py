from datetime import date
from decimal import Decimal

import pytest

from lifebeta import BenchmarkObservation, compare_with_benchmark, select_benchmark_snapshot


def observations() -> tuple[BenchmarkObservation, ...]:
    return (
        BenchmarkObservation(
            "CPI-U", date(2026, 1, 31), date(2026, 2, 10), Decimal("100"),
            "official CPI release", "https://example.gov/cpi/january",
        ),
        BenchmarkObservation(
            "CPI-U", date(2026, 2, 28), date(2026, 3, 10), Decimal("102"),
            "official CPI release", "https://example.gov/cpi/february",
        ),
        BenchmarkObservation(
            "CPI-U", date(2026, 3, 31), date(2026, 4, 10), Decimal("110"),
            "future CPI release", "https://example.gov/cpi/march",
        ),
    )


def test_snapshot_never_uses_a_value_before_its_release_date() -> None:
    snapshot = select_benchmark_snapshot(
        observations(), series_id="CPI-U", as_of=date(2026, 3, 15)
    )
    assert snapshot.observation.period_end == date(2026, 2, 28)
    assert snapshot.observation.level == Decimal("102")


def test_comparison_reports_personal_inflation_gap() -> None:
    comparison = compare_with_benchmark(
        personal_percent_change=Decimal("5"),
        base_as_of=date(2026, 2, 15),
        current_as_of=date(2026, 3, 15),
        series_id="CPI-U",
        observations=observations(),
    )
    assert comparison.benchmark_percent_change == Decimal("2.0000")
    assert comparison.personal_minus_benchmark == Decimal("3.0000")


def test_comparison_refuses_dates_without_a_new_release() -> None:
    with pytest.raises(ValueError, match="newer released period"):
        compare_with_benchmark(
            personal_percent_change=Decimal("1"),
            base_as_of=date(2026, 2, 15),
            current_as_of=date(2026, 3, 1),
            series_id="CPI-U",
            observations=observations(),
        )
