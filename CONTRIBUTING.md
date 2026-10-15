# Contributing to My1040NR

Thank you for helping international students. Ground rules:

1. No real taxpayer data, ever. All examples and tests use fictional people.
2. Every tax rule needs a source: an IRS publication, a form instruction, or a state instruction, cited where the rule lives. If a value is not yet verified against the current instructions, mark it TODO_VERIFY rather than presenting it as settled.
3. Plain English wins. If a question needs the word "exempt" to make sense, rewrite the question.
4. The privacy model is non-negotiable: no accounts, no storage of user data, no transmission of returns, SSN asked last. Pull requests that weaken it will be closed.

## How code flows (branch rules)

- `main` is protected. Nobody, including the owner and admins, can push to it directly. Every change arrives by pull request with at least one approving review from the code owner (@mminaei), all review conversations resolved, and the checks above passing.
- All new work goes to the `dev` branch (directly, or on a feature branch merged into `dev`).
- When `dev` is stable, open a pull request from `dev` to `main`. On approval and merge, tag the merge commit (for example `v0.2.0`) and publish a GitHub release with plain-English notes on what changed, including the rules version when tax rules changed.
- Tax rules changes are never mixed into a release silently: the release notes must say what rule changed and its IRS or state source.
