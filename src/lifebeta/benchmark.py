from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal, ROUND_HALF_UP


FOUR_PLACES = Decimal("0.0001")


@dataclass(frozen=True)
class BenchmarkObservation:
    series_id: str
    period_end: date
    released_on: date
    level: Decimal
    source_label: str
    source_url: str

    def __post_init__(self) -> None:
        if not self.series_id.strip() or not self.source_label.strip() or not self.source_url.strip():
            raise ValueError("benchmark provenance fields cannot be empty")
        if self.level <= 0:
            raise ValueError("benchmark level must be positive")
        if self.released_on < self.period_end:
            raise ValueError("benchmark cannot be released before its measurement period ends")


@dataclass(frozen=True)
class BenchmarkSnapshot:
    as_of: date
    observation: BenchmarkObservation


@dataclass(frozen=True)
class InflationComparison:
    series_id: str
    personal_percent_change: Decimal
    benchmark_percent_change: Decimal
    personal_minus_benchmark: Decimal
    base_snapshot: BenchmarkSnapshot
    current_snapshot: BenchmarkSnapshot


class MissingBenchmarkError(ValueError):
    pass


def select_benchmark_snapshot(
    observations: tuple[BenchmarkObservation, ...], *, series_id: str, as_of: date
) -> BenchmarkSnapshot:
    """Use only values that had actually been released by the analysis date."""
    eligible = [
        observation
        for observation in observations
        if observation.series_id == series_id
        and observation.period_end <= as_of
        and observation.released_on <= as_of
    ]
    if not eligible:
        raise MissingBenchmarkError(
            f"no released {series_id} observation is available as of {as_of.isoformat()}"
        )
    selected = max(eligible, key=lambda item: (item.period_end, item.released_on))
    return BenchmarkSnapshot(as_of, selected)


def compare_with_benchmark(
    *,
    personal_percent_change: Decimal,
    base_as_of: date,
    current_as_of: date,
    series_id: str,
    observations: tuple[BenchmarkObservation, ...],
) -> InflationComparison:
    if base_as_of >= current_as_of:
        raise ValueError("base_as_of must be before current_as_of")
    base = select_benchmark_snapshot(observations, series_id=series_id, as_of=base_as_of)
    current = select_benchmark_snapshot(observations, series_id=series_id, as_of=current_as_of)
    if current.observation.period_end <= base.observation.period_end:
        raise ValueError("benchmark comparison requires a newer released period")
    benchmark_change = (
        Decimal("100") * (current.observation.level / base.observation.level - Decimal("1"))
    ).quantize(FOUR_PLACES, rounding=ROUND_HALF_UP)
    personal_change = personal_percent_change.quantize(FOUR_PLACES, rounding=ROUND_HALF_UP)
    return InflationComparison(
        series_id=series_id,
        personal_percent_change=personal_change,
        benchmark_percent_change=benchmark_change,
        personal_minus_benchmark=(personal_change - benchmark_change).quantize(
            FOUR_PLACES, rounding=ROUND_HALF_UP
        ),
        base_snapshot=base,
        current_snapshot=current,
    )
