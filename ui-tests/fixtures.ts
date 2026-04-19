import { test as base } from '@playwright/test';
import * as fs from 'fs';
import { ARTIFACTS_DIR } from '@shared/paths';

// Ensure the per-run artifacts directory exists before any spec writes to it.
// Downloads from the UI flow are persisted here so CI can upload them for
// post-mortem and so the Python validator can read the exact CSV the live
// AI produced.
fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

export const test = base;
export { expect } from '@playwright/test';
