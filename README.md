# ai-skills

Ushbu foydalanuvchining custom Claude Code skill'larini bitta joyga
jamlovchi katalog, shu bilan birga o'rnatilgan tayyor marketplace
plugin'larining ham ro'yxati — hammasi AI-skill bilan bog'liq narsalar bir
joyda bo'lishi uchun.

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
| `repo-hygiene-audit` | Takror kod + ortiqcha/shov-shuvli commit'larni topuvchi | Custom skill |
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

## Bu repodagi custom skill'lar

### `skills/bpmn-diagram` — BPMN diagramma

Prompt orqali BPMN 2.0 diagramma yaratish va bosqichma-bosqich tahrirlash —
biznes-jarayonni o'zbek, rus yoki ingliz tilida tasvirlab bering, va javobga
jonli, interaktiv diagramma + standartga mos `.bpmn` fayl olasiz, hech
qanday AI API chaqiruvisiz (Claude bevosita `bpmn-studio`'ning o'zining
production AI pipeline'i ishlatadigan xuddi shu `ProcessSpec`/tahrirlash-
amal vokabulyarida fikr yuritadi). To'liq mexanika uchun
`skills/bpmn-diagram/SKILL.md`ga qarang.

`D:\Docker\projects\bpmn-studio\src\lib\ai\`dan ko'chirilgan (faqat sof,
DOM'ga bog'liq bo'lmagan modullar — `process-spec.ts`, `validator.ts`,
`lint.ts`, `layout.ts`): `process-spec.mjs`, `validator.mjs`, `lint.mjs`,
`layout.mjs`. Bu repoda yangi (bpmn-studio'da bunga teng narsa yo'q — u
jonli bpmn-js Modeler orqali ishlaydi): `apply.mjs` (sof ProcessSpec
reducer) va `serialize-xml.mjs` (ProcessSpec + layout → BPMN 2.0 XML).
`bpmn-moddle`ning haqiqiy sxema parseri orqali tekshirilgan — ham oddiy
jarayon, ham ko'p-pool/lane/boundary-event/data-object topologiyasida nol
xatolik bilan.

### `skills/accessibility-testing` — Qulaylik tekshiruvi

Jonli sahifaning accessibility-tree strukturasini (yo'qolgan label'lar,
buzilgan sarlavha tartibi, yetib bo'lmaydigan interaktiv elementlar,
landmark muammolari) `claude-in-chrome`ning `read_page` vositasi orqali
auditlaydi — yangi o'rnatish shart emas. Doirasi aniq belgilangan: faqat
daraxt strukturasi, WCAG-sertifikatlangan qoidalar to'plami emas (rang-
kontrast hisoblanmaydi — compliance-darajadagi audit uchun axe-core/
Lighthouse bilan birga ishlatilsin).

### `skills/visual-regression-testing` — Vizual regressiya testi

Sahifani belgilangan viewport'larda (`claude-in-chrome` orqali) skrinshot
qiladi va saqlangan baseline bilan piksel-solishtiradi (`scripts/diff.mjs`,
pixelmatch — sof rasm-solishtirish, qo'lda tuzilgan test fixture'lari bilan
tekshirilgan: bir xil rasmlar uchun 0% farq, ataylab o'zgartirilgan hudud
uchun aniq piksel soni).

### `skills/i18n-translate` — Tarjima / ko'p tillilik

Loyihaning locale fayllari bo'ylab (JSON yoki Flutter `.arb`) yo'q/bo'sh
kalitlarni topadi (`scripts/diff-locales.mjs` — ataylab to'liqsiz fixture
bilan tekshirilgan: 2 yo'q + 1 bo'sh kalitni to'g'ri topdi) va Claude
ularni bevosita tarjima qiladi (tashqi tarjima API'siz), interpolyatsiya
placeholder'larini, ICU plural sintaksisini va har bir locale'ning mavjud
uslubini saqlab qolgan holda. Yangi locale'ni noldan yaratishni ham
bajaradi. Pastdagi POS'ning `i18n-auditor` agentini **almashtirmaydi**,
balki **to'ldiradi** — u boshqa xatoni topadi (kod ishlatgan, lekin hech
qaysi locale faylida yo'q kalit).

### `skills/openapi-from-codebase` — Kod bazasidan Swagger/OpenAPI

Mavjud Express/Next.js route handler'larini o'qib OpenAPI 3.0 spec yaratadi
— oldindan spec yoki Postman collection shart emas (Postman'ning o'z
`api-documentation` skill'ini o'qib tasdiqlandi: u spec/collection
allaqachon mavjud deb hisoblaydi, xom route kodidan hech narsani
chiqarmaydi). Buni avtomatik generatsiya qiladigan steklarni (FastAPI'ning
`/openapi.json`, `@nestjs/swagger`li NestJS) ataylab o'tkazib yuboradi —
foydalanuvchini takrorlash o'rniga mavjud natijaga yo'naltiradi.
`scripts/validate.mjs` (`@apidevtools/swagger-parser`) yozilgan spec
haqiqatan to'g'ri OpenAPI ekanini "tayyor" deb aytishdan oldin tekshiradi —
qo'lda tuzilgan to'g'ri spec (2 path/3 operatsiya/2 sxema, to'g'ri
sanalgan) va ataylab buzilgan `$ref` (to'g'ri rad etilgan) bilan
tekshirilgan.

### `skills/repo-hygiene-audit` — Takror kod va commit shovqinini topish

Ikkita tashqi bog'liqliksiz skript: `find-duplicates.mjs` (sliding-window
qator-hash klon aniqlash — jscpd/PMD CPD texnikasi, fixture bilan
tekshirilgan: ataylab qo'yilgan bitta takrorni aniq topdi, bog'liqsiz
kodni e'tiborsiz qoldirdi) va `commit-noise.mjs` (ma'nosiz commit
xabarlarini va qisqa vaqt oralig'ida bir-biriga mos fayllarga tegishli
kichik commit'lar ketma-ketligini topadi — sun'iy "shovqinli" tarix bilan
tekshirilgan: 4-commit/6-daqiqalik ketma-ketlikni va undagi 3 ta umumiy
xabarli commit'ni to'g'ri topdi, bog'liqsiz keyingi commit'ni to'g'ri
tegmay qoldirdi). Foydalanuvchining o'z kuzatuvi asosida qurildi — commit'lar
juda mayda bo'lib ketayotgani va kod sessiyalar bo'ylab ko'p takrorlanayotgani
haqida — tuzatishning xulq-atvor yarmisi uchun
[[feedback_commit_and_duplication_discipline]]ga qarang (bu skill faqat
keyinchalik auditlaydi).

## Boshqa loyihalardan ko'chirilgan agentlar

### `agents/` (5 fayl, `D:\Docker\projects\pos\.claude\agents\`dan so'zma-so'z ko'chirilgan, 2026-10-26)

`db-migration-reviewer.md`, `i18n-auditor.md`, `pos-quality-auditor.md`,
`poster-integration-dev.md`, `poster-parity-orchestrator.md` — Biznes
POS'ning o'zining maxsus subagentlari (Prisma migratsiya xavfsizligini
ko'rib chiqish, i18n sizish aniqlash, ishlab chiqarishga tayyorlik auditi,
Poster POS integratsiyasi, va Poster-parity yetkazib berish
orkestratori). Ko'chirildi, ko'chirilmadi (move emas) — POS'ning o'z
`.claude/agents/`i tegilmagan va hali ham asosiy manba hisoblanadi; **agar
POS'ning nusxalari o'zgarsa, bu yerga qayta ko'chirish kerak, bu repo
avtomatik sinxronlanmaydi**.

`pos-quality-auditor.md`dan bitta credential (urug'langan lokal admin
paroli) bu repo public bo'lishidan oldin yashirildi — agar asl nusxa kerak
bo'lsa, git tarixiga qarang; u hali ham, yashirilmagan holda, POS'ning
o'zining shaxsiy nusxasida bor.

Ataylab **ko'chirilmagan**: POS'ning qolgan 6 ta agenti (`architect`,
`backend-dev`, `cto`, `frontend-dev`, `pm`, `qa-reviewer`) — bular
`~/.claude/agents/`da allaqachon global mavjud bo'lgan agentlarning POS
uchun moslashtirilgan versiyalari. Ularni bu yerga (user scope, xuddi
`~/.claude/agents/` kabi) ko'chirish bir xil agent nomining ikkita raqobat
qiluvchi global ta'rifini yaratgan bo'lardi va POS'ga xos taxminlarni
boshqa har qanday loyihaning umumiy architect/pm va h.k. ishiga sizdirishi
mumkin edi. Bu yerga ko'chirilgan 5 ta agentning POS'ga xos nomlari bor,
shunday to'qnashuv yo'q, shuning uchun ular hamma joyda — kimdir ularni
ataylab chaqirmaguncha (masalan, haqiqiy Poster integratsiyasi ishi uchun)
— shunchaki befarq turadi.

## Shu loyiha bilan birga o'rnatilgan marketplace plugin'lari (2026-10-26/27)

Bular tayyor plugin'lar, bu yerda qurilmagan — `claude plugin install
<nom>@<marketplace>` orqali o'rnatilgan, `user` doirasida (faqat shu emas,
har qanday loyihada mavjud).

**Xavfsizlik auditi (Trail of Bits):**
- `static-analysis`, `insecure-defaults`, `differential-review` — bu
  bosqichdan oldin allaqachon mavjud edi
- `supply-chain-risk-auditor` — npm/PyPI/Go bog'liqlik xavfi, bu
  foydalanuvchining loyihalarida npm+pip ko'p ishlatilgani uchun qo'shildi
- `open-sourcing` — repo public bo'lishidan oldin sirlar-tarixi gigienasi +
  litsenziya/docs/CI tayyorligi. 2026-10-27'da, haqiqiy saboqdan keyin
  qo'shildi: bu repo'ning o'z git tarixida qisqa vaqt POS'ning
  `pos-quality-auditor.md`sidan ko'chirilgan oddiy matnli urug'langan admin
  paroli bor edi, *working tree* yashirilgandan keyin ham — faqat tarixni
  qayta yozish + force-push buni haqiqatan olib tashladi. Buni har qanday
  yangi-public push'dan OLDIN ishga tushiring, nafaqat joriy fayl
  mazmunini grep qilish.

**Ish jarayoni / test:**
- `superpowers` — reja tuzish, TDD, tizimli debugging, subagent-asosida
  ishlab chiqish
- `playwright` — Microsoft'ning brauzer avtomatlashtirish / E2E test MCP'i
- `github` — rasmiy GitHub MCP. Autentifikatsiya header-asosida, OAuth
  login emas: `GITHUB_PERSONAL_ACCESS_TOKEN`ni `~/.claude/settings.json`ning
  `env` blokida o'rnating (https://github.com/settings/tokens'dan GitHub
  PAT), keyin Claude Code'ni qayta ishga tushiring. `claude mcp login` bu
  serverga tegishli emas.

**AI workflow:**
- `agent-sdk-dev` — Claude Agent SDK qurish vositasi
- `pydantic-ai` — Python AI agent freymvork patternlari
- `mcp-server-dev` — MCP server loyihalash/qurish
- `langfuse` — LLM kuzatuvi/prompt-boshqaruv/baholash
- `mlflow` — ⚠️ o'rnatilgan, lekin **yuklanmayapti** (upstream paketlash
  bugi: v1.0.0'da ikki marta `hooks/hooks.json` deklaratsiyasi — lokal
  tuzatib bo'lmaydi, upstream'ga xabar berilgan). Tuzatilgan versiya
  chiqqach qayta o'rnating.

**Video / media ishlab chiqarish:**
- `runway-api` — video generatsiya (veo3, gen4.5, seedance2, Nano, Banana
  Pro)
- `hyperframes` — HeyGen HTML'dan video kompozitsiyalari
- `adobe-for-creativity` — rasm tahrirlash / kreativ ish jarayonlari

**Ma'lumotlar bazasi:**
- `prisma` — POS va bpmn-studio'ning haqiqiy ORM'iga mos keladi (ikkisi
  ham Prisma orqali Postgres); sxema/migratsiya/so'rov yordami. O'z-
  joylashtirilgan/Fly Postgres uchun boshqa mos plugin yo'q — marketplace'
  dagi har qanday boshqa DB plugin ma'lum bir boshqariladigan bulut
  provayderiga (Neon, Supabase, PlanetScale va h.k.) bog'langan, bu
  foydalanuvchi ulardan foydalanmaydi; to'g'ridan-to'g'ri `psql`/`docker
  exec` kirish uchun plugin umuman kerak emas.

**Kuzatuv / xato monitoring:**
- `sentry` — xato hisobotlari, stack trace'lar, fingerprint bo'yicha
  masala qidirish. Bir nechta jonli deploy'lar (pos.non-bor.uz, AyTiX
  Support, Maktab Sinov, SmartVision, ...) hech qanday xato-monitoring
  ko'rinishiga ega emasligi sababli qo'shildi.

**Hujjatlar / kodni tushunish:**
- `context7` — versiyaga mos kutubxona dokumentatsiyasi jonli ravishda
  kontekstga tortib olinadi, o'qitish-ma'lumotlari davridagi API bilimiga
  tayanish o'rniga (anonim ishlaydi, sozlash shart emas).
- `mintlify` — bu foydalanuvchining yozgan har qanday hujjatini (testing
  qo'llanma, AI Kitob, API ma'lumotnomalari) haqiqiy hosting qilingan
  hujjat saytiga aylantirish uchun.
- `sourcegraph` — ko'p-repo kod qidirish/tushunish; 30+ repo bilan "mening
  barcha loyihalarim bo'ylab X'ni top" takrorlanadigan ehtiyojga aylangach
  eng foydali bo'ladi.

**Kod sifati / xavfsizlik (Trail of Bits'ni to'ldiradi):**
- `semgrep` — kod yozilayotganda real vaqtda zaiflik skanerlash (Trail of
  Bits'ning plugin'lari ko'proq audit/tahlil-yo'naltirilgan; semgrep
  inline/jonli hamkasbi).
- `sonarqube` — og'irroq, ko'proq o'ziga xos qarashli sifat+xavfsizlik
  darvozasi (7000+ qoida, PostToolUse hook'lar, sirlarni skanerlash) —
  to'liq qiymat uchun SonarQube server/bulut akkaunti kerak; mavjud variant
  sifatida o'rnatilgan, hali hech qaysi loyihaga faol sozlanmagan.

**Bu loyiha paydo bo'lishidan oldin allaqachon o'rnatilgan edi (ma'lumot uchun):**
- `ui-ux-pro-max` — design system, palitra, UX qo'llanmalari, va taqdimot
  slaydlari ("slayd" savoliga qarang — bu plugin ichidagi `slides` skill,
  shuningdek built-in Artifact "Slides" turi, ikkisi ham allaqachon mavjud;
  yangi plugin kerak bo'lmadi)
- `impeccable` — vizual dizayn sifatini tanqid qilish/sayqallash
- `postman` — API loyihalash/mock/test/monitor, bu foydalanuvchining
  Postman workspace'iga bog'langan
- Figma MCP server — ulangan, dizaynni kodga aylantirish

## Bu yerga yangi custom skill qo'shish

1. `mkdir skills/<nom>` va `skills/<nom>/SKILL.md` yozing (frontmatter:
   `name`, `description` — nima qilishi VA qachon ishlatilishi).
2. Har qanday skriptni `skills/<nom>/scripts/` ostiga joylashtiring.
3. Alohida ro'yxatga olish shart emas — bu repo allaqachon Claude Code'ga
   lokal plugin sifatida ulangan (`ai-skills@ai-skills`); `skills/` ostidagi
   har bir skill papkasi avtomatik aniqlanadi.
4. Yuqoridagi "Tezkor indeks" jadvaliga yangi elementning o'zbekcha nomini
   qo'shing.
