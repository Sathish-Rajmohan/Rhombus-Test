import { expect, type Page } from '@playwright/test';
import { env } from '@shared/env';

/**
 * Page Object for the authenticated landing page at rhombusai.com.
 *
 * The dashboard lists existing projects in the left sidebar and exposes a
 * "New Project" entry that opens a "Create New Project" modal. Creating a
 * project redirects the browser to /workflow/{id} where the transformation
 * flow begins.
 */
export class DashboardPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto(env.RHOMBUS_BASE_URL, { waitUntil: 'domcontentloaded' });
    await expect(
      this.page
        .getByRole('button', { name: /new project/i })
        .or(this.page.getByText('New Project', { exact: true }))
        .first(),
      'Dashboard "New Project" entry must be visible',
    ).toBeVisible({ timeout: 20_000 });
  }

  /**
   * Create a new project through the UI and return the numeric project id
   * parsed from the /workflow/{id} URL the app redirects to.
   */
  async createNewProject(name: string): Promise<number> {
    const newProjectEntry = this.page
      .getByRole('button', { name: /new project/i })
      .or(this.page.getByText('New Project', { exact: true }))
      .first();
    await expect(newProjectEntry, '"New Project" entry must be visible').toBeVisible({
      timeout: 10_000,
    });
    await newProjectEntry.click();

    const modal = this.page
      .getByRole('dialog', { name: /create new project/i })
      .or(this.page.locator('[role="dialog"]:has-text("Create New Project")'))
      .first();
    await expect(modal, '"Create New Project" modal must open').toBeVisible({ timeout: 10_000 });

    const nameInput = modal
      .getByPlaceholder(/enter project name/i)
      .or(modal.locator('input[type="text"]'))
      .first();
    await nameInput.fill(name);

    const createButton = modal.getByRole('button', { name: /^create$/i });
    await expect(createButton, '"Create" button must enable once a name is entered').toBeEnabled({
      timeout: 5_000,
    });
    await createButton.click();

    await this.page.waitForURL(/\/workflow\/\d+/, { timeout: 30_000 });

    const match = this.page.url().match(/\/workflow\/(\d+)/);
    if (!match || !match[1]) {
      throw new Error(`Expected URL to match /workflow/{id}, got ${this.page.url()}`);
    }
    return parseInt(match[1], 10);
  }

  /** Navigate directly to an existing workflow by id (fallback path). */
  async gotoWorkflow(projectId: number): Promise<void> {
    await this.page.goto(`${env.RHOMBUS_BASE_URL}/workflow/${projectId}`, {
      waitUntil: 'domcontentloaded',
    });
  }
}
