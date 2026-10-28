const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../../app-core.js');

test('every registered tax year carries a complete rules entry', () => {
  for (const year of core.availableYears()) {
    const r = core.rulesFor(year);
    assert.equal(r.year, year);
    assert.match(r.rulesVersion, new RegExp('^' + year + '\\.'));
    assert.ok(r.standardDeduction > 0);
    assert.ok(Array.isArray(r.brackets.single) && Array.isArray(r.brackets.mfs));
    assert.ok(r.treaties && typeof r.treaties === 'object');
    assert.ok(r.deadlines.federal && r.deadlines.form8843 && r.deadlines.extensionTo);
    assert.ok(r.irsAddress.noPayment.length === 3 && r.irsAddress.payment.length === 2);
    assert.ok(r.forms.f8843 && r.forms.f1040nr && r.forms.schedOI && r.forms.sched1);
    for (const code of r.states.prep) {
      const st = r.states[code];
      assert.ok(st, code);
      assert.ok(st.asset && st.form && st.form.addrRefund && st.form.addrOwe && st.form.deadline, code);
    }
    assert.ok(r.states.noTax.includes('TX'));
  }
});

test('the stamped rules version matches the registry for the default year', () => {
  assert.equal(core.RULES_VERSION, core.rulesFor(core.TAX_YEAR).rulesVersion);
});

test('rulesFor rejects an unregistered tax year', () => {
  assert.throws(() => core.rulesFor(2099), /No rules registered/);
  assert.deepEqual(core.availableYears(), [2025]);
});

test('a new tax year is data only: the engine runs off the registered figures', () => {
  const base = core.TAX_RULES[2025];
  core.TAX_RULES[2099] = Object.assign({}, base, { year: 2099, rulesVersion: '2099.0.1', standardDeduction: 1000 });
  try {
    // India treaty filers claim the standard deduction: a data-only year with
    // a $1,000 deduction must flow straight through the federal computation.
    const c = core.computeNR({ taxYear: 2099, treatyCountry: 'India', wagesW2: '20000', fedWithheldW2: '1500' });
    assert.equal(c.taxYear, 2099);
    assert.equal(c.rulesVersion, '2099.0.1');
    assert.equal(c.line12, 1000);
    assert.equal(c.line15, 19000);
    // Residency must read the day counts keyed to the registered year.
    const res = core.residencyForYear({ taxYear: 2099, visaNow: 'F-1', greenCard: false, days: { 2099: 200, 2098: 0, 2097: 0 }, fjYearsThrough2099: 6 });
    assert.equal(res.resident, true);
    // State figures come from the same registry entry.
    const ca = core.computeCA({ taxYear: 2099, stWages: '15000', stWithheld: '400', scholarshipTaxable: '' }, c);
    assert.equal(ca.l18, base.states.CA.standardDeduction);
    assert.equal(core.stateFormFor(2099, 'CA').form, 'Form 540NR');
  } finally {
    delete core.TAX_RULES[2099];
  }
});
