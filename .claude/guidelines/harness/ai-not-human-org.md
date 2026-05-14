# AI is not a Human Org

Human orgs exist because one brain can't hold everything. Humans specialize, then need meetings to sync. The org chart solves a constraint AI doesn't have.

AI has the opposite constraint: holds any expertise via prompts, loses everything between sessions. No experience accumulates. Each conversation is a fresh boot with loaded docs.

| | Human | AI |
|---|---|---|
| **Brain** | Persistent instance with accumulated experience | Ephemeral config — same model, different prompts |
| **Expertise** | Earned over years, can't switch on demand | Loaded via prompts, switchable instantly |
| **Bias/insight** | From experience and background | From prompts and loaded docs |
| **Context sharing** | Meetings — slow, lossy | Docs — instant, exact |
| **Specialization** | Necessary (one brain can't hold everything) | Optional (same brain, different focus) |
| **Forgetting** | Can't force-forget; context bleeds | Clean slate each session; context is loaded or absent |

## Design implication

Don't model AI workflows after company org charts. Model after how one person works:

- **Thinking** — hats (skills)
- **Doing** — hands (subagents)
- **Remembering** — docs

One conversation. Many hats. Disposable hands. Docs are shared memory, not agent state.

## Subagents are context windows, not people

Subagents aren't "other people." Same model, isolated context window. Value isn't expertise — it's:

1. **Context protection** — subagent reads 50 files, runs tests; noise stays out of gateway.
2. **Focused execution** — clean context + tight prompt beats cluttered context after 30 messages.
3. **Parallel work** — independent tasks run simultaneously.

Disposable focused instances. Spawned for a job, discarded after.

## Boundary

Applies to: any project evaluating gateway+subagent architecture, any harness that organizes Claude work.

Does not prescribe: which hats to wear, which hands to spawn, how to name them — that's repo-shaped (Tier 2). The operational hats-vs-hands distinction lives in `hats-and-hands.md` (Tier 1, sibling principle).
