# Overview

> Living doc. Skeleton sections (Problem / User / Current State) seeded at scaffold from Q&A answers. Grown sections (Module Index / Data Flow / Key Boundaries) start empty and grow via doc-sync — every commit that adds, removes, or reshapes a module triggers a sync proposal. See `CLAUDE.md` Doc Sync.

## Problem

Fun hobby CLI tool. Scans local Claude Code session logs at `~/.claude/projects/**/*.jsonl` and produces a mechanical (non-LLM) word/sentence frequency wordcloud. Output is a self-contained HTML page that auto-opens in the browser; user clicks an in-page "Export PNG" button to rasterize and share on social media — like an old-school Facebook trivia app, but for "what did Claude say to you this week."

v1 surfaces most-used words split by speaker (user vs Claude). v2 extends to most-said sentences. Tokenization must handle both Latin (whitespace) and CJK (character segmentation) input cleanly. Layout (combined vs split tabs/images) decided post-bootstrap.

## User

Claude Code community. Anyone with a populated `~/.claude/projects/` directory who wants a shareable visual of their AI conversation patterns. Distribution via npm registry; users run `npx whatdidclaudesay` with zero install. Fallback `npx github:user/whatdidclaudesay` works pre-publish.

## Current State

greenfield

## Module Index

> Grows via doc-sync as modules are added or refactored. One-line description per significant file or directory.

## Data Flow

> Grows via doc-sync as entry points and pipelines crystallize. Inputs → transforms → outputs through the code.

## Key Boundaries

> Grows via doc-sync as API contracts, internal interfaces, and external dependencies stabilize.
