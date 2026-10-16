'use strict';

const projectSource = 'app-core.js: State pipeline v1; docs/PRODUCT-SPEC.md §9.3 (project rule set; legal claims remain TODO_VERIFY)';

module.exports = [
  { id: 'ca-wages', taxYear: 2025, source: `${projectSource}; assets/ca-540nr.pdf`, verificationStatus: 'TODO_VERIFY', input: { stCode: 'CA', stWages: '12000', stWithheld: '400' }, expected: { action: 'prepare' } },
  { id: 'ca-withholding-only', taxYear: 2025, source: `${projectSource}; assets/ca-540nr.pdf`, verificationStatus: 'TODO_VERIFY', input: { stCode: 'CA', stWages: '0', stWithheld: '25' }, expected: { action: 'prepare-refund-only' } },
  { id: 'ca-no-income', taxYear: 2025, source: `${projectSource}; assets/ca-540nr.pdf`, verificationStatus: 'TODO_VERIFY', input: { stCode: 'CA', stWages: '0', stWithheld: '0' }, expected: { action: 'worksheet' } },
  { id: 'ca-treaty-income', taxYear: 2025, source: `${projectSource}; assets/ca-540nr.pdf; treaty add-back behavior TODO_VERIFY`, verificationStatus: 'TODO_VERIFY', input: { stCode: 'CA', stWages: '8000', stWithheld: '0', treatyCountry: 'China', federalWages: '5000' }, expected: { action: 'prepare' } },
  { id: 'ca-scholarship-only', taxYear: 2025, source: `${projectSource}; assets/ca-540nr.pdf`, verificationStatus: 'TODO_VERIFY', input: { stCode: 'CA', stWages: '0', scholarshipTaxable: '1200', stWithheld: '0' }, expected: { action: 'worksheet' } },

  { id: 'ny-wages', taxYear: 2025, source: `${projectSource}; assets/ny-it203.pdf`, verificationStatus: 'TODO_VERIFY', input: { stCode: 'NY', stWages: '14000', stWithheld: '500' }, expected: { action: 'prepare' } },
  { id: 'ny-withholding-only', taxYear: 2025, source: `${projectSource}; assets/ny-it203.pdf`, verificationStatus: 'TODO_VERIFY', input: { stCode: 'NY', stWages: '0', stWithheld: '35' }, expected: { action: 'prepare-refund-only' } },
  { id: 'ny-no-income', taxYear: 2025, source: `${projectSource}; assets/ny-it203.pdf`, verificationStatus: 'TODO_VERIFY', input: { stCode: 'NY', stWages: '0', stWithheld: '0' }, expected: { action: 'worksheet' } },
  { id: 'ny-treaty-income', taxYear: 2025, source: `${projectSource}; assets/ny-it203.pdf; treaty treatment TODO_VERIFY`, verificationStatus: 'TODO_VERIFY', input: { stCode: 'NY', stWages: '9500', stWithheld: '0', treatyCountry: 'China', federalWages: '5000' }, expected: { action: 'prepare' } },
  { id: 'ny-scholarship-only', taxYear: 2025, source: `${projectSource}; assets/ny-it203.pdf`, verificationStatus: 'TODO_VERIFY', input: { stCode: 'NY', stWages: '0', scholarshipTaxable: '900', stWithheld: '0' }, expected: { action: 'worksheet' } },

  { id: 'ma-wages', taxYear: 2025, source: `${projectSource}; assets/ma-1nrpy.pdf`, verificationStatus: 'TODO_VERIFY', input: { stCode: 'MA', stWages: '13000', stWithheld: '450' }, expected: { action: 'prepare' } },
  { id: 'ma-withholding-only', taxYear: 2025, source: `${projectSource}; assets/ma-1nrpy.pdf`, verificationStatus: 'TODO_VERIFY', input: { stCode: 'MA', stWages: '0', stWithheld: '40' }, expected: { action: 'prepare-refund-only' } },
  { id: 'ma-no-income', taxYear: 2025, source: `${projectSource}; assets/ma-1nrpy.pdf`, verificationStatus: 'TODO_VERIFY', input: { stCode: 'MA', stWages: '0', stWithheld: '0' }, expected: { action: 'worksheet' } },
  { id: 'ma-treaty-income', taxYear: 2025, source: `${projectSource}; assets/ma-1nrpy.pdf; treaty add-back behavior TODO_VERIFY`, verificationStatus: 'TODO_VERIFY', input: { stCode: 'MA', stWages: '7000', stWithheld: '0', treatyCountry: 'China', federalWages: '5000' }, expected: { action: 'prepare' } },
  { id: 'ma-scholarship-only', taxYear: 2025, source: `${projectSource}; assets/ma-1nrpy.pdf`, verificationStatus: 'TODO_VERIFY', input: { stCode: 'MA', stWages: '0', scholarshipTaxable: '1000', stWithheld: '0' }, expected: { action: 'worksheet' } },

  { id: 'il-wages', taxYear: 2025, source: `${projectSource}; assets/il-1040.pdf; Schedule NR instructions not present in repository`, verificationStatus: 'TODO_VERIFY', input: { stCode: 'IL', stWages: '11000', stWithheld: '300' }, expected: { action: 'prepare' } },
  { id: 'il-withholding-only', taxYear: 2025, source: `${projectSource}; assets/il-1040.pdf`, verificationStatus: 'TODO_VERIFY', input: { stCode: 'IL', stWages: '0', stWithheld: '20' }, expected: { action: 'prepare-refund-only' } },
  { id: 'il-no-income', taxYear: 2025, source: `${projectSource}; assets/il-1040.pdf`, verificationStatus: 'TODO_VERIFY', input: { stCode: 'IL', stWages: '0', stWithheld: '0' }, expected: { action: 'worksheet' } },
  { id: 'il-treaty-income', taxYear: 2025, source: `${projectSource}; assets/il-1040.pdf; treaty treatment TODO_VERIFY`, verificationStatus: 'TODO_VERIFY', input: { stCode: 'IL', stWages: '6000', stWithheld: '0', treatyCountry: 'China', federalWages: '5000' }, expected: { action: 'prepare' } },
  { id: 'il-scholarship-only', taxYear: 2025, source: `${projectSource}; assets/il-1040.pdf`, verificationStatus: 'TODO_VERIFY', input: { stCode: 'IL', stWages: '0', scholarshipTaxable: '800', stWithheld: '0' }, expected: { action: 'worksheet' } },

  { id: 'ak-no-tax', taxYear: 2025, source: `${projectSource}; docs/PRODUCT-SPEC.md §9.3 (state list explicitly TODO_VERIFY)`, verificationStatus: 'TODO_VERIFY', input: { stCode: 'AK', stWages: '9000', stWithheld: '0' }, expected: { action: 'notax' } },
  { id: 'fl-no-tax', taxYear: 2025, source: `${projectSource}; docs/PRODUCT-SPEC.md §9.3 (state list explicitly TODO_VERIFY)`, verificationStatus: 'TODO_VERIFY', input: { stCode: 'FL', stWages: '9000', stWithheld: '0' }, expected: { action: 'notax' } },
  { id: 'nv-no-tax', taxYear: 2025, source: `${projectSource}; docs/PRODUCT-SPEC.md §9.3 (state list explicitly TODO_VERIFY)`, verificationStatus: 'TODO_VERIFY', input: { stCode: 'NV', stWages: '9000', stWithheld: '0' }, expected: { action: 'notax' } },
  { id: 'nh-no-tax', taxYear: 2025, source: `${projectSource}; docs/PRODUCT-SPEC.md §9.3 (state list explicitly TODO_VERIFY)`, verificationStatus: 'TODO_VERIFY', input: { stCode: 'NH', stWages: '9000', stWithheld: '0' }, expected: { action: 'notax' } },
  { id: 'sd-no-tax', taxYear: 2025, source: `${projectSource}; docs/PRODUCT-SPEC.md §9.3 (state list explicitly TODO_VERIFY)`, verificationStatus: 'TODO_VERIFY', input: { stCode: 'SD', stWages: '9000', stWithheld: '0' }, expected: { action: 'notax' } },
  { id: 'tn-no-tax', taxYear: 2025, source: `${projectSource}; docs/PRODUCT-SPEC.md §9.3 (state list explicitly TODO_VERIFY)`, verificationStatus: 'TODO_VERIFY', input: { stCode: 'TN', stWages: '9000', stWithheld: '0' }, expected: { action: 'notax' } },
  { id: 'tx-no-tax', taxYear: 2025, source: `${projectSource}; docs/PRODUCT-SPEC.md §9.3 (state list explicitly TODO_VERIFY)`, verificationStatus: 'TODO_VERIFY', input: { stCode: 'TX', stWages: '9000', stWithheld: '0' }, expected: { action: 'notax' } },
  { id: 'wa-no-tax', taxYear: 2025, source: `${projectSource}; docs/PRODUCT-SPEC.md §9.3 (state list explicitly TODO_VERIFY)`, verificationStatus: 'TODO_VERIFY', input: { stCode: 'WA', stWages: '9000', stWithheld: '0' }, expected: { action: 'notax' } },
  { id: 'wy-no-tax', taxYear: 2025, source: `${projectSource}; docs/PRODUCT-SPEC.md §9.3 (state list explicitly TODO_VERIFY)`, verificationStatus: 'TODO_VERIFY', input: { stCode: 'WY', stWages: '9000', stWithheld: '0' }, expected: { action: 'notax' } },

  { id: 'unsupported-wages-worksheet', taxYear: 2025, source: `${projectSource}; docs/PRODUCT-SPEC.md §9.4 (worksheet product requirement; not implemented in the engine)`, verificationStatus: 'TODO_VERIFY', input: { stCode: 'OR', stWages: '10000', stWithheld: '0' }, expected: { action: 'worksheet' } },
  { id: 'unsupported-withholding-only', taxYear: 2025, source: `${projectSource}; docs/PRODUCT-SPEC.md §9.3 (withholding trigger TODO_VERIFY)`, verificationStatus: 'TODO_VERIFY', input: { stCode: 'OR', stWages: '0', stWithheld: '15' }, expected: { action: 'prepare-refund-only' } },
  { id: 'no-state-row-no-income', taxYear: 2025, source: `${projectSource}; docs/PRODUCT-SPEC.md §9.6 (no-income no-state-return case)`, verificationStatus: 'TODO_VERIFY', input: { stCode: '', stWages: '0', stWithheld: '0' }, expected: { action: 'none' } },
  { id: 'no-state-row-federal-treaty-income', taxYear: 2025, source: `${projectSource}; docs/PRODUCT-SPEC.md §9.6 (state source determination unmodeled)`, verificationStatus: 'TODO_VERIFY', input: { stCode: '', stWages: '0', stWithheld: '0', treatyCountry: 'China', federalWages: '5000' }, expected: { action: 'none' } }
];
