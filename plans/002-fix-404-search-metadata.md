# Plan 002: 404 ページから検索用ゲームメタデータを除外する

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in "STOP conditions" occurs, stop and report. When
> done, update this plan's row in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 3a07f3b..HEAD -- src/layouts/Layout.astro src/pages/404.astro tests/smoke.test.ts`

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `3a07f3b`, 2026-07-23
- **Issue**: https://github.com/keroway/reflectorbit-lp/issues/119

## Why this matters

Every request for a missing path returns the custom 404 with a canonical URL of
`/404/`, no `robots=noindex`, and a `VideoGame` JSON-LD object whose
description is the 404 message. This sends contradictory search signals and
can cause a utility error page to be indexed or interpreted as the product
entity. The shared layout needs page-level control over indexability and
structured data.

## Current state

- `src/layouts/Layout.astro:5-8` accepts only `title` and `description`.
- `src/layouts/Layout.astro:31-65` always builds the `VideoGame` JSON-LD object.
- `src/layouts/Layout.astro:82-107` always emits canonical/social metadata and
  JSON-LD.
- `src/pages/404.astro:6-9` uses the common layout without a noindex or
  structured-data override.
- A live request to `/__audit_missing__` returned HTTP 404 but contained
  `<link rel="canonical" href="https://reflectorbit-lp.pages.dev/404/">`, no
  robots meta, and the homepage `VideoGame` JSON-LD with the 404 description.

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

- `src/layouts/Layout.astro`
- `src/pages/404.astro`
- `tests/smoke.test.ts`

**Out of scope**:

- Redesigning the 404 content
- Changing homepage SEO copy or schema fields
- Cloudflare redirects/header configuration
- Adding an SEO dependency

## Git workflow

- Branch: `fix/404-search-metadata`
- Commit example: `fix(seo): exclude 404 page from indexing`.
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Add explicit layout controls

Extend `Layout.astro` props with narrowly named, default-safe controls for
indexability and structured-data emission. Defaults must preserve the homepage
output. Use the controls to conditionally emit robots metadata and JSON-LD;
avoid duplicating the entire head in `404.astro`.

**Verify**: `npm run typecheck` exits 0.

### Step 2: Mark the 404 page as non-indexable

Pass the new controls from `src/pages/404.astro` so the built page includes
`<meta name="robots" content="noindex, nofollow">` (or the repository's chosen
equivalent) and excludes `VideoGame` JSON-LD. Decide explicitly whether to
omit the canonical tag for 404 pages; do not canonicalize all missing URLs to
the `/404/` utility route.

**Verify**: after `npm run build`, `dist/404.html` contains the robots directive,
does not contain `application/ld+json`, and does not canonicalize to `/404/`.
`dist/index.html` must still contain its canonical and JSON-LD.

### Step 3: Add regression coverage

Add Playwright assertions for a missing route's HTTP 404 status and head
metadata. Also assert the homepage retains `VideoGame` JSON-LD.

**Verify**: `npx playwright test` exits 0.

## Test plan

- In `tests/smoke.test.ts`, request a guaranteed-missing path and assert status
  404, a noindex robots meta, no JSON-LD, and no `/404/` canonical.
- Assert `/` still has one `application/ld+json` script.
- Follow the existing direct Playwright style without snapshots.

## Done criteria

- [ ] Missing routes return HTTP 404 and emit a noindex directive.
- [ ] The 404 document does not emit `VideoGame` JSON-LD.
- [ ] The 404 document does not canonicalize arbitrary missing URLs to `/404/`.
- [ ] Homepage canonical and JSON-LD output are unchanged.
- [ ] All repository verification commands exit 0.
- [ ] Only in-scope files and `plans/README.md` are modified.

## STOP conditions

- Cloudflare Pages serves a different 404 artifact than `dist/404.html`.
- The change would remove or alter homepage metadata.
- The chosen approach requires deployment-specific middleware; report that
  constraint instead of adding a new runtime adapter.

## Maintenance notes

Any future utility/error pages using `Layout.astro` should make an explicit
indexability decision. Review built HTML, not only Astro source.
