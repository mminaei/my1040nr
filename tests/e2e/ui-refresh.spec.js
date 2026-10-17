const { test, expect } = require('@playwright/test');

const routes = [
  '/index.html', '/prepare.html', '/nr.html', '/residency.html', '/exempt.html',
  '/forms.html', '/states.html', '/pricing.html', '/vita.html', '/legal.html'
];

const publicPages = [
  ['/index.html', /US taxes, built/],
  ['/pricing.html', 'Everything is free.'],
  ['/exempt.html', 'The word "exempt", in plain English'],
  ['/forms.html', 'The forms, in plain English'],
  ['/vita.html', 'Free in-person help: VITA volunteers'],
  ['/legal.html', 'Disclaimer, terms and privacy']
];

test('every route has the shared site header and labeled navigation', async ({ page }) => {
  for (const route of routes) {
    const response = await page.goto(route);
    expect(response.status()).toBe(200);
    await expect(page.locator('header.site-header')).toHaveCount(1);
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(1);
  }
});

test('public pages retain their headings and home preparation links', async ({ page }) => {
  for (const [route, heading] of publicPages) {
    await page.goto(route);
    await expect(page.locator('h1')).toContainText(heading);
  }
  await page.goto('/index.html');
  await expect(page.getByRole('link', { name: 'Prepare Form 8843 free now' }).first())
    .toHaveAttribute('href', 'prepare.html');
  await expect(page.getByRole('link', { name: 'Prepare Form 1040-NR free now' }).first())
    .toHaveAttribute('href', 'nr.html');
});

test('residency and state checkers still show results', async ({ page }) => {
  await page.goto('/residency.html');
  await expect(page.getByLabel('Your visa type')).toBeVisible();
  await page.getByRole('button', { name: 'Count my years and check' }).click();
  await expect(page.locator('#result')).toBeVisible();

  await page.goto('/states.html');
  await expect(page.getByLabel('State you lived in or earned money in')).toBeVisible();
  await page.getByRole('button', { name: 'Check this state' }).click();
  await expect(page.locator('#result')).toBeVisible();
});

test('checker results fit desktop and 375px viewports', async ({ page }) => {
  for (const [route, action, labels] of [
    ['/residency.html', 'Count my years and check', [
      'Are you a US citizen or a green card holder?',
      'Your visa type',
      'What was the first calendar year you were in the US on an F or J visa, even for one day?',
      'Before that first year, how many earlier calendar years had you already spent in the US on any F or J visa?',
      'Days physically in the US in 2025',
      'Days physically in the US in 2024',
      'Days physically in the US in 2023'
    ]],
    ['/states.html', 'Check this state', [
      'State you lived in or earned money in',
      'Did you earn income in that state (a job, assistantship, internship, or OPT employer located there)?',
      'About how much did you earn in that state, in dollars?',
      'Did that state take tax out of your pay? Look at your W-2, boxes 16 and 17, or your pay stubs.',
      'How did you live in that state?'
    ]]
  ]) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(route);
    for (const label of labels) {
      await expect(page.getByLabel(label)).toBeVisible();
    }
    await page.getByRole('button', { name: action }).click();

    for (const width of [1280, 375]) {
      await page.setViewportSize({ width, height: 812 });
      const result = page.locator('#result');
      await expect(result).toBeVisible();
      await expect(page.getByRole('status')).toBeVisible();
      const bounds = await result.boundingBox();
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(documentWidth).toBeLessThanOrEqual(width);
    }
  }
});

test('all routes fit a 375px viewport without page-level horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const route of routes) {
    await page.goto(route);
    const widths = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth
    }));
    expect(widths.document, route).toBeLessThanOrEqual(widths.viewport);
  }
});
