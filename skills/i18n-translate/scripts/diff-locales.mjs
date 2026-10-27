#!/usr/bin/env node
// Flattens one or more i18n locale files (JSON or Flutter .arb — both are
// JSON on disk, ARB just prefixes metadata keys with "@") to dot-path keys
// and reports, per file, which keys from the union are missing or empty.
// Pure structural diff — no translation happens here, Claude does that
// after reading this report.
//
// Usage: node diff-locales.mjs --files en.json,uz.json,ru.json

import { readFileSync } from "node:fs";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]?.replace(/^--/, "");
    if (key) out[key] = argv[i + 1];
  }
  return out;
}

function isArbMeta(key) {
  return key.startsWith("@");
}

function flatten(obj, prefix = "", out = {}) {
  for (const [key, value] of Object.entries(obj)) {
    if (isArbMeta(key)) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      flatten(value, path, out);
    } else {
      out[path] = value;
    }
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.files) {
    console.log(JSON.stringify({ ok: false, error: "Usage: diff-locales.mjs --files path1.json,path2.json[,...]" }));
    process.exitCode = 1;
    return;
  }

  const paths = args.files.split(",").map((p) => p.trim()).filter(Boolean);
  const perFile = {};
  for (const p of paths) {
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(p, "utf8"));
    } catch (err) {
      console.log(JSON.stringify({ ok: false, error: `Failed to read/parse "${p}": ${err instanceof Error ? err.message : String(err)}` }));
      process.exitCode = 1;
      return;
    }
    perFile[p] = flatten(parsed);
  }

  const unionKeys = new Set();
  for (const flat of Object.values(perFile)) {
    for (const key of Object.keys(flat)) unionKeys.add(key);
  }

  const report = {};
  for (const [p, flat] of Object.entries(perFile)) {
    const missing = [];
    const empty = [];
    for (const key of unionKeys) {
      if (!(key in flat)) missing.push(key);
      else if (flat[key] === "" || flat[key] === null) empty.push(key);
    }
    report[p] = { keyCount: Object.keys(flat).length, missing, empty };
  }

  console.log(JSON.stringify({ ok: true, unionKeyCount: unionKeys.size, files: report }, null, 2));
}

main();
