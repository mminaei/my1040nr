'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  computeNR,
  stateDetermination,
  stateCalc
} = require('../../app-core.js');
const stateCases = require('../fixtures/state-cases.js');

test('state determination fixtures retain source and verification metadata', () => {
  assert.ok(stateCases.length >= 25);
  for (const fixture of stateCases) {
    assert.ok(fixture.id);
    assert.equal(fixture.taxYear, 2025);
    assert.ok(fixture.source, `${fixture.id} has a source citation`);
    assert.ok(['verified', 'TODO_VERIFY'].includes(fixture.verificationStatus));
    assert.ok(fixture.input);
    assert.ok(fixture.expected);
  }
});

test('state determination matches the explicitly unverified fixture matrix', async (t) => {
  for (const fixture of stateCases) {
    await t.test(fixture.id, () => {
      assert.equal(fixture.verificationStatus, 'TODO_VERIFY');
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
