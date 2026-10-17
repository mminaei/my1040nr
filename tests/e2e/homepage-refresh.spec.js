const { test, expect } = require('@playwright/test');

test('homepage keeps its key content and preparation destinations', async ({ page }) => {
  const response = await page.goto('/index.html');

  expect(response).not.toBeNull();
  expect(response.status()).toBe(200);
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('heading', {
    level: 1,
    name: 'US taxes, built only for international students.'
  })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Prepare Form 8843 free now' })).toHaveCount(2);
  await expect(page.getByRole('link', { name: 'Prepare Form 1040-NR free now' })).toHaveCount(2);
  expect(await page.locator('a[href="prepare.html"]').evaluateAll(links =>
    links.every(link => link.textContent.trim() === 'Prepare Form 8843 free now')
  )).toBe(true);
  expect(await page.locator('a[href="nr.html"]').evaluateAll(links =>
    links.every(link => link.textContent.trim() === 'Prepare Form 1040-NR free now')
  )).toBe(true);
  await expect(page.getByText('Your SSN is the last thing we ask', { exact: true }))
    .toBeVisible();
});

test('homepage uses the approved light surface and fits a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/index.html');

  const surfaceColor = await page.locator('body').evaluate(element =>
    getComputedStyle(element).backgroundColor
  );
  expect(surfaceColor).toBe('rgb(245, 248, 251)');
  expect(await page.evaluate(() =>
    document.documentElement.scrollWidth <= document.documentElement.clientWidth
  )).toBe(true);
  await expect(page.getByRole('link', { name: 'Prepare Form 8843 free now' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Prepare Form 1040-NR free now' }).first()).toBeVisible();
});
