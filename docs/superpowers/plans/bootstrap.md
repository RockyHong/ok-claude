# Pipeline Bootstrap Plan

> **For agentic workers:** Use `/todo` to see current progress. Each task is independent and session-sized.

**Goal:** Final bootstrap cleanup for WhatDidClaudeSay

**Context:** Pipeline scaffolded on 2026-05-14. CLAUDE.md is live. `docs/techstack.md` and `docs/overview.md` are seeded skeletons — skeleton sections (Runtime / Framework / Build & Dist / Problem / User / State) carry detected facts; grown sections (Architecture Rules / Coding Patterns / Module Index / Data Flow / Key Boundaries) start empty and grow via doc-sync as code lands. Skill / MCP / hook picks already curated and pinned in `.claude/settings.json`.

`docs/specs/` not scaffolded (single-purpose CLI — see `docs/techstack.md` § Rejected Alternatives). `docs/backlog.md` already populated by `/super-bootstrap` with `GAP-001` (roadmap planning) — no Task 2 seed needed.

Only cleanup remains.

---

### Task 1: Cleanup

- [ ] **Resolve `GAP-001` in `docs/backlog.md`** — populate feature breakdown, write first-feature spec (at `docs/superpowers/specs/{slug}.md` since persistent `docs/specs/` was not scaffolded), write first-feature plan (at `docs/superpowers/plans/{date}-{slug}.md`). Then delete the `GAP-001` item.
- [ ] **Delete this file** (`docs/superpowers/plans/bootstrap.md`) — bootstrap is complete
- [ ] **Verify `/todo` shows no active work** (unless real project work started)
- [ ] **Commit**: `chore: complete pipeline bootstrap`

---

**Note on re-runs:** if `/harness-bootstrap` is run again later, this file gets regenerated. If `docs/specs/` and `docs/backlog.md` already exist with content, Tasks 1 and 2 are dropped — only Task 3 (cleanup) remains. Most refresh value on re-runs comes from Phase 3c curation (skill/MCP picks against live sources), not from this plan. (Re-runs typically come via `/harness-bootstrap` directly — `/super-bootstrap` is the greenfield-gate entry; once code is landed, it just dispatches to `/harness-bootstrap`.)
