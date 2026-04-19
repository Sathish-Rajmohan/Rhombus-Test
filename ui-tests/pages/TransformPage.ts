import { expect, type Page, type Download, type Locator } from '@playwright/test';
import { TRANSFORMATION_PROMPT } from '../../api-tests/helpers/endpoints';

/**
 * Page Object for the workflow canvas at /workflow/{id}.
 *
 * Selector priority follows Playwright guidance: getByRole and getByTestId
 * first, with scoped CSS as a last resort. The only CSS classes used here
 * belong to third-party libraries whose class names are public contracts
 * (`react-flow__node`, `lucide-*`) so they are stable across Tailwind or
 * Radix refactors.
 */
export class TransformPage {
  constructor(private readonly page: Page) {}

  /**
   * The chat composer textarea uses two different placeholders depending on
   * workflow state. Matching both keeps the same getter valid across the
   * whole flow: empty canvas, after CSV attachment, and after prompt send.
   */
  private get chatTextarea(): Locator {
    return this.page
      .locator(
        'textarea[placeholder*="Attach or drop" i], textarea[placeholder*="transform" i]',
      )
      .first();
  }

  private get sendButton(): Locator {
    return this.page.locator('button:has(svg.lucide-arrow-up)');
  }

  private get runPipelineButton(): Locator {
    return this.page.getByTestId('run-pipeline');
  }

  async waitForCanvasReady(): Promise<void> {
    await expect(
      this.chatTextarea,
      'Workflow canvas chat textarea must be visible',
    ).toBeVisible({ timeout: 20_000 });
  }

  /**
   * Attach a CSV file to the chat composer so the LLM sees it as a dataset.
   *
   * The attach-trigger button is scoped to the composer panel so we do not
   * accidentally click the canvas "Add Node" button, which uses the same
   * lucide-plus icon.
   *
   * The "Add New File" modal hosts a hidden `<input type="file">`; we drive
   * it with setInputFiles which is Playwright's canonical pattern for
   * drag-drop upload widgets.
   */
  async attachCsv(filePath: string): Promise<void> {
    const composer = this.chatTextarea.locator('xpath=ancestor::*[3]');

    const attachTrigger = composer
      .locator('button[aria-haspopup="menu"]:has(svg.lucide-plus)')
      .or(composer.locator('button:has(svg.lucide-plus)'))
      .first();
    await expect(
      attachTrigger,
      'Attach "+" trigger must be present in the chat composer',
    ).toBeVisible({ timeout: 10_000 });
    await attachTrigger.click();

    const addNewFile = this.page
      .getByRole('menuitem', { name: /add new file/i })
      .or(this.page.getByText(/^\s*add new file\s*$/i))
      .first();
    await expect(
      addNewFile,
      '"Add new file" menu item must appear after clicking the + trigger',
    ).toBeVisible({ timeout: 5_000 });
    await addNewFile.click();

    const modal = this.page
      .getByRole('dialog', { name: /add new file/i })
      .or(this.page.locator('[role="dialog"]:has-text("Add New File")'))
      .first();
    await expect(modal, '"Add New File" modal must open').toBeVisible({ timeout: 10_000 });

    const fileInput = modal.locator('input[type="file"]').first();
    await fileInput.waitFor({ state: 'attached', timeout: 5_000 });
    await fileInput.setInputFiles(filePath);

    const uploadButton = modal.getByRole('button', { name: /^upload$/i });
    await expect(
      uploadButton,
      '"Upload" button must enable after selecting a file',
    ).toBeEnabled({ timeout: 10_000 });
    await uploadButton.click();

    await expect(modal, 'Upload modal must dismiss after confirming').toBeHidden({
      timeout: 30_000,
    });
    await expect(
      this.page.getByText(/messy\.csv/i).first(),
      'messy.csv chip must appear in the composer after upload',
    ).toBeVisible({ timeout: 30_000 });
  }

  async sendTransformationPrompt(prompt: string = TRANSFORMATION_PROMPT): Promise<void> {
    const textarea = this.chatTextarea;
    await expect(
      textarea,
      'Chat textarea must be editable before sending the prompt',
    ).toBeEditable({ timeout: 10_000 });
    await textarea.click();
    await textarea.fill(prompt);
    await expect(textarea, 'Typed prompt must appear in the textarea').toHaveValue(prompt, {
      timeout: 5_000,
    });

    // Scope the submit button to the same composer as the active textarea so
    // we do not fire the wrong one while multiple composers co-exist briefly.
    const composer = textarea.locator('xpath=ancestor::*[3]');
    const scopedSend = composer.locator('button:has(svg.lucide-arrow-up)').first();
    const submitButton = (await scopedSend.count()) > 0 ? scopedSend : this.sendButton.first();
    await expect(
      submitButton,
      'Send button must be enabled after typing the prompt',
    ).toBeEnabled({ timeout: 5_000 });
    await submitButton.click();
  }

  /**
   * Wait for the LLM to finish building the pipeline on the canvas.
   *
   * We deliberately do not watch the "Building this phase" chat banner:
   * the chat stream echoes the phase name and persists after completion,
   * which would make text-based waits never resolve. Instead we use the
   * canvas itself as the source of truth: at least two react-flow nodes
   * (Data Input + downstream transformation) plus a best-effort check for
   * the green-tick completion badge on the last node.
   *
   * Timeout is 5 minutes because LLM round-trip plus node streaming is
   * typically 30-90s but can spike under load.
   */
  async waitForPipelineBuilt(): Promise<void> {
    await expect
      .poll(async () => await this.page.locator('.react-flow__node').count(), {
        timeout: 300_000,
        intervals: [1000, 2000, 3000, 5000],
        message:
          'Transformation node never rendered on the canvas. The LLM did not finish building the pipeline.',
      })
      .toBeGreaterThanOrEqual(2);

    // Best-effort: match any Lucide "check" variant (lucide-check,
    // lucide-check-circle, lucide-circle-check-big) so we are resilient to
    // icon renames. If the tick selector does not match on this build, we
    // do not block: node count >= 2 plus Run Pipeline enabled is already a
    // strong signal and openOutputNodePreview covers the rest.
    const outputNode = this.page.locator('.react-flow__node').last();
    const greenTick = outputNode.locator('svg[class*="check" i]').first();
    await greenTick.waitFor({ state: 'visible', timeout: 60_000 }).catch(() => undefined);

    await expect(this.runPipelineButton, 'Run Pipeline button must appear').toBeVisible({
      timeout: 10_000,
    });
    await expect(
      this.runPipelineButton,
      'Run Pipeline button must be enabled once the pipeline is built',
    ).toBeEnabled({ timeout: 10_000 });
  }

  async runPipeline(): Promise<void> {
    await expect(
      this.runPipelineButton,
      'Run Pipeline button must be enabled before clicking',
    ).toBeEnabled({ timeout: 10_000 });
    await this.runPipelineButton.click();
  }

  /**
   * After the pipeline runs, the output is reached by hovering the
   * downstream node and clicking the "eye" (preview) icon on its header.
   * The eye icon only becomes visible once the run has produced an output,
   * so polling the hover + visibility check doubles as the "pipeline
   * finished" wait.
   */
  async openOutputNodePreview(): Promise<void> {
    const nodes = this.page.locator('.react-flow__node');
    await expect(nodes.first(), 'At least one canvas node must be present').toBeVisible({
      timeout: 30_000,
    });
    const outputNode = nodes.last();

    const eyeIcon = outputNode
      .locator('[aria-label*="preview" i]')
      .or(outputNode.locator('[data-testid*="preview" i]'))
      .or(outputNode.getByRole('button', { name: /preview/i }))
      .or(outputNode.locator('svg[class*="eye" i]'))
      .first();

    await expect
      .poll(
        async () => {
          await outputNode.hover();
          return await eyeIcon.isVisible();
        },
        {
          timeout: 180_000,
          intervals: [500, 1000, 2000, 5000],
          message:
            'Eye (preview) icon never appeared on the output node. Pipeline may not have finished running.',
        },
      )
      .toBe(true);

    await eyeIcon.click();

    // The bare text "Node Preview" is mounted in inactive tab content
    // elsewhere in the DOM, so waiting for the toolbar's Download split
    // button is the reliable "panel is open" signal.
    await expect(
      this.page
        .locator('button[aria-haspopup="menu"]:has-text("Download")')
        .or(this.page.getByRole('button', { name: /^download$/i }))
        .first(),
      'Download button must be visible (indicates the Node Preview panel is open)',
    ).toBeVisible({ timeout: 30_000 });
  }

  /**
   * Trigger a CSV download from the Node Preview panel toolbar.
   *
   * The toolbar has a "Download" split button. Depending on build the main
   * button either triggers a direct CSV download or opens a format
   * dropdown. We register the download listener before clicking and then
   * handle the optional dropdown afterwards.
   */
  async downloadResult(): Promise<Download> {
    const downloadButton = this.page
      .getByRole('button', { name: /^download$/i })
      .or(this.page.locator('button:has-text("Download")'))
      .first();

    await expect(
      downloadButton,
      'Download button must be visible in the preview panel',
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      downloadButton,
      'Download button must be enabled in the preview panel',
    ).toBeEnabled({ timeout: 10_000 });

    const downloadPromise = this.page.waitForEvent('download', { timeout: 60_000 });
    await downloadButton.click();

    const csvMenuItem = this.page
      .getByRole('menuitem', { name: /csv/i })
      .or(this.page.locator('[role="menuitem"]:has-text("CSV")'))
      .first();
    const menuAppeared = await csvMenuItem
      .waitFor({ state: 'visible', timeout: 3_000 })
      .then(() => true)
      .catch(() => false);
    if (menuAppeared) {
      await csvMenuItem.click();
    }

    return await downloadPromise;
  }
}
