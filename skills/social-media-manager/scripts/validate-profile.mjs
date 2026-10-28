#!/usr/bin/env node
// Checks a profile JSON has every field the skill actually relies on before
// Claude starts generating content/replies from it — a profile missing
// "boundaries" is the dangerous case (nothing stops an auto-reply from
// promising something it shouldn't), so that's enforced, not just advised.
//
// Usage: node validate-profile.mjs --profile <path>

import { readFileSync } from "node:fs";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]?.replace(/^--/, "");
    if (key) out[key] = argv[i + 1];
  }
  return out;
}

const REQUIRED_FIELDS = ["businessName", "language", "tone", "topics", "boundaries"];

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.profile) {
    console.log(JSON.stringify({ ok: false, error: "Usage: validate-profile.mjs --profile <path>" }));
    process.exitCode = 1;
    return;
  }

  let profile;
  try {
    profile = JSON.parse(readFileSync(args.profile, "utf8"));
  } catch (err) {
    console.log(JSON.stringify({ ok: false, error: `Failed to read/parse profile: ${err instanceof Error ? err.message : String(err)}` }));
    process.exitCode = 1;
    return;
  }

  const missing = REQUIRED_FIELDS.filter((f) => !(f in profile) || profile[f] == null || (Array.isArray(profile[f]) && profile[f].length === 0));
  if (missing.length > 0) {
    console.log(JSON.stringify({ ok: false, error: `Profile is missing required field(s): ${missing.join(", ")}` }));
    process.exitCode = 1;
    return;
  }

  const warnings = [];
  if (!profile.exampleCaptions || profile.exampleCaptions.length === 0) {
    warnings.push("No exampleCaptions — generated content will have nothing concrete to match tone against.");
  }
  if (!profile.escalationContact) {
    warnings.push("No escalationContact — flagged/sensitive replies have nowhere defined to be routed to a human.");
  }

  console.log(JSON.stringify({ ok: true, businessName: profile.businessName, boundaryCount: profile.boundaries.length, warnings }, null, 2));
}

main();
