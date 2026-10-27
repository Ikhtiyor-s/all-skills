---
name: accessibility-testing
description: Audits a live web page for accessibility problems (missing labels, broken heading structure, unreachable or unlabeled interactive elements, landmark issues) using the browser's own accessibility tree. Use when the user asks for an accessibility audit, a11y check, WCAG review, or "is this page accessible", or reports that a screen reader can't use something.
---

# Accessibility Testing

Audits a live page using the accessibility tree the browser itself exposes — the same tree screen readers consume — via `claude-in-chrome`'s `read_page` tool. No extra install, no axe-core dependency.

## Mechanics

1. Navigate (claude-in-chrome) to the page/route under test. If the page has meaningfully different states (a modal open, a form with validation errors shown, a mobile nav expanded), audit each state that matters separately — most real a11y bugs live in those states, not just the resting page.
2. Call `read_page` with `filter: "all"` (not `"interactive"` — you need headings, landmarks, and images too, not just controls) at a reasonable `depth`. If output is truncated, re-read narrower subtrees via `ref_id`.
3. Walk the tree and check, in order:
   - **Images**: every `img`/image-role node has a non-empty accessible name, UNLESS it's genuinely decorative (then it should be `alt=""`/`role="presentation"`, i.e. absent from the tree entirely — flag an image with no name AND no indication it's decorative).
   - **Form inputs**: every input/textarea/select/combobox has an accessible name (a label, `aria-label`, or `aria-labelledby` — not just visible placeholder text, which isn't a reliable label).
   - **Buttons & links**: every button/link node has a non-empty, non-generic accessible name (flag "click here", "learn more" with no surrounding context, or an icon-only button with no name at all).
   - **Heading structure**: collect all heading-role nodes; flag a skipped level (h1 → h3 with no h2), more than one h1 on the page, or a heading-shaped visual element that isn't actually marked up as a heading (you can't fully verify the latter from the tree alone — note it as a manual-check item if the page looks heading-structured visually but the tree shows none).
   - **Landmarks**: the page should have exactly one `main`, and nav/header/footer landmarks should exist where the page visually has them. A page with zero landmarks is a flag on its own.
   - **Interactive elements reachability**: anything clickable in the visual page but absent or non-interactive in the tree (e.g. a `<div onclick>` with no role/tabindex) is a real bug — screen readers and keyboard users can't reach it. Cross-check against a screenshot if you're unsure something clickable is missing from the tree.
   - **ARIA misuse**: `aria-hidden="true"` on a node that also contains focusable children (hides them from assistive tech while leaving them tab-reachable — a trap, not a convenience); `role` attributes that don't match the element's actual behavior.
4. **Severity**: use `critical` (blocks a screen-reader/keyboard user from completing a task entirely — unlabeled required form field, unreachable interactive control), `serious` (works but is confusing or very slow via assistive tech — ambiguous link text, broken heading order), `moderate` (a real but narrower issue — redundant landmark, missing decorative-image marking).
5. **Report**: group findings by severity, cite the element (tree ref / visible text / selector-ish description), and say what to change (e.g. "add `aria-label` naming what this button does" — not just "fix accessibility").

## Known limitation (say this plainly when relevant, don't silently skip)

This checks accessibility **tree structure**, not the full WCAG rule set: it does **not** compute color contrast ratios, does not verify focus-order sequencing beyond what the tree implies, and does not run a certified ruleset like axe-core. For a compliance-grade (WCAG 2.1 AA) audit, tell the user this covers the structural half and a contrast/computed-style pass with a dedicated tool (axe-core, Lighthouse) is still worth doing separately — don't present this as a substitute for that.
