# ai-skills

Consolidated catalog of this user's custom Claude Code skills, plus a running
list of the ready-made marketplace plugins installed alongside them so
everything AI-skill-related lives in one place.

## Tezkor indeks (o'zbekcha)

Oson topish uchun — har bir skill/agent/plugin'ning qisqa o'zbekcha nomi.
Batafsil tushuntirish pastdagi bo'limlarda.

| Nomi (name) | O'zbekcha | Turi |
|---|---|---|
| `bpmn-diagram` | BPMN diagramma (prompt orqali yaratish/tahrirlash) | Custom skill |
| `accessibility-testing` | Qulaylik (accessibility) tekshiruvi | Custom skill |
| `visual-regression-testing` | Vizual regressiya testi (skrinshot solishtirish) | Custom skill |
| `i18n-translate` | Tarjima / ko'p tillilik (i18n) | Custom skill |
| `openapi-from-codebase` | Kod bazasidan Swagger/OpenAPI hujjat yaratish | Custom skill |
| `db-migration-reviewer` | DB migratsiya xavfsizligini tekshiruvchi | Agent (POS'dan) |
| `i18n-auditor` | Tarjima kamchiliklarini (yo'q kalit) topuvchi | Agent (POS'dan) |
| `pos-quality-auditor` | POS sifat auditori ("bozorga tayyormi") | Agent (POS'dan) |
| `poster-integration-dev` | Poster POS integratsiyasi dasturchisi | Agent (POS'dan) |
| `poster-parity-orchestrator` | Poster parity rejasini boshqaruvchi | Agent (POS'dan) |
| `static-analysis` | Statik kod xavfsizlik tahlili | Plugin (Trail of Bits) |
| `insecure-defaults` | Xavfli standart sozlamalarni aniqlovchi | Plugin (Trail of Bits) |
| `differential-review` | Diff-asosida xavfsizlik ko'rib chiqish | Plugin (Trail of Bits) |
| `supply-chain-risk-auditor` | Bog'liqlik (dependency) xavf auditi | Plugin (Trail of Bits) |
| `open-sourcing` | Repo'ni PUBLIC qilishdan oldin sirlar(parol/token)ni tekshirish | Plugin (Trail of Bits) |
| `superpowers` | Reja tuzish va tizimli debugging | Plugin |
| `playwright` | Brauzerda avtomatik test | Plugin |
| `github` | GitHub integratsiyasi | Plugin |
| `agent-sdk-dev` | AI agent qurish vositasi | Plugin |
| `pydantic-ai` | Python AI agent freymvorki | Plugin |
| `mcp-server-dev` | MCP server qurish | Plugin |
| `langfuse` | AI kuzatuv (tracing) va baholash | Plugin |
| `mlflow` | AI model kuzatuvi — ⚠️ hozircha ishlamaydi | Plugin |
| `runway-api` | Video generatsiya (AI) | Plugin |
| `hyperframes` | HTML'dan video yaratish | Plugin |
| `adobe-for-creativity` | Rasm/kreativ tahrirlash | Plugin |
| `prisma` | Ma'lumotlar bazasi (Prisma ORM) yordamchisi | Plugin |
| `sentry` | Production xato monitoring | Plugin |
| `context7` | Dolzarb kutubxona dokumentatsiyasi | Plugin |
| `mintlify` | Hujjat (docs) sayti qurish | Plugin |
| `sourcegraph` | Ko'p-repo bo'yicha kod qidirish | Plugin |
| `semgrep` | Real vaqtda xavfsizlik skaneri | Plugin |
| `sonarqube` | To'liq kod sifat/xavfsizlik nazorati | Plugin |
| `ui-ux-pro-max` | Design system, UX, taqdimot (slayd) | Plugin (oldindan bor) |
| `impeccable` | Vizual dizayn sifatini nazorat qiluvchi | Plugin (oldindan bor) |
| `postman` | API test/mock/monitoring | Plugin (oldindan bor) |
| `figma` MCP | Figma dizaynini kodga aylantirish | MCP server (ulangan) |

## Custom skills in this repo

### `skills/bpmn-diagram` — BPMN diagramma

Prompt-driven BPMN 2.0 diagram generation and iterative editing — describe a
business process in Uzbek, Russian, or English and get a live, interactive
diagram plus a standards-compliant `.bpmn` file, with no AI API call (Claude
reasons directly in the same `ProcessSpec`/edit-operation vocabulary that
`bpmn-studio`'s own production AI pipeline uses). See
`skills/bpmn-diagram/SKILL.md` for the full mechanics.

Ported/vendored from `D:\Docker\projects\bpmn-studio\src\lib\ai\` (pure,
zero-DOM modules only — `process-spec.ts`, `validator.ts`, `lint.ts`,
`layout.ts`): `process-spec.mjs`, `validator.mjs`, `lint.mjs`, `layout.mjs`.
New in this repo (bpmn-studio has no headless equivalent — it round-trips
through a live bpmn-js Modeler instead): `apply.mjs` (pure ProcessSpec
reducer) and `serialize-xml.mjs` (ProcessSpec + layout → BPMN 2.0 XML).
Verified against `bpmn-moddle`'s real schema parser with zero warnings on
both a flat process and a multi-pool/lane/boundary-event/data-object
topology.

### `skills/accessibility-testing` — Qulaylik tekshiruvi

Audits a live page's accessibility-tree structure (missing labels, broken
heading order, unreachable interactive elements, landmark issues) via
`claude-in-chrome`'s `read_page` — no new install. Explicitly scoped: tree
structure only, not a WCAG-certified ruleset (no color-contrast computation —
pair with axe-core/Lighthouse for a compliance-grade audit).

### `skills/visual-regression-testing` — Vizual regressiya testi

Screenshots a page at fixed viewports (via `claude-in-chrome`) and
pixel-diffs against a stored baseline (`scripts/diff.mjs`, pixelmatch — pure
image diff, verified against hand-built test fixtures: 0% diff for
identical images, exact pixel count for a deliberately changed region).

### `skills/i18n-translate` — Tarjima / ko'p tillilik

Finds missing/empty keys across a project's locale files (JSON or Flutter
`.arb`, `scripts/diff-locales.mjs` — verified against a deliberately
incomplete fixture: correctly caught 2 missing + 1 empty key) and Claude
translates them directly (no external translation API), preserving
interpolation placeholders, ICU plural syntax, and each locale's existing
register. Also handles adding a brand-new locale from scratch. Complements
(doesn't replace) POS's `i18n-auditor` agent below — that one catches a
different bug (code references a key no locale file has at all).

### `skills/openapi-from-codebase` — Kod bazasidan Swagger/OpenAPI

Generates an OpenAPI 3.0 spec by reading existing Express/Next.js route
handlers — no prior spec or Postman collection needed (confirmed by reading
Postman's own `api-documentation` skill: it assumes a spec/collection
already exists, it doesn't extract one from raw route code). Explicitly
skips stacks that already auto-generate this (FastAPI's `/openapi.json`,
NestJS with `@nestjs/swagger`) — points the user at the existing output
instead of duplicating it. `scripts/validate.mjs` (`@apidevtools/swagger-parser`)
checks the written spec is actually valid OpenAPI before reporting done —
verified against a hand-built valid spec (2 paths/3 operations/2 schemas,
correctly counted) and a deliberately broken `$ref` (correctly rejected).

## Agents copied in from other projects

### `agents/` (5 files, copied verbatim from `D:\Docker\projects\pos\.claude\agents\`, 2026-10-26)

`db-migration-reviewer.md`, `i18n-auditor.md`, `pos-quality-auditor.md`,
`poster-integration-dev.md`, `poster-parity-orchestrator.md` — Biznes POS's
own specialist subagents (Prisma migration safety review, i18n leak
detection, production-readiness audit, Poster POS integration, and the
Poster-parity delivery orchestrator). Copied, not moved — POS's own
`.claude/agents/` is untouched and still authoritative; **if POS's copies
change, re-copy them here, this repo doesn't auto-sync**.

One credential was redacted from `pos-quality-auditor.md` (a seeded local
admin password) before this repo went public — see git history if the
original is ever needed; it still lives, unredacted, in POS's own private
copy.

Deliberately **not** copied: POS's other 6 agents (`architect`,
`backend-dev`, `cto`, `frontend-dev`, `pm`, `qa-reviewer`) — those are
POS-customized versions of agents that already exist globally at
`~/.claude/agents/`. Copying them here (user scope, same as `~/.claude/agents/`)
would create two competing global definitions of the same agent name and
could leak POS-specific assumptions into every other project's generic
architect/pm/etc. work. The 5 agents copied here have POS-specific names
with no such collision, so they just sit inert everywhere except when
someone deliberately invokes them (e.g. for actual Poster integration work).

## Marketplace plugins installed alongside this project (2026-10-26/27)

These are off-the-shelf plugins, not built here — installed via
`claude plugin install <name>@<marketplace>`, scope `user` (available in
every project, not just this one).

**Security audit (Trail of Bits):**
- `static-analysis`, `insecure-defaults`, `differential-review` — already
  present before this round
- `supply-chain-risk-auditor` — npm/PyPI/Go dependency risk, added for the
  heavy npm+pip usage across this user's projects
- `open-sourcing` — secrets-history hygiene + license/docs/CI readiness
  before a repo goes public. Added 2026-10-27 right after a real lesson:
  this repo's own git history briefly carried a plaintext seeded admin
  password (copied from POS's `pos-quality-auditor.md`) even after the
  *working tree* was redacted — only a history rewrite + force-push
  actually removed it. Run this BEFORE pushing anything new-public, not
  just a grep of current file contents.

**Dev workflow / testing:**
- `superpowers` — planning, TDD, systematic debugging, subagent-driven dev
- `playwright` — Microsoft's browser automation / E2E testing MCP
- `github` — official GitHub MCP. Auth is header-based, not OAuth login: set
  `GITHUB_PERSONAL_ACCESS_TOKEN` in `~/.claude/settings.json`'s `env` block
  (a GitHub PAT from https://github.com/settings/tokens), then restart
  Claude Code. `claude mcp login` does not apply to this server.

**AI workflow:**
- `agent-sdk-dev` — Claude Agent SDK dev kit
- `pydantic-ai` — Python AI agent framework patterns
- `mcp-server-dev` — designing/building MCP servers
- `langfuse` — LLM tracing/prompt-management/evaluation
- `mlflow` — ⚠️ installed but **fails to load** (upstream packaging bug:
  duplicate `hooks/hooks.json` declaration in v1.0.0 — not fixable locally;
  reported upstream). Reinstall later once a fixed version ships.

**Video / media production:**
- `runway-api` — video generation (veo3, gen4.5, seedance2, Nano, Banana Pro)
- `hyperframes` — HeyGen HTML-to-video compositions
- `adobe-for-creativity` — image editing / creative workflows

**Database:**
- `prisma` — matches POS's and bpmn-studio's actual ORM (both are Postgres
  via Prisma); schema/migration/query help. Self-hosted/Fly Postgres has no
  matching plugin otherwise — every other DB plugin in the marketplace is
  locked to a specific managed cloud provider (Neon, Supabase, PlanetScale,
  etc.) this user doesn't use; direct `psql`/`docker exec` access needs no
  plugin at all.

**Observability / error monitoring:**
- `sentry` — error reports, stack traces, issue search by fingerprint. Added
  because multiple live deployments (pos.non-bor.uz, AyTiX Support, Maktab
  Sinov, SmartVision, ...) had no error-monitoring visibility at all.

**Docs / code understanding:**
- `context7` — version-accurate library docs pulled live into context
  instead of relying on training-data-era API knowledge (works anonymously,
  no setup).
- `mintlify` — for turning any of this user's written docs (testing
  qo'llanma, AI Kitob, API references) into a real hosted docs site.
- `sourcegraph` — cross-repo code search/understanding; most useful once
  "find X across all my projects" becomes a recurring need with 30+ repos.

**Code quality / security (complements Trail of Bits):**
- `semgrep` — real-time vulnerability scanning while code is being written
  (Trail of Bits' plugins are more audit/analysis-oriented; semgrep is the
  inline/live counterpart).
- `sonarqube` — heavier, more opinionated quality+security gate (7000+
  rules, PostToolUse hooks, secrets scanning) — needs a SonarQube
  server/cloud account to get full value; installed as an available option,
  not actively configured against any project yet.

**Already installed before this project existed (for reference):**
- `ui-ux-pro-max` — design system, palettes, UX guidelines, and presentation
  slides (see "slayd" question — the `slides` skill inside this plugin, plus
  the built-in Artifact "Slides" type, are both already available; no new
  plugin was needed)
- `impeccable` — visual design-quality critique/polish
- `postman` — API design/mock/test/monitor, bound to this user's Postman
  workspace
- Figma MCP server — connected, design-to-code

## Adding another custom skill here

1. `mkdir skills/<name>` and write `skills/<name>/SKILL.md` (frontmatter:
   `name`, `description` — what it does AND when to use it).
2. Bundle any scripts under `skills/<name>/scripts/`.
3. No separate registration needed — this repo is already linked into
   Claude Code as a local plugin (`ai-skills@ai-skills`); every skill folder
   under `skills/` is picked up automatically.
4. Update the "Tezkor indeks" table above with the new item's o'zbekcha nomi.
