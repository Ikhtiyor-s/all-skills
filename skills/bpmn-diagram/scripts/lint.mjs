// Ported from bpmn-studio's src/lib/ai/lint.ts (pure, zero-DOM subset).
// Real, deterministic structural checks — no AI involved.

import { FLOW_NODE_TYPES, GATEWAY_TYPES } from "./process-spec.mjs";

export function lintProcessSpec(spec) {
  const issues = [];
  const flowNodes = spec.nodes.filter((n) => FLOW_NODE_TYPES.includes(n.type) && n.type !== "boundaryEvent");
  if (flowNodes.length === 0) return issues;

  const hasStart = flowNodes.some((n) => n.type === "startEvent");
  if (!hasStart) issues.push({ code: "no-start", message: "The process has no start event." });

  const hasEnd = flowNodes.some((n) => n.type === "endEvent");
  if (!hasEnd) issues.push({ code: "no-end", message: "The process has no end event." });

  const incoming = new Map();
  const outgoing = new Map();
  for (const f of spec.flows) {
    outgoing.set(f.sourceId, (outgoing.get(f.sourceId) ?? 0) + 1);
    incoming.set(f.targetId, (incoming.get(f.targetId) ?? 0) + 1);
  }

  for (const n of flowNodes) {
    const hasIncoming = (incoming.get(n.id) ?? 0) > 0;
    const hasOutgoing = (outgoing.get(n.id) ?? 0) > 0;
    if (n.type === "startEvent") {
      if (!hasOutgoing) issues.push({ code: "orphan-node", message: `Start event "${n.name ?? n.id}" has no outgoing flow.`, nodeId: n.id });
      continue;
    }
    if (n.type === "endEvent") {
      if (!hasIncoming) issues.push({ code: "orphan-node", message: `End event "${n.name ?? n.id}" has no incoming flow.`, nodeId: n.id });
      continue;
    }
    if (!hasIncoming && !hasOutgoing) {
      issues.push({ code: "orphan-node", message: `"${n.name ?? n.id}" is disconnected from the rest of the process.`, nodeId: n.id });
    } else if (!hasOutgoing) {
      issues.push({ code: "orphan-node", message: `"${n.name ?? n.id}" has no outgoing flow (a dead end that isn't an end event).`, nodeId: n.id });
    }
  }

  for (const n of flowNodes.filter((n) => GATEWAY_TYPES.includes(n.type))) {
    const outCount = outgoing.get(n.id) ?? 0;
    if (outCount === 1) {
      issues.push({ code: "single-branch-gateway", message: `Gateway "${n.name ?? n.id}" only has one outgoing flow — a gateway with a single branch is redundant.`, nodeId: n.id });
    } else if (outCount >= 2 && (n.type === "exclusiveGateway" || n.type === "inclusiveGateway")) {
      const outFlows = spec.flows.filter((f) => f.sourceId === n.id);
      const hasDefault = outFlows.some((f) => f.isDefault);
      const allConditioned = outFlows.every((f) => f.condition);
      if (!hasDefault && !allConditioned) {
        issues.push({
          code: "ambiguous-gateway",
          message: `Gateway "${n.name ?? n.id}" has ${outCount} branches with no default flow and not every branch has a condition — routing is ambiguous.`,
          nodeId: n.id,
        });
      }
    }
  }

  return issues;
}
