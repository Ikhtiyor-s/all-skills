#!/usr/bin/env node
// Pixel-diffs two PNGs of identical dimensions and writes a visual diff image.
// Pure image processing (pixelmatch + pngjs) — no browser needed; screenshots
// themselves come from claude-in-chrome or Playwright, captured by the skill.
//
// Usage: node diff.mjs --baseline <path.png> --current <path.png> --out <diff.png> [--threshold 0.1]

import { readFileSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]?.replace(/^--/, "");
    if (key) out[key] = argv[i + 1];
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.baseline || !args.current || !args.out) {
    console.log(JSON.stringify({ ok: false, error: "Usage: diff.mjs --baseline <path> --current <path> --out <path> [--threshold 0.1]" }));
    process.exitCode = 1;
    return;
  }

  const baseline = PNG.sync.read(readFileSync(args.baseline));
  const current = PNG.sync.read(readFileSync(args.current));

  if (baseline.width !== current.width || baseline.height !== current.height) {
    console.log(
      JSON.stringify({
        ok: false,
        error: `Dimension mismatch: baseline ${baseline.width}x${baseline.height} vs current ${current.width}x${current.height} — recapture at the same viewport/DPR, or treat as an expected layout change and update the baseline.`,
      })
    );
    process.exitCode = 1;
    return;
  }

  const { width, height } = baseline;
  const diff = new PNG({ width, height });
  const diffPixels = pixelmatch(baseline.data, current.data, diff.data, width, height, {
    threshold: Number(args.threshold) || 0.1,
  });

  writeFileSync(args.out, PNG.sync.write(diff));

  const totalPixels = width * height;
  const diffPercent = (diffPixels / totalPixels) * 100;

  console.log(
    JSON.stringify({
      ok: true,
      width,
      height,
      diffPixels,
      totalPixels,
      diffPercent: Math.round(diffPercent * 10000) / 10000,
      diffImagePath: args.out,
    })
  );
}

main();
