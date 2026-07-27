# Plan 001: モバイル幅の Hero 横スクロールを解消する

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in "STOP conditions" occurs, stop and report. When
> done, update this plan's row in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 3a07f3b..HEAD -- src/components/Hero.astro playwright.config.ts tests/smoke.test.ts`
> If an in-scope file changed, compare the current code with the excerpts below
> before proceeding.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `3a07f3b`, 2026-07-23
- **Issue**: https://github.com/keroway/reflectorbit-lp/issues/118

## Why this matters

The primary `REFLECTORBIT` heading is 428 px wide at the mobile breakpoint. In
measured 320, 375, and 390 px viewports it extends outside the viewport and
increases `document.documentElement.scrollWidth` to 374, 402, and 409 px. This
creates horizontal page scrolling on the LP's most important device class and
can clip the brand heading. The existing Playwright project uses Desktop Chrome
only, so the regression passes CI.

## Current state

- `src/components/Hero.astro:152-154` sets a fixed mobile `text-5xl` size and
  `tracking-[0.15em]`:

  ```astro
  <h1 class="mt-4 text-5xl font-bold tracking-[0.15em] text-rb-core sm:text-7xl">
    REFLECTORBIT
  </h1>
  ```

- `playwright.config.ts:14-18` defines only `devices['Desktop Chrome']`.
- `tests/smoke.test.ts` checks section visibility but never asserts that the
  document fits the viewport.
- Preserve the design rule in `docs/design.md`: use existing typography and
  brand tokens; do not introduce a new brand color.

## Commands you will need

| Purpose   | Command               | Expected on success |
| --------- | --------------------- | ------------------- |
| Install   | `npm ci`              | exit 0              |
| Lint      | `npm run lint`        | exit 0              |
| Typecheck | `npm run typecheck`   | 0 errors            |
| Build     | `npm run build`       | 2 pages built       |
| E2E       | `npx playwright test` | all tests pass      |

## Scope

**In scope**:

- `src/components/Hero.astro`
- `playwright.config.ts`
- `tests/smoke.test.ts`

**Out of scope**:

- Rewriting the Hero SVG or copy
- Changing brand colors or `docs/design.md`
- Broad responsive redesigns of other sections
- Adding browsers beyond Chromium unless required for the named regression

## Git workflow

- Branch: `fix/mobile-hero-overflow`
- Use a conventional commit such as
  `fix(hero): prevent mobile horizontal overflow`.
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Add a mobile horizontal-overflow regression test

Add a Playwright mobile project using a standard mobile viewport/device, or
make the test explicitly set a 320 px viewport. Add a smoke assertion that,
after `/` loads, the root document's `scrollWidth` is no greater than its
`clientWidth`. Keep the existing Desktop Chrome coverage.

**Verify**: run the new test against the unmodified Hero and confirm it fails
because the page is wider than the viewport. If it unexpectedly passes, STOP
and report the measured widths.

### Step 2: Make the Hero heading fit narrow viewports

Adjust only the heading's responsive type size/tracking (or apply an equivalent
local max-width-safe treatment) so `REFLECTORBIT` remains fully visible at
320 px without changing the `sm:` desktop appearance.

**Verify**: `npx playwright test` exits 0 and the mobile overflow assertion
passes.

### Step 3: Run the full repository gates

**Verify**:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npx playwright test`

All commands must exit 0.

## Test plan

- Extend `tests/smoke.test.ts` with a mobile-width assertion for
  `scrollWidth <= clientWidth`.
- Preserve all existing facade, video, reduced-motion, and a11y tests.
- Ensure the test fails for actual page-level overflow rather than merely
  checking the heading's CSS classes.

## Done criteria

- [ ] At 320 px, the document has no horizontal overflow.
- [ ] The full `REFLECTORBIT` heading is within the viewport.
- [ ] Desktop typography at the `sm` breakpoint is unchanged.
- [ ] `npm run lint`, `npm run typecheck`, `npm run build`, and
      `npx playwright test` all exit 0.
- [ ] Only in-scope files and `plans/README.md` are modified.

## STOP conditions

- The overflow is no longer reproducible at commit `3a07f3b`.
- Fixing it requires changing copy, global overflow clipping, or unrelated
  sections. Do not hide a layout bug with `overflow-x: hidden`.
- The mobile project makes unrelated tests depend on unsupported device APIs;
  report which test and why instead of deleting coverage.

## Maintenance notes

Keep the page-level overflow assertion whenever Hero typography changes.
Reviewers should test 320 px, not just the more forgiving 390 px viewport.
