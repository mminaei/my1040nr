# Testing

The project uses Node's built-in test runner for unit/regression checks and Playwright with Chromium for browser checks. The browser tests use the local static server in `tests/support/static-server.js`; they do not require a deployed site or live tax service.

## Requirements and setup

Use Node.js 22 and npm. From the repository root:

```powershell
npm ci
npx playwright install chromium
```

On Linux CI, the workflow installs Chromium and its system dependencies with:

```sh
npx playwright install --with-deps chromium
```

On Windows PowerShell, `npx.cmd playwright install chromium` is the equivalent shim if `npx` is not available as a command.

The Playwright configuration starts `node tests/support/static-server.js` on `127.0.0.1:4173` and waits for `/prepare.html`. The server only serves files under the repository root. Playwright may reuse an existing server outside CI; stop any unrelated service using that port if the tests appear to be hitting the wrong site.

## Commands

Run commands from the repository root:

```powershell
npm run test:unit
npm run test:e2e
npm test
```

`test:unit` runs `node --test tests/unit/*.test.js` and checks calculation/helper behavior, package structure, fixture metadata, and static-server behavior. `test:e2e` runs `playwright test` in Chromium and exercises the browser flows, generated package ordering, local extraction confirmation, and privacy boundaries. `npm test` runs the unit suite followed by the browser suite.

On Windows PowerShell, use the `.cmd` shims if command resolution requires them:

```powershell
npm.cmd run test:unit
npm.cmd run test:e2e
npm.cmd test
```

The root JavaScript syntax checks used in CI can also be run directly:

```powershell
node --check app-core.js
node --check app.js
node --check nr.js
node --check doc-extract.js
```

## Fixtures, sources, and verification status

Every test input and uploaded document must be fictional and synthetic. Do not use real taxpayer information, even for local debugging. Do not place sensitive values in test names, fixture IDs, filenames, console output, screenshots, traces, or other artifacts.

State determination cases in `tests/fixtures/state-cases.js` include an `id`, `taxYear`, `source`, `verificationStatus`, `input`, and `expected` value. The source field records the basis available to the project; where no authoritative tax-year-specific source has been confirmed, the case stays `TODO_VERIFY`. A regression test can preserve an existing engine result without certifying that the result is legally correct. Do not remove an unverified marker or adjust a tax expectation based on assumption.

The repository's PDF form assets are not substitutes for IRS or state instructions. For a tax-rule change, cite the relevant authoritative instructions or publication for the applicable tax year and record whether the expectation has actually been verified. See [Engine and rule-source ownership](ENGINE.md) and [Readiness](READINESS.md) for current limits and pending review.

## Failures and artifacts

The test runners report failed test names, assertion details, and stack traces in the command output. Use the failing case ID and synthetic inputs to reproduce a problem. Playwright may create `playwright-report/` and `test-results/` output when a run fails; these paths are ignored by git. Review and remove generated artifacts before sharing a change, and never attach real taxpayer files or data.

Passing this suite is evidence only of the exercised code behavior and regression expectations. It is not tax-law validation, professional review, or a guarantee of a complete return.
