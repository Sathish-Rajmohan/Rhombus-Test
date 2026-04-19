# decisions.md — execution-time decisions

All major decisions M1–M20 and minor decisions N1–N14 are pre-resolved in PLAN.md.
This file records only decisions made during coding that were not already covered.

| # | decision | classification | what was chosen | why | what was rejected |
|---|---|---|---|---|---|
| E1 | Python venv package versions | minor | pandas 3.0.2, pytest 9.0.3, numpy 2.4.4 (latest at install time) | requirements.txt with older pins (pandas==2.2.3) failed metadata-generation on the local Python build; installed latest stable and pinned those; determinism preserved by exact == pins | pinned older versions — caused pip build failure on current Python |
| E2 | ESLint rule name correction | minor | `playwright/no-focused-test` (singular) | `playwright/no-focused-tests` (plural) does not exist in eslint-plugin-playwright 1.6.2; discovered by running lint and checking available rules list | `no-focused-tests` (plural) — does not exist in this plugin version |
| E3 | Project root location | minor | `d:\Rhombus\Rhombus-Test\` | existing `Rhombus-Test` directory was already present and empty inside the workspace; used it as the project root instead of creating a new `rhombus-qa` subdirectory | creating a new `rhombus-qa` subdirectory — unnecessary nesting |
