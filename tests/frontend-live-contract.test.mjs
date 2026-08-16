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

function ingestTerminalSnapshot() {
  const harness = loadFunctionalApp();
  prepareRun(harness);
  harness.hooks.ingestSnapshot(structuredClone(terminalSnapshot));
  return harness;
}

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
  assert.match(evidence.runtime, /UNVERIFIED/);
  assert.match(evidence.runtime, /CACHED/);
  assert.equal(evidence.metadata.outputOrigin, "CACHED");
  assert.equal(evidence.metadata.reasonCode, "MODULE_CONFIGURED_CACHED");
  assert.deepEqual(Array.from(evidence.metadata.qualifiers), [
    "CACHED_EVIDENCE_INPUT",
    "TRUNCATED_SEARCH",
  ]);

  const clinical = hooks.findNode("recruitability-slot-0");
  assert.equal(clinical.execution, "FAILED");
  assert.equal(clinical.resultBasis, "MODELED");
  assert.match(clinical.runtime, /DEMO FALLBACK/);
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
  assert.match(simulation.runtime, /CACHED/);
  assert.notEqual(simulation.resultBasis, "NOT WIRED");
  assert.notEqual(simulation.runtime, "NOT WIRED");
  assert.equal(simulation.metadata.stationPayload.verdict, "small_molecule_tractable");
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
  assert.doesNotMatch(program.uncertainty, /IQR/i);
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
