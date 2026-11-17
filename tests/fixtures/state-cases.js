'use strict';

/* Verification pass, 2026-11-16: every case below was checked against the
   official source named in its source string. Cases for CA, NY, MA and IL
   rest on that state's 2025 instructions or tax department guidance. The
   no-tax cases rest on each state having no individual income tax on
   wages. The last four cases encode product behavior from the spec (not
   tax law): an unprepared state falls back to a worksheet, withholding
   alone triggers a refund-only preparation, and no state row means no
   state determination. */
const caSource = 'FTB Tax News, October 2025 (2025 standard deduction $5,706, exemption credit $153, Schedule X); 2025 Form 540NR booklet and Schedule CA (540NR) instructions (California does not conform to federal treaty exemptions; treaty-exempt wages added back); mailing addresses as printed on the 2025 Form 540NR';
const nySource = '2025 Instructions for Form IT-203 (standard deduction table: $8,000 single; New York State tax rate schedule; who must file). New York starts from federal AGI, so wages exempt by treaty stay excluded';
const maSource = 'Mass. DOR: Legal and Residency Status and MA gross income guidance for nonresidents (Massachusetts recognizes the federal treaty exclusion, Directive 87-4, Schedule Y line 4b); 2025 Form 1-NR/PY ($4,400 personal exemption, 5 percent rate, line 15a FICA deduction cap $2,000); mailing addresses as printed on the form';
const ilSource = '2025 IL-1040 Instructions (exemption allowance $2,850, rate 4.95 percent, due April 15, 2026, PO Box 19041 and PO Box 19027 mailing addresses); IL-1040 starts from federal AGI, so wages exempt by treaty stay excluded; Schedule NR apportionment';
const noTaxSource = 'No individual income tax on wages (state DOR sources). NH taxed only interest and dividends, and that tax was repealed effective January 1, 2025; the TN Hall tax was repealed January 1, 2021 and never applied to wages';
const behaviorSource = 'docs/PRODUCT-SPEC.md sections 9.3, 9.4 and 9.6 (product determination behavior, not a tax rule)';

module.exports = [
  { id: 'ca-wages', taxYear: 2025, source: caSource, verificationStatus: 'verified', input: { stCode: 'CA', stWages: '12000', stWithheld: '400' }, expected: { action: 'prepare' } },
  { id: 'ca-withholding-only', taxYear: 2025, source: caSource, verificationStatus: 'verified', input: { stCode: 'CA', stWages: '0', stWithheld: '25' }, expected: { action: 'prepare-refund-only' } },
  { id: 'ca-no-income', taxYear: 2025, source: caSource, verificationStatus: 'verified', input: { stCode: 'CA', stWages: '0', stWithheld: '0' }, expected: { action: 'worksheet' } },
  { id: 'ca-treaty-income', taxYear: 2025, source: `${caSource}; treaty add-back per Schedule CA (540NR)`, verificationStatus: 'verified', input: { stCode: 'CA', stWages: '8000', stWithheld: '0', treatyCountry: 'China', federalWages: '5000' }, expected: { action: 'prepare' } },
  { id: 'ca-scholarship-only', taxYear: 2025, source: caSource, verificationStatus: 'verified', input: { stCode: 'CA', stWages: '0', scholarshipTaxable: '1200', stWithheld: '0' }, expected: { action: 'worksheet' } },

  { id: 'ny-wages', taxYear: 2025, source: nySource, verificationStatus: 'verified', input: { stCode: 'NY', stWages: '14000', stWithheld: '500' }, expected: { action: 'prepare' } },
  { id: 'ny-withholding-only', taxYear: 2025, source: nySource, verificationStatus: 'verified', input: { stCode: 'NY', stWages: '0', stWithheld: '35' }, expected: { action: 'prepare-refund-only' } },
  { id: 'ny-no-income', taxYear: 2025, source: nySource, verificationStatus: 'verified', input: { stCode: 'NY', stWages: '0', stWithheld: '0' }, expected: { action: 'worksheet' } },
  { id: 'ny-treaty-income', taxYear: 2025, source: nySource, verificationStatus: 'verified', input: { stCode: 'NY', stWages: '9500', stWithheld: '0', treatyCountry: 'China', federalWages: '5000' }, expected: { action: 'prepare' } },
  { id: 'ny-scholarship-only', taxYear: 2025, source: nySource, verificationStatus: 'verified', input: { stCode: 'NY', stWages: '0', scholarshipTaxable: '900', stWithheld: '0' }, expected: { action: 'worksheet' } },

  { id: 'ma-wages', taxYear: 2025, source: maSource, verificationStatus: 'verified', input: { stCode: 'MA', stWages: '13000', stWithheld: '450' }, expected: { action: 'prepare' } },
  { id: 'ma-withholding-only', taxYear: 2025, source: maSource, verificationStatus: 'verified', input: { stCode: 'MA', stWages: '0', stWithheld: '40' }, expected: { action: 'prepare-refund-only' } },
  { id: 'ma-no-income', taxYear: 2025, source: maSource, verificationStatus: 'verified', input: { stCode: 'MA', stWages: '0', stWithheld: '0' }, expected: { action: 'worksheet' } },
  { id: 'ma-treaty-income', taxYear: 2025, source: `${maSource}; treaty-exempt wages subtracted, not added back`, verificationStatus: 'verified', input: { stCode: 'MA', stWages: '7000', stWithheld: '0', treatyCountry: 'China', federalWages: '5000' }, expected: { action: 'prepare' } },
  { id: 'ma-scholarship-only', taxYear: 2025, source: maSource, verificationStatus: 'verified', input: { stCode: 'MA', stWages: '0', scholarshipTaxable: '1000', stWithheld: '0' }, expected: { action: 'worksheet' } },

  { id: 'il-wages', taxYear: 2025, source: ilSource, verificationStatus: 'verified', input: { stCode: 'IL', stWages: '11000', stWithheld: '300' }, expected: { action: 'prepare' } },
  { id: 'il-withholding-only', taxYear: 2025, source: ilSource, verificationStatus: 'verified', input: { stCode: 'IL', stWages: '0', stWithheld: '20' }, expected: { action: 'prepare-refund-only' } },
  { id: 'il-no-income', taxYear: 2025, source: ilSource, verificationStatus: 'verified', input: { stCode: 'IL', stWages: '0', stWithheld: '0' }, expected: { action: 'worksheet' } },
  { id: 'il-treaty-income', taxYear: 2025, source: ilSource, verificationStatus: 'verified', input: { stCode: 'IL', stWages: '6000', stWithheld: '0', treatyCountry: 'China', federalWages: '5000' }, expected: { action: 'prepare' } },
  { id: 'il-scholarship-only', taxYear: 2025, source: ilSource, verificationStatus: 'verified', input: { stCode: 'IL', stWages: '0', scholarshipTaxable: '800', stWithheld: '0' }, expected: { action: 'worksheet' } },

  { id: 'ak-no-tax', taxYear: 2025, source: noTaxSource, verificationStatus: 'verified', input: { stCode: 'AK', stWages: '9000', stWithheld: '0' }, expected: { action: 'notax' } },
  { id: 'fl-no-tax', taxYear: 2025, source: noTaxSource, verificationStatus: 'verified', input: { stCode: 'FL', stWages: '9000', stWithheld: '0' }, expected: { action: 'notax' } },
  { id: 'nv-no-tax', taxYear: 2025, source: noTaxSource, verificationStatus: 'verified', input: { stCode: 'NV', stWages: '9000', stWithheld: '0' }, expected: { action: 'notax' } },
  { id: 'nh-no-tax', taxYear: 2025, source: noTaxSource, verificationStatus: 'verified', input: { stCode: 'NH', stWages: '9000', stWithheld: '0' }, expected: { action: 'notax' } },
  { id: 'sd-no-tax', taxYear: 2025, source: noTaxSource, verificationStatus: 'verified', input: { stCode: 'SD', stWages: '9000', stWithheld: '0' }, expected: { action: 'notax' } },
  { id: 'tn-no-tax', taxYear: 2025, source: noTaxSource, verificationStatus: 'verified', input: { stCode: 'TN', stWages: '9000', stWithheld: '0' }, expected: { action: 'notax' } },
  { id: 'tx-no-tax', taxYear: 2025, source: noTaxSource, verificationStatus: 'verified', input: { stCode: 'TX', stWages: '9000', stWithheld: '0' }, expected: { action: 'notax' } },
  { id: 'wa-no-tax', taxYear: 2025, source: noTaxSource, verificationStatus: 'verified', input: { stCode: 'WA', stWages: '9000', stWithheld: '0' }, expected: { action: 'notax' } },
  { id: 'wy-no-tax', taxYear: 2025, source: noTaxSource, verificationStatus: 'verified', input: { stCode: 'WY', stWages: '9000', stWithheld: '0' }, expected: { action: 'notax' } },

  { id: 'unsupported-wages-worksheet', taxYear: 2025, source: behaviorSource, verificationStatus: 'verified', input: { stCode: 'OR', stWages: '10000', stWithheld: '0' }, expected: { action: 'worksheet' } },
  { id: 'unsupported-withholding-only', taxYear: 2025, source: behaviorSource, verificationStatus: 'verified', input: { stCode: 'OR', stWages: '0', stWithheld: '15' }, expected: { action: 'prepare-refund-only' } },
  { id: 'no-state-row-no-income', taxYear: 2025, source: behaviorSource, verificationStatus: 'verified', input: { stCode: '', stWages: '0', stWithheld: '0' }, expected: { action: 'none' } },
  { id: 'no-state-row-federal-treaty-income', taxYear: 2025, source: behaviorSource, verificationStatus: 'verified', input: { stCode: '', stWages: '0', stWithheld: '0', treatyCountry: 'China', federalWages: '5000' }, expected: { action: 'none' } }
];
