from decimal import Decimal

from lifebeta import BasketItem, fixed_basket_index


def test_fixed_basket_index_and_contributions_reconcile() -> None:
    basket = (
        BasketItem("chipotle", Decimal("2")),
        BasketItem("gym", Decimal("1")),
        BasketItem("bars", Decimal("8")),
    )
    base = {"chipotle": Decimal("10"), "gym": Decimal("30"), "bars": Decimal("2.50")}
    current = {"chipotle": Decimal("11"), "gym": Decimal("33"), "bars": Decimal("2.75")}
    result = fixed_basket_index(basket, base, current)

    assert result.base_cost == Decimal("70.00")
    assert result.current_cost == Decimal("77.00")
    assert result.level == Decimal("110.0000")
    assert sum(result.point_contributions.values(), start=Decimal("0")) == Decimal("10.0000")


def test_missing_product_price_is_rejected() -> None:
    basket = (BasketItem("jersey", Decimal("1")),)
    try:
        fixed_basket_index(basket, {"jersey": Decimal("90")}, {})
    except ValueError as error:
        assert "jersey" in str(error)
    else:
        raise AssertionError("missing price should fail")

