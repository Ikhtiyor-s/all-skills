// New (not in bpmn-studio): a pure ProcessSpec reducer for AiOperation[].
// bpmn-studio's own apply-operations.ts mutates a live bpmn-js Modeler
// instance instead — not callable outside a browser. This is the headless
// equivalent: same operation vocabulary, same semantics, no DOM.

let emptyIdCounter = 0;

export function sanitizeId(rawId) {
  let s = String(rawId ?? "").trim().replace(/[^A-Za-z0-9_-]/g, "_");
  if (s && !/^[A-Za-z_]/.test(s)) s = `n_${s}`;
  if (!s) s = `n_empty_${emptyIdCounter++}`;
  return s;
}

function cloneNode(node) {
  const n = { ...node, id: sanitizeId(node.id) };
  if (n.attachedToId) n.attachedToId = sanitizeId(n.attachedToId);
  if (n.parentId) n.parentId = sanitizeId(n.parentId);
  return n;
}

function cloneFlow(flow) {
  return {
    ...flow,
    id: sanitizeId(flow.id),
    sourceId: sanitizeId(flow.sourceId),
    targetId: sanitizeId(flow.targetId),
  };
}

/**
 * Applies a validated AiOperation[] to currentSpec, returning a new
 * ProcessSpec. Deleting a node cascades to its flows and (for participants/
 * lanes) its children — a real editor does this automatically when you
 * delete a shape from the canvas; this headless reducer has to do it
 * explicitly.
 */
export function applyOperations(currentSpec, operations) {
  let nodes = currentSpec.nodes.map((n) => ({ ...n }));
  let flows = currentSpec.flows.map((f) => ({ ...f }));

  const removeNodeCascading = (rawId) => {
    const id = sanitizeId(rawId);
    const toRemove = new Set([id]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const n of nodes) {
        if (n.parentId && toRemove.has(n.parentId) && !toRemove.has(n.id)) {
          toRemove.add(n.id);
          grew = true;
        }
      }
    }
    nodes = nodes.filter((n) => !toRemove.has(n.id));
    flows = flows.filter((f) => !toRemove.has(f.sourceId) && !toRemove.has(f.targetId));
  };

  for (const op of operations) {
    switch (op.op) {
      case "ADD_NODE": {
        nodes.push(cloneNode(op.node));
        break;
      }
      case "REMOVE_NODE": {
        removeNodeCascading(op.nodeId);
        break;
      }
      case "UPDATE_NODE": {
        const id = sanitizeId(op.nodeId);
        nodes = nodes.map((n) => (n.id === id ? { ...n, ...op.patch } : n));
        break;
      }
      case "ADD_FLOW": {
        flows.push(cloneFlow(op.flow));
        break;
      }
      case "REMOVE_FLOW": {
        const id = sanitizeId(op.flowId);
        flows = flows.filter((f) => f.id !== id);
        break;
      }
      case "UPDATE_FLOW": {
        const id = sanitizeId(op.flowId);
        flows = flows.map((f) => (f.id === id ? { ...f, ...op.patch } : f));
        break;
      }
      case "MOVE_NODE": {
        const id = sanitizeId(op.nodeId);
        const parentId = op.parentId ? sanitizeId(op.parentId) : undefined;
        nodes = nodes.map((n) => {
          if (n.id !== id) return n;
          const next = { ...n };
          if (parentId) next.parentId = parentId;
          else delete next.parentId;
          return next;
        });
        break;
      }
      case "UPDATE_PROPERTY": {
        const id = sanitizeId(op.elementId);
        nodes = nodes.map((n) => (n.id === id ? { ...n, [op.property]: op.value } : n));
        flows = flows.map((f) => (f.id === id ? { ...f, [op.property]: op.value } : f));
        break;
      }
      default:
        break;
    }
  }

  return { processName: currentSpec.processName, nodes, flows };
}
