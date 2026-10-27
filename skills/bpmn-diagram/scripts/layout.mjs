// Ported from bpmn-studio's src/lib/ai/layout.ts (ELK-based auto-layout,
// pure npm dependency — no browser/bpmn-js needed). Always computes a full
// layout from scratch: this skill persists a ProcessSpec between prompts,
// never pixel positions, so there is nothing "already arranged" to preserve.

import ELK from "elkjs/lib/elk.bundled.js";
import { FLOW_NODE_TYPES } from "./process-spec.mjs";

const elk = new ELK();

const DEFAULT_SIZE = {
  startEvent: { width: 36, height: 36 },
  endEvent: { width: 36, height: 36 },
  intermediateThrowEvent: { width: 36, height: 36 },
  intermediateCatchEvent: { width: 36, height: 36 },
  boundaryEvent: { width: 36, height: 36 },
  task: { width: 100, height: 80 },
  userTask: { width: 100, height: 80 },
  serviceTask: { width: 100, height: 80 },
  scriptTask: { width: 100, height: 80 },
  businessRuleTask: { width: 100, height: 80 },
  manualTask: { width: 100, height: 80 },
  sendTask: { width: 100, height: 80 },
  receiveTask: { width: 100, height: 80 },
  callActivity: { width: 100, height: 80 },
  subProcess: { width: 350, height: 200 },
  eventSubProcess: { width: 350, height: 200 },
  transaction: { width: 350, height: 200 },
  exclusiveGateway: { width: 50, height: 50 },
  parallelGateway: { width: 50, height: 50 },
  inclusiveGateway: { width: 50, height: 50 },
  eventBasedGateway: { width: 50, height: 50 },
  complexGateway: { width: 50, height: 50 },
  dataObject: { width: 36, height: 50 },
  dataStore: { width: 50, height: 50 },
  textAnnotation: { width: 100, height: 30 },
  group: { width: 200, height: 200 },
};

export function defaultSize(type) {
  return DEFAULT_SIZE[type] ?? { width: 100, height: 80 };
}

const H_SPACING = 80;
const V_SPACING = 60;
const LANE_HEADER_WIDTH = 30;
const LANE_MIN_HEIGHT = 140;
const POOL_PADDING = 40;
const CONTAINER_MARGIN = 40;

async function layoutFlowGraph(nodes, flows) {
  if (nodes.length === 0) {
    return { positions: new Map(), width: 0, height: 0 };
  }

  const nodeIds = new Set(nodes.map((n) => n.id));
  const elkNodes = nodes.map((n) => {
    const size = defaultSize(n.type);
    return { id: n.id, width: size.width, height: size.height };
  });
  const elkEdges = flows
    .filter((f) => nodeIds.has(f.sourceId) && nodeIds.has(f.targetId))
    .map((f) => ({ id: f.id, sources: [f.sourceId], targets: [f.targetId] }));

  const graph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.layered.spacing.nodeNodeBetweenLayers": String(H_SPACING),
      "elk.spacing.nodeNode": String(V_SPACING),
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
      "elk.edgeRouting": "ORTHOGONAL",
    },
    children: elkNodes,
    edges: elkEdges,
  };

  const result = await elk.layout(graph);

  const positions = new Map();
  let maxX = 0;
  let maxY = 0;
  for (const child of result.children ?? []) {
    const x = child.x ?? 0;
    const y = child.y ?? 0;
    const width = child.width ?? 100;
    const height = child.height ?? 80;
    positions.set(child.id, { x, y, width, height });
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
  }

  return { positions, width: maxX, height: maxY };
}

function rectsOverlap(a, b, margin = 10) {
  return (
    a.x - margin < b.x + b.width &&
    a.x + a.width + margin > b.x &&
    a.y - margin < b.y + b.height &&
    a.y + a.height + margin > b.y
  );
}

function placeAuxiliary(positions, node, anchorId, offset) {
  const size = defaultSize(node.type);
  const anchor = anchorId ? positions.get(anchorId) : undefined;
  const x = (anchor?.x ?? 0) + offset.dx;
  let y = (anchor?.y ?? 0) + offset.dy;

  let guard = 0;
  while (guard++ < 50 && Array.from(positions.values()).some((b) => rectsOverlap(b, { x, y, ...size }))) {
    y += size.height + 20;
  }
  positions.set(node.id, { x, y, ...size });
}

export async function computeFullLayout(spec) {
  const positions = new Map();

  const participants = spec.nodes.filter((n) => n.type === "participant");
  const lanesByParticipant = new Map();
  for (const lane of spec.nodes.filter((n) => n.type === "lane")) {
    const list = lanesByParticipant.get(lane.parentId ?? "") ?? [];
    list.push(lane);
    lanesByParticipant.set(lane.parentId ?? "", list);
  }

  const flowNodes = spec.nodes.filter((n) => FLOW_NODE_TYPES.includes(n.type) && n.type !== "boundaryEvent");
  const boundaryEvents = spec.nodes.filter((n) => n.type === "boundaryEvent");
  const dataNodes = spec.nodes.filter((n) => n.type === "dataObject" || n.type === "dataStore");
  const artifacts = spec.nodes.filter((n) => n.type === "textAnnotation" || n.type === "group");

  async function layoutGroup(nodesInGroup, originX, originY) {
    const ids = new Set(nodesInGroup.map((n) => n.id));
    const internalFlows = spec.flows.filter((f) => ids.has(f.sourceId) && ids.has(f.targetId) && f.kind !== "association");
    const { positions: local, width, height } = await layoutFlowGraph(nodesInGroup, internalFlows);
    for (const [id, b] of local) {
      positions.set(id, { x: b.x + originX, y: b.y + originY, width: b.width, height: b.height });
    }
    return { width, height };
  }

  if (participants.length > 0) {
    let poolY = 0;
    let maxPoolContentWidth = 0;

    const poolLayouts = [];
    for (const participant of participants) {
      const lanes = lanesByParticipant.get(participant.id) ?? [];
      if (lanes.length > 0) {
        let tallestLane = 0;
        let contentWidth = 0;
        for (const lane of lanes) {
          const laneNodes = flowNodes.filter((n) => n.parentId === lane.id);
          const { width, height } = await layoutGroup(laneNodes, 0, 0);
          tallestLane = Math.max(tallestLane, height);
          contentWidth = Math.max(contentWidth, width);
        }
        const uniformHeight = Math.max(LANE_MIN_HEIGHT, tallestLane + 40);
        const laneHeights = lanes.map(() => uniformHeight);
        poolLayouts.push({ participant, lanes, laneHeights, contentWidth });
      } else {
        const poolNodes = flowNodes.filter((n) => n.parentId === participant.id);
        const { width, height } = await layoutGroup(poolNodes, 0, 0);
        poolLayouts.push({ participant, lanes: [], laneHeights: [Math.max(LANE_MIN_HEIGHT, height + 40)], contentWidth: width });
      }
      maxPoolContentWidth = Math.max(maxPoolContentWidth, poolLayouts[poolLayouts.length - 1].contentWidth);
    }

    const poolWidth = maxPoolContentWidth + LANE_HEADER_WIDTH + POOL_PADDING * 2;

    for (const { participant, lanes, laneHeights } of poolLayouts) {
      const poolHeight = laneHeights.reduce((a, b) => a + b, 0) || LANE_MIN_HEIGHT;
      positions.set(participant.id, { x: 0, y: poolY, width: poolWidth, height: poolHeight });

      if (lanes.length > 0) {
        let laneY = poolY;
        lanes.forEach((lane, i) => {
          const laneHeight = laneHeights[i];
          positions.set(lane.id, { x: LANE_HEADER_WIDTH, y: laneY, width: poolWidth - LANE_HEADER_WIDTH, height: laneHeight });
          laneY += laneHeight;
        });
      }

      poolY += poolHeight + CONTAINER_MARGIN;
    }

    for (const { participant, lanes } of poolLayouts) {
      if (lanes.length > 0) {
        for (const lane of lanes) {
          const laneBounds = positions.get(lane.id);
          const laneNodes = flowNodes.filter((n) => n.parentId === lane.id);
          await layoutGroup(laneNodes, laneBounds.x + POOL_PADDING, laneBounds.y + (laneBounds.height - defaultSize("task").height) / 2 - 20);
        }
      } else {
        const poolBounds = positions.get(participant.id);
        const poolNodes = flowNodes.filter((n) => n.parentId === participant.id);
        await layoutGroup(poolNodes, poolBounds.x + LANE_HEADER_WIDTH + POOL_PADDING, poolBounds.y + POOL_PADDING);
      }
    }
  } else {
    await layoutGroup(flowNodes, 0, 0);
  }

  for (const be of boundaryEvents) {
    const host = be.attachedToId ? positions.get(be.attachedToId) : undefined;
    const size = defaultSize("boundaryEvent");
    if (host) {
      positions.set(be.id, { x: host.x + host.width - size.width / 2, y: host.y + host.height - size.height / 2, ...size });
    } else {
      placeAuxiliary(positions, be, undefined, { dx: 0, dy: 0 });
    }
  }

  for (const d of [...dataNodes, ...artifacts]) {
    const relatedFlow = spec.flows.find((f) => f.sourceId === d.id || f.targetId === d.id);
    const anchorId = relatedFlow ? (relatedFlow.sourceId === d.id ? relatedFlow.targetId : relatedFlow.sourceId) : undefined;
    placeAuxiliary(positions, d, anchorId, { dx: 0, dy: -(defaultSize(d.type).height + 60) });
  }

  return positions;
}
