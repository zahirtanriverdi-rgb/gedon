import { test, expect } from '@playwright/test';

test('customer marketplace home loads without console errors', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(err.message));

  await page.goto('/');

  await expect(page.getByText('GedəkGörək')).toBeVisible();
  await expect(page.getByText('Bazar məlumatları yüklənir...')).toHaveCount(0, { timeout: 10000 });

  expect(consoleErrors, `Unexpected console errors: ${consoleErrors.join('\n')}`).toEqual([]);
});

test('global search interaction updates the search box', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('text=Bazar məlumatları yüklənir...', { state: 'detached' }).catch(() => {});
  // The sticky header search box (same placeholder) only mounts after scrolling past 300px,
  // so before that there's exactly one match: the hero search box in <main>.
  const searchInput = page.getByPlaceholder(/Tur adı, region və ya açar söz axtar/).first();
  await searchInput.fill('Quba');
  await expect(searchInput).toHaveValue('Quba');
});
