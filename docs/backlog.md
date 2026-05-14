# Backlog

Single tracker for deferred items — things found but not fixing now. Solo-dev queue. Scanned by doc sync at commit. When picking up new work, scan related items here to bundle.

**Three categories** distinguished by ID prefix:

- **`BUG-###`** — broken behavior. Surface symptom may hide deeper cause.
- **`DEBT-###`** — working but rotting (test fixture rot, stale dep, cleanup owed).
- **`GAP-###`** — design gap, never properly specced.

No phase prescription per category — when an item rolls into a session, the harness phase-gate triage decides which superpowers phases run. Surface "clear fix" can become design work after evidence; pre-routing biases that judgment.

Format per item: stable ID, short title, affected area, why it matters, proposed fix or what's missing. Newest at top. When resolved, **delete the item** — git history is the archive.

---

## Open

### GAP-001: Plan v1 roadmap

**Affected area:** whole product

**Why it matters:** bootstrap delivered overview + techstack but no feature breakdown / order / first-step. Without this, `/todo` will report empty and the pipeline has no fuel.

**What's missing:** ordered feature list with rationale, first-feature spec, and first-feature plan.

**Deliverables** (session triages phases via harness phase-gate; ground work in `docs/overview.md` + `docs/techstack.md`):

- This backlog file populated with feature breakdown (one item per feature, ordered, w/ rationale).
- First-feature spec at `docs/specs/{first-feature-slug}.md` (or `docs/superpowers/specs/` if the project doesn't scaffold persistent specs — the `/harness-bootstrap` Q&A decides).
- First-feature plan at `docs/superpowers/plans/{date}-{first-feature-slug}.md`.

After deliverables exist, delete this `GAP-001` item — `/todo` will pick up the actual work from the populated backlog and first-feature spec/plan.
