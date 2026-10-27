// Ported from bpmn-studio's src/lib/ai/validator.ts (pure, zero-DOM subset).
// Simulates applying an edit plan against a working copy of the spec so
// every reference resolves before anything is actually applied.

import { ALL_NODE_TYPES, ACTIVITY_TYPES, CONTAINER_TYPES, EVENT_DEFINITIONS, GATEWAY_TYPES, LOOP_KINDS } from "./process-spec.mjs";

const ALLOWED_PROPERTIES = new Set(["name", "documentation"]);

export function validateEditPlan(plan, currentSpec) {
  const errors = [];
  const nodeIds = new Set(currentSpec.nodes.map((n) => n.id));
  const flowIds = new Set(currentSpec.flows.map((f) => f.id));
  const nodesById = new Map(currentSpec.nodes.map((n) => [n.id, n]));

  function fail(index, message) {
    errors.push({ operationIndex: index, message });
  }

  plan.operations.forEach((o, index) => {
    switch (o.op) {
      case "ADD_NODE": {
        const { node } = o;
        if (!node?.id || typeof node.id !== "string") {
          fail(index, "ADD_NODE: node.id is required");
          break;
        }
        if (nodeIds.has(node.id)) {
          fail(index, `ADD_NODE: id "${node.id}" already exists`);
          break;
        }
        if (!ALL_NODE_TYPES.includes(node.type)) {
          fail(index, `ADD_NODE "${node.id}": unknown node type "${node.type}"`);
        }
        if (node.eventDefinition && !EVENT_DEFINITIONS.includes(node.eventDefinition)) {
          fail(index, `ADD_NODE "${node.id}": unknown eventDefinition "${node.eventDefinition}"`);
        }
        if (node.loop && !LOOP_KINDS.includes(node.loop)) {
          fail(index, `ADD_NODE "${node.id}": unknown loop kind "${node.loop}"`);
        }
        if (node.type === "boundaryEvent") {
          if (!node.attachedToId) {
            fail(index, `ADD_NODE "${node.id}": boundaryEvent requires attachedToId`);
          } else if (!nodeIds.has(node.attachedToId)) {
            fail(index, `ADD_NODE "${node.id}": attachedToId "${node.attachedToId}" does not exist`);
          } else {
            const host = nodesById.get(node.attachedToId);
            if (host && !ACTIVITY_TYPES.includes(host.type)) {
              fail(index, `ADD_NODE "${node.id}": attachedToId "${node.attachedToId}" is not an activity`);
            }
          }
        }
        if (node.parentId) {
          if (!nodeIds.has(node.parentId)) {
            fail(index, `ADD_NODE "${node.id}": parentId "${node.parentId}" does not exist`);
          } else {
            const parent = nodesById.get(node.parentId);
            if (parent && !CONTAINER_TYPES.includes(parent.type)) {
              fail(index, `ADD_NODE "${node.id}": parentId "${node.parentId}" is not a participant/lane`);
            }
          }
        }
        if (node.type === "lane" && !node.parentId) {
          fail(index, `ADD_NODE "${node.id}": a lane requires parentId (its participant)`);
        }
        nodeIds.add(node.id);
        nodesById.set(node.id, node);
        break;
      }

      case "REMOVE_NODE": {
        if (!nodeIds.has(o.nodeId)) {
          fail(index, `REMOVE_NODE: "${o.nodeId}" does not exist`);
          break;
        }
        nodeIds.delete(o.nodeId);
        nodesById.delete(o.nodeId);
        break;
      }

      case "UPDATE_NODE": {
        if (!nodeIds.has(o.nodeId)) {
          fail(index, `UPDATE_NODE: "${o.nodeId}" does not exist`);
          break;
        }
        const patch = o.patch ?? {};
        if ("type" in patch && patch.type !== undefined) {
          fail(index, `UPDATE_NODE "${o.nodeId}": cannot change type via UPDATE_NODE (remove + re-add instead)`);
        }
        if (patch.eventDefinition && !EVENT_DEFINITIONS.includes(patch.eventDefinition)) {
          fail(index, `UPDATE_NODE "${o.nodeId}": unknown eventDefinition "${patch.eventDefinition}"`);
        }
        if (patch.loop && !LOOP_KINDS.includes(patch.loop)) {
          fail(index, `UPDATE_NODE "${o.nodeId}": unknown loop kind "${patch.loop}"`);
        }
        if (patch.parentId && !nodeIds.has(patch.parentId)) {
          fail(index, `UPDATE_NODE "${o.nodeId}": parentId "${patch.parentId}" does not exist`);
        }
        break;
      }

      case "ADD_FLOW": {
        const { flow } = o;
        if (!flow?.id) {
          fail(index, "ADD_FLOW: flow.id is required");
          break;
        }
        if (flowIds.has(flow.id)) {
          fail(index, `ADD_FLOW: id "${flow.id}" already exists`);
          break;
        }
        if (!nodeIds.has(flow.sourceId)) {
          fail(index, `ADD_FLOW "${flow.id}": sourceId "${flow.sourceId}" does not exist`);
        }
        if (!nodeIds.has(flow.targetId)) {
          fail(index, `ADD_FLOW "${flow.id}": targetId "${flow.targetId}" does not exist`);
        }
        if (flow.sourceId === flow.targetId) {
          fail(index, `ADD_FLOW "${flow.id}": source and target must differ`);
        }
        if (flow.isDefault) {
          const source = nodesById.get(flow.sourceId);
          if (source && !GATEWAY_TYPES.includes(source.type) && !ACTIVITY_TYPES.includes(source.type)) {
            fail(index, `ADD_FLOW "${flow.id}": isDefault requires a gateway or activity source`);
          }
        }
        flowIds.add(flow.id);
        break;
      }

      case "REMOVE_FLOW": {
        if (!flowIds.has(o.flowId)) {
          fail(index, `REMOVE_FLOW: "${o.flowId}" does not exist`);
          break;
        }
        flowIds.delete(o.flowId);
        break;
      }

      case "UPDATE_FLOW": {
        if (!flowIds.has(o.flowId)) {
          fail(index, `UPDATE_FLOW: "${o.flowId}" does not exist`);
          break;
        }
        const patch = o.patch ?? {};
        if ("sourceId" in patch || "targetId" in patch) {
          fail(index, `UPDATE_FLOW "${o.flowId}": cannot reroute source/target via UPDATE_FLOW (remove + re-add instead)`);
        }
        break;
      }

      case "MOVE_NODE": {
        if (!nodeIds.has(o.nodeId)) {
          fail(index, `MOVE_NODE: "${o.nodeId}" does not exist`);
          break;
        }
        if (o.parentId) {
          if (!nodeIds.has(o.parentId)) {
            fail(index, `MOVE_NODE "${o.nodeId}": parentId "${o.parentId}" does not exist`);
          } else {
            const parent = nodesById.get(o.parentId);
            if (parent && !CONTAINER_TYPES.includes(parent.type)) {
              fail(index, `MOVE_NODE "${o.nodeId}": parentId "${o.parentId}" is not a participant/lane`);
            }
          }
        }
        break;
      }

      case "UPDATE_PROPERTY": {
        const isNode = nodeIds.has(o.elementId);
        const isFlow = flowIds.has(o.elementId);
        if (!isNode && !isFlow) {
          fail(index, `UPDATE_PROPERTY: "${o.elementId}" does not exist`);
          break;
        }
        if (!ALLOWED_PROPERTIES.has(o.property)) {
          fail(index, `UPDATE_PROPERTY "${o.elementId}": property "${o.property}" is not allowed (use UPDATE_NODE/UPDATE_FLOW for structural fields)`);
        }
        break;
      }

      default: {
        fail(index, `Unknown operation "${o?.op}"`);
      }
    }
  });

  return { valid: errors.length === 0, errors };
}
