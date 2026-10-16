# Readiness checklist (reviewed 2026-10-16)

This checklist separates implemented code and regression coverage from verification of tax law and professional readiness. A working path or passing test does not establish that a tax result is correct or suitable for filing.

## Implemented code paths

- **Form 8843:** `prepare.html`, `app.js`, and `app-core.js` implement a browser interview and PDF package using `assets/f8843-2025.pdf`.
- **Form 1040-NR:** `nr.html`, `nr.js`, `doc-extract.js`, and `app-core.js` implement a tax-year 2025 preparation path for the currently supported interview inputs, calculations, federal forms, and selected state flows. The federal path includes the W-2/1042-S interview, local PDF extraction with user review/confirmation, and PDF generation.
- **1040-NR scope limits:** the current interview states that it supports single or married-filing-separately returns without dependents; it does not cover investment, self-employment, or rental income. The project does not prepare Form 4868.
- **State preparation:** the current engine has CA, NY, MA, and IL form paths, but accepts only one W-2 state row. It does not model state residency, part-year residence, mid-year moves, or multiple state rows.
- **Regression suite:** `tests/unit/` and `tests/e2e/` cover selected calculation relationships, fixture behavior, browser flows, generated package structure, and privacy boundaries. See `docs/TESTING.md`.

These are implementation-status statements only. The code is not a professional determination that a user qualifies for a form or that the generated return is complete, correct, or ready to file.

## Verification still required

- Verify federal residency, income, deduction, treaty, withholding, tax, line-mapping, mailing-address, and deadline rules against official instructions and publications for the applicable tax year. Keep unsupported expectations marked `TODO_VERIFY`.
- Verify all state thresholds, rates, allocations, calculations, form mappings, mailing addresses, and filing guidance against each relevant state's tax-year-specific instructions.
- Verify each treaty rule against authoritative IRS treaty sources, including applicable treaty articles and IRS publications.
- Obtain CPA or Enrolled Agent review and sign-off of the federal and state rules, calculations, forms, and generated output before real-world reliance.
- Expand state data and logic before supporting people with multiple state rows, state residency questions, part-year residence, or moves between states. A missing W-2 state row cannot establish that no state filing obligation exists.

The checked-in PDFs in `assets/` are form templates and do not, by themselves, verify tax rules. Source and verification metadata for state regression cases is recorded in `tests/fixtures/state-cases.js`. Passing tests must not be presented as tax-professional validation.

## Product and operational items

- The app is designed as a static, client-side site with no collection or persistence of taxpayer data. Keep all test inputs fictional; never put taxpayer information in the repository, test output, or artifacts.
- The waitlist still points at a `TODO-FOUNDER` Buttondown placeholder; it is not currently an email collection feature.
- Trademark review, a domain support email, and the founder's business, insurance, and written security-policy decisions remain pending.

## Release posture

The implemented 1040-NR path and its regression suite are not equivalent to a verified tax product. Do not claim professional readiness until authoritative tax-year source verification and qualified professional review are complete, and do not rely on unsupported or `TODO_VERIFY` outcomes for an individual return.
