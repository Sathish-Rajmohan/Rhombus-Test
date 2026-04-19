import { expect, type Download, type Page } from '@playwright/test';

/**
 * Helper for the post-pipeline result view.
 *
 * The UI test validates the output via Download handles rather than
 * scraping the on-canvas preview grid (which is virtualised and uses
 * unstable row-group selectors).
 */
export class PreviewPage {
  constructor(private readonly _page: Page) {}

  async saveDownload(download: Download, destPath: string): Promise<void> {
    await download.saveAs(destPath);
    const failure = await download.failure();
    expect(failure, `Download failed: ${failure ?? 'no error'}`).toBeNull();
  }
}
