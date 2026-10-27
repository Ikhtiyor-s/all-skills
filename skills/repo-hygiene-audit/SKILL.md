---
name: repo-hygiene-audit
description: Audits a codebase for duplicated code blocks and noisy git commit history (low-information messages, runs of small commits that should have been one). Use when the user asks to check for duplicate/repeated code, review commit hygiene, or clean up a messy git history — or proactively after a multi-commit work session before calling it done.
---

# Repo Hygiene Audit

Two independent checks, both via bundled scripts with no npm dependencies (pure Node): duplicated code blocks, and commit-history noise. Neither check rewrites anything on its own — both produce a report; any actual squashing or refactoring is a separate, explicit step the user signs off on.

## Check 1: duplicate code

```
node scripts/find-duplicates.mjs --dir <path> [--window 6] [--ext .ts,.tsx,.js,.jsx,.py,.dart] [--min-chars 120]
```

Sliding-window line-hash clone detection (same technique as jscpd/PMD CPD): finds blocks of `--window` consecutive non-trivial lines that appear more than once anywhere under `--dir`, merges adjacent matching windows into one reported block, and sorts results by impact (`lines × occurrences`) — the worst offenders first, not alphabetically. Verified against a fixture with one deliberate duplication: found exactly that block, at the right line ranges, and correctly ignored unrelated code in the same files.

**Reading the report**: for each duplicate group, look at the actual code (the script gives locations + a preview, not a full diff) before recommending extraction — a short duplicated boilerplate pattern (e.g. a standard try/catch shape) is often not worth a shared abstraction; a duplicated 20-line business-logic block almost always is. Say which kind each finding is, don't recommend extracting everything found mechanically.

**Defaults are JS/TS/Python/Dart-shaped** (comment syntax isn't stripped, so a block that's mostly comments can false-positive as a duplicate) — note that caveat on findings that look comment-heavy rather than presenting them as high-confidence.

## Check 2: commit-history noise

```
node scripts/commit-noise.mjs --dir <path> [--since "30 days ago"] [--gap-minutes 15] [--run-threshold 3]
```

Flags two independent things from `git log`:
- **Low-information commit messages** — bare `wip`/`fix`/`update`/`typo`/etc. with nothing describing what changed.
- **Squash-candidate runs** — `--run-threshold` or more commits within `--gap-minutes` of each other that touch at least one shared file. This catches noise even when no single message is generic (e.g. four real but overly-granular commits building one feature).

Verified against a synthetic history (4 commits across 6 minutes on one file, 3 with generic messages, plus one well-separated unrelated commit): correctly flagged the 4-commit run as a squash candidate, correctly listed only the 3 generic-message commits as low-info, and correctly left the unrelated later commit out of both.

**Never squash on your own initiative.** Report the candidates; if the user wants them combined, that's an interactive rebase (`git rebase -i`) they run themselves (Claude Code's tools can't drive an interactive rebase), or a `git reset --soft <before-the-run> && git commit` sequence Claude can do non-interactively if the user explicitly asks for that specific run to be squashed — confirm the exact commit range before touching history, and never on a branch that's already been pushed/shared without discussing the force-push that implies.

## Why this exists

The user's own observation prompting this skill: too many small commits and repeated code appearing across sessions. This audits for the symptom after the fact; the actual fix is in how work gets done — batch related changes into one commit instead of committing after every micro-edit, and check for an existing helper/util before writing a new one. Run this periodically (end of a work session, before "done") rather than only when something already feels messy.
