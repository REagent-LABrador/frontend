import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { loadFunctionalApp, prepareRun } from "./helpers/load-functional-app.mjs";

const terminalSnapshot = JSON.parse(
  fs.readFileSync(
    new URL("./fixtures/orchestrator-terminal-snapshot.json", import.meta.url),
    "utf8",
  ),
);
const appHtml = fs.readFileSync(new URL("../app/index.html", import.meta.url), "utf8");

function ingestTerminalSnapshot() {
  const harness = loadFunctionalApp();
  prepareRun(harness);
  harness.hooks.ingestSnapshot(structuredClone(terminalSnapshot));
  return harness;
}

test("stage metrics are exposed as visible button groups instead of selects", () => {
  assert.doesNotMatch(appHtml, /<select[^>]+data-metric-stage=/);
  for (const [stage, expectedCount] of [
    ["biomarker", 3],
    ["hypothesis", 3],
    ["roi", 3],
    ["recruitability", 4],
    ["simulation", 3],
  ]) {
    const matches = appHtml.match(new RegExp(`data-metric-stage="${stage}"`, "g")) || [];
    assert.equal(matches.length, expectedCount, `${stage} must expose every metric as a button`);
  }
  assert.equal((appHtml.match(/aria-pressed="true"/g) || []).length, 5);
});

test("HTTP ingestion keeps result status separate from execution, origin, and basis", () => {
  const { hooks } = ingestTerminalSnapshot();

  assert.deepEqual(
    Array.from(hooks.state.stageStates),
    ["warning", "complete", "complete", "warning", "warning"],
    "progress must follow result_status so validated fallback/cached results remain terminal",
  );

  const evidence = hooks.findNode("bio-slot-0");
  assert.equal(evidence.execution, "SKIPPED");
  assert.equal(evidence.resultBasis, "OBSERVED + INFERRED");
  assert.equal(evidence.runtime, "UNVERIFIED");
  assert.equal(evidence.outputOrigin, "CACHED");
  assert.equal(evidence.metadata.outputOrigin, "CACHED");
  assert.equal(evidence.metadata.reasonCode, "MODULE_CONFIGURED_CACHED");
  assert.deepEqual(Array.from(evidence.metadata.qualifiers), [
    "CACHED_EVIDENCE_INPUT",
    "TRUNCATED_SEARCH",
  ]);

  const clinical = hooks.findNode("recruitability-slot-0");
  assert.equal(clinical.execution, "FAILED");
  assert.equal(clinical.resultBasis, "MODELED");
  assert.equal(clinical.runtime, "UNVERIFIED");
  assert.equal(clinical.outputOrigin, "DEMO_FALLBACK");
  assert.equal(clinical.metadata.outputOrigin, "DEMO_FALLBACK");
  assert.equal(clinical.metadata.reasonCode, "RUNTIME_UNAVAILABLE");
  assert.deepEqual(Array.from(clinical.metadata.warnings), [
    "Live execution could not start because Bun was unavailable.",
  ]);
});

test("the evidence node receives its own native station payload", () => {
  const { hooks } = ingestTerminalSnapshot();
  const evidence = hooks.findNode("bio-slot-0");

  assert.equal(evidence.metadata.stationPayload.graph_id, "graph-test");
  assert.equal(
    evidence.metadata.stationPayload.interpretability.headline.title,
    "Evidence coverage",
  );
});

test("a cached tractability payload is not relabeled as an unwired simulation", () => {
  const { hooks } = ingestTerminalSnapshot();
  const simulation = hooks.findNode("simulation-slot-0");

  assert.equal(simulation.execution, "SKIPPED", "the actual skipped invocation remains visible");
  assert.equal(simulation.resultBasis, "OBSERVED + MODELED");
  assert.equal(simulation.runtime, "UNVERIFIED");
  assert.equal(simulation.outputOrigin, "CACHED");
  assert.notEqual(simulation.resultBasis, "NOT WIRED");
  assert.notEqual(simulation.runtime, "NOT WIRED");
  assert.equal(simulation.metadata.stationPayload.verdict, "small_molecule_tractable");
});

test("the first real lineage is recentered out from under the sticky rail", () => {
  const harness = loadFunctionalApp();
  const { hooks } = harness;
  hooks.state.snapshot = {
    indication: "Rheumatoid arthritis",
    biomarkers: 3,
    papers: 40,
    hypotheses: 3,
    biomarkerRange: [1, 10],
    hypothesisRange: [1, 10],
  };
  hooks.state.runData = {
    biomarkers: [{ slot: 0 }],
    programs: [{ lane: 0 }],
    requestedLanes: 9,
    biomarkerShortfall: 2,
    hypothesisShortfall: 8,
  };
  hooks.buildScaffold();
  hooks.elements.graphScroller.clientWidth = 1200;
  hooks.centerGraphOnActiveLineage();

  assert.equal(
    hooks.elements.graphScroller.scrollLeft,
    0,
    "the bound first lane must stay to the right of the 184px sticky rail",
  );
});

test("the inspector uses a generic interpretability renderer in HTTP mode", () => {
  const { hooks } = ingestTerminalSnapshot();
  const simulation = hooks.findNode("simulation-slot-0");

  assert.equal(
    typeof hooks.renderInterpretability,
    "function",
    "app.js must expose one module-independent renderInterpretability hook",
  );

  const html = hooks.renderInterpretability(
    simulation.metadata.stationPayload.interpretability,
  );
  assert.match(html, /data-interpretability-view=["']1\.0\.0["']/);
  for (const section of [
    "headline",
    "metrics",
    "steps",
    "evidence",
    "assumptions",
    "uncertainty",
    "limitations",
    "counterfactuals",
    "lineage",
  ]) {
    assert.match(
      html,
      new RegExp(`data-interpretability-section=["']${section}["']`),
      `renderer must expose a stable ${section} section`,
    );
  }
  assert.match(html, /IRAK4 tractability dossier/);
  assert.match(html, /Pocket volume/);
  assert.match(html, /PDB:6EGE/);
  assert.match(html, /This dossier is not an atomistic trajectory/);
});

test("HTTP inspector does not claim real backend records are illustrative mock data", () => {
  const { hooks } = ingestTerminalSnapshot();
  const simulation = hooks.findNode("simulation-slot-0");

  hooks.renderInspector(simulation);
  const html = hooks.elements.inspectorBody.innerHTML;
  assert.doesNotMatch(html, /ILLUSTRATIVE MOCK DATA/);
  assert.doesNotMatch(html, /NO MODULES WIRED/);
  assert.match(html, /IRAK4 tractability dossier/);
});

test("HTTP inspector omits redundant live and cached execution prose", () => {
  const { hooks } = ingestTerminalSnapshot();

  hooks.renderInspector(hooks.findNode("simulation-slot-0"));
  const cachedHtml = hooks.elements.inspectorBody.innerHTML;
  assert.doesNotMatch(cachedHtml, /orchestrator supplied validated CACHED output/);
  assert.doesNotMatch(cachedHtml, /module-owned replay\/revalidation command/i);
  assert.match(cachedHtml, /Output origin/);
  assert.match(cachedHtml, /CACHED/);

  hooks.renderInspector(hooks.findNode("roi-slot-0"));
  const liveHtml = hooks.elements.inspectorBody.innerHTML;
  assert.doesNotMatch(liveHtml, /Backend-reported LIVE result/);
  assert.match(liveHtml, /Output origin/);
  assert.match(liveHtml, /LIVE/);
});

test("a validated fallback keeps structured truth without a warning banner", () => {
  const { hooks } = ingestTerminalSnapshot();
  const clinical = hooks.findNode("recruitability-slot-0");

  hooks.renderInspector(clinical);
  const html = hooks.elements.inspectorBody.innerHTML;
  assert.match(html, /Module execution<\/span><strong>FAILED/);
  assert.match(html, /Output origin<\/span><strong>DEMO FALLBACK/);
  assert.doesNotMatch(html, /validated DEMO_FALLBACK output/);
  assert.doesNotMatch(html, /not a live result/i);
  assert.doesNotMatch(html, /class="state-warning"/);
  assert.match(html, /Enrollment feasibility/);
});

test("ROI keeps its own uncertainty and formats a negative value conventionally", () => {
  const { hooks } = ingestTerminalSnapshot();
  const roi = hooks.findNode("roi-slot-0");

  hooks.renderInspector(roi);
  const html = hooks.elements.inspectorBody.innerHTML;
  assert.match(html, /-\$24M/);
  assert.doesNotMatch(html, /\$-24M/);
  assert.match(html, /rNPV P10–P90: -\$142\.7M to -\$7\.9M/);
  assert.doesNotMatch(html, /simulated months range/);
  assert.equal(hooks.metricCell(-24, "$", "M"), "-$24M");
});

test("an unlabeled simulated range is not invented to be an IQR", () => {
  const { hooks } = loadFunctionalApp();
  const program = {
    metrics: {},
    recruitFailed: false,
    uncertainty: "not supplied",
    stationPayloads: {
      recruitability: {
        score: 0,
        simulated_months_to_enroll: 455,
        simulated_months_range: [93, 1172],
        screens_per_enrollee: 5,
      },
    },
  };

  hooks.applyStationDerivations(program);
  assert.equal(program.uncertainty, "simulated months range: 93–1172");
  assert.equal(program.recruitmentUncertainty, "simulated months range: 93–1172");
  assert.doesNotMatch(program.uncertainty, /IQR/i);

  const programWithRoiRange = {
    metrics: {},
    recruitFailed: false,
    uncertainty: "rNPV P10–P90: -$142.7M to -$7.9M",
    stationPayloads: program.stationPayloads,
  };
  hooks.applyStationDerivations(programWithRoiRange);
  assert.equal(
    programWithRoiRange.uncertainty,
    "rNPV P10–P90: -$142.7M to -$7.9M",
    "recruitability must not overwrite the ROI uncertainty",
  );
  assert.equal(
    programWithRoiRange.recruitmentUncertainty,
    "simulated months range: 93–1172",
  );
});

test("frontend v0 rejects unsupported indications before creating a run", () => {
  const { hooks, document } = loadFunctionalApp();
  hooks.elements.maxBiomarkers.min = "1";
  hooks.elements.maxBiomarkers.max = "5";
  hooks.elements.maxBiomarkers.value = "3";
  hooks.elements.maxPapers.min = "1";
  hooks.elements.maxPapers.max = "100";
  hooks.elements.maxPapers.value = "40";
  hooks.elements.maxHypotheses.min = "1";
  hooks.elements.maxHypotheses.max = "5";
  hooks.elements.maxHypotheses.value = "3";

  hooks.elements.indication.value = "Glioblastoma";
  const unsupported = hooks.validateSetup();
  assert.equal(unsupported.valid, false);
  assert.match(document.getElementById("indication-error").textContent, /Rheumatoid arthritis/);

  hooks.elements.indication.value = "Rheumatoid arthritis";
  const supported = hooks.validateSetup();
  assert.equal(supported.valid, true);
});
