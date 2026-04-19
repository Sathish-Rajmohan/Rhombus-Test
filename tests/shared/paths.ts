import * as path from 'path';
import * as fs from 'fs';

const REPO_ROOT = path.resolve(__dirname, '../../');

export const FIXTURES_INPUT_CSV = path.join(REPO_ROOT, 'fixtures', 'input', 'messy.csv');

export const FIXTURES_EXPECTED_CSV = path.join(REPO_ROOT, 'fixtures', 'output', 'expected.csv');

export const ARTIFACTS_DIR = path.join(REPO_ROOT, 'artifacts');

export const STORAGE_STATE_PATH = path.join(REPO_ROOT, 'storageState.json');

/**
 * Returns a unique per-test temp download directory under artifacts/.
 * Creates the directory if it does not exist.
 */
export function tmpDownloadDir(testTitle: string): string {
  const safe = testTitle.replace(/[^a-z0-9]/gi, '_').slice(0, 60);
  const dir = path.join(ARTIFACTS_DIR, `downloads_${safe}_${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
