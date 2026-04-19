/**
 * Project cleanup helper for the UI test.
 *
 * The UI test creates a project end-to-end through the browser and then
 * best-effort deletes it via the REST API so the account stays below the
 * Rhombus free-plan 3-project cap across repeated runs.
 */

import type { APIRequestContext } from '@playwright/test';

/**
 * Best-effort delete. Non-fatal if the endpoint shape differs; the test
 * still passes and the user can delete manually from the dashboard.
 */
export async function tryDeleteProject(
  ctx: APIRequestContext,
  projectId: number,
): Promise<void> {
  const candidates = [
    `/api/dataset/projects/${projectId}/`,
    `/api/dataset/projects/${projectId}/delete/`,
  ];
  for (const endpoint of candidates) {
    const resp = await ctx.delete(endpoint).catch(() => null);
    if (resp && [200, 202, 204].includes(resp.status())) {
      return;
    }
  }
  process.stderr.write(
    `[project-helpers] Could not auto-delete project ${projectId}. ` +
      'Delete manually at https://rhombusai.com/ to avoid hitting the 3-project limit.\n',
  );
}
