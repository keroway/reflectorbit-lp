# Plan 004: 保守ドキュメントを現行構成へ同期する

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If
> anything in "STOP conditions" occurs, stop and report. When done, update this
> plan's row in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 3a07f3b..HEAD -- CLAUDE.md .github/dependabot.yml README.md package.json biome.json src/pages/index.astro`

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: docs
- **Planned at**: commit `3a07f3b`, 2026-07-23
- **Issue**: https://github.com/keroway/reflectorbit-lp/issues/120

## Why this matters

The agent/maintainer guidance contradicts the current configuration in several
places. It says CSS is covered by Biome and later says CSS is excluded, points
to a nonexistent README deployment section, omits three live page sections,
and tells maintainers that Vite is pinned by an override that no longer exists.
These are operational instructions, so stale text can directly cause incorrect
maintenance changes.

## Current state

- `CLAUDE.md:25-26` says Biome covers CSS, while `CLAUDE.md:78-80` and
  `biome.json:11-12` exclude both Astro and CSS.
- `CLAUDE.md:31` points to a README "デプロイ（Cloudflare Pages）" section,
  but `README.md` has no such section and instead links to
  `docs/development.md`.
- `CLAUDE.md:44-53` omits Trailer, Screenshots, and SiteNav from the current
  composition shown in `src/pages/index.astro:14-25`.
- `.github/dependabot.yml:28-30` says `package.json` pins Vite at `^7.3.5`;
  `package.json:48-50` only overrides `yaml`.
- `CLAUDE.md:60-61` still calls Core cyan although the current documented token
  is blue-violet.

## Commands you will need

| Purpose          | Command             | Expected on success |
| ---------------- | ------------------- | ------------------- |
| Lint/docs format | `npm run lint`      | exit 0              |
| Typecheck        | `npm run typecheck` | 0 errors            |
| Build            | `npm run build`     | 2 pages built       |

## Scope

**In scope**:

- `CLAUDE.md`
- `.github/dependabot.yml`
- `README.md` only if needed to create the referenced deployment section;
  prefer correcting the link to `docs/development.md`

**Read-only references**:

- `package.json`
- `biome.json`
- `src/pages/index.astro`
- `docs/development.md`
- `docs/design.md`

**Out of scope**:

- Changing package versions or actual build/lint configuration
- Rewriting product copy
- Adding new deployment behavior

## Git workflow

- Branch: `docs/sync-maintainer-guidance`
- Commit example: `docs: sync maintainer guidance with current config`.
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Correct tooling and deployment guidance

Make the Biome target list internally consistent with `biome.json`. Replace the
nonexistent README section reference with the actual deployment/setup source.
Remove the stale Vite override warning from Dependabot configuration while
retaining the useful Astro 7/Vite 8 warning in `CLAUDE.md`.

**Verify**:

```sh
rg -n "overrides.*vite|README「デプロイ|json.*css" CLAUDE.md .github/dependabot.yml
```

Expected: no stale claim remains.

### Step 2: Synchronize the architecture summary and color wording

List the actual section order from `src/pages/index.astro` and include SiteNav,
Trailer, and Screenshots in the component summary. Use the current Core color
name from `docs/design.md`.

**Verify**: compare the documented order directly with imports/render order in
`src/pages/index.astro`; they must match exactly.

### Step 3: Run repository gates

**Verify**: `npm run lint`, `npm run typecheck`, and `npm run build` all exit 0.

## Test plan

- No new executable test is required for prose-only corrections.
- `npm run lint` is the Markdown formatting gate.
- Manually compare each corrected factual claim against its named source file.

## Done criteria

- [ ] Biome scope is described consistently.
- [ ] Deployment guidance points to an existing section/document.
- [ ] Architecture order matches `src/pages/index.astro`.
- [ ] No nonexistent Vite override is described.
- [ ] Core color wording matches `docs/design.md`.
- [ ] Lint, typecheck, and build pass.
- [ ] Only in-scope files and `plans/README.md` are modified.

## STOP conditions

- A source-of-truth file is itself ambiguous or contradictory.
- Correcting a claim would require changing configuration or application code.
- Product wording differs between `docs/copy.md` and the rendered components;
  report that as a separate finding rather than expanding this docs-only plan.

## Maintenance notes

Treat `CLAUDE.md` as executable maintainer guidance: configuration claims
should always name the source file they mirror. Remove obsolete warnings when
the condition they warn about is gone.
