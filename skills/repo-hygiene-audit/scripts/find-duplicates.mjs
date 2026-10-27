#!/usr/bin/env node
// Line-window clone detection (same technique as jscpd/PMD CPD, written
// from scratch so this skill has no npm dependency): normalize each file's
// lines, hash sliding windows of N consecutive non-trivial lines, and
// report any hash that recurs in a different (file, location) — i.e. the
// same code appearing more than once. Overlapping windows sharing a hash
// run get merged into one reported block instead of many tiny ones.
//
// Usage: node find-duplicates.mjs --dir <path> [--window 6] [--ext .ts,.tsx,.js,.jsx,.py,.dart] [--min-chars 120]

import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", "coverage", ".dart_tool", "vendor", ".venv", "__pycache__"]);

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]?.replace(/^--/, "");
    if (key) out[key] = argv[i + 1];
  }
  return out;
}

function walk(dir, exts, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, exts, out);
    else if (exts.some((e) => entry.endsWith(e))) out.push(full);
  }
  return out;
}

function normalizeLine(line) {
  const trimmed = line.trim();
  return trimmed.replace(/\s+/g, " ");
}

function isTrivial(line) {
  // Blank, a lone brace/bracket, or a single-word line carries no real
  // duplication signal and would otherwise dominate the results with noise.
  return line === "" || /^[{}()\[\];,]+$/.test(line) || line.length < 3;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const dir = args.dir ?? ".";
  const windowSize = Number(args.window) || 6;
  const exts = (args.ext ?? ".ts,.tsx,.js,.jsx,.py,.dart").split(",");
  const minChars = Number(args["min-chars"]) || 120;

  const files = walk(dir, exts);
  const hashToWindows = new Map(); // hash -> [{file, startIdx, endIdx, lines}]

  for (const file of files) {
    let raw;
    try {
      raw = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const rawLines = raw.split(/\r?\n/);
    // Keep (normalizedLine, originalLineNumber) pairs, dropping trivial lines
    // — so a window spans N *meaningful* lines, not N raw lines that might
    // be mostly blank/brace noise.
    const sig = [];
    rawLines.forEach((l, idx) => {
      const n = normalizeLine(l);
      if (!isTrivial(n)) sig.push({ n, lineNo: idx + 1 });
    });

    for (let i = 0; i + windowSize <= sig.length; i++) {
      const windowLines = sig.slice(i, i + windowSize);
      const text = windowLines.map((w) => w.n).join("\n");
      if (text.length < minChars) continue;
      const hash = createHash("sha1").update(text).digest("hex");
      const entry = { file, startLine: windowLines[0].lineNo, endLine: windowLines[windowLines.length - 1].lineNo, text };
      if (!hashToWindows.has(hash)) hashToWindows.set(hash, []);
      hashToWindows.get(hash).push(entry);
    }
  }

  // Only hashes seen in >=2 distinct (file,startLine) locations are real duplicates.
  const groups = [];
  for (const [hash, occurrences] of hashToWindows) {
    const distinct = [];
    const seen = new Set();
    for (const o of occurrences) {
      const key = `${o.file}:${o.startLine}`;
      if (!seen.has(key)) {
        seen.add(key);
        distinct.push(o);
      }
    }
    if (distinct.length >= 2) {
      groups.push({ hash, occurrences: distinct });
    }
  }

  // Merge groups that are adjacent extensions of the same duplicated block
  // (same file set, consecutive start lines) so one 20-line duplication
  // doesn't get reported as fifteen separate 6-line windows.
  groups.sort((a, b) => a.occurrences[0].startLine - b.occurrences[0].startLine);
  const merged = [];
  for (const g of groups) {
    const prev = merged[merged.length - 1];
    const sameLocations =
      prev &&
      prev.occurrences.length === g.occurrences.length &&
      prev.occurrences.every((o, i) => o.file === g.occurrences[i].file && g.occurrences[i].startLine === o.endLine - windowSize + 2);
    if (sameLocations) {
      prev.occurrences = prev.occurrences.map((o, i) => ({ ...o, endLine: g.occurrences[i].endLine }));
    } else {
      merged.push({ ...g, occurrences: g.occurrences.map((o) => ({ ...o })) });
    }
  }

  const report = merged
    .map((g) => ({
      lineCount: g.occurrences[0].endLine - g.occurrences[0].startLine + 1,
      occurrenceCount: g.occurrences.length,
      locations: g.occurrences.map((o) => ({ file: relative(dir, o.file), startLine: o.startLine, endLine: o.endLine })),
      preview: g.occurrences[0].text.split("\n").slice(0, 3).join(" | "),
    }))
    .sort((a, b) => b.lineCount * b.occurrenceCount - a.lineCount * a.occurrenceCount);

  console.log(JSON.stringify({ ok: true, filesScanned: files.length, duplicateGroups: report }, null, 2));
}

main();
