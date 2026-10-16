# Engine, data flow, and rule sources

My1040NR is a static, client-side application. The interview, document extraction, calculations, and PDF generation run in the user's browser. The application has no server-side return processing or taxpayer-data persistence.

## Browser shells and shared code

- `prepare.html` loads the Form 8843 shell in `app.js` and shared helpers from `app-core.js`.
- `nr.html` loads the Form 1040-NR shell in `nr.js`, shared helpers from `app-core.js`, and local extraction code from `doc-extract.js`.
- `app.js` and `nr.js` collect interview answers in page memory and present the corresponding preparation flows. `app-core.js` contains shared calculations, field mappings, and PDF construction helpers, including the CommonJS exports used by unit tests.
- The shell pages load the vendored PDF libraries from `assets/`; they do not send interview answers to an application server.

For Form 8843, `app.js` collects the interview answers and calls the shared `buildPackage` helper in `app-core.js` with the form template `assets/f8843-2025.pdf`. The generated four-page PDF is ordered as: mailing slip, next-steps page, then the two pages of the filled Form 8843.

## 1040-NR document and data flow

In the 1040-NR flow, a user can enter W-2 and 1042-S information manually or select PDF documents. `doc-extract.js` uses the local `assets/pdf.min.js` and `assets/pdf.worker.min.js` code to parse and render the selected file in the browser. Extracted field values are candidates shown with their source area; the user must review and confirm them before they are used. Extraction alone does not populate confirmed return values. The uploaded file and interview data remain in the current page session; no application code persists them.

After the interview, the shell passes the collected data to calculation helpers in `app-core.js`, then uses PDF helpers in `app-core.js` and `nr.js` to create a package in memory. The federal package starts with its mailing slip and summary, followed by the filled federal forms. `assets/f1040nr.pdf` and `assets/f1040nro.pdf` supply the Form 1040-NR and Schedule OI templates; `assets/f1040s1.pdf` is included when the current code path requires Schedule 1. If the state determination selects a prepared return, the package adds a separate state slip and the matching state form. A downloadable Blob is created in the browser.

## Form and library assets

The checked-in form templates used by the flows are:

- Form 8843: `assets/f8843-2025.pdf`
- Form 1040-NR: `assets/f1040nr.pdf`
- Schedule OI: `assets/f1040nro.pdf`
- Schedule 1: `assets/f1040s1.pdf`
- State form templates: `assets/ca-540nr.pdf`, `assets/ny-it203.pdf`, `assets/ma-1nrpy.pdf`, and `assets/il-1040.pdf`

The browser-side libraries include `assets/pdf-lib.min.js` for PDF generation and `assets/pdf.min.js` plus `assets/pdf.worker.min.js` for local document reading. These file names identify the templates/code used; their presence does not verify the tax calculations, field mappings, addresses, or legal instructions.

## State flow boundary

The current state pipeline reads one W-2 state row (`stCode`, `stWages`, and `stWithheld`) and has preparation paths for CA, NY, MA, and IL. It does not determine state residency, handle part-year residency or mid-year moves, or evaluate multiple state rows from one or more W-2s. A missing state row is not evidence that no state filing obligation exists. See `docs/PRODUCT-SPEC.md` §9 for the broader product requirements; those requirements do not mean the corresponding functionality is implemented.

## Rule versions and ownership

The shared Form 8843 code declares `RULES_VERSION` in `app-core.js`; the 1040-NR pipeline declares `NR_RULES_VERSION` there as well. Both are currently labeled `2025.1.0`. These constants identify a code/rules revision and are printed in generated packages; they are not a verification status, source citation, or approval.

Tax-rule changes must be tied to a tax year and supported by authoritative, tax-year-specific sources. Use the applicable IRS form instructions and publications (including Publication 901 where treaty rules are involved) and the relevant state tax agency's instructions. Checked-in federal and state PDFs under `assets/` are form templates, not a complete archive of those instructions. `docs/PRODUCT-SPEC.md` records project requirements and some cited assumptions, but it is not an authority for tax law.

Official source locations include the IRS Forms and Instructions pages and IRS publications at `irs.gov`, plus the applicable state tax agency's official instructions for that year. The checked-in Form 8843, Form 1040-NR, and state PDFs under `assets/` are form templates only; supporting instructions and source publications are not maintained as a complete local source archive.

Tests should retain their source and verification metadata. The cases in `tests/fixtures/state-cases.js` use `source` and `verificationStatus`; expectations not confirmed against controlling instructions remain `TODO_VERIFY`. A passing test only shows that current code matches its recorded expectation. It does not validate tax law. Professional review is still required before relying on the engine.
