'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  computeNR,
  stateDetermination,
  stateCalc,
  stateFormFor
} = require('../../app-core.js');
const stateCases = require('../fixtures/state-cases.js');

test('state determination fixtures retain source and verification metadata', () => {
  assert.ok(stateCases.length >= 25);
  for (const fixture of stateCases) {
    assert.ok(fixture.id);
    assert.equal(fixture.taxYear, 2025);
    assert.ok(fixture.source, `${fixture.id} has a source citation`);
    assert.equal(fixture.verificationStatus, 'verified');
    assert.ok(fixture.input);
    assert.ok(fixture.expected);
  }
});

test('state determination matches the verified fixture matrix', async (t) => {
  for (const fixture of stateCases) {
    await t.test(fixture.id, () => {
      assert.equal(fixture.verificationStatus, 'verified');
      const result = stateDetermination(fixture.input, computeNR({
        status: 'single',
        treatyCountry: fixture.input.treatyCountry || '',
        wagesW2: fixture.input.federalWages || '0',
        wages1042: '0',
        scholarshipTaxable: fixture.input.scholarshipTaxable || '0',
        fedWithheldW2: '0',
        withheld1042: '0',
        ssTaxW2: '0',
        medTaxW2: '0',
        visaNow: 'F-1'
      }));

      assert.equal(result.action, fixture.expected.action);
    });
  }
});

test('state calculation outcomes reconcile withholding, tax, refunds, and amounts owed', () => {
  const federalInput = {
    status: 'single',
    treatyCountry: '',
    wagesW2: '12000',
    wages1042: '0',
    scholarshipTaxable: '0',
    fedWithheldW2: '0',
    withheld1042: '0',
    ssTaxW2: '0',
    medTaxW2: '0',
    visaNow: 'F-1'
  };
  const federal = computeNR(federalInput);
  const inputs = {
    CA: { stCode: 'CA', stWages: '9000', stWithheld: '100' },
    NY: { stCode: 'NY', stWages: '9000', stWithheld: '100' },
    MA: { stCode: 'MA', stWages: '9000', stWithheld: '100' },
    IL: { stCode: 'IL', stWages: '9000', stWithheld: '100' }
  };

  for (const [stateCode, input] of Object.entries(inputs)) {
    const calculation = stateCalc(stateCode, input, federal);
    assert.ok(calculation, `${stateCode} has a calculation`);
    assert.equal(calculation.payments, 100);
    assert.equal(calculation.refund, Math.max(0, calculation.payments - calculation.tax));
    assert.equal(calculation.owed, Math.max(0, calculation.tax - calculation.payments));
    assert.ok(calculation.refund === 0 || calculation.owed === 0);
  }
});

test('unprepared state codes do not return a supported-state calculation', () => {
  assert.equal(stateCalc('OR', { stCode: 'OR', stWages: '10000', stWithheld: '0' }, {}), null);
});

test('California uses the official 2025 figures (FTB Tax News, October 2025)', () => {
  // $40,000 of CA wages: standard deduction $5,706, Schedule X brackets,
  // $153 exemption credit. Before the 2026-11-16 correction the engine used
  // a $5,537 deduction and the 2024 brackets (tax $608, refund $892).
  const federal = computeNR({
    status: 'single', treatyCountry: '', wagesW2: '40000', wages1042: '0',
    scholarshipTaxable: '0', fedWithheldW2: '0', withheld1042: '0',
    ssTaxW2: '0', medTaxW2: '0', visaNow: 'F-1'
  });
  const ca = stateCalc('CA', { stCode: 'CA', stWages: '40000', stWithheld: '1500', scholarshipTaxable: '0' }, federal);
  assert.equal(ca.l18, 5706);
  assert.equal(ca.l19, 34294);
  assert.equal(ca.l31, 736);
  assert.equal(ca.tax, 583);
  assert.equal(ca.refund, 917);

  const federal15 = computeNR({
    status: 'single', treatyCountry: '', wagesW2: '15000', wages1042: '0',
    scholarshipTaxable: '0', fedWithheldW2: '0', withheld1042: '0',
    ssTaxW2: '0', medTaxW2: '0', visaNow: 'F-1'
  });
  const ca15 = stateCalc('CA', { stCode: 'CA', stWages: '15000', stWithheld: '400', scholarshipTaxable: '0' }, federal15);
  assert.equal(ca15.l19, 9294);
  assert.equal(ca15.tax, 0);
  assert.equal(ca15.refund, 400);
});

test('Massachusetts subtracts treaty-exempt wages (DOR Directive 87-4)', () => {
  // China treaty student: $17,000 on the W-2, of which $5,000 is exempt
  // under Article 20(c). Massachusetts follows the federal exclusion
  // (Schedule Y, line 4b), so MA taxes $12,000, not $17,000. Before the
  // 2026-11-16 fix the engine taxed the full $17,000 (tax $630).
  const federal = computeNR({
    status: 'single', treatyCountry: 'China', wagesW2: '17000', wages1042: '0',
    scholarshipTaxable: '0', fedWithheldW2: '0', withheld1042: '0',
    ssTaxW2: '0', medTaxW2: '0', visaNow: 'F-1'
  });
  const ma = stateCalc('MA', { stCode: 'MA', stWages: '17000', stWithheld: '380', scholarshipTaxable: '0' }, federal);
  assert.equal(ma.treatyExempt, 5000);
  assert.equal(ma.maIncome, 12000);
  assert.equal(ma.taxable, 7600);
  assert.equal(ma.tax, 380);
  assert.equal(ma.refund, 0);
  assert.equal(ma.owed, 0);
});

test('Illinois mailing addresses match the 2025 IL-1040 instructions', () => {
  const il = stateFormFor(2025, 'IL');
  assert.match(il.addrRefund, /PO Box 19041, Springfield, IL 62794-9041/);
  assert.match(il.addrOwe, /PO Box 19027, Springfield, IL 62794-9027/);
});

test('California treaty allocation never exceeds 100 percent (China add-back)', () => {
  // W-2 box 16 is gross CA wages and already includes the $5,000 treaty-
  // exempt part. Before the 2026-11-16 fix, computeCA added the exempt
  // share to CA-source income a second time: the allocation ratio hit
  // 125 percent and the prorated exemption credit $191, above the $153
  // statutory credit. Correct: tax $22, refund $978, credit exactly $153.
  const federal = computeNR({
    status: 'single', treatyCountry: 'China', wagesW2: '20000', wages1042: '0',
    scholarshipTaxable: '0', fedWithheldW2: '0', withheld1042: '0',
    ssTaxW2: '0', medTaxW2: '0', visaNow: 'F-1'
  });
  const ca = stateCalc('CA', { stCode: 'CA', stWages: '20000', stWithheld: '1000', scholarshipTaxable: '0' }, federal);
  assert.equal(ca.caAGI, 20000);
  assert.equal(ca.l35, 14294);
  assert.equal(ca.pct, 1);
  assert.equal(ca.l39, 153);
  assert.equal(ca.tax, 22);
  assert.equal(ca.refund, 978);

  // Partial California: $30,000 of total wages, $20,000 of them CA wages.
  const federalP = computeNR({
    status: 'single', treatyCountry: 'China', wagesW2: '30000', wages1042: '0',
    scholarshipTaxable: '0', fedWithheldW2: '0', withheld1042: '0',
    ssTaxW2: '0', medTaxW2: '0', visaNow: 'F-1'
  });
  const caP = stateCalc('CA', { stCode: 'CA', stWages: '20000', stWithheld: '600', scholarshipTaxable: '0' }, federalP);
  assert.equal(caP.caAGI, 20000);
  assert.equal(caP.totalAll, 30000);
  assert.equal(caP.l39, 102);
  assert.equal(caP.tax, 148);
  assert.equal(caP.refund, 452);
});
