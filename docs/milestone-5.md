# Milestone 5: Portfolio Purchasing Power

LifeBeta first explains which spending categories drove a personal price index. This milestone adds the second question: did a portfolio grow enough to preserve the purchasing power of that basket?

## Correct real-return calculation

Simply subtracting inflation from investment return is an approximation. LifeBeta compares compounded growth factors:

```text
real return = ((1 + nominal return) / (1 + personal inflation)) - 1
```

For example, a portfolio rising 10% while a personal basket rises 5% has a real return of approximately 4.76%, not exactly 5%.

## Outputs

- Nominal portfolio return.
- Personal inflation rate.
- Compounded real return.
- Portfolio value required to keep pace with the basket.
- Dollar surplus or shortfall versus that requirement.
- Current portfolio value expressed in base-period purchasing-power dollars.

## Data flow

```text
base portfolio value + current portfolio value
                         +
              personal index level
                         |
                         v
          nominal and inflation factors
                         |
                         v
 real return + required value + purchasing-power gap
```

All values are caller supplied. The result is educational purchasing-power analysis, not investment advice or a recommendation to trade.

## Marco's interview explanation

“I use the personal index as a deflator. Instead of subtracting two percentages, I divide the portfolio growth factor by the personal-inflation factor. The output shows both the real percentage return and the dollar amount by which the portfolio exceeded or missed the value required to preserve purchasing power.”
