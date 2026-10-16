'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  computeNR,
  residency2025,
  studentYearCount,
  checkUSAddress
} = require('../../app-core.js');

test('computeNR preserves the wage, scholarship, and withholding line relationships', () => {
  const result = computeNR({
    status: 'single',
    treatyCountry: '',
    wagesW2: '6000',
    wages1042: '0',
    scholarshipTaxable: '400',
    fedWithheldW2: '900',
    withheld1042: '0',
    ssTaxW2: '0',
    medTaxW2: '0',
    visaNow: 'F-1'
  });

  assert.equal(result.line1a, 6000);
  assert.equal(result.line1k, 0);
  assert.equal(result.line1z, result.line1a - result.line1k);
  assert.equal(result.line9, result.line1z + result.line8);
  assert.equal(result.line15, Math.max(0, result.line9 - result.line12));
  assert.equal(result.line33, result.line25a + result.line25g);
  assert.equal(result.refund, Math.max(0, result.line33 - result.line24));
  assert.equal(result.owed, Math.max(0, result.line24 - result.line33));
});

test('studentYearCount counts a calendar year only once', () => {
  assert.equal(studentYearCount({
    firstYear: '2021',
    priorYears: '0',
    visa2022: 'F'
  }), 5);
});

test('TODO_VERIFY: a student within the five-calendar-year limit is nonresident for the SPT calculation', () => {
  const result = residency2025({
    visaNow: 'F-1',
    greenCard: false,
    fjYearsThrough2025: 5,
    days: { 2023: 365, 2024: 365, 2025: 365 }
  });

  assert.equal(result.resident, false);
  assert.equal(result.exempt, true);
});

test('TODO_VERIFY: F and J student exemption changes at the five-calendar-year boundary', () => {
  for (const visaNow of ['F-1', 'J-1']) {
    const fifthYear = residency2025({
      visaNow,
      greenCard: false,
      fjYearsThrough2025: 5,
      days: { 2023: 0, 2024: 0, 2025: 365 }
    });
    const sixthYear = residency2025({
      visaNow,
      greenCard: false,
      fjYearsThrough2025: 6,
      days: { 2023: 0, 2024: 0, 2025: 183 }
    });

    assert.equal(fifthYear.exempt, true, `${visaNow} fifth calendar year`);
    assert.notEqual(sixthYear.exempt, true, `${visaNow} sixth calendar year`);
    assert.equal(sixthYear.resident, true, `${visaNow} sixth calendar year with 183 days`);
  }
});

test('TODO_VERIFY: SPT requires at least 31 current-year days and 183 weighted days', () => {
  const under31Days = residency2025({
    visaNow: 'B-2',
    greenCard: false,
    fjYearsThrough2025: 0,
    days: { 2023: 190, 2024: 365, 2025: 30 }
  });
  const at31Days = residency2025({
    visaNow: 'B-2',
    greenCard: false,
    fjYearsThrough2025: 0,
    days: { 2023: 190, 2024: 365, 2025: 31 }
  });

  assert.equal(under31Days.resident, false);
  assert.equal(under31Days.weighted, 30 + 365 / 3 + 190 / 6);
  assert.equal(at31Days.resident, true);
  assert.equal(at31Days.weighted, 31 + 365 / 3 + 190 / 6);
});

test('TODO_VERIFY: SPT weighted-day threshold applies when current-year minimum is met', () => {
  const belowWeightedThreshold = residency2025({
    visaNow: 'B-2',
    greenCard: false,
    fjYearsThrough2025: 0,
    days: { 2023: 181, 2024: 365, 2025: 31 }
  });
  const atWeightedThreshold = residency2025({
    visaNow: 'B-2',
    greenCard: false,
    fjYearsThrough2025: 0,
    days: { 2023: 182, 2024: 365, 2025: 31 }
  });

  assert.equal(belowWeightedThreshold.weighted, 31 + 365 / 3 + 181 / 6);
  assert.ok(belowWeightedThreshold.weighted < 183);
  assert.equal(belowWeightedThreshold.resident, false);
  assert.ok(atWeightedThreshold.weighted >= 183);
  assert.equal(atWeightedThreshold.resident, true);
});

test('TODO_VERIFY: green-card status overrides the student exemption and day count', () => {
  const result = residency2025({
    visaNow: 'F-1',
    greenCard: true,
    fjYearsThrough2025: 1,
    days: { 2023: 0, 2024: 0, 2025: 0 }
  });

  assert.equal(result.resident, true);
  assert.match(result.why, /Green card test/);
});

test('TODO_VERIFY: single and MFS status both produce federal tax-table line results', () => {
  const base = {
    treatyCountry: '',
    wagesW2: '15000',
    wages1042: '0',
    scholarshipTaxable: '0',
    fedWithheldW2: '0',
    withheld1042: '0',
    ssTaxW2: '0',
    medTaxW2: '0',
    visaNow: 'F-1'
  };
  const single = computeNR({ ...base, status: 'single' });
  const mfs = computeNR({ ...base, status: 'mfs' });

  assert.equal(single.line16, mfs.line16);
  assert.ok(Number.isFinite(single.line16));
  assert.ok(Number.isFinite(mfs.line16));
  assert.equal(single.line16, single.line24);
  assert.equal(mfs.line16, mfs.line24);
  assert.equal(single.refund, 0);
  assert.equal(mfs.refund, 0);
});

test('TODO_VERIFY: single and MFS use their current status-specific worksheet brackets above the tax-table range', () => {
  const base = {
    treatyCountry: '',
    wagesW2: '400000',
    wages1042: '0',
    scholarshipTaxable: '0',
    fedWithheldW2: '0',
    withheld1042: '0',
    ssTaxW2: '0',
    medTaxW2: '0',
    visaNow: 'F-1'
  };
  const single = computeNR({ ...base, status: 'single' });
  const mfs = computeNR({ ...base, status: 'mfs' });

  assert.ok(Number.isFinite(single.line16));
  assert.ok(Number.isFinite(mfs.line16));
  assert.notEqual(single.line16, mfs.line16);
  assert.equal(single.line16, single.line24);
  assert.equal(mfs.line16, mfs.line24);
});

test('TODO_VERIFY: empty numeric fields become zero and negative inputs retain numeric sign', () => {
  const empty = computeNR({
    status: 'single',
    treatyCountry: '',
    wagesW2: '',
    wages1042: '',
    scholarshipTaxable: '',
    fedWithheldW2: '',
    withheld1042: '',
    ssTaxW2: '',
    medTaxW2: '',
    visaNow: ''
  });
  const negative = computeNR({
    status: 'single',
    treatyCountry: '',
    wagesW2: '-100',
    wages1042: '',
    scholarshipTaxable: '',
    fedWithheldW2: '-5',
    withheld1042: '',
    ssTaxW2: '',
    medTaxW2: '',
    visaNow: ''
  });

  assert.equal(empty.line1a, 0);
  assert.equal(empty.line9, 0);
  assert.equal(empty.line33, 0);
  assert.equal(negative.line1a, -100);
  assert.equal(negative.line25a, -5);
  assert.equal(negative.line33, -5);
});

test('US address ZIP validation accepts five digits and ZIP+4', () => {
  assert.deepEqual(checkUSAddress({ zip: '78705', state: 'TX' }), {});
  assert.deepEqual(checkUSAddress({ zip: '78705-1234', state: 'TX' }), {});
});

test('US address validation rejects malformed ZIP codes', () => {
  assert.match(checkUSAddress({ zip: '7870', state: 'TX' }).error, /5 digits/);
});

test('US address validation warns when the ZIP prefix maps to another state', () => {
  assert.match(checkUSAddress({ zip: '10001', state: 'CA' }).warn, /is in NY/);
});
