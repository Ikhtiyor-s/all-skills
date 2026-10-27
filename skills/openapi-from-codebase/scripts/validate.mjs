#!/usr/bin/env node
// Validates a generated OpenAPI document (YAML or JSON) with a real parser —
// catches malformed $refs, missing required fields, and schema violations
// before the spec is handed back as "done". Claude writes the spec by hand
// (reading the route files); this only checks the result is actually valid
// OpenAPI, the same role bpmn-moddle plays for the bpmn-diagram skill.
//
// Usage: node validate.mjs --spec openapi.yaml

import SwaggerParser from "@apidevtools/swagger-parser";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]?.replace(/^--/, "");
    if (key) out[key] = argv[i + 1];
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.spec) {
    console.log(JSON.stringify({ ok: false, error: "Usage: validate.mjs --spec <path to .yaml/.json>" }));
    process.exitCode = 1;
    return;
  }

  try {
    const api = await SwaggerParser.validate(args.spec);
    const pathCount = Object.keys(api.paths ?? {}).length;
    let operationCount = 0;
    const methods = ["get", "put", "post", "delete", "options", "head", "patch", "trace"];
    for (const pathItem of Object.values(api.paths ?? {})) {
      for (const m of methods) if (pathItem[m]) operationCount++;
    }
    console.log(
      JSON.stringify({
        ok: true,
        openapiVersion: api.openapi,
        title: api.info?.title,
        version: api.info?.version,
        pathCount,
        operationCount,
        schemaCount: Object.keys(api.components?.schemas ?? {}).length,
      })
    );
  } catch (err) {
    console.log(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
    process.exitCode = 1;
  }
}

main();
