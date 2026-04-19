import { test, expect, type APIRequestContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { buildAuthedApiContext } from './helpers/request-context';
import {
  TEMP_UPLOAD_ENDPOINT,
  UPLOAD_FIELDS,
  type TempUploadResponse,
} from './helpers/endpoints';
import { MESSY_CSV_PATH } from '@shared/paths';

/**
 * Dataset upload tests.
 *
 *   positive: valid CSV returns 200 with a numeric temp-dataset id.
 *   negative: no file attached returns 4xx.
 *   negative: column_header_row=0 is rejected.
 *
 * All tests are black-box: status codes and publicly documented response
 * shape only. No mocks.
 */

type MultipartValue = string | { name: string; mimeType: string; buffer: Buffer };

function buildUploadMultipart(
  overrides: Record<string, MultipartValue> = {},
): Record<string, MultipartValue> {
  const csvBuffer = fs.readFileSync(MESSY_CSV_PATH);
  const filename = path.basename(MESSY_CSV_PATH);
  return {
    [UPLOAD_FIELDS.file]: { name: filename, mimeType: 'text/csv', buffer: csvBuffer },
    [UPLOAD_FIELDS.title]: filename,
    [UPLOAD_FIELDS.description]: '',
    [UPLOAD_FIELDS.columnHeaderRow]: '1',
    ...overrides,
  };
}

/**
 * Parse the Retry-After header per RFC 7231. Accepts either a delta-seconds
 * integer or an HTTP-date; falls back to a caller-supplied default when the
 * header is absent or malformed. Returns the delay in milliseconds, clamped
 * so a misbehaving server cannot stall CI indefinitely.
 */
function parseRetryAfterMs(headerValue: string | undefined, fallbackMs: number): number {
  const MAX_MS = 30_000;
  if (!headerValue) return Math.min(fallbackMs, MAX_MS);
  const asInt = Number(headerValue);
  if (Number.isFinite(asInt) && asInt >= 0) {
    return Math.min(asInt * 1000, MAX_MS);
  }
  const asDate = Date.parse(headerValue);
  if (Number.isFinite(asDate)) {
    return Math.min(Math.max(0, asDate - Date.now()), MAX_MS);
  }
  return Math.min(fallbackMs, MAX_MS);
}

/**
 * Retry once on HTTP 429. Wait time is driven by the server's Retry-After
 * header (RFC 7231), not a blind sleep; the 5s fallback applies only when
 * the header is absent.
 */
async function uploadWithRetry(ctx: APIRequestContext): Promise<TempUploadResponse> {
  const multipart = buildUploadMultipart();
  let resp = await ctx.post(TEMP_UPLOAD_ENDPOINT, { multipart });
  if (resp.status() === 429) {
    const retryAfter = resp.headers()['retry-after'];
    const waitMs = parseRetryAfterMs(retryAfter, 5_000);
    await new Promise<void>((r) => setTimeout(r, waitMs));
    resp = await ctx.post(TEMP_UPLOAD_ENDPOINT, { multipart });
  }
  if (resp.status() !== 200) {
    throw new Error(`Temp upload returned ${resp.status()}: ${await resp.text()}`);
  }
  return (await resp.json()) as TempUploadResponse;
}

test.describe('API Upload', () => {
  test('Upload positive: valid CSV returns 200 with a numeric dataset id', async () => {
    const ctx = await buildAuthedApiContext();
    const uploaded = await uploadWithRetry(ctx);
    await ctx.dispose();

    expect(typeof uploaded.id, 'Temp dataset id should be a number').toBe('number');
    expect(uploaded.id, 'Temp dataset id should be positive').toBeGreaterThan(0);
    expect(typeof uploaded.title, 'Title should echo back as a string').toBe('string');
  });

  test('Upload negative: no file attached returns 4xx', async () => {
    const ctx = await buildAuthedApiContext();
    const resp = await ctx.post(TEMP_UPLOAD_ENDPOINT, {
      multipart: {
        [UPLOAD_FIELDS.title]: 'empty',
        [UPLOAD_FIELDS.description]: '',
        [UPLOAD_FIELDS.columnHeaderRow]: '1',
      },
    });
    await ctx.dispose();

    expect(resp.status(), `Expected 4xx but got ${resp.status()}`).toBeGreaterThanOrEqual(400);
    expect(resp.status(), 'Missing-file should not be treated as success').toBeLessThan(500);
  });

  test('Upload negative: column_header_row=0 is rejected', async () => {
    const ctx = await buildAuthedApiContext();
    const resp = await ctx.post(TEMP_UPLOAD_ENDPOINT, {
      multipart: buildUploadMultipart({ [UPLOAD_FIELDS.columnHeaderRow]: '0' }),
    });
    const bodyText = await resp.text();
    await ctx.dispose();

    expect(
      resp.status(),
      `Expected non-2xx for column_header_row=0, got ${resp.status()} / body: ${bodyText}`,
    ).not.toBe(200);
    expect(resp.status(), 'Must return an error status').toBeGreaterThanOrEqual(400);
  });
});
