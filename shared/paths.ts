import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../');

/** Input fixture consumed by both the UI test and the upload helpers. */
export const MESSY_CSV_PATH = path.join(REPO_ROOT, 'fixtures', 'input', 'messy.csv');

/** Per-run artifact directory (HTML reports, downloads, traces). */
export const ARTIFACTS_DIR = path.join(REPO_ROOT, 'artifacts');

/** Where auth.setup.ts persists the authenticated browser session. */
export const STORAGE_STATE_PATH = path.join(REPO_ROOT, 'storageState.json');
