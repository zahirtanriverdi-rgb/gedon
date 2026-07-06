import { test, expect } from '@playwright/test';

test('vendor can log in with valid credentials and reach the vendor portal', async ({ page }) => {
  await page.goto('/vendor/login');
  await expect(page.getByText('Operator Girişi')).toBeVisible();

  await page.getByPlaceholder('istifadeci_adi').fill('gedekgorek');
  await page.getByPlaceholder('••••••••').fill('password123');
  await page.getByRole('button', { name: 'Daxil ol' }).click();

  await expect(page.getByRole('button', { name: 'Çıxış' })).toBeVisible({ timeout: 10000 });
});

test('vendor login shows an error for wrong credentials', async ({ page }) => {
  await page.goto('/vendor/login');
  await page.getByPlaceholder('istifadeci_adi').fill('gedekgorek');
  await page.getByPlaceholder('••••••••').fill('wrong-password');
  await page.getByRole('button', { name: 'Daxil ol' }).click();

  await expect(page.getByText('İstifadəçi adı/e-poçt və ya şifrə yanlışdır!')).toBeVisible();
});
