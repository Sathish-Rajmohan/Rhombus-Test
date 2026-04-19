import { type Page } from '@playwright/test';
import { env } from '@shared/env';

/**
 * Page Object for the Rhombus AI login flow.
 *
 * Observed flow (2026-04-19):
 *   1. /api/auth/signin renders the NextAuth provider chooser.
 *   2. The "Sign in with Auth0" button redirects to auth.rhombusai.com/login.
 *   3. Auth0 page shows email + password fields alongside social buttons;
 *      the "Log In" button is matched exactly so we do not pick up any
 *      "Continue with <provider>" social buttons.
 *   4. Auth0 redirects back to rhombusai.com on success.
 */
export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto(`${env.RHOMBUS_BASE_URL}/api/auth/signin`, {
      waitUntil: 'domcontentloaded',
    });

    const auth0Btn = this.page.getByRole('button', { name: /sign in with auth0/i });
    await auth0Btn.waitFor({ state: 'visible', timeout: 10_000 });
    await auth0Btn.click();

    await this.page.waitForURL(/auth\.rhombusai\.com/, { timeout: 30_000 });
  }

  async login(email: string, password: string): Promise<void> {
    const emailField = this.page
      .getByLabel(/email address/i)
      .or(this.page.locator('input[type="email"], input[name="email"]').first());
    await emailField.waitFor({ state: 'visible', timeout: 15_000 });
    await emailField.fill(email);

    const passwordField = this.page
      .locator('input[type="password"], input[name="password"]')
      .first();
    await passwordField.waitFor({ state: 'visible', timeout: 10_000 });
    await passwordField.fill(password);

    // Exact match avoids matching "Continue with <provider>" social buttons.
    await this.page.getByRole('button', { name: 'Log In', exact: true }).click();
  }

  async waitForRedirectToApp(): Promise<void> {
    await this.page.waitForURL(
      (url) => url.hostname === 'rhombusai.com' || url.hostname === 'www.rhombusai.com',
      { timeout: 30_000 },
    );
  }
}
