import { test, expect } from '@playwright/test';
import {
  buildAuthedApiContext,
  buildUnauthApiContext,
  getBearerToken,
} from './helpers/request-context';
import { PROFILE_ENDPOINT } from './helpers/endpoints';

/**
 * Authentication and session tests.
 *
 *   positive: NextAuth session endpoint returns a usable JWT accessToken.
 *   positive: /profile with a valid Bearer token returns 200 + user fields.
 *   negative: /profile without Authorization header returns 401 or 403.
 */

test.describe('API Auth', () => {
  test('session endpoint returns a JWT access token', async () => {
    const token = await getBearerToken();
    expect(token.length, 'accessToken should be a non-empty string').toBeGreaterThan(0);
    expect(token, 'accessToken should look like a JWT (starts with eyJ)').toMatch(/^eyJ/);
  });

  test('authenticated /profile request returns 200 and user fields', async () => {
    const ctx = await buildAuthedApiContext();
    const resp = await ctx.get(PROFILE_ENDPOINT);
    expect(resp.status(), `Expected 200, got ${resp.status()}`).toBe(200);
    const body = (await resp.json()) as Record<string, unknown>;
    await ctx.dispose();

    // Social-login accounts can have null first_name/last_name; typeof null === 'object'.
    expect(['string', 'object'], 'first_name should be string or null').toContain(
      typeof body['first_name'],
    );
    expect(['string', 'object'], 'last_name should be string or null').toContain(
      typeof body['last_name'],
    );
  });

  test('unauthenticated /profile request returns 401 or 403', async () => {
    const ctx = await buildUnauthApiContext();
    const resp = await ctx.get(PROFILE_ENDPOINT);
    await ctx.dispose();

    expect([401, 403], `Expected 401 or 403 for missing auth, got ${resp.status()}`).toContain(
      resp.status(),
    );
  });
});
