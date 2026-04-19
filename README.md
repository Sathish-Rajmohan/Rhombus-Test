# rhombus-qa

Automated QA suite for the Rhombus AI platform — SDET take-home exercise.

## Overview

This repository contains:
- **UI tests** (Playwright + TypeScript) covering the manual transformation end-to-end flow.
- **API tests** (Playwright request fixture) covering auth, upload, pipeline, and download endpoints.
- **Data validation** (Python + pandas) asserting the output CSV matches the committed known-good oracle.

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 20 LTS |
| npm | 10+ |
| Python | 3.11 |

## Clone + Install

```bash
git clone <repo-url> rhombus-qa
cd rhombus-qa
npm ci
npx playwright install --with-deps chromium
```

## Env Setup

```bash
cp .env.example .env
# fill in RHOMBUS_BASE_URL, RHOMBUS_EMAIL, RHOMBUS_PASSWORD
```

## Run UI Tests

```bash
npm run test:ui
```

Runs headless Chromium. On first run, `auth.setup.ts` writes `storageState.json` (gitignored).

## Run API Tests

```bash
npm run test:api
```

## Run Validation

```bash
npm run validate
```

Validates `fixtures/output/expected.csv` against `fixtures/input/messy.csv` using the Python validator. Fully offline — no live app required.

## Run All Suites

```bash
npm run test:all
```

## CI

- `.github/workflows/ci.yml` — runs on push, PR, and manual dispatch.
- `.github/workflows/regression.yml` — runs daily at 06:00 UTC.
- Each job uploads artifacts (HTML report, traces, JUnit XML) retained per the workflow config.

## Artifacts

After a CI run, download from the Actions UI:
- `playwright-report/` — HTML test report with traces
- `junit.xml` — PR annotations
- `validation-report.txt` — per-assertion failure log

## Troubleshooting

1. **`storageState.json` not found** — run `npm run test:ui` once; the setup project generates it.
2. **Login fails** — verify `RHOMBUS_EMAIL` and `RHOMBUS_PASSWORD` in `.env` against the live app.
3. **Download event never fires** — ensure `RHOMBUS_BASE_URL` uses `https://` and the account has a valid session.
4. **Python validator not found** — activate the venv: `source .venv/bin/activate` (Linux/Mac) or `.venv\Scripts\activate` (Windows).
5. **Port / CORS errors in API tests** — check that `RHOMBUS_BASE_URL` does not have a trailing slash.

## Regenerating the Oracle CSV

1. Log in to the Rhombus AI app manually.
2. Upload `fixtures/input/messy.csv`.
3. Apply "Remove Duplicate Rows" then "Standardize Text Columns" (trim + lowercase email/country).
4. Download the result.
5. Replace `fixtures/output/expected.csv` with the downloaded file.
6. Commit with message `fix(fixtures): regenerate oracle csv — human verified <date>`.
7. Record the new commit SHA in this README under "Oracle Commit".

**Oracle Commit:** _TBD after first manual run_

## Demo Video

_Link TBD — will be an unlisted YouTube or Loom recording._

## Project Structure

```
rhombus-qa/
├── .github/workflows/    CI/CD workflows
├── tests/
│   ├── ui/               Playwright UI tests + page objects
│   ├── api/              Playwright API tests
│   └── shared/           Shared env loader + path helpers
├── validation/           Python data validator
├── fixtures/
│   ├── input/            messy.csv (committed input)
│   └── output/           expected.csv (committed oracle)
├── playwright.config.ts  Playwright configuration
└── package.json          npm scripts
```

## License

MIT
