#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  interpretabilityView,
  isScientificSnapshot,
  normalizeStageTruth,
  resolveBackendBase,
  scientificCandidateId,
  scientificComparisonStatus,
  scientificNodeForStage,
  stationPayloadFor,
} from "./app/js/snapshot-contract.js";

const fallback = {
  execution: "COMPLETE",
  outputOrigin: "UNREPORTED",
  resultBasis: "BACKEND-REPORTED",
  runtime: "BACKEND SNAPSHOT",
};

const clinicalTruth = normalizeStageTruth(
  {
    execution_status: "COMPLETE_WITH_WARNINGS",
    module_execution_status: "FAILED",
    output_origin: "DEMO_FALLBACK",
    result_basis: ["MODELED"],
    runtime_maturity: "LOCAL",
    reason_code: "RUNTIME_UNAVAILABLE",
    qualifiers: ["FALLBACK_USED", "NOT_DECISION_GRADE"],
  },
  fallback,
);
assert.deepEqual(clinicalTruth, {
  presentationStatus: "COMPLETE_WITH_WARNINGS",
  moduleExecution: "FAILED",
  outputOrigin: "DEMO_FALLBACK",
  resultBasis: "MODELED",
  runtimeMaturity: "LOCAL",
  reasonCode: "RUNTIME_UNAVAILABLE",
  qualifiers: ["FALLBACK_USED", "NOT_DECISION_GRADE"],
});

const simulationTruth = normalizeStageTruth(
  {
    execution_status: "COMPLETE_WITH_WARNINGS",
    module_execution_status: "SKIPPED",
    output_origin: "CACHED",
    result_basis: ["OBSERVED", "INFERRED"],
    runtime_maturity: "LOCAL",
    reason_code: "MODULE_CONFIGURED_CACHED",
    qualifiers: [],
  },
  fallback,
);
assert.equal(simulationTruth.moduleExecution, "SKIPPED");
assert.equal(simulationTruth.outputOrigin, "CACHED");
assert.equal(simulationTruth.resultBasis, "OBSERVED + INFERRED");
assert.notEqual(simulationTruth.resultBasis, "NOT WIRED");

const interpretability = {
  schema_version: "1.0.0",
  headline: {
    title: "Recruitability",
    result: "FEASIBLE_WITH_RISK",
    plain_language: "Enrollment is possible with material timing risk.",
    status: "QUALIFIED",
    basis: ["OBSERVED", "MODELED"],
  },
  metrics: [{ id: "metric.months", label: "Enrollment", display: "32 months", meaning: "Modeled enrollment duration." }],
  steps: [{ id: "step.velocity" }],
  evidence: [{ id: "evidence.precedent" }],
  assumptions: [{ id: "assumption.sites" }],
  uncertainty: { method: "scenario range" },
  limitations: [{ id: "limitation.coverage", message: "Registry coverage is incomplete." }],
  counterfactuals: [{ id: "counterfactual.sites", change: "Add sites" }],
  lineage: { input_refs: [] },
  extensions: {},
};
const biomarkerRecord = { station_payload: { interpretability } };
const programRecord = { station_payloads: { simulation: { interpretability } } };
assert.strictEqual(stationPayloadFor(biomarkerRecord, "biomarker"), biomarkerRecord.station_payload);
assert.strictEqual(stationPayloadFor(programRecord, "simulation"), programRecord.station_payloads.simulation);
assert.strictEqual(
  stationPayloadFor({ stationPayloads: programRecord.station_payloads }, "simulation"),
  programRecord.station_payloads.simulation,
  "translated camelCase records must retain their stage payload",
);

const view = interpretabilityView(programRecord.station_payloads.simulation);
assert.equal(view.schemaVersion, "1.0.0");
assert.equal(view.headline.title, "Recruitability");
assert.equal(view.headline.status, "QUALIFIED");
assert.deepEqual(view.headline.basis, ["OBSERVED", "MODELED"]);
assert.equal(view.metrics.length, 1);
assert.equal(view.evidenceCount, 1);
assert.equal(view.assumptionCount, 1);
assert.equal(view.stepCount, 1);
assert.strictEqual(view.raw, interpretability, "the readable view must retain the exact native object");
assert.equal(interpretabilityView({}), null);

assert.equal(
  resolveBackendBase("", "http://127.0.0.1:8787"),
  "http://127.0.0.1:8787",
  "an integrated one-process run must use the serving origin",
);

const scientificFixture = JSON.parse(
  readFileSync(
    new URL("./tests/fixtures/orchestrator-scientific-snapshot.json", import.meta.url),
    "utf8",
  ),
);
assert.equal(isScientificSnapshot(scientificFixture), true);
assert.equal(scientificCandidateId(scientificFixture.branches[0]), "H-b1");
assert.equal(
  scientificNodeForStage(scientificFixture.branches[0], "recruitability").artifact
    .simulated_months_to_enroll,
  22,
);
assert.equal(
  scientificComparisonStatus(scientificFixture.highlander.result, "H-p1"),
  "FRONTIER",
);
assert.equal(
  resolveBackendBase("?base=http%3A%2F%2Flocalhost%3A9999", "http://127.0.0.1:8787"),
  "http://localhost:9999",
  "the explicit base override remains available",
);

const appPath = fileURLToPath(new URL("./app/js/app.js", import.meta.url));
const htmlPath = fileURLToPath(new URL("./app/index.html", import.meta.url));
const stylesPath = fileURLToPath(new URL("./app/styles.css", import.meta.url));
const contractPath = fileURLToPath(new URL("./app/API-CONTRACT.md", import.meta.url));
const app = readFileSync(appPath, "utf8");
const html = readFileSync(htmlPath, "utf8");
const styles = readFileSync(stylesPath, "utf8");
const contract = readFileSync(contractPath, "utf8");

assert.equal(
  [...app.matchAll(/function\s+renderInterpretability\s*\(/g)].length,
  1,
  "the inspector must have one shared interpretability renderer",
);

for (const required of [
  "normalizeStageTruth",
  "stationPayloadFor",
  "interpretabilityView",
  "HIGHLANDER CLIENT-SIDE · SERVER CONSUMER NOT WIRED",
  "labrador.run-setup.v3",
  "Run server Highlander",
  "scientific_packet_excludes_representative_values",
]) {
  assert.ok(app.includes(required), `functional app must wire ${required}`);
}
for (const required of [
  "module_execution_status",
  "output_origin",
  "runtime_maturity",
  "station_payload",
  "interpretability",
]) {
  assert.ok(contract.includes(required), `API contract must document optional ${required}`);
}

assert.doesNotMatch(html, /Human review actions|Hard constraints are separate\./);
assert.doesNotMatch(app, /openActionDialog|recordAction|renderAuditLog/);
assert.doesNotMatch(html, /frontier-count|frontier-stat|frontier-total|gap-total/);
assert.doesNotMatch(styles, /\.frontier-count|\.frontier-stat/);
assert.doesNotMatch(app, /frontier-total|gap-total/);
assert.match(html, /data-pareto-frontier="nominal-projection"/);
assert.match(html, /data-pareto-frontier-line="nominal-projection"/);
assert.match(html, /data-pareto-dimensions="roi,recruitability,simulation"/);
assert.match(html, /Three-dimensional Pareto view:/);
assert.match(html, /Each numbered point is one plan\./);
assert.match(app, /var keys = \["roi", "recruitability", "simulation"\]/);
assert.match(app, /circle\.setAttribute\("data-plan-id", program\.id\)/);
assert.match(app, /planIndex\.textContent = String\(point\.planNumber\)/);
assert.match(app, /var nominalFrontier = plottedPrograms\.filter/);
assert.match(styles, /\.pareto-depth-grid\s*\{/);
assert.match(styles, /\.pareto-frontier-line\s*\{/);
assert.match(contract, /fills the\s+remaining comparison-panel height/i);

const comparisonPanelRule = styles.match(/\[data-region="program-comparison"\]\s*\{([^}]*)\}/s);
assert.ok(comparisonPanelRule, "the comparison panel must expose its stable layout hook");
assert.match(comparisonPanelRule[1], /display:\s*flex/);
assert.match(comparisonPanelRule[1], /min-height:\s*0/);
assert.match(comparisonPanelRule[1], /flex-direction:\s*column/);
const paretoFigureRule = styles.match(/\.pareto-figure\s*\{([^}]*)\}/s);
assert.ok(paretoFigureRule, "the Pareto figure must have an explicit fill-panel rule");
assert.match(paretoFigureRule[1], /display:\s*flex/);
assert.match(paretoFigureRule[1], /min-height:\s*300px/);
assert.match(paretoFigureRule[1], /flex:\s*1\s+1\s+300px/);
assert.match(paretoFigureRule[1], /flex-direction:\s*column/);
const paretoPlotRule = styles.match(/\.pareto-plot\s*\{([^}]*)\}/s);
assert.ok(paretoPlotRule, "the 3D plot must fill the Pareto figure");
assert.match(paretoPlotRule[1], /min-height:\s*0/);
assert.match(paretoPlotRule[1], /height:\s*100%/);
assert.match(paretoPlotRule[1], /flex:\s*1\s+1\s+auto/);

console.log("Functional app integration verification passed.");
console.log("  Stage truth: module execution remains separate from fallback origin.");
console.log("  Payloads: biomarker singular and program stage maps are consumed.");
console.log("  Interpretability: readable projection retains native JSON verbatim.");
console.log("  Backend base: integrated serving defaults to same origin.");
console.log("  Highlander: returned plans map to the ROI × recruitability × simulation 3D view; the chart fills its panel.");
console.log("  Scientific v1: native branches and server Highlander results stay separate from representative display values.");
