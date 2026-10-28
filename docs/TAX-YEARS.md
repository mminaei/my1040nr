# Adding a tax year

My1040NR is built so a new tax year is a data entry, not a rebuild. Every
figure that changes from year to year lives in the `TAX_RULES` registry in
`app-core.js`, keyed by tax year: federal standard deduction and brackets,
student treaty benefits, filing deadlines, IRS mailing addresses, the
official form PDF paths, and each prepared state's amounts, brackets, form
name, addresses, deadline and PDF path. The engine (`computeNR`, `residencyForYear`,
the four state computations) and both interviews read only from the registry
entry for the filer's chosen tax year. Both interviews offer exactly the
registered years in their Tax year selector, so a year goes live everywhere
the moment its entry exists.

## Checklist for a new year

1. **Forms.** When the IRS and the states publish the final forms for the
   year, save them under `assets/` and point the entry's `forms` and state
   `asset` paths at them. If a form's field names changed, re-map that form's
   field map (the `FIELD`/`CHECK` maps and the filler functions) against the
   new PDF before relying on it; field maps are per form version.
2. **Registry entry.** Add `TAX_RULES[<year>]` with the year's figures. Give
   it a `rulesVersion` of `<year>.1.0` (bump the minor for later corrections
   within the same year). Keep the `TODO_VERIFY` discipline: a figure is
   only settled once checked against that year's official instructions, and
   the state fixtures keep `verificationStatus: 'TODO_VERIFY'` until then.
3. **Deadlines and addresses.** Fill `deadlines` (federal, Form 8843,
   extension) and `irsAddress` from the year's form instructions, and each
   state's `form.deadline` and addresses from the state booklet. Deadlines
   shift for weekends and holidays; copy them from the instructions, do not
   compute them.
4. **Golden tests.** Add engine fixtures for the year (federal cases per
   treaty and filing status, one per prepared state) with sources recorded,
   the way `tests/fixtures/state-cases.js` does for 2025.
5. **Copy sweep.** Page titles and guide pages still name a specific year in
   a few places (for example `nr.html` and `prepare.html` headings and the
   forms guide). Update them, or make the new year the default by changing
   `TAX_YEAR` in `app-core.js` once its entry is verified.
6. **Run the full suite** (`npm test`). The registry tests fail if an entry
   is missing any required piece, and the parity tests keep earlier years
   byte-stable.

Earlier years stay available: a student filing a late or amended-season
return picks the older year in the same selector.
