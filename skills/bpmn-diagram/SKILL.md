---
name: bpmn-diagram
description: Generates and iteratively edits BPMN 2.0 business-process diagrams from natural-language prompts in Uzbek, Russian, or English, rendering a live interactive diagram and saving a standards-compliant .bpmn file. Use whenever the user asks to draw, create, update, or fix a business process / workflow / BPMN diagram, or describes a process as a sequence of steps/departments and wants it visualized (e.g. "mijoz buyurtma beradi, keyin ...", "draw a BPMN diagram for ...", "add a step/branch to this process").
---

# BPMN Diagram

Turns a natural-language process description into a real BPMN 2.0 diagram, and keeps evolving that same diagram as the user sends follow-up prompts ("add a step", "add a branch for rejected orders", "put this in a separate lane") — without ever touching BPMN XML by hand.

You (the model) do the reasoning yourself — there is no AI API call anywhere in this pipeline. A bundled Node script only does the mechanical parts: validating your edit plan, applying it, auto-laying-out the result (ELK, the same algorithm bpmn-studio uses), and serializing it to BPMN 2.0 XML.

This vocabulary and the rules below are ported from the production AI pipeline of `bpmn-studio` (a sibling project, D:\Docker\projects\bpmn-studio) so diagrams stay consistent with it, but this skill never calls that app or needs it running — it's fully standalone.

## The ProcessSpec vocabulary

A process is `{ processName, nodes: NodeSpec[], flows: FlowSpec[] }`.

**NodeType** (one of): `startEvent, endEvent, intermediateThrowEvent, intermediateCatchEvent, boundaryEvent, task, userTask, serviceTask, scriptTask, businessRuleTask, manualTask, sendTask, receiveTask, subProcess, eventSubProcess, transaction, callActivity, exclusiveGateway, parallelGateway, inclusiveGateway, eventBasedGateway, complexGateway, participant, lane, dataObject, dataStore, textAnnotation`. (`group` exists in bpmn-studio's model but isn't supported by this skill's serializer — skip it.)

**NodeSpec**: `{ id, type, name?, eventDefinition?, interrupting?, attachedToId?, parentId?, isExpanded?, blackBox?, loop?, isForCompensation? }`
- `eventDefinition` (events only, default `"none"`): `message | timer | signal | conditional | error | escalation | terminate | compensation | link | cancel`.
- `interrupting`: boundary events and event-subprocess start events only.
- `attachedToId`: **boundaryEvent only** — the activity it attaches to. Required.
- `parentId`: the containing **lane or participant id** (not a subProcess — ProcessSpec has no nested containment; a subProcess/eventSubProcess/transaction/callActivity always renders as a single closed box, never with children inside it).
- `loop` (activities only, default `"none"`): `standard | sequential | parallel`.

**FlowSpec**: `{ id, sourceId, targetId, name?, condition?, isDefault?, kind? }`
- `kind` (default `"sequence"`): `sequence | message | association`. Use `"message"` only between nodes in **different participants** (it becomes a bpmn:messageFlow in the collaboration). `"association"` connects a dataObject/dataStore/textAnnotation to the element it documents.
- `isDefault`: marks this flow as its source gateway's default branch.

## Turning a request into an edit plan

Every change — including the very first "generate from scratch" — is a list of operations against the *current* spec (empty spec if this is a new diagram):

```
{"op":"ADD_NODE","node":NodeSpec}
{"op":"REMOVE_NODE","nodeId":string}
{"op":"UPDATE_NODE","nodeId":string,"patch":<NodeSpec fields except id/type>}
{"op":"ADD_FLOW","flow":FlowSpec}
{"op":"REMOVE_FLOW","flowId":string}
{"op":"UPDATE_FLOW","flowId":string,"patch":<FlowSpec fields except sourceId/targetId>}
{"op":"MOVE_NODE","nodeId":string,"parentId"?:string}
{"op":"UPDATE_PROPERTY","elementId":string,"property":"name"|"documentation","value":string}
```

Rules (mirrored from bpmn-studio's own proven AI system prompt):
- Every id you invent must be a short, unique, ASCII slug (letters/digits/underscore) not already in the current spec. Reuse the exact same id string everywhere you reference that node/flow in this plan.
- Only reference ids that already exist in the current spec, or that you add earlier in the same operations array.
- A lane's `parentId` must be its participant's id. A `boundaryEvent` needs `attachedToId` pointing at an existing activity.
- **If the process involves more than one actor/department exchanging work** (e.g. "mijoz" vs "kassir" vs "oshxona"), model them as participants (+ lanes if one side has sub-roles) and give **every** node a `parentId` — don't leave some nodes inside pools and others floating. Otherwise keep it a single flat process: no participants at all. Don't introduce pools for a single-actor process.
- Never remove, rename, or reroute elements unrelated to the user's request — the diagram may hold content they care about that this turn's request doesn't mention.
- If the requested change is destructive (removes existing elements), do it if asked, but say so plainly in your summary to the user.
- Prefer the smallest edit that satisfies the request. A pure addition is almost always ADD_NODE + ADD_FLOW; you very rarely need REMOVE_* unless the user asked to remove something.
- A process should end up with at least one startEvent and one endEvent reachable from it — if the user's description implies a start/end but didn't say the words "start"/"end", add them anyway (that's standard BPMN, not scope creep).

## Pipeline (every turn, new diagram or edit)

The skill's own files live next to this SKILL.md, under `scripts/` — reference them relative to this skill's announced base directory.

1. **Locate or start the spec.** Pick a `<slug>` for this diagram (short kebab-case, from the process name or the user's own name for it). If you're continuing a diagram from earlier in this conversation, reuse its existing `<slug>.bpmn-spec.json` path. Otherwise this is a new diagram — there is no current spec file yet (the script treats a missing `--spec` path as an empty process).
   - Default location: a `bpmn-diagrams/` folder under the current project's working directory if there is one; otherwise the session's scratchpad directory.
2. **Write your operations** as an `AiEditPlan` JSON — `{"summary": "...", "operations": [...]}` — to a temp file.
3. **First time only in this environment:** check whether `node_modules/elkjs` exists under this skill's plugin root (two directories up from `scripts/`). If not, run `npm install` there once — the layout script needs the `elkjs` dependency declared in that root `package.json`.
4. **Run the pipeline script:**
   ```
   node scripts/run.mjs --spec <slug>.bpmn-spec.json --ops <opsfile> --out <slug> --name "<process display name>"
   ```
   (Omit `--spec` for a brand-new diagram.) It prints one JSON line to stdout: `{ok, summary, nodeCount, flowCount, lint, bpmnPath, specPath, xml}` on success, or `{ok:false, errors}` if your plan failed validation.
   - **If `ok` is false**: the `errors` array tells you exactly which operation and why (unknown id, bad type, etc.). Fix your operations file and re-run — don't surface raw validation errors to the user as if the pipeline were broken.
   - **`lint`** (present even on success) lists structural warnings (no start/end event, orphan node, ambiguous gateway with no default branch) — these don't block anything, but mention anything non-trivial to the user and offer to fix it on request.
5. **Show the diagram.** Load the `artifact-design` skill (required before any artifact publish), then build the artifact page from `scripts/viewer-template.html`: substitute `{{TITLE}}` with the process name, `{{SUMMARY}}` with the plan's summary, and `{{BPMN_XML_JSON}}` with `JSON.stringify(xml)` of the XML the script returned (so it's safe to embed as a JS string literal). Publish it with the Artifact tool:
   - **New diagram:** publish fresh (pick a title = process name, a favicon emoji that fits the domain, e.g. 🔀 or 🗺️). Remember the resulting artifact URL for this conversation.
   - **Editing an existing diagram:** republish to the **same artifact URL** (pass `url`) so the user's open tab just updates — never spin up a second artifact for the same diagram.
6. **Tell the user** what changed (the plan's summary), the saved `.bpmn` file path (that's the durable deliverable — bpmn-studio, Camunda Modeler, draw.io, or any BPMN 2.0 tool can open it directly), and any lint warnings worth their attention. Keep this short.

## Known limitations (by design, not bugs)

- No nested sub-process contents, no `group` artifacts (BPMN schema risk for a feature that's rarely needed here).
- Connectors are straight 2-point lines, not bpmn-studio's full orthogonal routing — still valid, readable BPMNDI, just not hand-polished.
- Event/condition details are structural only (e.g. a timer event has no actual duration encoded) — fine for communicating a process shape, not for an executable workflow engine.
- If you need true engine-executable BPMN (real conditionExpression script languages, actual timer durations, etc.) or deeply nested sub-processes, that's what the full `bpmn-studio` editor is for — point the user there instead of trying to force it through this skill.
