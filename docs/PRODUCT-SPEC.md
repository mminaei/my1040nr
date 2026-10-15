# My1040NR PRODUCT SPEC (Open source project document)

This product (my1040nr.com, international students only) is maintained as an open source project. Do not send this spec to Copilot. It consolidates the v2 addendum plus Sections 8 (mailing slip) and 9 (state tax). Where the Copilot v1 prompt and this spec overlap, this spec governs My1040NR and the Copilot product must contain none of it (see Copilot Addendum v3).

---

# COPILOT ADDENDUM v2: My1040NR (OVERRIDES THE v1 PROMPT WHERE THEY CONFLICT)

This addendum amends the "Copilot Prompt: Tax App for US Filers and International Students" (v1, emailed 2026-10-14). Where v1 and this addendum conflict, THIS ADDENDUM WINS. Everything in v1 that is not mentioned here (residency engine rules, treaty engine, FICA module, calculation rules, diagnostics, IRS sources, golden tests) still applies.

Product: My1040NR, domain my1040nr.com. Audience: international students and scholars ONLY.

---

## 1. SCOPE CHANGE: STUDENTS ONLY

- Remove US citizens, green card holders, and general resident filers as target users. They are out of scope.
- Keep exactly one resident path: a student or scholar whose residency determination flips to resident alien for tax purposes (for example an F-1 in year 6 who passes the Substantial Presence Test). For that user, complete the determination, explain it in plain English, and then either (a) prepare the resident return if the build includes it, or (b) clearly refer them to resident software. Default to (b) unless I say otherwise. Never silently file them as a nonresident.
- Personas from v1: keep P7 to P16 (the international personas). Drop P1 to P6 as product personas; they may remain only as negative tests proving the app refuses or redirects resident filers.

## 2. THE PRODUCT IS A PDF. NOTHING ELSE.

- The only deliverable of a session is a downloadable PDF file containing the completed forms and the mailing instructions.
- The app does NOT transmit, e-file, submit, mail, or track anything, for anyone, ever. Remove all e-file stubs, MeF data models, transmission status fields, filing status trackers ("accepted", "refund received"), and any UI copy that could imply submission.
- All copy must say, wherever filing is mentioned: we prepare the PDF, you review it, sign it, and mail it yourself.
- Do not build refund tracking. A mail-in instruction page and a "what to keep" page replace it.

## 3. NO ACCOUNTS. NO SAVING. ONE SESSION.

This is the core architecture. It overrides v1 Sections 5, 9, 17, and 20 wherever they assume accounts or persistence.

- No sign-up, no login, no password, no user entity, no dashboard, no return list, no save and resume, no drafts. Delete the `User`, `TaxReturn` persistence, `AuditLog`, and `ConsentAndSignature` storage design from v1. There is no database of returns. Prefer no database at all in the product runtime.
- A return exists only inside one browser session. State lives in browser memory (and, at most, sessionStorage so an accidental refresh does not destroy an hour of work; sessionStorage clears when the tab closes, and the UI must say so). Closing the tab ends everything.
- Preferred architecture: everything runs client-side. Interview, residency determination, calculation, and PDF generation all execute in the browser (TypeScript port of the tax engine, pdf-lib or equivalent filling official IRS form templates). Under this architecture, user data never reaches a server at all, and the site may truthfully say exactly that.
- Fallback architecture, only if client-side PDF generation proves impossible for a specific form: a stateless PDF endpoint that receives the payload in memory over TLS, generates the PDF, returns it, and discards everything. For this fallback: no database writes, no disk writes, no request body logging, no analytics events containing form data, no error reporting payloads containing form data, and an automated test that proves a completed request leaves no stored artifact.
- Analytics: aggregate, cookieless page counts only (for example a self-hosted or privacy-first counter). No Google Analytics on interview pages, no session replay tools, no heatmaps, no third-party scripts of any kind on any page that displays tax data. The marketing pages and the app pages have different script rules; enforce this in code review and in a test that scans the built app bundle for forbidden script hosts.
- No third-party fonts, CDNs, or embedded widgets on app pages. Self-host everything the app needs.

## 4. SSN AND ITIN: LAST STEP ONLY

- The SSN (or ITIN) field appears exactly once, on the final screen before PDF generation, under the heading "Last step: the number that prints on your forms".
- Explain on that screen, in plain English: why it is needed (it prints on the forms), when it is used (only to generate this PDF), and what happens to it (under the client-side architecture it never leaves the device; under the fallback it is discarded when the PDF is returned and is never stored or logged).
- Never ask for SSN or ITIN during onboarding, residency, income, or review. The residency checker and every explainer must work without it. Form 8843 for a filer with no income must be completable, and the SSN field must be optional and skippable for an 8843-only session where the form allows a blank.
- Mask the field by default with a show and hide toggle. Validate format only. Never put the value in a URL, a log, an analytics event, an error message, or a filename. The downloaded PDF filename must contain no personal data (use `my1040nr-return-2025.pdf` style names).
- After the PDF is generated, the success screen offers a prominent "Erase everything now" button that wipes session state and the SSN from memory, and the app also wipes on tab close.

## 5. NEVER ASK "WERE YOU EXEMPT?" (UX RULE, NON-NEGOTIABLE)

- The word "exempt" is banned as a question. No screen may ask a user whether they were an exempt individual, or how many exempt years they have used.
- Instead ask only facts a student can actually answer:
  1. Your visa type (with pictures of an I-20 and a DS-2019 showing where to find it).
  2. The first calendar year you were in the US on an F or J visa, even for one day (with help text: check your first I-20 or DS-2019 start date or your oldest entry stamp).
  3. How many earlier calendar years, before that first year, you had already spent in the US on any F or J visa (default 0, with examples of when it is not 0: a bachelor's before a master's, an earlier J stay).
  4. Your days in the US per year, with a link to the I-94 travel history site and an entry and exit list builder that computes the days for them.
- The engine derives the exempt years from those facts, year by year, exactly as the public checker on my1040nr.com/residency.html does. The results screen explains it back in this order: (1) plain sentence ("Your days in 2025 do not count toward the residency test"), (2) their year count with their numbers ("2025 is year 3 of your 5"), (3) only then the IRS term, defined ("The IRS calls this being an exempt individual").
- Everywhere the word exempt must appear (form outputs, Schedule OI, legal text), pair it the first time on that screen with its plain meaning: "exempt (your days do not count)".
- Add explicit anti-misconception copy wherever exempt is explained: exempt does not mean you pay no tax, does not mean you do not file, and does not mean your job is tax-free. It does connect to FICA: while your days do not count, Social Security and Medicare tax should not be withheld from your student job.
- Add golden UX tests: scripted walkthroughs for the Priya persona (F-1 arrived 2023, year 3, nonresident) and the Daniel persona (F-1 arrived 2020, past the limit, resident) that assert the word exempt never appears in a question, and that the results screen shows their year counts correctly.

## 6. WHAT REPLACES THE REMOVED v1 PIECES

- v1 Section 9 (accounts, onboarding, dashboard) is replaced by: a single start screen ("Start your 2025 return", with the no-account, nothing-saved, PDF-only, SSN-last commitments listed before the first question), the interview, the final SSN step, the PDF download screen, and the erase screen.
- v1 Section 14 (filing package) becomes: the PDF itself, whose first page is the summary and mailing instructions, and whose last page is a checklist of what to attach (W-2 and 1042-S copies), where to mail for their exact case, and what copies to keep.
- v1 Section 16 (security) is replaced by the no-retention model in Sections 3 and 4 above, plus: strict Content Security Policy headers, no external requests from app pages, and a published privacy page that states the architecture truthfully. Keep the disclaimer, terms, and not-tax-advice pages from the live site (my1040nr.com/legal.html) and expand them, do not rewrite them into weaker language.
- Stripe, pricing, and checkout are removed entirely. The product is free. There is no payment code, no price screen in the app, and no upsell surface.

## 7. ACCEPTANCE CRITERIA FOR THIS ADDENDUM

1. A complete nonresident return (persona P8) can be finished in one session with no account, producing a correct PDF, and a network trace of the whole session shows no request containing an SSN (client-side build) or no stored artifact after generation (fallback build).
2. The SSN field exists on exactly one screen, the last one, verified by an automated UI test and a codebase search.
3. The word exempt never appears inside a question anywhere in the question graph, verified by an automated scan of the question files.
4. Closing the tab mid-interview and reopening the app shows an empty start screen, verified by an end-to-end test.
5. The PDF filename and every log line produced during a test session contain no personal data, verified by automated tests with canary values.
6. The app bundle for app pages loads zero third-party scripts, verified in the build report.
7. All v1 golden tax calculation tests that remain in scope (personas P7 to P16) still pass unchanged. The tax math did not change. The product around it did.

Start from the v1 prompt, apply this addendum, and document every removal in DECISIONS.md under "Removed by Addendum v2".

---

## 8. PAGE 1 OF THE PDF IS A MAILING SLIP (ADDED 2026-10-14, FOUNDER REQUIREMENT)

The generated PDF must open with a dedicated mailing slip page, before the summary page and before any IRS form. This page is a My1040NR page, not an IRS form, and it must be labeled at the top: "Mailing slip: not an IRS form. Print this page, keep a copy, and mail the forms behind it."

Required content of the mailing slip, in this order on one page:

1. **FROM (sender) block, top left, large enough to read on an envelope copy:**
   - Taxpayer full name as it appears on the return.
   - Return mailing address exactly as entered in the session: US address (street, apartment, city, state, ZIP) or foreign address (street, city, province or state, postal code, country spelled out in full, as the IRS requires for foreign addresses on the return).
   - Spouse name and address too, only if the return includes a spouse with a different address (rare for nonresidents; default to a single sender block).
   - The sender block must use the same address that prints on Form 1040-NR or 8843, generated from the same session data, never typed twice.
2. **TO (IRS) block, centered, in the largest type on the page:**
   - The single correct IRS mailing address for this exact return, selected by the address rules engine (see below), printed as the full postal block: agency line, service center or PO Box, city, state, ZIP.
   - Under it, one plain sentence naming why this address: for example "This is the IRS address for a Form 1040-NR with no payment enclosed" or "for Form 8843 filed on its own".
3. **What this envelope contains line:** "Tax year 2025: Form 1040-NR (signed and dated), Form 8843, copy of Form W-2, copy of Form 1042-S." Build this list from the actual session contents, forms in filing order, each with a checkbox the user can tick by hand after printing.
4. **Before you seal it checklist (checkboxes):**
   - Signed and dated the return (unsigned returns are returned by the IRS).
   - Kept a full copy of everything for your records.
   - Attached the IRS copy of each W-2 and 1042-S listed above.
   - If you owe money: check or money order payable to "United States Treasury" with the payment voucher from this PDF, never cash.
   - Written your SSN or ITIN, the tax year, and "Form 1040-NR" on the payment if paying by check.
5. **Deadline and proof of mailing block:** the personalized due date for this user (April 15 or June 15, per the deadlines engine) with one sentence: mailing on or before this date with proof of mailing counts as filing on time, and a recommendation to use USPS Certified Mail or a tracking service and keep the receipt with their copy. Foreign mailers get the same block with the note to mail early and keep the postal receipt.
6. **Cut-off envelope label (bottom of the page, inside a dashed cut line):** the FROM block repeated small at top left and the TO block repeated in mailing-label position, sized to be cut out and taped to the envelope, or to show through a standard No. 10 window envelope. State on the slip: "No envelope printer needed: cut on the dashed line and tape this label to the front of your envelope."
7. **Privacy line at the foot of the slip:** "This slip shows your name and address because the IRS needs a return address. Mail it in a sealed envelope. Do not email this PDF to anyone you do not trust: it contains your tax forms."

Address rules engine for the TO block:
- Addresses live in the versioned rules files per tax year, sourced from the current IRS form instructions ("Where to File" tables), with the source cited in TAX_RULES_SOURCES.md. Never hard code an address in program logic.
- Selection inputs: form set (8843 alone, 1040-NR alone, 1040-NR with 8843), payment enclosed or not, refund or balance due or neither, and the taxpayer's state or country of residence where the instructions table uses it.
- Reference values for tax year 2025, to be re-verified against the 2025 instructions before any real use and marked TODO_VERIFY until then: Form 8843 alone and Form 1040-NR with no payment go to Department of the Treasury, Internal Revenue Service, Austin, TX 73301-0215. Form 1040-NR with a payment enclosed goes to Internal Revenue Service, P.O. Box 1303, Charlotte, NC 28201-1303.
- If the engine cannot select an address with confidence for a session (unusual form combination), it must stop generation, say so plainly, and direct the user to the "Where to File" section of the official instructions at irs.gov. A wrong address printed confidently is a launch-blocking defect.

Tests for this section:
- Golden tests per persona assert the exact TO address, the exact enclosures list, and the exact deadline printed on the slip.
- A layout test asserts the slip is exactly one page and is page 1 of the assembled PDF.
- A consistency test asserts the sender name and address on the slip match the name and address printed on the return forms, character for character.

---

## 9. STATE TAX: DETERMINATION LOGIC AND PREPARATION (ADDED 2026-10-14, FOUNDER REQUIREMENT)

Yes, the product determines whether a student must file a state return, and yes, it prepares that return too, inside the same single session, into the same downloaded PDF, free like everything else. This section replaces the thinner state module in v1 Section 3.1.

### 9.1 The trap to design around
State residency is NOT federal residency. A student can be a nonresident for federal purposes and a resident, part-year resident, or nonresident for a state, under that state's own tests (domicile, statutory residency by days and a permanent place of abode, or presence for other than a temporary purpose, depending on the state). The interview must never copy the federal residency result into a state form. It asks the state questions separately and says, in plain English, "Your state answer can be different from your federal answer. That is normal."

### 9.2 Determination inputs (per state, for every state the student lived in or earned in)
- State lived in, with move-in and move-out dates, and where their permanent home (domicile) is.
- State worked in or earned income from, per employer and per document (W-2 state boxes, 1042-S state information where present).
- Days present in the state, and whether they kept a permanent place of abode there (a year-round apartment lease counts in states like New York; a dorm room treatment differs by state and must be in that state's rules file, not assumed).
- State-source gross income per state, state tax withheld per state (W-2 boxes 16 and 17).
- Whether the student moved between states mid-year (part-year in two states is common after graduation and OPT relocation).

### 9.3 Determination logic (rules as data, per state, per tax year)
For each state touched, evaluate in this order and output one result with a plain English reason and the rule citation from that state's instructions (stored in the rules file, marked TODO_VERIFY until checked against the current state instructions):
1. **No income tax state:** Alaska, Florida, Nevada, New Hampshire, South Dakota, Tennessee, Texas, Washington, Wyoming (verify the list per tax year; New Hampshire's interest and dividends tax repeal status must be checked per year). Result: NO STATE RETURN, reason stated.
2. **No state-source income and no state presence as a resident:** Result: NO STATE RETURN. Exception check: if any state tax was withheld anyway, go to step 4.
3. **State residency test in the state's rules file** (domicile test plus statutory test where the state has one): classify as RESIDENT, PART_YEAR, or NONRESIDENT for that state.
4. **Filing threshold test:** compare state-source gross income (and worldwide income where the state uses it for the threshold, for example California's threshold tables) against the filing threshold for that residency class and filing status in the rules file. Below threshold AND no withholding AND no other trigger (for example a federal return requirement trigger or a state-specific credit claim): NO STATE RETURN, with the numbers shown.
5. **Withholding trigger:** any state tax withheld means FILE, even below the threshold, because filing is the only way to reconcile or recover it. Say exactly that.
6. Anything the rules file cannot classify with confidence: NEEDS_REVIEW with the specific missing fact named. Never guess a state residency result silently.
- Reference thresholds for tax year 2025, each marked TODO_VERIFY against that state's 2025 instructions before real use: Massachusetts nonresidents file if Massachusetts gross income exceeds $8,000. New York nonresidents generally file if New York source income exceeds the New York standard deduction for their status ($8,000 single) or to recover withholding. Illinois filing generally follows whether Illinois base income exceeds the exemption allowance ($2,850 per person for 2025). California nonresident and part-year thresholds come from the FTB filing threshold tables by status and dependents and use worldwide gross income.

### 9.4 Preparation
- Launch states with full calculation and form preparation: California, New York, Massachusetts, Illinois, and Texas (Texas: determination only, answer is no state income tax, no form). This order follows where international students actually are, not alphabet.
- All other states: the determination engine still runs and gives a result with its reason. Preparation for an unsupported state produces a state worksheet PDF (income, withholding, residency result, threshold math, the state's official form name and link) and a clear statement that the form itself is not yet prepared, instead of silently skipping the state.
- State forms are prepared from the same session data as the federal return (income documents entered once). State-specific additions are asked only when a determination result requires that state (treaty benefits do not carry into states automatically; several states do not honor federal treaties, and the state module must say so where that is true for a supported state, California being the well-known case).
- State deadlines come from the state rules file and are shown next to the federal deadline wherever deadlines appear, including both mailing slips.

### 9.5 Where state pages go in the PDF (amends Section 8)
- The PDF is one file, two packages. Order: (1) federal mailing slip, (2) federal summary and instructions, (3) federal forms, then (4) a SEPARATE state mailing slip page, (5) state instructions, (6) state forms, per state if more than one.
- The state slip follows all Section 8 rules with state data: sender block identical to the federal slip, TO block with the state tax agency's mailing address for that exact form and payment status, selected from the state rules file (refund and payment addresses differ in most states), the state enclosures list, the state deadline, and a bold line at the top: "Separate envelope. Do not mail your state return to the IRS, and do not mail your federal return to the state."
- If the determination result is NO STATE RETURN for every state touched, no state slip is generated, and the federal summary page says so with the per-state reasons, so the student has the answer in writing.

### 9.6 Tests
- Determination golden tests: at least 25 cases across the launch states and the no-tax states, covering resident, part-year, nonresident, below threshold, below threshold with withholding (must file), treaty income in a state that does not honor the treaty, a mid-year move producing two part-year results, and a no-income student (no state return anywhere).
- PDF structure tests assert the state slip exists exactly when a state return is prepared, sits immediately before the state forms, and carries the state agency address, never an IRS address.

---

## 10. ARCHITECTURE DECISION AND MANDATORY RULES UPDATES (FOUNDER DECISION 2026-10-14)

DECIDED by the founder on 2026-10-14: one engine, two shells, and mandatory updates when tax rules change.

### 10.1 One engine, two shells
- The tax engine (interview, residency and determination logic, calculations, treaty tables, state rules, PDF generation including both mailing slips) is ONE local-only codebase, written once.
- Shell A: the web app at my1040nr.com. It runs entirely in the student's browser. Documents and answers are processed locally and are never sent to us; the server, if any, serves static files only and stores nothing.
- Shell B: a desktop app (Tauri) for Windows and macOS, built from the same codebase. It runs fully offline, which is the product's proof of safety: a student can switch on airplane mode and finish a return.
- No feature may exist in one shell only. A rule change is made once, in the engine, and ships to both shells. The shells differ only in packaging and in the update mechanism below.

### 10.2 Rules as versioned, signed packages
- All tax law lives in rules packages, separate from app code: one package per tax year, containing federal rates, brackets, thresholds, treaty tables, mailing addresses, and per-state rules.
- Every rules package carries: taxYear, rulesVersion (for example 2025.4.1), published timestamp, a validThrough date, a minimum app version, and a plain English "what changed" note. Packages are cryptographically signed; both shells verify the signature before applying a package and refuse anything unsigned or altered.
- The summary page of every generated PDF prints the rules version used (for example "Prepared with My1040NR rules 2025.4.1"), so any return can be traced to the exact rules that produced it.

### 10.3 Mandatory updates on the desktop app (founder requirement)
- At launch, and again at the moment before PDF generation, the desktop app fetches a small rules manifest over HTTPS. This is the ONLY network call the app ever makes, and it sends only the app version and current rules versions. It sends no user data, no answers, no identifiers.
- The manifest states, per tax year, the latest rules version and the MINIMUM allowed rules version. A rules change published by the team raises the minimum.
- If the installed rules for the chosen tax year are below the minimum, the update is MANDATORY: the app downloads and installs the new signed rules package, shows the plain English "what changed" note, and restarts. The student cannot start a new interview and cannot generate a PDF until the update is applied. There is no "skip" or "remind me later" on a mandatory update.
- Because sessions hold nothing saved (Section 1 of this spec), a mandatory restart destroys no work: the update check happens at launch, before the interview starts, and the pre-generation check compares the manifest against the rules version the session began with. If a mandatory update landed mid-session, the app says so plainly, explains that the rules changed, and requires the update and a fresh session before any PDF is made. It never generates a PDF with rules it knows are superseded.
- Offline honesty: the desktop app works fully offline while its rules are inside their validity window. Each rules package's validThrough date covers its filing season. If the app cannot reach the manifest AND the current date is past the validThrough date for the chosen tax year, it must say it cannot confirm the rules are current and must refuse to prepare that year until it can check. It must never silently prepare a return on expired rules.
- A failed update (network error, bad signature, interrupted download) never applies partially: the app keeps the previous complete package, keeps the mandatory gate in place, and offers a retry. Rollback to the last verified package is automatic on any verification failure.
- App binary updates ride the same channel (signed Tauri updater). A binary update that carries rules changes is treated as mandatory on the same terms.

### 10.4 Web shell updates
- The web shell always loads the latest signed rules when the page loads, so it can never run stale rules. The rules version is pinned at session start and stamped on the PDF exactly as on desktop. If the rules are republished mid-session, the web shell applies the same rule as desktop: no PDF on superseded rules; the student is told and the session restarts.

### 10.5 Tests
- Update tests must prove: the app blocks interview start and blocks PDF generation when below the manifest minimum; the block lifts only after a verified signed package installs; an unsigned or tampered package is rejected and rolled back; the offline-past-validThrough case refuses with the correct message; the manifest request contains no user data (network trace assertion); and every generated PDF carries its rules version stamp.

---

## 11. EXTENSIONS (ADDED 2026-10-14)

- Form 1040-NR filers CAN extend with Form 4868, filed by their original due date: April 15 group (wages subject to withholding) extends to October 15; June 15 group (no wages subject to withholding) extends to December 15, using the nonresident alien checkbox on Form 4868 (per IRS Publication 519, chapter 7). The future 1040-NR build must offer Form 4868 preparation as part of the deadline flow, including its own mailing slip, and must always state that an extension never extends the time to pay.
- Form 8843 filed BY ITSELF cannot be extended: Form 4868 covers tax returns only. The 8843 flow must say this plainly wherever the June 15 deadline appears, and must never imply an October 15 option for a standalone 8843. A late 8843 should still be filed as soon as possible, with the product explaining the residency exclusion risk of late filing from the form instructions.
