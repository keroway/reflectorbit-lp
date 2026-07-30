# Plan 003: High 脆弱性のある svgo を更新し監査を CI に組み込む

> **Executor instructions**: Follow this plan step by step. Never include
> exploit payloads in commits, issues, or test fixtures. Run every verification
> command and confirm the expected result before moving on. If anything in
> "STOP conditions" occurs, stop and report. When done, update this plan's row
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 3a07f3b..HEAD -- package.json package-lock.json .github/workflows/ci.yml`

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `3a07f3b`, 2026-07-23
- **Implemented in**: commit `1c94033` on branch `security/update-svgo`

## Why this matters

`npm audit --omit=dev --audit-level=high` reports one High advisory:
GHSA-2p49-hgcm-8545 in `svgo@4.0.1`. The dependency is pulled into Astro's
build/distribution path and the lockfile pins the affected version. CI currently
does not run a dependency audit, so the repository can remain green while a
High advisory is present.

## Current state

- `package-lock.json:7366-7367` pins `node_modules/svgo` at `4.0.1`.
- `package-lock.json:3175` shows Astro requesting `svgo: ^4.0.1`.
- `.github/workflows/ci.yml` runs lint, typecheck, build, and E2E, but no
  dependency audit.
- The verified command and result were:

  ```text
  npm audit --omit=dev --audit-level=high
  1 high severity vulnerability
  ```

## Commands you will need

| Purpose   | Command                                   | Expected on success     |
| --------- | ----------------------------------------- | ----------------------- |
| Install   | `npm ci`                                  | exit 0                  |
| Audit     | `npm audit --omit=dev --audit-level=high` | exit 0, 0 High/Critical |
| Lint      | `npm run lint`                            | exit 0                  |
| Typecheck | `npm run typecheck`                       | 0 errors                |
| Build     | `npm run build`                           | 2 pages built           |
| E2E       | `npx playwright test`                     | all tests pass          |

## Scope

**In scope**:

- `package-lock.json`
- `package.json` only if a minimal override or direct dependency constraint is
  required
- `.github/workflows/ci.yml`

**Out of scope**:

- Unrelated dependency upgrades
- Major Astro migration
- Security demonstration payloads
- Application source changes

## Git workflow

- Branch: `security/update-svgo`
- Commit example: `fix(deps): update vulnerable svgo`.
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Update only the affected dependency path

Use npm's lockfile-aware update/audit fix so the resolved SVGO version is no
longer affected. Review the lockfile diff and reject unrelated package churn.
If the fix requires an Astro major upgrade, STOP.

**Verify**: `npm audit --omit=dev --audit-level=high` exits 0 with no High or
Critical advisory.

### Step 2: Add a CI audit gate

Add a lightweight CI step or job using the exact audit command above. Place it
where dependency installation already occurs unless a separate job materially
improves clarity without duplicating unnecessary setup.

**Verify**: `actionlint .github/workflows/ci.yml` exits 0 when `actionlint` is
available; otherwise validate YAML and report that actionlint was unavailable.

### Step 3: Run all gates

Run lint, typecheck, build, E2E, and audit.

**Verify**: every command in "Commands you will need" exits 0.

## Test plan

- No exploit regression fixture is needed or allowed.
- The machine-checkable regression gate is the production dependency audit.
- Existing build and E2E tests establish that the dependency update does not
  break Astro output.

## Done criteria

- [ ] The lockfile no longer resolves the affected SVGO release.
- [ ] Production audit reports 0 High/Critical advisories.
- [ ] CI runs the production audit on pull requests and main.
- [ ] Lint, typecheck, build, and E2E still pass.
- [ ] Only in-scope files and `plans/README.md` are modified.

## STOP conditions

- Remediation requires disabling the audit, ignoring the advisory, or adding a
  broad override without verifying Astro compatibility.
- Remediation requires an Astro major upgrade or application source changes.
- More High/Critical advisories appear; report them separately rather than
  broadening this change silently.

## Maintenance notes

Keep the audit scoped to production/build distribution dependencies to avoid
low-signal development-only noise. Reviewers should inspect the lockfile diff,
not just the final audit output.
