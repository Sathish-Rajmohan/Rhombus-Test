import * as fs from 'fs';
import * as path from 'path';
import { expect, test } from './fixtures';
import { DashboardPage } from './pages/DashboardPage';
import { TransformPage } from './pages/TransformPage';
import { PreviewPage } from './pages/PreviewPage';
import { runDataValidator } from './helpers/data-validator';
import { buildAuthedApiContext } from '../api-tests/helpers/request-context';
import { TRANSFORMATION_PROMPT, EXPECTED_CSV_HEADER } from '../api-tests/helpers/endpoints';
import { tryDeleteProject } from '../api-tests/helpers/project-helpers';
import { MESSY_CSV_PATH, ARTIFACTS_DIR } from '@shared/paths';

/**
 * End-to-end UI test for the Rhombus AI pipeline flow (spec Option A).
 *
 * Drives the real browser through: create project -> attach CSV via the
 * chat composer -> send a natural-language prompt -> wait for the LLM to
 * build the pipeline -> run it -> open the output node's preview panel ->
 * download the result CSV.
 *
 * The downloaded CSV is then handed to the Python data validator so the
 * same 11 row-level transformation rules used offline (dedup, casing,
 * whitespace, schema, amount sign, date format) also gate whatever the
 * live AI produced. If the LLM drifts on any rule, the test fails with
 * the offending rule tag in the error message.
 *
 * afterAll best-effort deletes the project so the account stays below the
 * Rhombus free-plan 3-project cap across repeated runs.
 */

test.describe('AI pipeline flow (Option A)', () => {
  let projectId: number | undefined;

  test.afterAll(async () => {
    if (projectId === undefined) return;
    const ctx = await buildAuthedApiContext();
    await tryDeleteProject(ctx, projectId);
    await ctx.dispose();
  });

  test('end-to-end: create project, attach CSV, run pipeline, validate downloaded CSV', async ({
    page,
  }) => {
    // Full AI pipeline journey runs long: project creation, upload, LLM build
    // (can take 2-5 min), pipeline run, download. Override the global 120s cap.
    test.setTimeout(15 * 60 * 1000);

    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    projectId = await dashboard.createNewProject(`playwright-${Date.now()}`);

    const transformPage = new TransformPage(page);

    await transformPage.waitForCanvasReady();
    await transformPage.attachCsv(MESSY_CSV_PATH);

    await transformPage.sendTransformationPrompt(TRANSFORMATION_PROMPT);
    await transformPage.waitForPipelineBuilt();

    await transformPage.runPipeline();
    await transformPage.openOutputNodePreview();

    const download = await transformPage.downloadResult();
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const destPath = path.join(ARTIFACTS_DIR, `ui-output-${stamp}.csv`);
    const previewPage = new PreviewPage(page);
    await previewPage.saveDownload(download, destPath);

    const content = fs.readFileSync(destPath, 'utf-8');
    const lines = content
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const [headerLine, ...dataLines] = lines;

    expect(content.trim().length, 'Downloaded CSV must not be empty').toBeGreaterThan(0);
    expect(headerLine, 'First line must be the expected header').toBe(EXPECTED_CSV_HEADER);
    expect(dataLines.length, `Expected 13 rows after deduplication, got ${dataLines.length}`).toBe(
      13,
    );

    const validation = runDataValidator(destPath, MESSY_CSV_PATH);
    expect(validation.ok, validation.message).toBe(true);
  });
});
