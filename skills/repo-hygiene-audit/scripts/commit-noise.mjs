#!/usr/bin/env node
// Flags two kinds of commit noise from git log: individual commits with a
// low-information message (wip/fix/update/typo/...), and "runs" of several
// commits close together in time that touch overlapping files — usually
// one logical change that should have been one commit, now candidates for
// an interactive squash (which this script only recommends; it never
// rewrites history itself).
//
// Usage: node commit-noise.mjs --dir <repoPath> [--since "30 days ago"] [--gap-minutes 15] [--run-threshold 3]

import { execFileSync } from "node:child_process";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]?.replace(/^--/, "");
    if (key) out[key] = argv[i + 1];
  }
  return out;
}

const LOW_INFO_RE = /^(wip|fix(es|ed)?|update[ds]?|tmp|temp|typo|test|debug|asdf|minor|misc|stuff|changes?|small fix|cleanup|\.+|wip\s*\d*)$/i;

function parseLog(raw) {
  const commits = [];
  let current = null;
  for (const line of raw.split("\n")) {
    if (line.startsWith("\x01")) {
      if (current) commits.push(current);
      const [, hash, ts, subject] = line.split("\x01");
      current = { hash, timestamp: Number(ts), subject, files: [] };
    } else if (line.trim() && current) {
      current.files.push(line.trim());
    }
  }
  if (current) commits.push(current);
  return commits.reverse(); // git log is newest-first; we want chronological order
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const dir = args.dir ?? ".";
  const since = args.since ?? "30 days ago";
  const gapMs = (Number(args["gap-minutes"]) || 15) * 60_000;
  const runThreshold = Number(args["run-threshold"]) || 3;

  let raw;
  try {
    raw = execFileSync("git", ["log", `--since=${since}`, "--pretty=format:\x01%H\x01%ct\x01%s", "--name-only"], {
      cwd: dir,
      encoding: "utf8",
    });
  } catch (err) {
    console.log(JSON.stringify({ ok: false, error: `git log failed: ${err instanceof Error ? err.message : String(err)}` }));
    process.exitCode = 1;
    return;
  }

  const commits = parseLog(raw);

  const lowInfo = commits.filter((c) => LOW_INFO_RE.test(c.subject.trim()));

  const runs = [];
  let current = null;
  for (const c of commits) {
    if (
      current &&
      c.timestamp - current.commits[current.commits.length - 1].timestamp <= gapMs / 1000 &&
      c.files.some((f) => current.fileSet.has(f))
    ) {
      current.commits.push(c);
      c.files.forEach((f) => current.fileSet.add(f));
    } else {
      if (current) runs.push(current);
      current = { commits: [c], fileSet: new Set(c.files) };
    }
  }
  if (current) runs.push(current);

  const squashCandidates = runs
    .filter((r) => r.commits.length >= runThreshold)
    .map((r) => ({
      commitCount: r.commits.length,
      spanMinutes: Math.round((r.commits[r.commits.length - 1].timestamp - r.commits[0].timestamp) / 60),
      sharedFiles: [...r.fileSet].slice(0, 10),
      commits: r.commits.map((c) => ({ hash: c.hash.slice(0, 8), subject: c.subject })),
    }));

  console.log(
    JSON.stringify(
      {
        ok: true,
        totalCommitsScanned: commits.length,
        lowInfoMessageCommits: lowInfo.map((c) => ({ hash: c.hash.slice(0, 8), subject: c.subject })),
        squashCandidateRuns: squashCandidates,
      },
      null,
      2
    )
  );
}

main();
