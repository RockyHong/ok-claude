---
name: release
description: Prepare a version release — bump version files, commit, and tag. Just run /release with no arguments.
---

# Release

Prepare a version release. No arguments — reads git state and decides what to do.

## Usage

```
/release
```

## Project Config

- **Type:** node
- **Version files:**
  - `package.json` → `version` (currently 0.1.0)
- **Platforms:** none (single-deploy npm package)
- **Main branch:** master
- **Distribution:** npm registry (`ok-claude`)

## Protocol

### 1. Qualify

Run in parallel:
- `git status` — working tree must be clean. If dirty, stop: "Commit or stash changes first."
- `git branch --show-current` — must be on `master`. If not, warn and ask to continue.

### 2. Read state

```bash
# Latest version tag
git tag -l "v*" --sort=-v:refname | head -1

# Commits since last version tag
git log <latest-tag>..HEAD --oneline

# Check if current commit == tagged commit
git rev-parse HEAD
git rev-parse <latest-tag>^{commit}
```

### 3. Decide

Based on the state, determine which flow to run:

**STATE A — No version tag exists:**
→ Go to "Full Release Flow"

**STATE B — Version tagged, same commit:**
→ "v{latest} already released. Nothing to do."

**STATE C — Version tagged, different commit:**
→ Go to "Full Release Flow"

### Full Release Flow

**Step 1 — Detect bump level** from conventional commits since last tag:

| Signal | Bump |
|---|---|
| `BREAKING CHANGE:` in body, or `!:` suffix | major |
| `feat:` | minor |
| `fix:`, `refactor:`, `chore:`, `docs:`, `test:`, `perf:` | patch |
| No conventional prefixes | patch (default) |

Use the highest level found. If no previous tag exists, ask user for the version.

**Step 2 — Propose:**

> Current: 0.1.0 → New: {new_version} (auto: N feat, N fix since v{current})
> OK?

Wait for confirmation. User can override the version.

**Step 3 — Bump version files:**

Edit `package.json`. Replace the `version` field value.

Use the Edit tool:
- old_string: `"version": "{current_version}",`
- new_string: `"version": "{new_version}",`

Only change the version field. Do not touch anything else in `package.json`.

**Step 4 — Generate release notes** from commits since last tag:

```
## What's New
- description (from feat: commits)

## Fixes
- description (from fix: commits)

## Other
- description (from everything else)
```

Omit empty sections. Show to user for approval.

**Step 5 — Commit and tag:**

```bash
git add package.json
git commit -m "chore: release v{version}"
git tag -a v{version} -m "<release notes>"
```

Use annotated tag. Pass message via HEREDOC.

**Step 6 — Report:**

> Release v{version} prepared.
> To push tag: `git push origin master --tags`
> To ship to npm:
>   1. `npm whoami` — confirms logged in. If 401, run `npm login` (use `--auth-type=web` if it stalls).
>   2. `npm publish` (add `--otp=<code>` if 2FA enabled on your npm account)

## Rules

- Never push. User pushes manually.
- Never run `npm publish` automatically. User publishes manually after tag is pushed.
- Never proceed if working tree is dirty.
- Never delete or move existing tags.
- All tags are annotated (`git tag -a`).
- No arguments to `/release` — always auto-detect.
