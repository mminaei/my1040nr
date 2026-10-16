const { test, expect } = require('@playwright/test');
const { extractPdfText } = require('./helpers/pdf-text');

const applicantLabel = 'Social Security number or ITIN (optional)';

async function expectQuestionPromptsAvoidExempt(page) {
  const prompts = await page.locator('fieldset legend, label').allTextContents();
  expect(prompts.every(prompt => !/\bexempt\b/i.test(prompt)),
    'Interview questions should not use the term exempt').toBe(true);
}

async function expectIdentifierNotAsked(page) {
  await expect(page.getByLabel(applicantLabel)).toHaveCount(0);
}

async function completeNoIncomeInterview(page) {
  await expect(page.getByRole('heading', { name: 'Before we start: two quick checks' })).toBeVisible();
  await expectQuestionPromptsAvoidExempt(page);
  await expectIdentifierNotAsked(page);
  await page.getByLabel('No, I had no U.S. income in 2025').check();
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByRole('heading', { name: 'Your name' })).toBeVisible();
  await expectIdentifierNotAsked(page);
  await expectQuestionPromptsAvoidExempt(page);
  await page.getByLabel('First name and middle initial (as on your passport)').fill('Jordan Example');
  await page.getByLabel('Last name (family name)').fill('Sample');
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByRole('heading', { name: 'Your addresses' })).toBeVisible();
  await expectIdentifierNotAsked(page);
  await expectQuestionPromptsAvoidExempt(page);
  await page.getByLabel('Your address in the United States (street, apartment, city, state, ZIP)')
    .fill('123 Fictional Way, Unit 2, Austin, TX');
  await page.getByLabel('Your address in your home country (street, city, postal code, country)')
    .fill('456 Example Street, Sample City, ZZ 00000');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText(/could not find a ZIP code at the end/i)).toBeVisible();
  await page.getByLabel('Your address in the United States (street, apartment, city, state, ZIP)')
    .fill('123 Fictional Way, Unit 2, Austin, TX 78705');
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByRole('heading', { name: 'Your visa and passport' })).toBeVisible();
  await expectIdentifierNotAsked(page);
  await expectQuestionPromptsAvoidExempt(page);
  await page.getByLabel('Type of U.S. visa you entered on').selectOption('F-1');
  await page.getByLabel('Date you entered the United States on this stay').fill('2025-08-15');
  await page.getByLabel('No, it is the same').check();
  await page.getByLabel('Country of citizenship', { exact: true }).selectOption('Canada');
  await page.getByLabel('Country that issued your passport').selectOption('Canada');
  await page.getByLabel('Passport number').fill('EXAMPLE-0001');
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByRole('heading', { name: 'Your days in the United States' })).toBeVisible();
  await expectIdentifierNotAsked(page);
  await expectQuestionPromptsAvoidExempt(page);
  await page.getByLabel('Days you were in the U.S. in 2025').fill('120');
  await page.getByLabel('Days you were in the U.S. in 2024').fill('0');
  await page.getByLabel('Days you were in the U.S. in 2023').fill('0');
  await page.getByLabel(/Of your 2025 days/).fill('120');
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByRole('heading', { name: 'Your school' })).toBeVisible();
  await expectIdentifierNotAsked(page);
  await expectQuestionPromptsAvoidExempt(page);
  await page.getByLabel('Name, address, and telephone number of the school you attended in 2025')
    .fill('Example University, Sample Campus, Austin, TX 78705, (512) 555-0100');
  await page.getByLabel('Name, address, and telephone number of the director of your academic program (your department or program office)')
    .fill('Example Program Office, (512) 555-0101');
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByRole('heading', { name: 'Your earlier years, and two yes or no questions' })).toBeVisible();
  await expectIdentifierNotAsked(page);
  await expectQuestionPromptsAvoidExempt(page);
  await page.getByLabel('No (5 years or fewer)').check();
  await page.getByLabel('No', { exact: true }).check();
  await expect(page.getByLabel('Explain the step you took (Form 8843 line 14)')).toHaveCount(0);
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByRole('heading', { name: 'Last step: your U.S. taxpayer number, if you have one' })).toBeVisible();
  await expect(page.getByLabel(applicantLabel)).toHaveCount(1);
  await expectQuestionPromptsAvoidExempt(page);
}

test('Form 8843 interview preserves order and restarts after reload', async ({ page }) => {
  await page.goto('/prepare.html');
  await expect(page.getByRole('heading', { name: 'Before we start: two quick checks' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Your name' })).toBeVisible();
  await page.getByLabel('First name and middle initial (as on your passport)').fill('Jordan Example');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Your addresses' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Before we start: two quick checks' })).toBeVisible();
  await expect(page.getByLabel('First name and middle initial (as on your passport)')).toHaveCount(0);
  await expectIdentifierNotAsked(page);
  await completeNoIncomeInterview(page);
});

test('Form 8843 download has the expected filename, page order, and selected output', async ({ page }) => {
  await page.goto('/prepare.html');
  await completeNoIncomeInterview(page);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Make my PDF' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('My1040NR-Form-8843-2025.pdf');
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const pages = await extractPdfText(page, Buffer.concat(chunks));

  expect(pages.length === 4, 'Generated PDF should contain exactly four pages').toBe(true);
  expect(pages[0].toLowerCase().includes('mailing slip: not an irs form'),
    'PDF page 1 should be the mailing slip').toBe(true);
  expect(pages[1].toLowerCase().includes('your form 8843 is ready: what to do next'),
    'PDF page 2 should contain the filing instructions').toBe(true);
  expect(pages[2].toUpperCase().includes('JORDAN EXAMPLE'),
    'PDF page 3 should contain the filled Form 8843 first page').toBe(true);
  expect(pages[3].toLowerCase().includes('sign here'),
    'PDF page 4 should contain the Form 8843 signature page').toBe(true);

  const fullText = pages.join(' ').toUpperCase();
  const selectedValues = ['JORDAN EXAMPLE SAMPLE', '123 FICTIONAL WAY', 'CANADA', 'EXAMPLE UNIVERSITY'];
  expect(selectedValues.every(value => fullText.includes(value)),
    'Generated PDF should include the selected fictional interview answers').toBe(true);
  expect(fullText.includes('2025.1.0'), 'Generated PDF should include the rules version').toBe(true);
});

test('income notice links to the implemented Form 1040-NR preparer', async ({ page }) => {
  await page.goto('/prepare.html');
  await page.getByLabel('Yes, I had U.S. income in 2025').check();
  const preparerLink = page.getByRole('link', { name: 'Form 1040-NR preparer' });
  await expect(preparerLink).toHaveAttribute('href', 'nr.html');
  await preparerLink.click();
  await expect(page).toHaveURL(/\/nr\.html$/);
  await expect(page.getByRole('heading', { name: 'Prepare your Form 1040-NR (2025)' })).toBeVisible();
});