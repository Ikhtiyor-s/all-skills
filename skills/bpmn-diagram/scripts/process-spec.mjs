// ProcessSpec vocabulary — ported from bpmn-studio's src/lib/ai/process-spec.ts
// (pure, zero-DOM-dependency subset) so the two projects reason about a BPMN
// process graph the same way. Kept as plain JS here since this skill has no
// build step of its own.

export const FLOW_NODE_TYPES = [
  "startEvent",
  "endEvent",
  "intermediateThrowEvent",
  "intermediateCatchEvent",
  "boundaryEvent",
  "task",
  "userTask",
  "serviceTask",
  "scriptTask",
  "businessRuleTask",
  "manualTask",
  "sendTask",
  "receiveTask",
  "subProcess",
  "eventSubProcess",
  "transaction",
  "callActivity",
  "exclusiveGateway",
  "parallelGateway",
  "inclusiveGateway",
  "eventBasedGateway",
  "complexGateway",
];

export const GATEWAY_TYPES = [
  "exclusiveGateway",
  "parallelGateway",
  "inclusiveGateway",
  "eventBasedGateway",
  "complexGateway",
];

export const ACTIVITY_TYPES = [
  "task",
  "userTask",
  "serviceTask",
  "scriptTask",
  "businessRuleTask",
  "manualTask",
  "sendTask",
  "receiveTask",
  "subProcess",
  "eventSubProcess",
  "transaction",
  "callActivity",
];

export const EVENT_TYPES = [
  "startEvent",
  "endEvent",
  "intermediateThrowEvent",
  "intermediateCatchEvent",
  "boundaryEvent",
];

export const CONTAINER_TYPES = ["participant", "lane"];

export const ALL_NODE_TYPES = [
  ...FLOW_NODE_TYPES,
  "participant",
  "lane",
  "dataObject",
  "dataStore",
  "textAnnotation",
  "group",
];

export const EVENT_DEFINITIONS = [
  "none",
  "message",
  "timer",
  "signal",
  "conditional",
  "error",
  "escalation",
  "terminate",
  "compensation",
  "link",
  "cancel",
];

export const LOOP_KINDS = ["none", "standard", "sequential", "parallel"];

export function createEmptyProcessSpec(processName) {
  return { processName, nodes: [], flows: [] };
}

export function findNode(spec, id) {
  return spec.nodes.find((n) => n.id === id);
}

export function findFlow(spec, id) {
  return spec.flows.find((f) => f.id === id);
}
