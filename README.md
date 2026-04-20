# Rhombus AI - QA Automation Suite

Automated test suite for the [Rhombus AI](https://rhombusai.com) data-transformation platform. Produced as an SDET take-home exercise.

The deliverable follows the spec's "quality over quantity" principle: one excellent end-to-end UI flow, a small set of tightly-scoped black-box API tests, and a rigorous offline data-validation layer.

---

## What is in the box

| Suite              | Tool                         |          Tests | What it proves                                                                                                                                                    |
| ------------------ | ---------------------------- | -------------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ui-tests/`        | Playwright + TypeScript      | 1 full journey | A logged-in user can drive the live Rhombus AI workflow from chat prompt -> pipeline run -> CSV download, and the downloaded CSV passes every transformation rule |
| `api-tests/`       | Playwright `request` fixture |              7 | Auth, session, and dataset upload with explicit negative cases return the documented status codes                                                                 |
| `data-validation/` | Python + pandas + pytest     |              9 | 11 output-only rules + 4 input-vs-output correlation rules, plus seven negative tests proving each rule catches regressions                                       |

The UI test calls the Python validator on its own downloaded CSV with both `--input messy.csv` and `--output <artifact>`, so the full rule set (including input correlation) enforces correctness across the live browser flow and the offline suite from a single source of truth.

All three suites are runnable from a single `npm ci` + `pip install`. Everything that touches credentials reads from `.env`; no secrets are ever committed.

---

## Repository layout

```
Rhombus-Test/
|-- ui-tests/                          Playwright UI suite (single E2E spec)
|   |-- auth.setup.ts                  One-off login -> storageState.json (gitignored)
|   |-- fixtures.ts                    Shared test setup (artifacts dir)
|   |-- ai-pipeline.spec.ts            Full journey + validator call on downloaded CSV
|   `-- pages/                         Page Object Model
|       |-- LoginPage.ts
|       |-- DashboardPage.ts
|       |-- TransformPage.ts
|       `-- PreviewPage.ts
|
|-- api-tests/                         Black-box REST tests
|   |-- auth.spec.ts                   Session + profile (positive and negative)
|   |-- upload.spec.ts                 Upload positive + 2 negatives
|   `-- helpers/
|       |-- endpoints.ts               Endpoint and field-name constants
|       |-- request-context.ts         Bearer-token auth context builder
|       `-- project-helpers.ts         Cleanup helper used by the UI spec
|
|-- data-validation/                   Offline validator against committed CSVs
|   |-- validate_output.py             CLI: exits 0 on pass, 1 on failure
|   |-- schema.py                      Expected columns, dtypes, not-null columns
|   |-- rules.py                       Row counts, invariants, tolerances
|   |-- requirements.txt               Pinned Python deps
|   |-- pytest.ini
|   `-- tests/test_validate_output.py  1 positive + 5 negative mutation tests
|
|-- fixtures/
|   |-- input/messy.csv                15 rows; 2 duplicates; mixed casing/whitespace
|   `-- output/expected.csv            13-row oracle derived from messy.csv
|
|-- shared/                            Cross-suite helpers (env loading, paths)
|-- .github/workflows/                 ci.yml (PR + push) + regression.yml (nightly)
|-- playwright.config.ts               3 projects: setup, ui, api
|-- package.json
|-- tsconfig.json                      strict + noUncheckedIndexedAccess
`-- README.md                          This file
```

---

## Prerequisites

| Tool    | Version | Check              |
| ------- | ------- | ------------------ |
| Node.js | 20 LTS  | `node --version`   |
| npm     | 10+     | Ships with Node 20 |
| Python  | 3.11+   | `python --version` |
| Git     | any     | `git --version`    |

Developed on Windows 11; CI runs `ubuntu-latest`. All file paths use `path.resolve`/`pathlib`; there are no hardcoded separators.

---

## Install

```bash
git clone <repo-url> Rhombus-Test
cd Rhombus-Test

# Node deps (pinned via package-lock.json)
npm ci

# Playwright's Chromium + OS dependencies
npx playwright install --with-deps chromium

# Python venv + data-validation deps
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux / macOS:
source .venv/bin/activate

pip install -r data-validation/requirements.txt
```

---

## Configure

Copy the template and fill in a test account:

```bash
cp .env.example .env
```

`.env` keys:

```ini
RHOMBUS_BASE_URL=https://rhombusai.com
RHOMBUS_API_URL=https://api.rhombusai.com
RHOMBUS_EMAIL=your-test-account@example.com
RHOMBUS_PASSWORD=your-password

# OPTIONAL: reuse an existing project instead of creating a new one each run.
# Helpful if the account has already hit the 3-project free-plan cap.
RHOMBUS_TEST_PROJECT_ID=1234
```

`.env` is gitignored. In CI the same keys are injected from GitHub repository secrets.

---

## Run

| Command            | What it does                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------- |
| `npm run test:ui`  | Logs in once (if needed), then runs the single end-to-end UI test                           |
| `npm run test:api` | Runs all 7 API tests against the live REST backend (about 15 s)                             |
| `npm run validate` | Runs the Python validator + pytest wrapper against `fixtures/output/expected.csv` (offline) |
| `npm run test:all` | Setup -> UI -> API (same order as CI)                                                       |
| `npm run lint`     | ESLint over all `.ts` source, zero-warning gate                                             |
| `npx tsc --noEmit` | TypeScript typecheck                                                                        |

### Debugging the UI test

```bash
# Headed with Playwright Inspector
npx playwright test --project=ui --headed

# Playwright UI (time-travel debugger)
npx playwright test --project=ui --ui
```

HTML reports go to `playwright-report/`; JUnit XML to `junit.xml` (both gitignored).

---

## Design notes

### UI test: Option A (AI Pipeline Flow)

The spec allows either the AI-pipeline flow or a manual-transformation flow. Rhombus AI is fundamentally an AI-driven product, so Option A is the natural critical journey.

The test lives in `ui-tests/ai-pipeline.spec.ts` and drives the full browser flow: create project through the sidebar modal, attach `messy.csv` through the chat composer, send a natural-language prompt, wait for the LLM to build the pipeline on the canvas, run it, open the output node preview, and download the CSV.

Assertions:

- Workflow canvas and chat textarea load.
- CSV attaches (file chip appears in the composer).
- LLM-built pipeline appears (Run button becomes active).
- Pipeline runs and the Download button becomes available.
- Downloaded CSV has the expected header and 13 rows.
- Downloaded CSV passes the Python data validator (all 11 row-level transformation rules).

The validator is invoked as a subprocess on the live download via `python data-validation/validate_output.py --output <artifact>`, so the exact same rules used offline in CI also gate the live UI run. The downloaded CSV is persisted to `artifacts/ui-output-<timestamp>.csv` and uploaded as a CI artifact for post-mortem.

Selectors follow the priority ladder: `getByTestId` first (the live app exposes `data-testid="run-pipeline"`), then `getByRole`/`getByLabel`, with scoped CSS only for third-party classes whose names are public contracts (`react-flow__node`, `lucide-*`).

### API tests: black-box, status-code driven

| Test                  | Type     | What it asserts                                                                  |
| --------------------- | -------- | -------------------------------------------------------------------------------- |
| Session endpoint      | positive | `/api/auth/session` returns a JWT accessToken                                    |
| Authed profile        | positive | `GET /api/accounts/users/profile` with a Bearer token returns 200 + user fields  |
| Unauth profile        | negative | Same endpoint without Authorization returns 401 or 403                           |
| Upload                | positive | `POST /api/dataset/datasets/temp/upload` with messy.csv returns 200 + numeric id |
| Upload no file        | negative | Same endpoint with no file attached returns 4xx                                  |
| Upload bad header row | negative | Same endpoint with `column_header_row=0` returns a non-2xx error                 |

The spec asks for "at least two tests from auth, upload, pipeline status, download, error handling, with at least one negative test." This suite covers two categories (auth + upload), includes three negative tests, and completes in about 15 seconds.

Pipeline run and download are not tested at the API layer because they depend on a stateful LLM pipeline-build step that is non-deterministic (the LLM sometimes returns a textual plan rather than persisted nodes). The UI test exercises this journey end-to-end in the real browser where it is deterministic.

### Data validation

`data-validation/validate_output.py` runs two layers of assertions:

**Output-only rules (always run):**

- Column names and order match schema.
- Not-null columns contain no nulls.
- Row count equals 13.
- `id` values are unique.
- No fully duplicate rows.
- Every email matches the regex and is lowercase.
- Every country is uppercase and trimmed.
- No leading/trailing whitespace in any text column.
- No negative amounts (tolerance = 1e-6).
- `signup_date` is in `YYYY-MM-DD` format.
- `id` and `amount` are numerically coercible.

**Input-vs-output correlation (when `--input` is supplied):**

- Post-dedup input row count equals output row count (catches drop-all or no-dedup pipelines).
- Every input id is present in output (catches silent row loss).
- Every output id exists in input (catches fabricated rows).
- Every normalized input email survives to output.

The UI test passes both `--input fixtures/input/messy.csv` and the live-downloaded `--output <artifact>` so the full set of rules enforces correctness on whatever the AI actually produced. The pytest wrapper runs the positive case against the committed oracle plus seven negative cases (duplicate rows, uppercase email, lowercase country, wrong columns, negative amount, fabricated output id, missing output id) to prove every rule actually catches regressions.

#### Two correctness boundaries

The suite has two separate correctness boundaries that share one rule set:

| Boundary                 | Where                                        | Input                                          | What it proves                                                                                                                 | Runtime                  |
| ------------------------ | -------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------ |
| **Rule correctness**     | `validate` CI job + local `npm run validate` | Committed `messy.csv` and `expected.csv`       | The 15 validation rules are themselves correct; the 7 pytest mutation tests all catch the defects they target                  | about 2 s                |
| **Pipeline correctness** | `test-ui` CI job + local `npm run test:ui`   | Live-downloaded `artifacts/ui-output-<ts>.csv` | The Rhombus AI pipeline (LLM + workflow engine) still produces output that satisfies those rules against the user's real input | 5-10 min (LLM dominates) |

Running only the first boundary would let product regressions through. Running only the second would give slow, noisy feedback on rule-code changes. Both layers call the same `validate_output.py` so there is a single source of truth for what "correct output" means; the cost and speed trade-off is made at the job level, not by duplicating rules.

---

## CI

### `.github/workflows/ci.yml` (push + PR)

1. `lint-format`: ESLint, Prettier, Python pytest collect-only, guard for committed `storageState.json`.
2. `test-api`: Playwright API project.
3. `test-ui`: Playwright UI project (headless Chromium).
4. `validate`: Python validator against `fixtures/output/expected.csv` (offline).
5. `report-aggr`: summary and gating.

Artefacts per run: `playwright-report/`, `test-results/` (traces, videos, screenshots), `junit.xml`.

### `.github/workflows/regression.yml` (nightly, 06:00 UTC)

Same jobs. The UI job uses `continue-on-error: true` and opens a `prod-drift` labelled GitHub Issue on failure so the team is alerted to app-side drift without blocking CI.

Secrets required: `RHOMBUS_BASE_URL`, `RHOMBUS_API_URL`, `RHOMBUS_EMAIL`, `RHOMBUS_PASSWORD`, and optional `RHOMBUS_TEST_PROJECT_ID`.

---

## Demo video

A short walkthrough showing a local run of all three suites and a successful CI run.

Video link: https://youtu.be/E6_A7IwYjZg

---

## Troubleshooting

- **`storageState.json not found`**: run `npx playwright test --project=setup`, or any `npm run test:*` which depends on setup. The file is generated automatically on first login.
- **`Free plan project limit reached (3/3)`**: delete an old test project at [rhombusai.com](https://rhombusai.com) or set `RHOMBUS_TEST_PROJECT_ID=<id>` in `.env` to reuse an existing one.
- **UI test hangs while waiting for the pipeline**: the LLM can take 15-30 s to emit nodes. The 5-minute ceiling accommodates this, but a completely empty dataset or throttled network can push it over. Confirm manually that the account can drive the pipeline end-to-end.
- **API test returns 429**: the upload endpoint rate-limits aggressive retries. `upload.spec.ts` retries once, honoring the server's `Retry-After` header (RFC 7231, delta-seconds or HTTP-date), clamped to 30 s, with a 5 s fallback when the header is absent. If you hit this repeatedly, wait 60 s.
- **Python validator says "cannot import validate_output"**: activate the virtualenv (`.venv\Scripts\activate` on Windows, `source .venv/bin/activate` elsewhere) and install deps from `data-validation/requirements.txt`.
