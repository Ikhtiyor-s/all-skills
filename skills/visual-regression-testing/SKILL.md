---
name: visual-regression-testing
description: Catches unintended visual changes in a web page/app by screenshotting it at fixed viewports and pixel-diffing against a stored baseline. Use when the user asks to check for visual regressions, "did this change break the layout", compare before/after a CSS/component change, or wants a visual snapshot test set up for a page.
---

# Visual Regression Testing

Screenshot-based regression testing with no new browser install: it drives whatever browser session `claude-in-chrome` already controls, and does the pixel comparison itself (`scripts/diff.mjs`, pixelmatch — pure image diff, no browser needed for that part).

## Mechanics

1. **Pick a baseline directory**, by convention `visual-baselines/<name>/` under the current project's working directory (`<name>` = a short slug for the page/component under test, e.g. `landing-hero`, `checkout-flow`).
2. **Pick viewports** to check — ask the user if unspecified, otherwise default to `{mobile: 390x844, tablet: 768x1024, desktop: 1440x900}` (adjust to the project's actual breakpoints if its CSS defines different ones — check for that first).
3. For each viewport:
   - `resize_window` (claude-in-chrome) to that size on the tab showing the page under test.
   - `computer` action `screenshot` with `save_to_disk: true` to capture a PNG.
   - If `visual-baselines/<name>/<viewport>.png` **doesn't exist yet**: this is the first run — copy the captured screenshot there as the new baseline, tell the user a baseline was established, and stop (nothing to diff against yet).
   - If it **does exist**: run
     ```
     node scripts/diff.mjs --baseline visual-baselines/<name>/<viewport>.png --current <captured path> --out visual-baselines/<name>/<viewport>.diff.png
     ```
     It prints `{ok, width, height, diffPixels, totalPixels, diffPercent, diffImagePath}` (or `{ok:false, error}` if the two images aren't even the same size — that alone usually means a layout change, not noise, so say so plainly rather than treating it as a tool failure).
4. **Judge the result per viewport**: `diffPercent` under ~0.1% is normal font/anti-aliasing noise — treat as a pass. Anything higher, open the diff image (publish as an Artifact, or just describe what changed if you can tell from reading the two screenshots) and describe what visibly changed.
5. **Ask before overwriting a baseline.** If the diff reflects an intentional change the user asked for, offer to replace `visual-baselines/<name>/<viewport>.png` with the new capture — don't silently update it, a silently-updated baseline defeats the point of the check.
6. **Report**: per viewport, pass/fail + diffPercent, and for any fail, what changed and whether the baseline was updated.

## Limitations

- Pixel diffing is layout/color sensitive, not semantic — a 1px font-rendering shift on a different machine can show as noise above the threshold. If false positives are frequent for a given page, raise `--threshold` (pixelmatch's own per-pixel color-difference sensitivity, default 0.1) rather than the diffPercent judgment call above.
- No animation/video handling — screenshot timing matters for anything mid-transition; wait for animations to settle before capturing.
- Baselines are plain PNGs committed (or not) at the user's discretion — this skill doesn't manage git for them.
