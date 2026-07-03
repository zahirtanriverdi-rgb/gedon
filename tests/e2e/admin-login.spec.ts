import { test, expect } from '@playwright/test';

test('admin can log in with valid credentials and reach the admin portal', async ({ page }) => {
  await page.goto('/?portal=admin');
  await expect(page.getByText('Admin Girişi')).toBeVisible();

  await page.getByPlaceholder('admin@nümunə.az').fill('admin@gedekgore.az');
  await page.getByPlaceholder('••••••••').fill('changeme123');
  await page.getByRole('button', { name: 'Daxil ol' }).click();

  await expect(page.getByRole('button', { name: 'Çıxış' })).toBeVisible({ timeout: 10000 });
});
