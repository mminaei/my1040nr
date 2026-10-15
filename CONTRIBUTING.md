# Contributing to My1040NR

Thank you for helping international students. Ground rules:

1. No real taxpayer data, ever. All examples and tests use fictional people.
2. Every tax rule needs a source: an IRS publication, a form instruction, or a state instruction, cited where the rule lives. If a value is not yet verified against the current instructions, mark it TODO_VERIFY rather than presenting it as settled.
3. Plain English wins. If a question needs the word "exempt" to make sense, rewrite the question.
4. The privacy model is non-negotiable: no accounts, no storage of user data, no transmission of returns, SSN asked last. Pull requests that weaken it will be closed.

## How code flows (branch rules)

- `main` and `dev` are both protected the same way. Nobody, including the owner and admins, can push to either branch directly, force-push, or delete either branch. Every change arrives by pull request, with all review conversations resolved and the checks above passing.
- All new work is proposed as a pull request INTO `dev` (from a feature branch). Pull requests go to `dev` only, never straight to `main`.
- Only admins move code from `dev` to `main`: when `dev` is stable, an admin opens a pull request from `dev` to `main` and merges it. On merge, tag the merge commit (for example `v0.2.0`) and publish a GitHub release with plain-English notes on what changed, including the rules version when tax rules changed.
- Tax rules changes are never mixed into a release silently: the release notes must say what rule changed and its IRS or state source.

## Deployment (CI/CD)

- The live site at my1040nr.com is updated ONLY by the `deploy-production` GitHub Actions workflow, which runs only on a push to `main`. Under the branch rules, that means production changes exactly when an admin merges the `dev` to `main` pull request, and never before: pull requests, feature branches, and `dev` itself never deploy.
- The workflow syntax-checks the JavaScript, stages only the public site files (the HTML, CSS, JS, and `assets/`; repo documents like `docs/` and this file are never published), deploys to the Cloudflare Pages project `my1040nr` on its `main` branch, and then smoke-checks the live site.
- It needs one repository secret, `CLOUDFLARE_API_TOKEN` (a Cloudflare API token with Pages edit permission on the account), and one repository variable, `CLOUDFLARE_ACCOUNT_ID`. Without the secret the workflow fails loudly and nothing deploys.
- Do not deploy by hand except in a genuine emergency. A hand deploy that skips `main` breaks the rule that the live site always matches the `main` branch.
