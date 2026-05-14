# Pipeline State = File Presence

Multi-stage work pipelines reconstruct state from file presence in the working folder, not from explicit status fields, agent memory, or conversation context. Each stage = safe session break point. State survives `/clear`, restart, hand-off.

Corollary: if it's not in a file, it doesn't exist — not to future sessions, not to subagents, not to dashboard skills.

## Test

> "If this session ends right now and a new session starts cold, can it fully orient from files alone?"

- Yes → pipeline is session-safe.
- No → state lives somewhere ephemeral. Persist before break.

## What this requires

- **Atomic stage transitions** — artifacts written + committed before the next stage starts. Half-written state is invisible to the next session.
- **Unambiguous state signals** — file presence (or named subfolder) marks stage clearly. No status fields buried inside files.
- **No conversation dependency** — a stage that needs "what we agreed earlier" to resume must persist that agreement to a file first.

## Failure modes

- Decisions made in conversation, never written down → ephemeral. Compact lossy.
- Status field inside a file changes mid-stage → reader sees inconsistent state between stages.
- Stage transition needs a "magic action" by gateway after file write → break between write and action loses the transition.

## Boundary

Applies to: any multi-stage workflow with possible session breaks (which is every long workflow with AI agents).

Does not prescribe: stage names, file names, folder layout, transition triggers — repo-shaped (Tier 2). Two-stage pipelines (input → output) and ten-stage pipelines (discussion → ... → merge) both qualify.
