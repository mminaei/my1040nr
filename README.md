# My1040NR

My1040NR is a free, open-source static website with browser-based preparation flows for tax-year 2025 Forms 8843 and 1040-NR. It generates PDFs for the user to review, print, sign, and mail; it does not transmit a return to the IRS.

## Privacy model

The site is a static, client-side application. Interview answers and uploaded documents are processed in the browser and are not collected or persisted by this project. There are no accounts or application data stores. Reloading or closing the tab clears the in-memory interview. Uploaded documents are parsed locally; extracted values remain candidates until the user reviews and confirms them.

## Current implementation

- `prepare.html`, `app.js`, and `app-core.js` implement the Form 8843 interview and PDF package.
- `nr.html`, `nr.js`, `doc-extract.js`, and `app-core.js` implement the Form 1040-NR interview, local document extraction, calculation helpers, and PDF package.
- State preparation currently supports one W-2 state row and the state paths represented in the engine. It does not model state residency, part-year residency, mid-year moves, or multiple state rows.

The code and tests describe implemented behavior, not tax-professional approval or proof that tax calculations and legal interpretations are correct. Tax-year 2025 rules, state outcomes, treaty treatment, form mappings, and mailing details still require authoritative source verification and professional review. See [Readiness](docs/READINESS.md), [Engine and rule sources](docs/ENGINE.md), and [Testing](docs/TESTING.md). Do not treat a passing regression test as verification of tax law.

## Repository layout

- Root HTML, CSS, and JavaScript files: the static site and browser shells.
- `app-core.js`: shared Form 8843 and Form 1040-NR calculation, mapping, and PDF helpers.
- `doc-extract.js`: local W-2 and 1042-S PDF extraction used by the 1040-NR shell.
- `assets/`: PDF form templates and browser-side PDF libraries.
- `tests/`: Node unit tests, Playwright browser tests, and fictional fixtures.
- `docs/PRODUCT-SPEC.md`: product requirements and implementation notes; it is not an authoritative tax-law source.

## Contributing

See [Testing](docs/TESTING.md) for setup, test commands, and fixture requirements. All test data must be fictional. Never submit real taxpayer information in source, issues, pull requests, filenames, logs, or test artifacts. Tax-rule changes need authoritative, tax-year-specific source citations and clear verification status; do not promote `TODO_VERIFY` expectations based on inference.

## Disclaimer

My1040NR is software and general information, not tax, legal, or immigration advice, and is not affiliated with the IRS. The project does not certify that generated results are complete or correct. Consult official IRS and state instructions and a qualified tax professional for advice about an individual situation.

## License

MIT. See `LICENSE`. Third-party components and form assets are documented in the repository.
