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
const scientificSnapshot = JSON.parse(
  fs.readFileSync(
    new URL("./fixtures/orchestrator-scientific-snapshot.json", import.meta.url),
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

function ingestScientificSnapshot(snapshot = scientificSnapshot) {
  const harness = loadFunctionalApp({ search: "?backend=http&mode=scientific" });
  prepareRun(harness);
  harness.hooks.state.snapshot = Object.freeze({
    ...harness.hooks.state.snapshot,
    biomarkers: 3,
    hypotheses: 1,
  });
  harness.hooks.state.runData.requestedLanes = 3;
  harness.hooks.buildScaffold();
  harness.hooks.ingestSnapshot(structuredClone(snapshot));
  return harness;
}

test("stage metrics are exposed as visible button groups instead of selects", () => {
  assert.doesNotMatch(appHtml, /<select[^>]+data-metric-stage=/);
  for (const [stage, expectedValues] of Object.entries({
    biomarker: ["exploration", "evidence", "pursuit"],
    hypothesis: ["boldness", "evidence", "plausibility"],
    roi: ["rnpv", "positive", "impact"],
    recruitability: ["recruit", "duration", "screens", "risk"],
    simulation: ["tractability_fit", "precedent", "computed"],
  })) {
    const values = Array.from(
      appHtml.matchAll(
        new RegExp(
          `data-metric-stage="${stage}"[^>]+data-metric-value="([^"]+)"`,
          "g",
        ),
      ),
      (match) => match[1],
    );
    assert.deepEqual(
      values,
      expectedValues,
      `${stage} must expose every metric as a stable button`,
    );
  }
  assert.equal((appHtml.match(/aria-pressed="true"/g) || []).length, 5);
});

test("both HTTP modes keep all three tractability views available", () => {
  for (const search of ["?backend=http", "?backend=http&mode=scientific"]) {
    const harness = loadFunctionalApp({ search });
    harness.hooks.applyBootMode();

    const controls = harness.metricButtons.filter(
      (button) => button.dataset.metricStage === "simulation",
    );
    assert.deepEqual(
      controls.map((button) => button.dataset.metricValue),
      ["tractability_fit", "precedent", "computed"],
      search,
    );
    assert.deepEqual(
      controls.map((button) => button.hidden),
      [false, false, false],
      `${search} must not collapse Stage 05 back to one control`,
    );
    assert.equal(
      controls.filter(
        (button) => button.attributes.get("aria-pressed") === "true",
      ).length,
      1,
      `${search} must select exactly one Stage 05 view`,
    );
  }
});

test("precedent and computed tractability views stay categorical", () => {
  const { hooks } = loadFunctionalApp();
  assert.equal(typeof hooks.simulationMetricView, "function");
  const payload = {
    verdict: "small_molecule_tractable",
    verdict_basis: "retrieved_precedent",
    axis_conflict: null,
    target_precedent: {
      best_potency_nm: 0.022,
      clinical_stage_small_molecules: [{ name: "ZIMLOVISERTIB", phase: 2 }],
    },
    tractability: {
      pocket_volume_a3: { primary_d1_6_a3: 682.5 },
      site_pocket_rank: {
        fpocket: 2,
        prank: 1,
        n_pockets: 11,
        structure_pdb_id: "6EGE",
      },
    },
  };

  for (const key of ["precedent", "computed"]) {
    const view = hooks.simulationMetricView(payload, key);
    assert.equal(view.kind, "categorical", key);
    assert.equal(view.scalar, null, `${key} must not invent a scientific scalar`);
    assert.equal(typeof view.placement, "string", `${key} uses a named display lane`);
    assert.ok(view.display, `${key} supplies legible node copy`);
    assert.ok(view.detail, `${key} supplies an interpretation`);
    assert.ok(Array.isArray(view.sourcePaths) && view.sourcePaths.length > 0);
  }
  assert.match(
    hooks.simulationMetricView(payload, "precedent").sourcePaths.join(" "),
    /verdict_basis|target_precedent/,
  );
  assert.match(
    hooks.simulationMetricView(payload, "computed").sourcePaths.join(" "),
    /tractability|axis_conflict/,
  );
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

test("machine reason codes stay in audit detail instead of primary node copy", () => {
  const snapshot = structuredClone(terminalSnapshot);
  const simulationStage = snapshot.stages.find(
    (stage) => stage.stage_id === "simulation",
  );
  simulationStage.reason_code = "PINNED_ARTIFACT_REVALIDATED";

  const harness = loadFunctionalApp();
  prepareRun(harness);
  harness.hooks.ingestSnapshot(snapshot);

  const simulation = harness.hooks.findNode("simulation-slot-0");
  assert.equal(harness.hooks.state.stageStates[4], "replay");
  assert.equal(harness.hooks.state.stageNotes[4], "Complete · cached replay");
  assert.equal(simulation.reason, "PINNED_ARTIFACT_REVALIDATED");
  assert.equal(typeof harness.hooks.publicReasonSummary, "function");
  assert.doesNotMatch(
    harness.hooks.publicReasonSummary(simulation),
    /PINNED_ARTIFACT_REVALIDATED/,
  );

  const nodeCards = harness.hooks.elements.graphNodes.children.filter(
    (element) => element.dataset.nodeId === "simulation-slot-0",
  );
  const nodeCard = nodeCards.at(-1);
  assert.ok(nodeCard, "the tractability node card must be rendered");
  assert.doesNotMatch(
    nodeCard.innerHTML,
    /PINNED_ARTIFACT_REVALIDATED/,
    "the compact card needs plain-language status, not a raw machine token",
  );

  harness.hooks.renderInspector(simulation);
  assert.match(
    harness.hooks.elements.inspectorBody.innerHTML,
    /PINNED_ARTIFACT_REVALIDATED/,
    "the exact backend reason code remains inspectable in run qualifications",
  );
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

test("native enrollment fields are presented as modeled estimates, not an invented IQR", () => {
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
  assert.equal(program.uncertainty, "modeled enrollment range: 93–1172 months");
  assert.equal(program.recruitmentUncertainty, "modeled enrollment range: 93–1172 months");
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
    "modeled enrollment range: 93–1172 months",
  );
});

test("representative display metrics remain distinct from the shared native payload", () => {
  const snapshot = structuredClone(terminalSnapshot);
  snapshot.biomarkers[0].display_metric_basis = "REPRESENTATIVE_DEMO_SCENARIO_V1";
  snapshot.biomarkers[0].display_metrics = {
    exploration: 4,
    evidence: 60,
    pursuit: 2,
  };
  snapshot.programs[0].display_metric_basis = "REPRESENTATIVE_DEMO_SCENARIO_V1";
  snapshot.programs[0].display_metrics = {
    boldness: 7,
    evidence: 72,
    plausibility: 79,
    rnpv: 145,
    positive: 62,
    impact: 82,
    recruit: 82,
    duration: 18,
    screens: 2.3,
    risk: 18,
    tractability_fit: 86,
  };
  snapshot.programs[0].display_label = "myeloid response · H-g2";
  snapshot.programs[0].display_uncertainty = "Representative rNPV P10–P90: -$35M to $310M";
  snapshot.programs[0].display_recruitment_uncertainty =
    "Representative enrollment range: 14–23 months";
  snapshot.programs[0].display_tractability_uncertainty =
    "Representative branch-context fit; native dossier remains attached.";

  const harness = loadFunctionalApp();
  prepareRun(harness);
  harness.hooks.ingestSnapshot(snapshot);

  assert.deepEqual(
    Object.fromEntries(
      Object.keys(snapshot.programs[0].display_metrics).map((key) => [
        key,
        harness.hooks.state.runData.programs[0].metrics[key],
      ]),
    ),
    snapshot.programs[0].display_metrics,
  );
  assert.equal(harness.hooks.findNode("roi-slot-0").metrics.rnpv, 145);
  assert.equal(harness.hooks.findNode("recruitability-slot-0").metrics.recruit, 82);
  assert.equal(harness.hooks.findNode("recruitability-slot-0").metrics.duration, 18);
  assert.equal(harness.hooks.findNode("simulation-slot-0").metrics.tractability_fit, 86);
  assert.equal(
    harness.hooks.state.runData.programs[0].stationPayloads.recruitability.score,
    0,
    "native station payload remains unchanged",
  );
});

test("nine representative branches remain distinct and produce a three-record frontier", () => {
  const vectors = [
    [7, 72, 79, 145, 62, 82, 82, 18, 2.3, 18, 86],
    [6, 58, 71, 132, 57, 74, 69, 24, 3.2, 31, 64],
    [8, 64, 73, 108, 51, 70, 75, 21, 2.8, 25, 78],
    [7, 50, 67, 115, 53, 70, 68, 25, 3.4, 32, 62],
    [6, 69, 74, 195, 69, 79, 62, 28, 4.0, 38, 84],
    [8, 76, 86, 120, 55, 88, 88, 16, 2.0, 12, 88],
    [8, 67, 70, 170, 64, 76, 55, 33, 4.9, 45, 80],
    [7, 55, 68, 185, 67, 71, 48, 36, 5.7, 52, 60],
    [9, 63, 72, 128, 56, 77, 77, 20, 2.7, 23, 66],
  ];
  const snapshot = structuredClone(terminalSnapshot);
  const baseBiomarker = snapshot.biomarkers[0];
  snapshot.biomarkers = [0, 1, 2].map((slot) => ({
    ...structuredClone(baseBiomarker),
    slot,
    label: `RA signal ${slot + 1}`,
    display_metric_basis: "REPRESENTATIVE_DEMO_SCENARIO_V1",
    display_metrics: {
      exploration: [4, 6, 5][slot],
      evidence: [60, 50.7, 40.7][slot],
      pursuit: [2, 2, 3][slot],
    },
    display_uncertainty: "Representative biomarker posture",
  }));
  const baseProgram = snapshot.programs[0];
  snapshot.programs = vectors.map((vector, lane) => {
    const [
      boldness,
      evidence,
      plausibility,
      rnpv,
      positive,
      impact,
      recruit,
      duration,
      screens,
      risk,
      tractabilityFit,
    ] = vector;
    return {
      ...structuredClone(baseProgram),
      id: `branch-${lane}`,
      lane,
      biomarker_slot: Math.floor(lane / 3),
      hypothesis_slot: lane % 3,
      display_metric_basis: "REPRESENTATIVE_DEMO_SCENARIO_V1",
      display_label: `RA signal ${Math.floor(lane / 3) + 1} · hypothesis ${(lane % 3) + 1}`,
      display_metrics: {
        boldness,
        evidence,
        plausibility,
        rnpv,
        positive,
        impact,
        recruit,
        duration,
        screens,
        risk,
        tractability_fit: tractabilityFit,
      },
      display_uncertainty: `Representative branch interval ${lane + 1}`,
      display_recruitment_uncertainty: `Representative enrollment range ${lane + 1}`,
      display_tractability_uncertainty: `Representative branch-context fit ${tractabilityFit}/100`,
    };
  });

  const harness = loadFunctionalApp();
  prepareRun(harness);
  harness.hooks.state.snapshot = {
    indication: "Rheumatoid arthritis",
    biomarkers: 3,
    papers: 40,
    hypotheses: 3,
    biomarkerRange: [1, 10],
    hypothesisRange: [1, 10],
  };
  harness.hooks.state.runData = {
    biomarkers: [],
    programs: [],
    requestedLanes: 9,
    biomarkerShortfall: 0,
    hypothesisShortfall: 0,
  };
  harness.hooks.buildScaffold();
  harness.hooks.ingestSnapshot(snapshot);

  assert.equal(harness.hooks.state.runData.programs.length, 9);
  assert.deepEqual(
    harness.hooks.state.runData.programs.map((program) => program.id),
    Array.from({ length: 9 }, (_, lane) => `branch-${lane}`),
    "the 3D plan map must receive nine stable, distinct plan identities",
  );
  assert.equal(
    new Set(
      harness.hooks.state.runData.programs.map((program) =>
        JSON.stringify(program.metrics),
      ),
    ).size,
    9,
  );
  assert.deepEqual(
    harness.hooks.state.runData.programs
      .map((program, lane) => [lane, harness.hooks.programStatus(program)])
      .filter(([, status]) => status === "non-dominated")
      .map(([lane]) => lane),
    [0, 4, 5],
  );

  const perturbedPlan = harness.hooks.state.runData.programs[1];
  const baseline = { ...perturbedPlan.metrics };

  perturbedPlan.metrics.plausibility = 100;
  assert.equal(
    harness.hooks.programStatus(perturbedPlan),
    "dominated",
    "plausibility remains comparison context and must not change three-axis Pareto membership",
  );

  perturbedPlan.metrics.tractability_fit = 99;
  assert.equal(
    harness.hooks.programStatus(perturbedPlan),
    "non-dominated",
    "changing the simulation / tractability axis must be able to change Pareto membership",
  );

  perturbedPlan.metrics.tractability_fit = null;
  assert.equal(
    harness.hooks.programStatus(perturbedPlan),
    "incomparable",
    "a plan missing the simulation / tractability axis must stay off the plotted frontier",
  );

  perturbedPlan.metrics = { ...baseline, rnpv: null };
  assert.equal(
    harness.hooks.programStatus(perturbedPlan),
    "incomparable",
    "a plan missing ROI must stay off the plotted frontier",
  );

  perturbedPlan.metrics = { ...baseline, recruit: null };
  assert.equal(
    harness.hooks.programStatus(perturbedPlan),
    "incomparable",
    "a plan missing recruitability must stay off the plotted frontier",
  );

  perturbedPlan.metrics = baseline;
  assert.equal(
    new Set(
      harness.hooks.state.runData.programs.map(
        (program) => program.stationPayloads.recruitability.score,
      ),
    ).size,
    1,
    "all representative branches retain the same native module artifact",
  );
});

test("judge-facing HTTP copy contains no simulated label", () => {
  const snapshot = structuredClone(terminalSnapshot);
  const recruitability = snapshot.stages.find(
    (stage) => stage.stage_id === "recruitability",
  );
  recruitability.qualifiers = recruitability.qualifiers.filter(
    (qualifier) => qualifier !== "SIMULATED",
  );
  recruitability.qualifiers.push("MODELED_FORECAST");
  snapshot.programs[0].display_metric_basis = "REPRESENTATIVE_DEMO_SCENARIO_V1";
  snapshot.programs[0].display_metrics = {
    ...snapshot.programs[0].metrics,
    recruit: 82,
    duration: 18,
    screens: 2.3,
    risk: 18,
    tractability_fit: 86,
  };
  snapshot.programs[0].display_recruitment_uncertainty =
    "Representative enrollment range: 14–23 months";

  const harness = loadFunctionalApp();
  prepareRun(harness);
  harness.hooks.ingestSnapshot(snapshot);
  harness.hooks.renderInspector(harness.hooks.findNode("recruitability-slot-0"));

  assert.doesNotMatch(appHtml, /\bsimulated\b/i);
  assert.doesNotMatch(harness.hooks.elements.inspectorBody.innerHTML, /\bsimulated\b/i);
  assert.match(harness.hooks.elements.inspectorBody.innerHTML, /REPRESENTATIVE DEMO SCENARIO V1/);
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

test("scientific snapshot binds three exact focus branches and native artifacts", () => {
  const { hooks } = ingestScientificSnapshot();

  assert.equal(hooks.state.scientificSnapshot, true);
  assert.equal(hooks.state.runData.biomarkers.length, 3);
  assert.equal(hooks.state.runData.programs.length, 3);
  assert.deepEqual(
    hooks.state.runData.programs.map((program) => program.id),
    ["BR-01-b1", "BR-02-b2", "BR-03-p1"],
  );
  assert.equal(
    hooks.state.runData.biomarkers[2].label,
    "Mechanistic/PD readout: Pathway readout",
  );
  assert.equal(hooks.state.runData.programs[0].metrics.recruit, 72);
  assert.equal(hooks.state.runData.programs[0].metrics.duration, 22);
  assert.equal(hooks.state.runData.programs[0].metrics.rnpv, 45);
  assert.equal(hooks.state.runData.programs[0].stationPayloads.recruitability.simulated_months_to_enroll, 22);
  assert.equal(hooks.state.runData.programs[0].scientificNodes.roi_calculator.output_hash, "sha256:output-roi-b1");
});

test("scientific focus copy stays mode-neutral while explicit LIVE origins remain visible", () => {
  const replay = ingestScientificSnapshot();
  const processFocus = replay.hooks.state.runData.biomarkers[2];

  assert.equal(replay.hooks.state.executionMode, "REPLAY");
  assert.match(processFocus.summary, /selected from producer evidence/);
  assert.doesNotMatch(processFocus.summary, /selected from live evidence/i);
  assert.equal(replay.hooks.findNode("hyp-slot-2").outputOrigin, "DETERMINISTIC_REPLAY");

  const liveSnapshot = structuredClone(scientificSnapshot);
  liveSnapshot.execution_mode = "LIVE";
  liveSnapshot.branches[2].nodes.hypothesis_generator.output_origin = "LIVE";
  const live = ingestScientificSnapshot(liveSnapshot);
  live.hooks.renderInspector(live.hooks.findNode("hyp-slot-2"));

  assert.equal(live.hooks.state.executionMode, "LIVE");
  assert.match(live.hooks.state.runData.biomarkers[2].summary, /selected from producer evidence/);
  assert.match(
    live.hooks.elements.inspectorBody.innerHTML,
    /<span>Output origin<\/span><strong>LIVE<\/strong>/,
  );
});

test("scientific inspector shows exact hashes, native simulated names, and terminal reasons", () => {
  const { hooks } = ingestScientificSnapshot();

  hooks.renderInspector(hooks.findNode("recruitability-slot-0"));
  const clinicalHtml = hooks.elements.inspectorBody.innerHTML;
  assert.match(clinicalHtml, /simulated_months_to_enroll/);
  assert.match(clinicalHtml, /sha256:input-clin-b1/);
  assert.match(clinicalHtml, /sha256:output-clin-b1/);
  assert.match(clinicalHtml, /REagent-LABrador\/clinical_simulation/);

  hooks.renderInspector(hooks.findNode("hyp-slot-1"));
  const failureHtml = hooks.elements.inspectorBody.innerHTML;
  assert.match(failureHtml, /CREDENTIAL_MISSING/);
  assert.match(failureHtml, /ANTHROPIC_API_KEY is missing/);
  assert.match(failureHtml, /CANNOT_COMPLETE/);
  assert.match(failureHtml, /NOT RUN/);
  assert.match(failureHtml, /sha256:output-hyp-b2-failure/);
});

test("scientific comparison membership comes only from the server result", () => {
  const { hooks } = ingestScientificSnapshot();
  const frontier = hooks.state.runData.programs[0];
  const processFrontier = hooks.state.runData.programs[2];
  const failed = hooks.state.runData.programs[1];

  assert.equal(hooks.serverStatusLabel(frontier), "FRONTIER");
  assert.equal(hooks.serverStatusLabel(processFrontier), "FRONTIER");
  assert.equal(hooks.serverStatusLabel(failed), "INCOMPARABLE");
  assert.equal(hooks.programStatus(frontier), "non-dominated");

  frontier.metrics = {
    ...frontier.metrics,
    rnpv: -999999,
    recruit: 0,
    tractability_fit: 0,
  };
  processFrontier.metrics = {
    ...processFrontier.metrics,
    rnpv: 999999,
    recruit: 100,
    tractability_fit: 100,
  };
  frontier.displayMetricBasis = "REPRESENTATIVE_DEMO_SCENARIO_V1";
  frontier.displayMetrics = { rnpv: -1, recruit: -1, tractability_fit: -1 };

  assert.equal(
    hooks.programStatus(frontier),
    "non-dominated",
    "browser and representative values cannot change server Pareto membership",
  );
  assert.equal(hooks.programStatus(processFrontier), "non-dominated");
});

test("server Highlander Pareto set and producer-grounded action render verbatim", () => {
  const { hooks } = ingestScientificSnapshot();
  hooks.renderHighlander();

  const html = hooks.elements.serverHighlanderResult.innerHTML;
  assert.equal(hooks.elements.serverHighlanderResult.hidden, false);
  assert.match(html, /H-b1, H-p1/);
  assert.match(html, /Measure target engagement in synovial tissue/);
  assert.match(html, /sha256:output-sim-p1/);
  assert.match(html, /sha256:highlander-result-test/);
  assert.match(hooks.elements.programDetail.innerHTML, /SERVER|FRONTIER/);
  assert.match(hooks.elements.programDetail.innerHTML, /Representative values excluded from scientific packet: yes/);
});

test("representative watermark appears only for explicit representative demo mode", () => {
  const scientific = ingestScientificSnapshot();
  assert.equal(scientific.hooks.elements.representativeWatermark.hidden, true);
  assert.equal(scientific.hooks.elements.representativeWatermark.textContent, "");

  const strayWatermark = structuredClone(scientificSnapshot);
  strayWatermark.watermark = "SHOULD NOT SHOW";
  const nonRepresentative = ingestScientificSnapshot(strayWatermark);
  assert.equal(nonRepresentative.hooks.elements.representativeWatermark.hidden, true);

  const representative = structuredClone(scientificSnapshot);
  representative.presentation_mode = "REPRESENTATIVE_DEMO";
  representative.representative_demo = true;
  representative.watermark = "REPRESENTATIVE DEMO VALUES";
  const demo = ingestScientificSnapshot(representative);
  assert.equal(demo.hooks.elements.representativeWatermark.hidden, false);
  assert.equal(demo.hooks.elements.representativeWatermark.textContent, "REPRESENTATIVE DEMO VALUES");
});

test("explicit scientific launch mode builds the checked-in v3 IRAK4 replay frame", () => {
  const { hooks, document } = loadFunctionalApp({ search: "?backend=http&mode=scientific" });
  hooks.applyBootMode();
  const setup = hooks.buildScientificSetup({
    indication: "Rheumatoid arthritis",
    biomarkers: 3,
  });

  assert.equal(hooks.BOOT.launchMode, "scientific");
  assert.equal(setup.schemaVersion, "labrador.run-setup.v3");
  assert.equal(setup.execution.mode, "REPLAY");
  assert.equal(setup.execution.presentationMode, "SCIENTIFIC");
  assert.equal(
    setup.exploration.evidenceRequest.target,
    "can a small-molecule IRAK4 inhibitor suppress synovial fibroblast-driven inflammation in rheumatoid arthritis, or is its effect confined to the myeloid compartment?",
  );
  assert.equal(
    setup.exploration.evidenceRequest.reason,
    "frozen golden path for the REagent-LABrador integration demo",
  );
  assert.equal(setup.exploration.focus.maxBranches, 3);
  assert.equal(setup.program.frame.target.symbol, "IRAK4");
  assert.equal(setup.program.frame.target.uniprotAccession, "Q9NWZ3");
  assert.equal(setup.program.valuationFrame.target, "IRAK4");
  assert.equal(hooks.elements.maxHypotheses.value, "1");
  assert.equal(hooks.elements.maxHypotheses.disabled, true);
  assert.match(document.getElementById("setup-mode-chip").textContent, /Scientific replay/);
});

test("run query attaches read-only without creating another backend run", () => {
  let attachedRunId = null;
  let createCalls = 0;
  const httpBackend = {
    createRun() {
      createCalls += 1;
      return Promise.resolve({ runId: "LR-UNEXPECTED" });
    },
    startPolling(runId) {
      attachedRunId = runId;
      return { stop() {} };
    },
  };
  const { hooks, document } = loadFunctionalApp({
    search: "?backend=http&mode=scientific&run=LR-SCIENTIFIC-TEST",
    httpBackend,
  });
  const setNumber = (id, value, min, max) => {
    const input = document.getElementById(id);
    input.value = String(value);
    input.min = String(min);
    input.max = String(max);
  };
  document.getElementById("clinical-indication").value = "Rheumatoid arthritis";
  setNumber("max-biomarkers", 3, 1, 10);
  setNumber("max-papers", 40, 1, 100);
  setNumber("max-hypotheses", 1, 1, 10);
  setNumber("biomarker-low", 1, 1, 10);
  setNumber("biomarker-high", 10, 1, 10);
  setNumber("hypothesis-low", 1, 1, 10);
  setNumber("hypothesis-high", 10, 1, 10);

  hooks.applyBootMode();
  hooks.attachConfiguredRun(hooks.BOOT.runId);

  assert.equal(hooks.BOOT.runId, "LR-SCIENTIFIC-TEST");
  assert.equal(attachedRunId, "LR-SCIENTIFIC-TEST");
  assert.equal(createCalls, 0);
  assert.equal(hooks.state.runId, "LR-SCIENTIFIC-TEST");
  assert.match(document.getElementById("snapshot-note").textContent, /No new run was created/);
});
