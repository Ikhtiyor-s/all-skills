---
name: i18n-translate
description: Finds and fills missing or empty translations across a project's locale files (JSON, Flutter .arb), or produces a brand-new locale by translating an existing one. Use when the user asks to translate the app/UI into another language, add a new locale, make something multilang, or fix untranslated/missing i18n keys. For Uzbek, Russian, or English by default, but works with any language pair the user names.
---

# i18n Translate

Fills gaps in an existing multi-language setup, or spins up a brand-new locale from one that's already complete. Claude does the actual translating (no external API) — `scripts/diff-locales.mjs` only does the mechanical part: finding exactly which keys are missing or empty per file, so nothing gets missed by eyeballing a large JSON tree.

Complementary to, not a replacement for, POS's `i18n-auditor` agent (copied into this repo's `agents/`): that one finds keys referenced in code but absent from *any* locale file (a different bug — a typo'd `t()` call) and missing locale entries relative to code usage. This skill instead compares locale files **against each other** and produces the missing translations, not just a list of what's missing.

## Mechanics

1. **Find the locale files.** Common locations: `locales/`, `messages/`, `i18n/`, `lib/l10n/*.arb` (Flutter), or wherever the project's i18n config points (check `next-intl`/`i18next`/`intl` config if present). Confirm the format (JSON vs `.arb`) and which file is the source of truth — usually the most complete one, or whichever the user says to treat as canonical.

2. **Diff**, per target locale against the source:
   ```
   node scripts/diff-locales.mjs --files <source>.json,<target1>.json,<target2>.json
   ```
   Reports, per file, `missing` (key absent entirely) and `empty` (key present but `""`/`null`) against the union of keys across all the files given. Both count as "needs translating."

3. **Translate each missing/empty key's value** from the source locale, preserving exactly:
   - Interpolation placeholders verbatim (`{{name}}`, `{count}`, `%s`, `{0}`) — translate the surrounding text only, never the placeholder syntax itself.
   - ICU plural/select structure (`{count, plural, one {...} other {...}}`) — translate the text inside each branch, keep the ICU syntax and branch keys unchanged.
   - Embedded HTML/markup tags, and their position relative to the text they wrap.
   - The register already established in that locale's existing strings (e.g. Uzbek formal "siz" vs informal "sen" — match whatever the file already uses, don't introduce a different register for only the new keys).
   - Consistent terminology for repeated domain terms within the same file (if "buyurtma" is translated one way elsewhere in this exact locale, stay consistent — don't introduce a synonym for the same concept).

4. **Write the result** preserving the target file's original key order and nesting — insert new keys near their logical siblings (same section as in the source), don't reformat or reorder unrelated existing content.

5. **Flag, don't silently guess**, anything that's ambiguous out of context: a bare short string with no surrounding key-name hint ("open" — a door, a file, or a store's hours?), brand/product names (usually shouldn't be translated at all — ask if unsure), legal or pricing text (get explicit confirmation before translating anything with legal/financial weight).

6. **New-locale case** (no target file exists yet): copy the source file's full structure, translate every value, write the new file at the matching path/naming convention the other locale files already use, and tell the user what still needs wiring on the app side (locale list/config, language switcher UI, routing) — this skill produces the translated content, not app plumbing, since that's framework-specific.

7. **Report**: how many keys were filled per locale, and the list of anything flagged for manual review in step 5.
