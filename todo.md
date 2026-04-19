# todo.md — execution tracking

## phase 0 — repo and environment setup

- [x] 0-1: create .gitignore with entries from n12
- [x] 0-2: add README.md skeleton with section headers
- [x] 0-3: npm init + install pinned dev deps
- [x] 0-4: run npx playwright install --with-deps chromium
- [x] 0-5: create tsconfig.json (strict, noUncheckedIndexedAccess, path alias)
- [x] 0-6: create .eslintrc.cjs (eslint:recommended + @typescript-eslint + playwright plugin)
- [x] 0-7: create .prettierrc (printWidth:100, singleQuote, trailingComma:all)
- [x] 0-8: create .env.example (RHOMBUS_BASE_URL, RHOMBUS_EMAIL, RHOMBUS_PASSWORD)
- [x] 0-9: create tests/shared/env.ts (dotenv loader, throws on missing keys)
- [x] 0-10: create tests/shared/paths.ts (fixture + artifact path helpers)
- [x] 0-11: create playwright.config.ts (three projects: setup, ui, api)
- [x] 0-12: create python venv + validation/requirements.txt (pandas, pytest pinned)
- [x] 0-13: create validation/pytest.ini (-ra --strict-markers, testpaths=tests)
- [x] 0-14: add npm scripts (test:ui, test:api, test:all, lint, format, validate)
- [x] 0-15: verify npm run lint passes on scaffold
- [ ] 0-16: git init + first commit (chore: repo scaffold) [added during execution]

## phase 1 — ui tests

- [ ] 1-1: create fixtures/input/messy.csv (exact 15-row spec from plan)
- [ ] 1-2: write tests/ui/pages/LoginPage.ts
- [ ] 1-3: write tests/ui/auth.setup.ts (login + storageState)
- [ ] 1-4: write tests/ui/pages/DashboardPage.ts
- [ ] 1-5: write tests/ui/pages/UploadPage.ts
- [ ] 1-6: write tests/ui/pages/TransformPage.ts (STUB — awaits live app data)
- [ ] 1-7: write tests/ui/pages/PreviewPage.ts
- [ ] 1-8: write tests/ui/fixtures.ts (authedPage + tmpDownloadDir)
- [ ] 1-9: write tests/ui/manual-transformation.spec.ts
- [ ] 1-10: run ui test locally headed then headless; fix flake

## phase 2 — api tests

- [ ] 2-1: record network traffic / extract endpoints from devtools
- [ ] 2-2: create tests/api/helpers/endpoints.ts (STUB — awaits live app data)
- [ ] 2-3: create tests/api/helpers/request-context.ts
- [ ] 2-4: write tests/api/auth.spec.ts
- [ ] 2-5: write tests/api/upload.spec.ts
- [ ] 2-6: write tests/api/pipeline.spec.ts
- [ ] 2-7: write tests/api/download.spec.ts
- [ ] 2-8: run npm run test:api locally; verify green

## phase 3 — data validation

- [ ] 3-1: manually run ui flow, download output csv, commit as fixtures/output/expected.csv
- [ ] 3-2: write validation/schema.py
- [ ] 3-3: write validation/rules.py
- [ ] 3-4: write validation/validate_output.py (cli entry point)
- [ ] 3-5: write validation/tests/test_validate_output.py (positive + negative pytest)
- [ ] 3-6: run pytest validation/ locally; verify green

## phase 4 — ci/cd pipeline

- [ ] 4-1: create .github/workflows/ci.yml
- [ ] 4-2: add repo secrets in github (RHOMBUS_EMAIL, RHOMBUS_PASSWORD, RHOMBUS_BASE_URL)
- [ ] 4-3: add branch protection rule on main
- [ ] 4-4: push draft pr; iterate until green
- [ ] 4-5: create .github/workflows/regression.yml (nightly cron)
- [ ] 4-6: confirm artifacts upload and downloadable from actions ui

## phase 5 — readme and final checks

- [ ] 5-1: write complete README.md (all sections per plan section 8)
- [ ] 5-2: record demo video (3-5 min); paste link in readme
- [ ] 5-3: full suite run from clean clone; verify readme is sufficient
- [ ] 5-4: open final pr; merge to main; tag v1.0.0
