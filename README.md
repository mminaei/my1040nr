# My1040NR

Free U.S. tax form preparation for international students and scholars. Live at [my1040nr.com](https://my1040nr.com).

Every nonresident student or scholar in the United States must file at least Form 8843 every year, even with no income. The established products charge students for this (one well-known service charges $19.95 for Form 8843 alone and about $55 for a federal return). My1040NR is free, forever, and open source.

## The privacy model is the product

- **Nothing is uploaded.** The app runs entirely on the student's own device (browser today, desktop app next). There is no server collecting returns.
- **No accounts, no saving.** One session. Closing the tab erases everything.
- **The SSN is asked last**, on one screen, right before the PDF is generated, and it is never transmitted or stored.
- **The product is a PDF, not a filing.** The student downloads a ready-to-mail package (a mailing slip first, then the official IRS form, filled in), signs it, and mails it themselves. My1040NR transmits nothing to the IRS.
- **Plain English.** The app never asks a student "were you exempt?" It derives residency and day counts from questions students can actually answer.

## What works today

- Form 8843 (2025) preparation at [my1040nr.com/prepare](https://my1040nr.com/prepare), producing a 4-page PDF: mailing slip, next steps, and the filled official IRS form.
- Plain-English explainers and checkers on the site: residency (Substantial Presence Test), the word "exempt" explained, state tax determination, forms guide, and extension rules.

## Architecture: one engine, two shells

All tax logic lives in one shell-agnostic engine (`app-core.js`): interview flow data, field mapping to the official IRS PDFs, rules packages, and PDF assembly (mailing slips plus filled forms). The web page is the first shell. A desktop shell (Tauri, Windows and macOS) wraps the same engine so the app can run fully offline, which is the strongest privacy proof a student can verify: turn on airplane mode and it still works.

Tax rules ship as signed, versioned packages per tax year. When the rules change, the desktop app applies a **mandatory** update before it will prepare anything: no return is ever generated on rules the app knows are out of date, and every PDF prints the rules version that produced it.

## Repository layout

- Root: the static website (also the web shell), plain HTML/CSS/JS with no build step.
- `app-core.js`: the engine (Form 8843 field map, mailing slip and package builder).
- `app.js`, `prepare.html`: the web shell interview.
- `assets/`: the official IRS Form 8843 PDF (public domain, from irs.gov) and pdf-lib (MIT licensed, see below).
- `docs/PRODUCT-SPEC.md`: the full product specification and the reasoning behind it.
- `docs/READINESS.md`: an honest checklist of what is built, verified, and still owed.

## Roadmap

1. Form 1040-NR engine (income, treaty benefits, state determination and preparation) with Form 4868 extension support.
2. Desktop shell with the mandatory rules update channel.
3. Golden test coverage for the calculation and determination logic.

## Contributing

Issues and pull requests are welcome, especially: verification of rules data against current IRS and state instructions (see the TODO_VERIFY notes in the spec), translations of the plain-English guidance, and test cases. Please do not submit any real taxpayer data anywhere in this project, ever. Test data must be fictional.

## Disclaimer

My1040NR is software and general information, not tax, legal, or immigration advice, and it is not affiliated with the IRS. Tax rules in this repository are provided for education and preparation assistance; verify anything that matters against the official IRS and state instructions for the relevant tax year.

## License

MIT. See `LICENSE`.

Third-party components: pdf-lib (MIT License, (c) pdf-lib contributors), vendored in `assets/`. IRS forms are works of the U.S. federal government and are in the public domain.
