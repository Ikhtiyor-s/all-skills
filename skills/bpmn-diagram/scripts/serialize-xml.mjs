// New (not in bpmn-studio): ProcessSpec + computed layout -> standalone
// BPMN 2.0 XML (model + BPMNDI). bpmn-studio never needs this because it
// round-trips through a live bpmn-js Modeler instead; this skill has no
// browser, so it writes the XML directly.
//
// Scope: flat flow nodes/gateways/events/activities, data objects/stores,
// text annotations, and pools/lanes. Nested sub-process children aren't
// modeled — ProcessSpec itself has no notion of them (CONTAINER_TYPES is
// only ["participant", "lane"]), so a subProcess/eventSubProcess/
// transaction/callActivity always renders as a single closed box. "group"
// artifacts are dropped (unsupported) rather than emitted as invalid XML.

import { FLOW_NODE_TYPES } from "./process-spec.mjs";

function escapeXml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));
}

function attrs(obj) {
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}="${escapeXml(v)}"`)
    .join(" ");
}

function eventDefinitionXml(node) {
  if (!node.eventDefinition || node.eventDefinition === "none") return "";
  return `<bpmn:${node.eventDefinition}EventDefinition id="${node.id}_ed"/>`;
}

function loopCharacteristicsXml(node) {
  if (!node.loop || node.loop === "none") return "";
  if (node.loop === "standard") return `<bpmn:standardLoopCharacteristics/>`;
  return `<bpmn:multiInstanceLoopCharacteristics isSequential="${node.loop === "sequential"}"/>`;
}

function nodeToXml(node, spec) {
  const base = { id: node.id, name: node.name || undefined };

  switch (node.type) {
    case "startEvent": {
      const inner = eventDefinitionXml(node);
      const a = attrs({ ...base, isInterrupting: node.interrupting === false ? "false" : undefined });
      return inner ? `<bpmn:startEvent ${a}>${inner}</bpmn:startEvent>` : `<bpmn:startEvent ${a}/>`;
    }
    case "endEvent":
    case "intermediateThrowEvent":
    case "intermediateCatchEvent": {
      const inner = eventDefinitionXml(node);
      const a = attrs(base);
      return inner ? `<bpmn:${node.type} ${a}>${inner}</bpmn:${node.type}>` : `<bpmn:${node.type} ${a}/>`;
    }
    case "boundaryEvent": {
      const inner = eventDefinitionXml(node);
      const a = attrs({ ...base, attachedToRef: node.attachedToId, cancelActivity: node.interrupting === false ? "false" : "true" });
      return inner ? `<bpmn:boundaryEvent ${a}>${inner}</bpmn:boundaryEvent>` : `<bpmn:boundaryEvent ${a}/>`;
    }
    case "task":
    case "userTask":
    case "serviceTask":
    case "scriptTask":
    case "businessRuleTask":
    case "manualTask":
    case "sendTask":
    case "receiveTask": {
      const loop = loopCharacteristicsXml(node);
      const a = attrs({ ...base, isForCompensation: node.isForCompensation ? "true" : undefined });
      return loop ? `<bpmn:${node.type} ${a}>${loop}</bpmn:${node.type}>` : `<bpmn:${node.type} ${a}/>`;
    }
    case "subProcess":
    case "eventSubProcess":
    case "transaction":
    case "callActivity": {
      const tagName = node.type === "eventSubProcess" ? "subProcess" : node.type;
      const a = attrs({ ...base, triggeredByEvent: node.type === "eventSubProcess" ? "true" : undefined });
      return `<bpmn:${tagName} ${a}/>`;
    }
    case "exclusiveGateway":
    case "parallelGateway":
    case "inclusiveGateway":
    case "eventBasedGateway":
    case "complexGateway": {
      const defaultFlow = spec.flows.find((f) => f.sourceId === node.id && f.isDefault);
      const a = attrs({ ...base, default: defaultFlow?.id });
      return `<bpmn:${node.type} ${a}/>`;
    }
    case "dataObject": {
      return (
        `<bpmn:dataObject id="${node.id}_obj"/>` +
        `<bpmn:dataObjectReference ${attrs({ ...base, dataObjectRef: `${node.id}_obj` })}/>`
      );
    }
    case "dataStore": {
      return `<bpmn:dataStoreReference ${attrs({ ...base, dataStoreRef: `${node.id}_store` })}/>`;
    }
    case "textAnnotation": {
      return `<bpmn:textAnnotation id="${node.id}"><bpmn:text>${escapeXml(node.name ?? "")}</bpmn:text></bpmn:textAnnotation>`;
    }
    default:
      return "";
  }
}

function flowKind(flow, hasParticipants) {
  if (flow.kind === "message" && !hasParticipants) return "association"; // messageFlow is only valid inside a collaboration
  return flow.kind ?? "sequence";
}

function flowToXml(flow, kind) {
  const name = flow.name ? ` name="${escapeXml(flow.name)}"` : "";
  if (kind === "sequence") {
    const cond = flow.condition
      ? `<bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">${escapeXml(flow.condition)}</bpmn:conditionExpression>`
      : "";
    const a = `id="${flow.id}" sourceRef="${flow.sourceId}" targetRef="${flow.targetId}"${name}`;
    return cond ? `<bpmn:sequenceFlow ${a}>${cond}</bpmn:sequenceFlow>` : `<bpmn:sequenceFlow ${a}/>`;
  }
  if (kind === "message") {
    return `<bpmn:messageFlow id="${flow.id}" sourceRef="${flow.sourceId}" targetRef="${flow.targetId}"${name}/>`;
  }
  return `<bpmn:association id="${flow.id}" sourceRef="${flow.sourceId}" targetRef="${flow.targetId}"/>`;
}

function anchorSide(from, to) {
  const dx = to.x + to.width / 2 - (from.x + from.width / 2);
  const dy = to.y + to.height / 2 - (from.y + from.height / 2);
  return Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? "right" : "left") : dy >= 0 ? "bottom" : "top";
}

function pointOnSide(b, side) {
  switch (side) {
    case "right":
      return { x: b.x + b.width, y: b.y + b.height / 2 };
    case "left":
      return { x: b.x, y: b.y + b.height / 2 };
    case "bottom":
      return { x: b.x + b.width / 2, y: b.y + b.height };
    default:
      return { x: b.x + b.width / 2, y: b.y };
  }
}

function waypointsXml(sourceBounds, targetBounds) {
  const a = pointOnSide(sourceBounds, anchorSide(sourceBounds, targetBounds));
  const b = pointOnSide(targetBounds, anchorSide(targetBounds, sourceBounds));
  return `<di:waypoint x="${a.x}" y="${a.y}"/><di:waypoint x="${b.x}" y="${b.y}"/>`;
}

export function serializeToBpmnXml(spec, positions) {
  const participants = spec.nodes.filter((n) => n.type === "participant");
  const lanes = spec.nodes.filter((n) => n.type === "lane");
  const lanesByParticipant = new Map();
  for (const lane of lanes) {
    const list = lanesByParticipant.get(lane.parentId) ?? [];
    list.push(lane);
    lanesByParticipant.set(lane.parentId, list);
  }

  const contentNodes = spec.nodes.filter((n) => n.type !== "participant" && n.type !== "lane" && n.type !== "group");
  const nodeById = new Map(spec.nodes.map((n) => [n.id, n]));

  function ownerParticipantId(node) {
    let current = node;
    const seen = new Set();
    while (current?.parentId && !seen.has(current.parentId)) {
      seen.add(current.parentId);
      const parent = nodeById.get(current.parentId);
      if (!parent) return null;
      if (parent.type === "participant") return parent.id;
      current = parent;
    }
    return null;
  }

  const hasParticipants = participants.length > 0;
  let rootElementsXml = "";
  let planeBpmnElement = "Process_1";

  if (!hasParticipants) {
    const nodesXml = contentNodes.map((n) => nodeToXml(n, spec)).join("");
    const contentIds = new Set(contentNodes.map((n) => n.id));
    const flowsXml = spec.flows
      .filter((f) => contentIds.has(f.sourceId) && contentIds.has(f.targetId))
      .map((f) => flowToXml(f, flowKind(f, false)))
      .join("");
    rootElementsXml = `<bpmn:process id="Process_1" name="${escapeXml(spec.processName ?? "")}" isExecutable="false">${nodesXml}${flowsXml}</bpmn:process>`;
  } else {
    const fallbackParticipantId = participants[0].id;
    const ownedBy = new Map(participants.map((p) => [p.id, []]));
    for (const node of contentNodes) {
      const owner = ownerParticipantId(node) ?? fallbackParticipantId;
      (ownedBy.get(owner) ?? ownedBy.get(fallbackParticipantId)).push(node);
    }

    const participantsXml = participants
      .map((p) =>
        p.blackBox
          ? `<bpmn:participant ${attrs({ id: p.id, name: p.name })}/>`
          : `<bpmn:participant ${attrs({ id: p.id, name: p.name, processRef: `Process_${p.id}` })}/>`
      )
      .join("");
    const messageFlowsXml = spec.flows
      .filter((f) => f.kind === "message")
      .map((f) => flowToXml(f, "message"))
      .join("");

    const processesXml = participants
      .filter((p) => !p.blackBox)
      .map((p) => {
        const ownedNodes = ownedBy.get(p.id) ?? [];
        const ownedIds = new Set(ownedNodes.map((n) => n.id));
        const participantLanes = lanesByParticipant.get(p.id) ?? [];

        const laneSetXml =
          participantLanes.length > 0
            ? `<bpmn:laneSet id="LaneSet_${p.id}">${participantLanes
                .map((lane) => {
                  const refs = ownedNodes
                    .filter((n) => n.parentId === lane.id && FLOW_NODE_TYPES.includes(n.type))
                    .map((n) => `<bpmn:flowNodeRef>${n.id}</bpmn:flowNodeRef>`)
                    .join("");
                  return `<bpmn:lane ${attrs({ id: lane.id, name: lane.name })}>${refs}</bpmn:lane>`;
                })
                .join("")}</bpmn:laneSet>`
            : "";

        const nodesXml = ownedNodes.map((n) => nodeToXml(n, spec)).join("");
        const flowsXml = spec.flows
          .filter((f) => f.kind !== "message" && ownedIds.has(f.sourceId) && ownedIds.has(f.targetId))
          .map((f) => flowToXml(f, flowKind(f, true)))
          .join("");

        return `<bpmn:process ${attrs({ id: `Process_${p.id}`, isExecutable: "false" })}>${laneSetXml}${nodesXml}${flowsXml}</bpmn:process>`;
      })
      .join("");

    rootElementsXml = `<bpmn:collaboration id="Collaboration_1">${participantsXml}${messageFlowsXml}</bpmn:collaboration>${processesXml}`;
    planeBpmnElement = "Collaboration_1";
  }

  const dataStoresXml = contentNodes
    .filter((n) => n.type === "dataStore")
    .map((n) => `<bpmn:dataStore ${attrs({ id: `${n.id}_store`, name: n.name })}/>`)
    .join("");

  const shapeTargets = [...participants, ...lanes, ...contentNodes];
  const shapesXml = shapeTargets
    .map((n) => {
      const bounds = positions.get(n.id);
      if (!bounds) return "";
      const extra = n.type === "participant" || n.type === "lane" ? ` isHorizontal="true"` : "";
      return `<bpmndi:BPMNShape id="${n.id}_di" bpmnElement="${n.id}"${extra}><dc:Bounds x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}"/></bpmndi:BPMNShape>`;
    })
    .join("");

  const edgesXml = spec.flows
    .map((f) => {
      const s = positions.get(f.sourceId);
      const t = positions.get(f.targetId);
      if (!s || !t) return "";
      return `<bpmndi:BPMNEdge id="${f.id}_di" bpmnElement="${f.id}">${waypointsXml(s, t)}</bpmndi:BPMNEdge>`;
    })
    .join("");

  const diagramXml = `<bpmndi:BPMNDiagram id="BPMNDiagram_1"><bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${planeBpmnElement}">${shapesXml}${edgesXml}</bpmndi:BPMNPlane></bpmndi:BPMNDiagram>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" id="Definitions_1" exporter="ai-skills bpmn-diagram" exporterVersion="1.0" targetNamespace="http://bpmn.io/schema/bpmn">${rootElementsXml}${dataStoresXml}${diagramXml}</bpmn:definitions>
`;
}
