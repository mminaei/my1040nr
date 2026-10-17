const { test, expect } = require('@playwright/test');
const { extractPdfText } = require('./helpers/pdf-text');
const stateCases = require('../fixtures/state-cases.js');

const appOrigin = 'http://127.0.0.1:4173';
const syntheticTin = '000000000';

function expectUnverifiedStateCase(id) {
  const fixture = stateCases.find(stateCase => stateCase.id === id);
  expect(fixture && fixture.verificationStatus).toBe('TODO_VERIFY');
}

async function beginNonresidentInterview(page, state = 'TX') {
  await page.goto('/nr.html');
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByLabel('Your visa type on December 31, 2025').selectOption('F-1');
  await page.getByLabel('Do you have a green card (or one pending that was approved)?').selectOption('no');
  await page.getByLabel('Days you were in the US in 2025').fill('120');
  await page.getByLabel('Days you were in the US in 2024').fill('0');
  await page.getByLabel('Days you were in the US in 2023').fill('0');
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByLabel('First name and middle initial').fill('Riley Example');
  await page.getByLabel('Last name (family name)').fill('Sample');
  await page.getByLabel('US street address').fill('123 Fictional Way');
  await page.getByLabel('City').fill('Austin');
  await page.getByRole('combobox', { name: 'State', exact: true }).selectOption(state);
  await page.getByLabel('ZIP code').fill('78705');
  await page.getByRole('button', { name: 'Continue' }).click();
}

async function enterManualW2(page, {
  wages = '12000',
  fedWithheld = '1200',
  ssWithheld = '744',
  medicareWithheld = '174',
  state = '',
  stateWages = '',
  stateWithheld = ''
} = {}) {
  await page.getByLabel('Box 1: wages, tips, other compensation').fill(wages);
  await page.getByLabel('Box 2: federal income tax withheld').fill(fedWithheld);
  await page.getByLabel('Box 4: Social Security tax withheld').fill(ssWithheld);
  await page.getByLabel('Box 6: Medicare tax withheld').fill(medicareWithheld);
  await page.getByLabel('Box 15: state').selectOption(state);
  await page.getByLabel('Box 16: state wages').fill(stateWages);
  await page.getByLabel('Box 17: state tax withheld').fill(stateWithheld);
  await page.getByRole('button', { name: 'Continue' }).click();
}

async function completeTreatyDetails(page) {
  await page.getByLabel('Your tax treaty country (residence country with a US treaty claim)').selectOption('');
  await page.getByLabel('Country of citizenship').selectOption('Canada');
  await page.getByLabel('Country where you claim tax residence').selectOption('Canada');
  await page.getByRole('button', { name: 'Continue' }).click();
}

async function downloadPages(page) {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download your PDF' }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return { download, pages: await extractPdfText(page, Buffer.concat(chunks)) };
}

function findPage(pages, predicate, from = 0) {
  return pages.findIndex((text, index) => index >= from && predicate(text));
}

test('resident green-card holder is refused a Form 1040-NR path', async ({ page }) => {
  await page.goto('/nr.html');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Do you have a green card (or one pending that was approved)?').selectOption('yes');
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByRole('heading', { name: 'You file a different form for 2025' })).toBeVisible();
  await expect(page.getByText(/Resident aliens file Form 1040, not Form 1040-NR/)).toBeVisible();
  await expect(page.getByLabel('SSN or ITIN')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Download your PDF' })).toHaveCount(0);
});

test('zero-income interview routes back toward Form 8843 instead of an empty return', async ({ page }) => {
  await beginNonresidentInterview(page);
  await expect(page.getByRole('heading', { name: 'Step 3 of 6: your documents' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByRole('heading', { name: 'No income to report?' })).toBeVisible();
  const form8843Link = page.getByRole('link', { name: 'Form 8843' });
  await expect(form8843Link).toHaveAttribute('href', 'prepare.html');
  await expect(page.getByRole('link', { name: 'Download your PDF' })).toHaveCount(0);
});

test('manual nonresident entry keeps the identifier last and downloads the federal package in order', async ({ page }) => {
  const consoleMessages = [];
  page.on('console', message => consoleMessages.push(message.text()));

  expectUnverifiedStateCase('tx-no-tax');
  await beginNonresidentInterview(page, 'TX');
  await enterManualW2(page, { state: 'TX', stateWages: '12000' });
  await completeTreatyDetails(page);

  await expect(page.getByRole('heading', { name: 'Step 5 of 6: your federal result for 2025' })).toBeVisible();
  await expect(page.getByText('Total wages (line 1a)')).toBeVisible();
  await expect(page.getByLabel('SSN or ITIN')).toHaveCount(0);
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByRole('heading', { name: 'Step 6 of 6: your state return' })).toBeVisible();
  await expect(page.getByText(/TX has no state income tax on wages/i)).toBeVisible();
  await expect(page.getByLabel('SSN or ITIN')).toHaveCount(0);
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByRole('heading', { name: 'Last step: your SSN or ITIN' })).toBeVisible();
  await expect(page.getByLabel('SSN or ITIN')).toHaveCount(1);
  await page.getByLabel('SSN or ITIN').fill(syntheticTin);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Your 1040-NR package is ready' })).toBeVisible();
  expect(await page.evaluate(() => ({
    localStorage: localStorage.length,
    sessionStorage: sessionStorage.length,
    cookies: document.cookie
  }))).toEqual({ localStorage: 0, sessionStorage: 0, cookies: '' });

  const { download, pages } = await downloadPages(page);
  expect(download.suggestedFilename()).toBe('my1040nr-1040nr-2025.pdf');
  expect(download.suggestedFilename().includes(syntheticTin)).toBe(false);
  expect(pages.length).toBeGreaterThanOrEqual(4);
  expect(pages[0].toLowerCase()).toContain('mailing slip: form 1040-nr');
  expect(pages[1].toLowerCase()).toContain('your 2025 summary');
  const federalIndex = findPage(pages, text => /1040-NR/i.test(text), 2);
  const scheduleOiIndex = findPage(pages, text => /^\s*SCHEDULE OI\b/i.test(text), 2);
  expect(federalIndex).toBeGreaterThan(1);
  expect(scheduleOiIndex).toBeGreaterThan(federalIndex);
  expect(consoleMessages.every(message => !message.includes(syntheticTin))).toBe(true);
});

test('synthetic W-2 candidates require confirmation and no-state-row acknowledgement before calculation', async ({ page }) => {
  const externalRequests = [];
  page.on('request', request => {
    if (new URL(request.url()).origin !== appOrigin) externalRequests.push(request.url());
  });

  await beginNonresidentInterview(page);
  await expect(page.getByRole('heading', { name: 'Step 3 of 6: your documents' })).toBeVisible();
  const syntheticW2Bytes = await page.evaluate(async () => {
    const document = await PDFLib.PDFDocument.create();
    const font = await document.embedFont(PDFLib.StandardFonts.Helvetica);
    const sheet = document.addPage([612, 792]);
    sheet.drawText('W-2 Wage and Tax Statement', { x: 50, y: 740, size: 18, font });
    [
      ['1 Wages, tips, other compensation', '12000.00'],
      ['2 Federal income tax withheld', '1200.00'],
      ['4 Social Security tax withheld', '744.00'],
      ['6 Medicare tax withheld', '174.00']
    ].forEach(([label, amount], index) => {
      const y = 680 - index * 40;
      sheet.drawText(label, { x: 50, y, size: 10, font });
      sheet.drawText(amount, { x: 460, y, size: 10, font });
    });
    return document.save();
  });

  await page.getByLabel('W-2 PDF (you can add several)').setInputFiles({
    name: 'fictional-w2.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(syntheticW2Bytes)
  });
  await expect(page.getByRole('heading', { name: 'Step 3 of 6: check the numbers we read' })).toBeVisible();
  const desktopReview = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    columns: getComputedStyle(document.querySelector('.review-grid')).gridTemplateColumns
  }));
  expect(desktopReview.document).toBeLessThanOrEqual(desktopReview.viewport);
  expect(desktopReview.columns.trim().split(/\s+/)).toHaveLength(2);
  await page.setViewportSize({ width: 375, height: 812 });
  const mobileReview = await page.evaluate(() => {
    const selectors = ['.review-grid', '.doc-chips', '.review-fields', '.canvas-wrap', '.rv-field', '.upload-panel'];
    return {
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
      panels: selectors.map(selector => {
        const element = document.querySelector(selector);
        const bounds = element.getBoundingClientRect();
        return { selector, left: bounds.left, right: bounds.right, width: element.clientWidth, scrollWidth: element.scrollWidth };
      })
    };
  });
  expect(mobileReview.document).toBeLessThanOrEqual(mobileReview.viewport);
  expect(mobileReview.panels.every(panel =>
    panel.left >= 0 && panel.right <= mobileReview.viewport && panel.scrollWidth <= panel.width
  )).toBe(true);
  const candidateValues = [
    ['Box 1: wages, tips, other compensation', '12000'],
    ['Box 2: federal income tax withheld', '1200'],
    ['Box 4: Social Security tax withheld', '744'],
    ['Box 6: Medicare tax withheld', '174']
  ];
  const candidateRows = [];
  for (const [label, value] of candidateValues) {
    const input = page.getByLabel(label);
    await expect(input).toHaveValue(value);
    const row = page.locator('.rv-field').filter({ has: input });
    await expect(row).toContainText('Needs review');
    candidateRows.push(row);
  }
  const continueButton = page.getByRole('button', { name: 'Continue' });
  const noStateRow = page.getByLabel('This W-2 has no state row (boxes 15 to 17 are empty)');
  await expect(continueButton).toBeDisabled();
  for (const row of candidateRows) {
    await row.getByRole('button', { name: 'This matches' }).click();
  }
  await expect(continueButton).toBeDisabled();
  await noStateRow.check();
  await expect(continueButton).toBeEnabled();
  await continueButton.click();

  await completeTreatyDetails(page);
  await expect(page.getByRole('heading', { name: 'Step 5 of 6: your federal result for 2025' })).toBeVisible();
  await expect(page.getByRole('row', { name: /Total wages \(line 1a\).*?\$12,000/ })).toBeVisible();
  expect(externalRequests.length).toBe(0);
});

test('California prepared-state package puts its separate slip before the state form', async ({ page }) => {
  expectUnverifiedStateCase('ca-wages');
  await beginNonresidentInterview(page, 'CA');
  await enterManualW2(page, {
    state: 'CA',
    stateWages: '12000',
    stateWithheld: '400'
  });
  await completeTreatyDetails(page);
  await expect(page.getByRole('heading', { name: 'Step 5 of 6: your federal result for 2025' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByRole('heading', { name: 'Step 6 of 6: your state return' })).toBeVisible();
  await expect(page.getByText(/CA nonresident return/i)).toBeVisible();
  await expect(page.getByText(/OWN envelope to the state/i)).toBeVisible();
  await expect(page.getByLabel('SSN or ITIN')).toHaveCount(0);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Last step: your SSN or ITIN' })).toBeVisible();
  await page.getByLabel('SSN or ITIN').fill(syntheticTin);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Your 1040-NR package is ready' })).toBeVisible();

  const { download, pages } = await downloadPages(page);
  expect(download.suggestedFilename()).toBe('my1040nr-1040nr-2025.pdf');
  expect(pages[0].toLowerCase()).toContain('mailing slip: form 1040-nr');
  expect(pages[1].toLowerCase()).toContain('your 2025 summary');
  const federalIndex = findPage(pages, text => /1040-NR/i.test(text), 2);
  const scheduleOiIndex = findPage(pages, text => /^\s*SCHEDULE OI\b/i.test(text), 2);
  const stateSlipIndex = findPage(pages, text => /State mailing slip: Form 540NR/i.test(text));
  const stateFormIndex = findPage(pages, text => /540NR/i.test(text) && !/State mailing slip/i.test(text), stateSlipIndex + 1);
  expect(federalIndex).toBeGreaterThan(1);
  expect(scheduleOiIndex).toBeGreaterThan(federalIndex);
  expect(stateSlipIndex).toBeGreaterThan(scheduleOiIndex);
  expect(stateFormIndex).toBeGreaterThan(stateSlipIndex);
  expect(pages[stateSlipIndex]).toMatch(/OWN envelope to the state/i);
});
