import { test as setup } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { env } from '@shared/env';
import { STORAGE_STATE_PATH } from '@shared/paths';

/**
 * Playwright setup project. Runs once before the ui and api projects.
 * Logs in through Auth0 and persists the authenticated browser state
 * (cookies + localStorage) to storageState.json so all downstream tests
 * can skip the login flow.
 */
setup('authenticate and save storageState', async ({ page }) => {
  const login = new LoginPage(page);

  await login.goto();
  await login.login(env.RHOMBUS_EMAIL, env.RHOMBUS_PASSWORD);
  await login.waitForRedirectToApp();

  // "New/Create/+" project button is the first authenticated landmark.
  try {
    await page
      .getByRole('button', { name: /new|create|\+/i })
      .first()
      .waitFor({ state: 'visible', timeout: 15_000 });
  } catch {
    // Fallback: any sidebar/nav element that is only present when authenticated.
    await page
      .locator('nav, aside, [role="navigation"]')
      .first()
      .waitFor({ state: 'visible', timeout: 15_000 });
  }

  await page.context().storageState({ path: STORAGE_STATE_PATH });
});
