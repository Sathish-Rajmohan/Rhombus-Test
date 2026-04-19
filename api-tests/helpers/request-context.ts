import { request, type APIRequestContext } from '@playwright/test';
import { FRONTEND_BASE_URL, API_BASE_URL, SESSION_ENDPOINT } from './endpoints';
import { STORAGE_STATE_PATH } from '@shared/paths';

/**
 * Fetches the NextAuth session using cookies from storageState.json,
 * extracts the JWT accessToken, and returns it for Authorization headers.
 *
 * The Rhombus AI frontend (rhombusai.com) uses NextAuth; after UI login
 * the session is stored as a cookie on rhombusai.com. The accessToken in
 * the session response is a signed JWT that the browser forwards as
 * Authorization: Bearer <token> to api.rhombusai.com. storageState.json
 * holds those cookies, so we replay the session request to extract the
 * Bearer token without performing a second login.
 */
export async function getBearerToken(): Promise<string> {
  const frontendCtx = await request.newContext({
    baseURL: FRONTEND_BASE_URL,
    storageState: STORAGE_STATE_PATH,
  });

  try {
    const resp = await frontendCtx.get(SESSION_ENDPOINT);
    if (!resp.ok()) {
      throw new Error(
        `Session endpoint returned ${resp.status()}. Is storageState.json valid? ` +
          'Re-run the setup project: npx playwright test --project=setup',
      );
    }
    const session = (await resp.json()) as { accessToken?: string };
    if (!session.accessToken) {
      throw new Error('accessToken missing from session response; user may not be authenticated');
    }
    return session.accessToken;
  } finally {
    await frontendCtx.dispose();
  }
}

/** Authenticated APIRequestContext for api.rhombusai.com. */
export async function buildAuthedApiContext(): Promise<APIRequestContext> {
  const token = await getBearerToken();
  return request.newContext({
    baseURL: API_BASE_URL,
    extraHTTPHeaders: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
}

/** Unauthenticated APIRequestContext for api.rhombusai.com. Used by negative auth tests. */
export async function buildUnauthApiContext(): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: API_BASE_URL,
    extraHTTPHeaders: {
      Accept: 'application/json',
    },
  });
}
