# Rules Index

> Path-scoped rules in this directory. Each `.md` carries `globs:` frontmatter — Claude Code auto-attaches the rule's body when a matching file is read. Full ammo at the decision moment, zero ambient cost otherwise.
>
> **Cold-load caveat:** rule fires on file *read*, not on intent. If you're planning a change before opening files, read the relevant rule directly first: `Read .claude/rules/<name>.md`.
>
> Mirrored in `CLAUDE.md` § Rules with one-line summary bullets so the orchestrator knows what's available during planning.

## Active rules

None yet. No Phase 1 signals (frontend component dir, MV3 manifest, migrations, tests dir) fired during bootstrap or sync passes. Add rules below as path-scoped patterns emerge.

## Adding a new rule

1. New file `<topic>.md` with frontmatter:
   ```yaml
   ---
   globs:
     - "src/<scope>/**/*.ts"
   description: "When this rule applies and why"
   ---
   ```
2. Body uses the same imperative, full-detail style as `CLAUDE.md` § Edit Discipline — rules are loaded with full ammo.
3. Add a one-line summary bullet to `CLAUDE.md` § Rules so the orchestrator knows it exists.
4. Add an entry to this index.
