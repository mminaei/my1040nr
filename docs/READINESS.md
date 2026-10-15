# My1040NR READINESS CHECKLIST (reviewed 2026-10-14)

## READY AND VERIFIED
- Domain: my1040nr.com owned (Porkbun, expires 2027-10-15, auto-renew on, free WHOIS privacy).
- Website live: all 8 routes return 200 on both my1040nr.com and www.my1040nr.com (home, residency checker, exempt explainer, forms guide, state checker, pricing, legal, sample mailing slip PDF).
- Product decisions all made and written in the spec (My1040NR-Product-Spec-Dash.md, Sections 1 to 10): students only, always free, PDF only, no transmission, no accounts, one session, SSN last, no "exempt" questions, mailing slip as page 1, state determination and preparation with a second state slip, one engine two shells (web + Tauri desktop), mandatory signed rules updates.
- Sample mailing slip built and published.
- Legal page live with disclaimer, terms, and the no-retention privacy model.

## BUILT (first release, 2026-10-14)
- Form 8843 preparer is LIVE at my1040nr.com/prepare: one-session interview in the browser (no server, no storage), plain-English checks first (income warning, residency year count), SSN or ITIN asked last and optional, and a downloaded PDF of 4 pages: mailing slip, what-to-do-next, then the official IRS Form 8843 (2025) filled and flattened. Engine code is shell-agnostic (app-core.js) so the desktop shell reuses it unchanged.
- Verified by an automated test: a sample package was generated outside the browser and inspected; every test value landed in the correct field of the official form, the slip carried the Austin IRS address, and the rules version stamp (2025.1.0) printed.

## NOT BUILT YET
- The desktop (Tauri) shell wrapping the same engine, and its mandatory update channel.
- The full Form 1040-NR engine (income, treaty, state). The 8843 flow warns students with income that 1040-NR is also required and gives its April 15, 2026 deadline.
- Golden test cases exist as requirements in the spec, not yet as written test data.

## VERIFICATION PENDING (before any real student uses it)
- IRS mailing addresses on the slips: verify against the tax year 2025 form instructions (spec marks these TODO_VERIFY).
- State filing thresholds in the state checker and spec (MA, NY, IL reference values, CA tables): verify against each state's 2025 instructions.
- Form line mappings and treaty tables for tax year 2025: verify against official IRS instructions and Publication 901 when the engine is built.
- CPA or Enrolled Agent review and sign-off of the engine and treaty tables.

## FOUNDER ITEMS PENDING
- Waitlist is NOT collecting emails: the form still points at a TODO-FOUNDER Buttondown placeholder. Needs a real Buttondown account and embed URL from the founder.
- Code signing for the desktop app: Apple Developer ($99 per year) and Windows signing (Azure Trusted Signing about $10 per month), not yet purchased. Needed so students do not get "unidentified developer" warnings.
- Trademark search for the My1040NR name: not done.
- Support email on the domain (for example support@my1040nr.com forwarding): not set up.
- Business posture before launch: form an LLC, errors and omissions insurance, and a short written security policy. The local-only design removes the server risk, but the paper trail should exist before launch. The PDF-only, user-mails-it model means no EFIN and no e-file approval are required, because the product transmits nothing.

## SUGGESTED FIRST BUILD (smallest shippable piece)
Form 8843 only: residency checker plus the 8843 interview plus PDF with mailing slip. It serves the largest group (every nonresident student must file it, even with no income), needs no income documents and no tax tables, asks the SSN or ITIN late like everything else, and it is the exact form the incumbent charges $19.95 for. The full 1040-NR engine comes second.
