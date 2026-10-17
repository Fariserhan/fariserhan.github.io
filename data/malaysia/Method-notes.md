# Malaysia household income and prices: learn it, then rebuild it

## What this project asks

Did the middle household's income keep up with prices, and how does the answer vary by state? The six questions use official DOSM aggregates, not personal records. Treat the three federal territories as states for convenience: there are sixteen areas in each recent state comparison.

The headline measure is **median gross monthly household income**: sort households by income and take the middle value. Gross means before deductions; household means everyone sharing that household, not one employee. **Mean** means total income divided by household count. We use it only to examine the mean–median gap and to compare with mean expenditure.

**CPI**, the Consumer Price Index, tracks changes in a representative basket's prices. **Nominal** means money in that year's prices. **Real** means adjusted for price changes. **2010 = 100** is the original CPI base: the average base-year basket has index 100; January alone need not be 100. Here real income = nominal income × 100 / CPI, expressed in 2010 RM.

This does not identify the cheapest state or the best place for one family to live. State CPI tracks price change within a state, not the price-level difference between two states. Spending differences also reflect household size and choices.

## Run the project in Windows PowerShell

Open PowerShell and paste these commands. No packages or internet connection are needed to rebuild this frozen snapshot.

```powershell
Set-Location './data-project'
python run_all.py
python check.py
```

If Python is already on your PATH, the last two commands can be `python run_all.py` and `python check.py`. A successful check prints two PASS lines. A failed check raises an error; read its last line before changing anything. Do not delete checks merely to get PASS.

`run_all.py` rebuilds `malaysia.db`, executes the six SQL files in order, writes JSON and CSV outputs, copies the map, and regenerates `FINDINGS.md`. It overwrites these generated outputs. It leaves original raw files untouched. `load.py` alone rebuilds just the database and prints counts.

**SQLite** is a small database stored in one file. **SQL** is the language used to ask that database questions. A **table** is a set of rows with named columns. A **query** is one SQL request returning rows. You do not need a database server, paid service, pandas or new installations. The scripts use Python's built-in tools.

## Where everything lives

| Item | Location relative to this folder | Purpose |
|---|---|---|
| Original input snapshot | `../data/raw/` | Existing DOSM CSVs; never edited by the scripts |
| Extra official inputs | `sources/cpi_annual.csv`, `sources/mcoicop.csv` | Early national CPI and official category names |
| Input fingerprint | `sources/manifest.json` | SHA-256 file hashes: fingerprints that detect any changed input |
| Database | `malaysia.db` | Nine source tables; only files needed by these questions |
| Questions | `sql/01_...sql` through `sql/06_...sql` | One commented query per question |
| Website/Power BI outputs | `../site/data/malaysia/` | Six result CSVs, six JSON envelopes, metadata sidecars and map |
| Verified conclusions | `FINDINGS.md` | Headline sentences generated from exported rows |

The **grain** means what one row represents. Income and poverty tables contain one state and observation date per row. Monthly state CPI contains one state, month and division per row. National income has no state column; it represents Malaysia, with historical coverage caveats. Never join monthly CPI straight to income on state alone: that repeats the income record for every month and division.

Dates written as January 1 in income data label a survey year, not January income. Monthly CPI dates use the first day to label a month. Missing numeric cells load as SQL `NULL`, meaning unknown or unavailable. Missing is not zero. Category codes are text so `01` stays `01`.

The raw directory contains extra district and inflation files. They are not loaded because none of these six questions needs them. Source ids, catalogue links, direct download links and the licence are carried in each result's `meta` block. A JSON **envelope** here means an object with `meta` for explanations and `data` for result rows. CSV files have only rows; the matching `.meta.json` preserves their explanations.

## Run one SQL file yourself

Read `sql/01_real_income_growth.sql` first. It explains SELECT, WHERE, GROUP BY, JOIN, WITH and window functions at their first appearance. You can study and edit the query in any text editor, rerun the pipeline and compare results. Keep your practice changes separate from the numbered final queries if you want to preserve the verified findings.

To run just Q1 without exporting anything, use this command from this folder. This is an optional learning command, not a prerequisite.

```powershell
python -c "import sqlite3; from pathlib import Path; c=sqlite3.connect('malaysia.db'); c.row_factory=sqlite3.Row; print(*[dict(r) for r in c.execute(Path('sql/01_real_income_growth.sql').read_text(encoding='utf-8'))], sep='\n')"
```

For a first small edit, copy a query into `practice.sql`, simplify it, and replace the filename in that command with `practice.sql`. Avoid changing the originals until you can explain their results. SQLite already supports the window functions used here.

## Q1: real median income growth

Open `sql/01_real_income_growth.sql`. Its three named steps are **CTEs** (Common Table Expressions): temporary named results inside one query.

1. `annual_cpi` keeps `division = 'overall'`, extracts the year from the date and averages monthly CPI for each state and year. `COUNT(*)` counts rows; `HAVING COUNT(*) = 12` requires a full year. `check.py` also verifies distinct months.
2. `adjusted` joins income to CPI on **both state and year**. A join means matching rows from two results using shared keys. `CAST` changes a value's type; it keeps the year comparison explicit. Only the three endpoint years are needed.
3. `real_income` divides median income by CPI and multiplies by 100. Keep the unrounded numbers during arithmetic.
4. `growth` joins the adjusted result to itself: one copy for the starting observation, one for the ending observation. An **alias** is a short name for a table or expression, such as `a` and `b`.
5. Compute cumulative growth as `(end / start - 1) × 100`. This is the total change over the interval, not growth per year.
6. `RANK() OVER (...)` ranks rows without deleting them. A **window function** computes over related rows while retaining each row. `PARTITION BY start_year` creates a separate ranking for each period. Ranking uses unrounded growth; equal true values share a rank.

Read `real_growth_pct` beside `nominal_growth_pct`. Inflation can make the real gain smaller even though nominal income rises. The output has two observations per state. Use the start-year filter before ranking or charting. Do not describe a higher real-income level as proof that one state's prices are lower.

## Q2: mean–median gap and Gini

Open `sql/02_mean_median_gap.sql`.

1. Keep the four selected income survey years.
2. Match inequality records on state **and date**, so the Gini describes the same area and observation.
3. Subtract median from mean for the RM gap. Divide mean by median for the ratio. Subtract one and multiply by 100 for the gap relative to median.
4. Rank the ratio separately within each year. Look at `gini` alongside it; do not claim the ratio equals the Gini or that their rankings must match.

**Gini** summarises income inequality on a scale from zero (equality) toward one (greater inequality). A mean above the median is consistent with a right-skewed income distribution: some high incomes pull up the average. Aggregates do not reveal the full distribution. A scatter plot of ratio against Gini can show an association, not its cause. Ratios are exported to three decimals, Gini to three, percentages to one.

## Q3: income less expenditure

Open `sql/03_income_less_expenditure.sql`.

1. Read the combined state HIES table, which has both mean income and mean expenditure.
2. Keep the two available years. Calculate their difference in current-year RM per month.
3. Divide expenditure by income to describe the expenditure share of mean gross income.
4. Sort by the difference within each year. Filter one year in a chart so states appear once.

Only mean consumption expenditure exists here. A median-income-minus-mean-spending calculation would mix two different summaries and cannot describe the median household's surplus. Mean-to-mean is the defensible aggregate comparison, but it still is not household savings: the income measure is gross, the expenditure measure is consumption, and the source is aggregated. We have not calculated disposable income or followed the same household over time.

## Q4: poverty changes

Open `sql/04_poverty_change.sql`.

1. Keep the reported absolute poverty rate. **Absolute poverty** means income below the official Poverty Line Income, a basic-needs threshold.
2. Exclude the exceptional estimate from the survey-to-survey history. Also exclude early Labuan rows that contain only relative poverty: they are not absolute-poverty observations.
3. Sort observations by date within each state. `LAG` reads the preceding available observation's year and rate. Gaps in years remain gaps.
4. Subtract the previous rate from the current rate. This yields **percentage points**, the arithmetic difference between two percentages; it is not percentage growth.
5. Use `CASE` (a conditional choice) to withhold changes crossing the poverty-definition break. The raw older rate is retained; it is not silently substituted with a revised rate.

The first observation has no previous rate. A null change can also mark the definition break. Consult `comparability` before interpreting any row. Older observations are supplied for context with an explicit limited-comparability label, not as proof of an uninterrupted comparable trend. For a main portfolio chart, use recent survey years and carry the definition caveat.

## Q5: category price changes

Open `sql/05_price_categories.sql`.

1. `UNION ALL` stacks state CPI and official national CPI into one temporary result. It does not average the states; Malaysia's official series is kept separately.
2. Exclude overall CPI so it is not ranked against its component categories.
3. Average a complete set of monthly values for each area, category and endpoint year. The endpoint is fixed to match the income questions, even though newer monthly data exists.
4. Join the two annual results on area **and division**. Compute the percentage change.
5. Join `mcoicop` on the division code and restrict `digits = 2`. The dictionary includes more detailed rows; forgetting this filter would multiply records.
6. Rank price growth within each area. `division_name` is the official English description; keep the original code as text.

The lookup resolves the category-name TODO in the original notes. The original CPI base is confirmed by DOSM metadata. Category growth is not contribution to overall inflation: a fast-rising category can have a small basket weight. This query does not use weights. Category definitions are those of the current published DOSM series; do not splice in a different older classification yourself.

## Q6: national history and predict-then-reveal

Open `sql/06_national_long_view.sql`.

1. Use national median consistently: every national income observation supplies it. There is no need to switch to mean.
2. Join the official **annual** overall CPI on date. The supplied monthly national CPI starts too late; the extra annual input covers the early income years.
3. Produce nominal and real median income. National annual CPI is published at one decimal, so small differences from averages of rounded monthly data are expected. Use one source consistently for this chart.
4. Keep the actual observation years; annotate geographical coverage, population scope and the exceptional estimate using the supplied fields.

The chart's early geographical coverage is narrower and later coverage switches to citizens only. Do not call the endpoint ratio a perfectly comparable increase in living standards. A line connects observations visually; it does not mean a new survey happened in every intervening year.

For a portfolio interaction, initially show the earlier actual points, ask the visitor to imagine the later path, then reveal all observations with a button. This is a learning interaction, not a statistical forecast. The JSON supplies actual values and annotations; it does not implement a website or train a model.

## How to trust and refresh this work

`check.py` checks source row counts, unique keys, missing-value rules, monthly completeness, state coverage, shared income values, JSON/CSV parity and input fingerprints. It independently recomputes the leading real-growth, income–expenditure and national category-growth results directly from raw CSVs using plain Python, then checks every real-growth result and national real-income point. A second calculation reduces the risk of a SQL mistake; it cannot prove the original survey itself is error-free.

Numbers are rounded only at export: monetary amounts to whole RM, percentages and percentage-point changes to one decimal, CPI/ratios/Gini to three decimals. Do not recompute exact growth from rounded exported amounts; use the raw inputs or rerun SQL.

For an intentional future refresh, first make a separate project copy. Download official replacement files, update expected row counts in `load.py`, review date coverage and methods, and create a new manifest in that copy. The current run refuses changed inputs rather than silently changing a supposedly fixed snapshot. Update snapshot dates and endpoint choices deliberately, rerun checks, and review every headline and guide expectation. Never edit raw observations just to make a check pass.

Statistical data is **CC BY 4.0**: credit DOSM, link the sources and licence, and state that aggregation/deflation was performed. Boundaries: OpenDOSM (Department of Statistics Malaysia), MIT licence. The map uses a simplified copy of `states_opendosm_state_map.json` published in `github.com/dosm-malaysia/opendosm-front`. State names match the result JSON. Peninsular Malaysia and Borneo are fitted separately, not to a common scale; call-out circles enlarge Kuala Lumpur, Putrajaya and Labuan for interaction. Geographic area does not encode household count.

## Five practice exercises

1. In a copy of Q1, filter the final result to the later start year. Which state leads, and what is its real growth?
2. In Q2, filter to the latest year and the largest ratio. What are the state, ratio and Gini? Explain why the ratio is not the Gini.
3. In Q3, keep the latest year and sort the mean income–expenditure gap from largest to smallest. Which state leads? Why must you avoid calling it savings?
4. In Q4, show rows whose `comparability` says the definition break. How many rows are there? Why is `change_pp` null?
5. In Q5, keep Malaysia and the food, housing and transport codes. Sort growth descending. Which rose fastest, and by how much did transport rise? Why does this not tell you inflation contributions?

Try first, then open the answers below. Each answer can be checked against the CSV output, without installing anything.

## Explain it in an interview

**A 60-second version, after you have personally rebuilt and understood it:**

“I studied Malaysian household income and price changes using official DOSM open data. I loaded frozen CSV files into SQLite and used six SQL queries to analyse median income growth, the mean–median gap, spending, poverty and CPI categories. I adjusted income with each state's own annual-average CPI and checked the results using independent Python calculations. I kept median income as the headline and used mean income only where the comparison required it. I also flagged a poverty-definition break and historical coverage changes rather than hiding them. The outputs are reusable CSV and JSON, with source links and limitations. My next step is to rebuild the charts in Power BI and explain each query without relying on the guide.”

Use this as a study goal, not a claim that you have already independently completed every step. Do not claim Power BI completion until you have actually rebuilt the report.

| Likely question | Honest answer |
|---|---|
| Why median? | It describes the middle household and is less affected by very high incomes than the mean. It still ignores household size. |
| How did you adjust for inflation? | Divide income by the corresponding annual overall CPI and multiply by the base value; for states, average the complete monthly state series first. |
| What was the hardest join? | Matching income and CPI at the same area and year, then matching category endpoints on both area and code. Missing a key repeats rows. |
| Why not compare state CPI levels? | The indices track local price changes relative to a base, not a common RM cost for an identical household across states. |
| Why not use median income minus spending? | Spending is only available as a mean, so that difference cannot represent the median household's remaining money. |
| What did you validate? | Counts, unique keys, missingness, complete monthly coverage, all recent state combinations, source agreement and independent raw-data calculations. |
| What does the poverty null mean? | Either the first available observation or a definition break, identified by the accompanying label. Never zero poverty. |
| Can this prove a policy worked? | No. These are descriptive aggregates, with no causal design or individual longitudinal records. |
| Did you build the Power BI report? | Only say yes after doing the practice. Until then: I prepared chart-ready exports and am rebuilding the report myself. |
| What would improve it? | Examine survey uncertainty and household composition, and research comparable poverty revisions before expanding historical comparisons. |

## Hidden exercise answers

<details>
<summary>Open after attempting all five</summary>

1. Selangor, 16.9% real median growth in 2019–2024. Add a final `WHERE start_year = 2019` to the copied Q1 before its final `ORDER BY`.
2. Sabah: mean/median ratio 1.329 and Gini 0.405 in 2024. The ratio compares two summaries; Gini uses the distribution's inequality more broadly.
3. Selangor: RM6,030 per month in 2024. Gross income less consumption expenditure is an aggregate gap; deductions, the household distribution and other flows are not accounted for.
4. Sixteen rows. The change crossing into the newer poverty definition is withheld; comparing the two definitions as though unchanged would mislead.
5. Food & Beverages rose fastest: 16.5% over 2019–2024. Transport rose 6.7% and housing/utilities/fuels 6.4%. Basket weights would be needed to calculate contributions.

</details>
