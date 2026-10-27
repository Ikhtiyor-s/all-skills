#!/usr/bin/env node
// CLI entry point for the bpmn-diagram skill's pipeline:
//   read spec (if any) -> validate ops -> apply -> lint (warn only) ->
//   ELK layout -> serialize to BPMN 2.0 XML -> write <out>.bpmn +
//   <out>.bpmn-spec.json -> print a JSON summary (including the XML) on
//   stdout so the invoking skill doesn't need a second file read.
//
// Usage: node run.mjs --spec <specPath> --ops <opsPath> --out <outBaseNoExt>

import { readFile, writeFile } from "node:fs/promises";
import { validateEditPlan } from "./validator.mjs";
import { applyOperations } from "./apply.mjs";
import { lintProcessSpec } from "./lint.mjs";
import { computeFullLayout } from "./layout.mjs";
import { serializeToBpmnXml } from "./serialize-xml.mjs";
import { createEmptyProcessSpec } from "./process-spec.mjs";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]?.replace(/^--/, "");
    if (key) out[key] = argv[i + 1];
  }
  return out;
}

async function readJsonIfExists(path) {
  if (!path) return null;
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.ops || !args.out) {
    console.error(JSON.stringify({ ok: false, error: "Usage: run.mjs --spec <path> --ops <path> --out <baseNoExt>" }));
    process.exitCode = 1;
    return;
  }

  const currentSpec = (await readJsonIfExists(args.spec)) ?? createEmptyProcessSpec();
  const rawPlan = await readJsonIfExists(args.ops);
  const plan = Array.isArray(rawPlan) ? { operations: rawPlan, summary: "" } : rawPlan;

  if (!plan || !Array.isArray(plan.operations)) {
    console.log(JSON.stringify({ ok: false, error: "ops file must be an AiEditPlan ({operations, summary}) or a bare operations array" }));
    process.exitCode = 1;
    return;
  }

  const validation = validateEditPlan(plan, currentSpec);
  if (!validation.valid) {
    console.log(JSON.stringify({ ok: false, errors: validation.errors }));
    process.exitCode = 1;
    return;
  }

  const newSpec = applyOperations(currentSpec, plan.operations);
  if (args.name) newSpec.processName = args.name;

  const lintIssues = lintProcessSpec(newSpec);
  const positions = await computeFullLayout(newSpec);
  const xml = serializeToBpmnXml(newSpec, positions);

  const bpmnPath = `${args.out}.bpmn`;
  const specPath = `${args.out}.bpmn-spec.json`;
  await writeFile(bpmnPath, xml, "utf8");
  await writeFile(specPath, JSON.stringify(newSpec, null, 2), "utf8");

  console.log(
    JSON.stringify({
      ok: true,
      summary: plan.summary || "",
      nodeCount: newSpec.nodes.length,
      flowCount: newSpec.flows.length,
      lint: lintIssues,
      bpmnPath,
      specPath,
      xml,
    })
  );
}

main().catch((err) => {
  console.log(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
  process.exitCode = 1;
});
