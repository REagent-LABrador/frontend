    import { createHttpBackend } from "./backend-http.js";

    // Backend selection: mock (default, in-page deterministic demo, zero network)
    // or ?backend=http&base=http://localhost:8787 (real run API per ../API-CONTRACT.md).
    var BOOT = (function () {
      var params = new URLSearchParams(window.location.search);
      var mode = params.get("backend") === "http" ? "http" : "mock";
      var base = params.get("base") || "http://localhost:8787";
      return { mode: mode, base: base, http: mode === "http" ? createHttpBackend(base) : null };
    }());

    (function () {
      "use strict";

      var STAGES = [
        { id: "biomarker", label: "Biomarker" },
        { id: "hypothesis", label: "Hypothesis" },
        { id: "roi", label: "ROI / impact" },
        { id: "recruitability", label: "Recruitability" },
        { id: "simulation", label: "Simulation" }
      ];

      var BAND_INDEX = {
        indication: 0,
        biomarker: 1,
        hypothesis: 2,
        roi: 3,
        recruitability: 4,
        simulation: 5
      };

      var GRAPH_GEOMETRY = {
        xOrigin: 260,
        nodeWidth: 224,
        nodeHeight: 144,
        lane: 272,
        band: 440,
        canvasMinWidth: 2968,
        canvasHeight: 2640,
        rootOffset: 140,
        shelfOffset: 280,
        plotOffset: 68,
        plotTravel: 164,
        busInset: 20
      };

      var METRICS = {
        biomarker: {
          exploration: { label: "Exploration posture", unit: "1–10 named scale", domain: [1, 10], names: [null, "1 · Established", "2 of 10", "3 of 10", "4 of 10", "5 of 10", "6 of 10", "7 of 10", "8 of 10", "9 of 10", "10 · Untested but plausible"], basis: "Illustrative 10-point ordinal mapping; equal steps are not calibrated scientific distance." },
          evidence: { label: "Evidence support", unit: "/100 proxy", domain: [0, 100], basis: "Illustrative paper-level support proxy; no literature service called." },
          pursuit: { label: "Prior pursuit", unit: "named scale", domain: [0, 3], names: ["Sparse", "Limited", "Active", "Crowded"], basis: "Illustrative ordinal pursuit signal." }
        },
        hypothesis: {
          boldness: { label: "Boldness", unit: "/10 proxy", domain: [1, 10], basis: "Illustrative 10-point ordinal mapping." },
          evidence: { label: "Evidence support", unit: "/100 proxy", domain: [0, 100], basis: "Illustrative synthesis; mapper not called." },
          plausibility: { label: "Biological plausibility", unit: "/100 proxy", domain: [0, 100], basis: "Illustrative hypothesis field, not a calibrated probability." }
        },
        roi: {
          rnpv: { label: "P50 rNPV", unit: "$M modeled", domain: [0, 250], basis: "Synthetic economics-compatible field; NOT_DECISION_GRADE." },
          positive: { label: "Probability positive rNPV", unit: "% modeled", domain: [0, 100], basis: "Synthetic probability-positive field; not a probability of approval." },
          impact: { label: "Clinical impact", unit: "/100 proxy", domain: [0, 100], basis: "Illustrative product-impact proxy." }
        },
        recruitability: {
          recruit: { label: "Recruitability", unit: "/100 simulated", domain: [0, 100], basis: "Positive low-to-high display of an illustrative forecaster-compatible field." },
          duration: { label: "Enrollment duration", unit: "months simulated", domain: [12, 40], basis: "Synthetic simulatedMonthsToEnroll-compatible field." },
          screens: { label: "Screens per enrollee", unit: "ratio simulated", domain: [1, 8], basis: "Synthetic screensPerEnrollee-compatible field." },
          risk: { label: "Recruitability risk", unit: "/100 proxy", domain: [0, 100], basis: "Illustrative transformation; higher appears lower on this low-to-high axis." }
        },
        simulation: {
          support: { label: "Atomistic support", unit: "/100", domain: [0, 100], basis: "No values available: target module is not wired." },
          occupancy: { label: "Pose occupancy", unit: "%", domain: [0, 100], basis: "No values available: target module is not wired." },
          convergence: { label: "Convergence", unit: "%", domain: [0, 100], basis: "No values available: target module is not wired." }
        }
      };

      var BIOMARKER_LEVELS = [null, "1 · Established", "2 of 10", "3 of 10", "4 of 10", "5 of 10", "6 of 10", "7 of 10", "8 of 10", "9 of 10", "10 · Untested but plausible"];
      var HYPOTHESIS_LEVELS = [null, "1 · Standard", "2 of 10", "3 of 10", "4 of 10", "5 of 10", "6 of 10", "7 of 10", "8 of 10", "9 of 10", "10 · Radical"];

      var BIOMARKER_TEMPLATES = [
        { label: "IL6R", summary: "Inflammatory signaling anchor", metrics: { exploration: 1, evidence: 86, pursuit: 3 }, uncertainty: "±8 proxy points" },
        { label: "TYK2", summary: "Cytokine pathway regulator", metrics: { exploration: 4, evidence: 74, pursuit: 2 }, uncertainty: "±11 proxy points" },
        { label: "NLRP3", summary: "Inflammasome activation node", metrics: { exploration: 7, evidence: 62, pursuit: 2 }, uncertainty: "±14 proxy points" }
      ];

      var HYPOTHESIS_TEMPLATES = [
        [
          { label: "Stromal memory disruption", short: "IL6R · stromal memory", boldness: 5, evidence: 72, plausibility: 70, rnpv: 145, positive: 58, impact: 82, recruit: 89, duration: 18, screens: 2.2, risk: 24, uncertainty: "rNPV P10–P90: $52M–$261M", publicWhy: "Strong recruitability and clinical-impact proxies offset a lower modeled cash value than several alternatives." },
          { label: "Peripheral tolerance pulse", short: "IL6R · tolerance pulse", boldness: 7, evidence: 64, plausibility: 84, rnpv: 120, positive: 54, impact: 76, recruit: 91, duration: 17, screens: 2.0, risk: 20, uncertainty: "rNPV P10–P90: $30M–$236M", publicWhy: "Highest biological-plausibility and recruitability proxies preserve a frontier tradeoff despite lower modeled value." },
          { label: "Synovial clock reset", short: "IL6R · synovial reset", boldness: 8, evidence: 41, plausibility: 52, rnpv: 98, positive: 39, impact: 64, recruit: 68, duration: 25, screens: 3.6, risk: 46, uncertainty: "rNPV P10–P90: −$18M–$205M", publicWhy: "The record is dominated on the available baseline axes and remains useful as an explicit comparison." }
        ],
        [
          { label: "Immune checkpoint reset", short: "TYK2 · checkpoint reset", boldness: 7, evidence: 68, plausibility: 78, rnpv: 182, positive: 61, impact: 84, recruit: 74, duration: 22, screens: 3.1, risk: 38, uncertainty: "rNPV P10–P90: $61M–$312M", publicWhy: "Balanced modeled value, plausibility, and recruitability make this record non-dominated without making it a winner." },
          { label: "Isoform-selective switch", short: "TYK2 · isoform switch", boldness: 9, evidence: 57, plausibility: 72, rnpv: 195, positive: 57, impact: 79, recruit: 60, duration: 28, screens: 4.2, risk: 54, uncertainty: "rNPV P10–P90: $38M–$347M", publicWhy: "Higher modeled value trades against weaker recruitment, retaining a distinct frontier position." },
          { label: "Tissue-selective modulation", short: "TYK2 · tissue selective", boldness: 9, evidence: 46, plausibility: 80, rnpv: null, positive: null, impact: 88, recruit: null, duration: null, screens: null, risk: null, roiFailed: true, recruitFailed: true, uncertainty: "Economics and recruitment outputs missing", publicWhy: "Incomparable because required objective records failed; missing values are not treated as zero." }
        ],
        [
          { label: "Trained-immunity brake", short: "NLRP3 · trained immunity", boldness: 8, evidence: 62, plausibility: 66, rnpv: 280, positive: 49, impact: 91, recruit: 52, duration: 31, screens: 5.4, risk: 68, overflowRnpv: true, notAmenable: true, uncertainty: "rNPV P10–P90: $44M–$426M", publicWhy: "The raw $280M modeled value exceeds the display domain and trades against slower simulated recruitment." }
        ]
      ];

      // Real, committed output of the clinical_simulation station (2018 dupilumab-in-EoE
      // hindcast; clinical_simulation/schemas/examples/dupi-eoe-2018-hindcast.result.json).
      // Bundled VERBATIM so the inspector's station-output path is proven before any
      // backend exists. Its own input echo (id: dupi-eoe) labels it as a bundled real
      // example, distinct from the illustrative mock thesis it is attached to.
      var STATION_EXAMPLE_RECRUITABILITY = {"as_of_date":"2018-01-01","counterfactual":null,"eligibility":{"cited_trials":["NCT02227836","NCT02353078","NCT00895817"],"drivers":["exclusion of conditions associated with esophageal eosinophilia (Crohn's, Churg-Strauss, achalasia, hypereosinophilic syndrome) per NCT02227836/NCT02353078","requirement for persistent symptoms/eosinophilia after PPI trial per NCT02227836","age range restrictions (e.g., 18-90, 18-80) per NCT02227836/NCT02353078/NCT00895817","exclusion for pregnancy/lactation per NCT02353078/NCT00895817","exclusion for coagulopathy or bleeding risk per NCT00895817","inability to consent or language/literacy barriers per NCT02227836/NCT02353078"],"multiplier":0.6,"reasoning":"Even after meeting the eosinophil threshold, many patients would be excluded due to comorbid eosinophilic conditions, PPI-response requirements, age or pregnancy restrictions, and endoscopy-related safety exclusions as seen across the precedent EoE trials. Combining these moderate, overlapping exclusion criteria suggests roughly 60% of biomarker-positive patients would still qualify."},"evidence":{"competing_trials":20,"precedent_trials":["NCT02227836","NCT00961233","NCT02038894","NCT02353078","NCT00895817","NCT02125851","NCT01386112","NCT00638456","NCT00358449","NCT00762073"]},"failed_precedents":[{"nct_id":"NCT01458418","why_stopped":"Inability to complete enrollment due to difficulty in finding subjects"},{"nct_id":"NCT02314455","why_stopped":"Early analysis showed negative results. It was decided to halt the study."},{"nct_id":"NCT01479231","why_stopped":"Souces of funding have been terminated"},{"nct_id":"NCT01404832","why_stopped":"Inadequate recruitment"},{"nct_id":"NCT01585103","why_stopped":"Device was recalled by company"}],"input":{"as_of_date":"2018-01-01","asset":{"name":"dupilumab","modality":"antibody","sponsor":"Regeneron/Sanofi"},"biomarker_population":{"marker":"esophageal eosinophil count >= 15/hpf on biopsy","prevalence_in_disease":0.85,"assay_available":true},"disease":{"name":"eosinophilic esophagitis"},"endpoint":{"name":"Proportion achieving peak eosinophil count <= 6/hpf","type":"binary","expected_effect_size":0.8},"evidence":[],"id":"dupi-eoe","mechanism":"IL-4Ra blockade shuts down IL-4/IL-13 signalling, reducing type 2 inflammation and eosinophil recruitment to esophageal epithelium.","mechanism_hypothesis":null,"target":{"symbol":"IL4R","direction":"block"},"tissue":"esophageal mucosa","uncertainty":0.3},"phase3_median_n":88,"powering_basis":"phase-3 precedent median (5 trials) floors the effect size d=0.8 estimate of 65","precedent_median_n":30,"required_n":88,"score":1,"screens_per_enrollee":2,"simulated_months_range":[8,35],"simulated_months_to_enroll":15,"sites":40,"sites_basis":"precedent","waterfall_delta":12,"why":"88 patients (phase-3 precedent median (5 trials) floors the effect size d=0.8 estimate of 65) at 40 sites (p75 of at-scale precedents); precedent velocity 0.80 pt/site/mo across 39 completed trials, narrowed by 85% biomarker prevalence and 60% eligibility pass rate, with ~20 interventional trials competing for the same patients at the horizon."};

      var SCENARIOS = {
        balanced: {
          name: "Balanced evidence",
          version: "v1",
          description: "Keeps evidence confidence, modeled value, and recruitment in view.",
          author: "Product design fixture",
          timestamp: "2026-08-15 · illustrative",
          weights: [["Evidence confidence", 40], ["Modeled value", 30], ["Enrollment speed", 30]]
        },
        capital: {
          name: "Capital preservation",
          version: "v1",
          description: "Views positive-rNPV probability and evidence before upside.",
          author: "Product design fixture",
          timestamp: "2026-08-15 · illustrative",
          weights: [["Evidence confidence", 45], ["Positive rNPV", 40], ["Enrollment speed", 15]]
        },
        speed: {
          name: "Enrollment speed",
          version: "v1",
          description: "Views recruitability and enrollment duration before modeled upside.",
          author: "Product design fixture",
          timestamp: "2026-08-15 · illustrative",
          weights: [["Enrollment speed", 55], ["Evidence confidence", 25], ["Modeled value", 20]]
        }
      };

      var state = {
        screen: "setup",
        submitting: false,
        runId: null,
        packetSnapshot: null,
        snapshot: null,
        runData: null,
        nodes: [],
        stageStates: ["queued", "queued", "queued", "queued", "queued"],
        stageNotes: ["queued", "queued", "queued", "queued", "queued"],
        timers: [],
        selectedId: null,
        previewId: null,
        inspectorVisible: false,
        inspectorCollapsed: false,
        freshness: "fresh",
        lastUpdated: null,
        highlanderReady: false,
        highlanderLaunched: false,
        selectedProgramId: null,
        scenario: "balanced",
        pendingAction: null,
        decisionSetVersion: 1,
        auditEvents: [],
        metrics: {
          biomarker: "exploration",
          hypothesis: "boldness",
          roi: "rnpv",
          recruitability: "recruit",
          simulation: "support"
        }
      };

      var elements = {
        form: document.getElementById("setup-form"),
        indication: document.getElementById("clinical-indication"),
        maxBiomarkers: document.getElementById("max-biomarkers"),
        maxPapers: document.getElementById("max-papers"),
        maxHypotheses: document.getElementById("max-hypotheses"),
        runButton: document.getElementById("run-button"),
        branchPreview: document.getElementById("branch-preview"),
        paperPreview: document.getElementById("paper-preview"),
        snapshotNote: document.getElementById("snapshot-note"),
        progress: document.getElementById("progress-strip"),
        graphSurface: document.getElementById("graph-surface"),
        graphNodes: document.getElementById("graph-nodes"),
        connectors: document.getElementById("connectors"),
        graphScroller: document.getElementById("graph-scroller"),
        graphScreen: document.getElementById("screen-graph"),
        inspector: document.getElementById("inspector"),
        inspectorHeading: document.getElementById("inspector-heading"),
        inspectorSubtitle: document.getElementById("inspector-subtitle"),
        inspectorBody: document.getElementById("inspector-body"),
        collapsedIdentity: document.getElementById("collapsed-identity"),
        freshness: document.getElementById("freshness"),
        freshnessButton: document.getElementById("freshness-button"),
        readinessState: document.getElementById("readiness-state"),
        packetCounts: document.getElementById("packet-counts"),
        gapConfirm: document.getElementById("gap-confirm"),
        gapConfirmInput: document.getElementById("gap-confirm-input"),
        launchHighlander: document.getElementById("launch-highlander"),
        live: document.getElementById("live-region"),
        toast: document.getElementById("toast"),
        programList: document.getElementById("program-list"),
        comparisonBody: document.getElementById("comparison-body"),
        paretoPlot: document.getElementById("pareto-plot"),
        programDetail: document.getElementById("program-detail"),
        scenarioMeta: document.getElementById("scenario-meta"),
        weightList: document.getElementById("weight-list"),
        chatLog: document.getElementById("chat-log"),
        actionDialog: document.getElementById("action-dialog"),
        actionTitle: document.getElementById("action-dialog-title"),
        actionDescription: document.getElementById("action-description"),
        actionRationale: document.getElementById("action-rationale"),
        actionError: document.getElementById("action-error"),
        auditLog: document.getElementById("audit-log")
      };

      function escapeHTML(value) {
        return String(value)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");
      }

      function announce(message) {
        elements.live.textContent = "";
        window.requestAnimationFrame(function () {
          elements.live.textContent = message;
        });
      }

      function showToast(message) {
        elements.toast.textContent = message;
        elements.toast.classList.add("visible");
        window.setTimeout(function () {
          elements.toast.classList.remove("visible");
        }, 2600);
      }

      function setTimer(callback, delay) {
        var timer = window.setTimeout(callback, delay);
        state.timers.push(timer);
        return timer;
      }

      function clearTimers() {
        state.timers.forEach(function (timer) { window.clearTimeout(timer); });
        state.timers = [];
      }

      function numberFieldState(input, label) {
        var raw = input.value.trim();
        var number = Number(raw);
        var minimum = Number(input.min);
        var maximum = Number(input.max);
        var error = document.getElementById(input.id + "-error");
        var valid = raw !== "" && Number.isInteger(number) && number >= minimum && number <= maximum;
        input.setAttribute("aria-invalid", valid ? "false" : "true");
        if (!valid) {
          error.textContent = label + " must be a whole number from " + minimum + " to " + maximum + ".";
          return { valid: false, value: null };
        }
        error.textContent = "";
        return { valid: true, value: number };
      }

      function validateSetup() {
        var indication = elements.indication.value.trim();
        var indicationError = document.getElementById("indication-error");
        var indicationValid = indication.length > 0;
        elements.indication.setAttribute("aria-invalid", indicationValid ? "false" : "true");
        indicationError.textContent = indicationValid ? "" : "Enter a clinical indication; whitespace alone is not valid.";

        var biomarkers = numberFieldState(elements.maxBiomarkers, "Maximum biomarkers");
        var papers = numberFieldState(elements.maxPapers, "Maximum literature papers");
        var hypotheses = numberFieldState(elements.maxHypotheses, "Maximum hypotheses per biomarker");
        var valid = indicationValid && biomarkers.valid && papers.valid && hypotheses.valid;

        if (biomarkers.valid && hypotheses.valid) {
          var branches = biomarkers.value * hypotheses.value;
          elements.branchPreview.textContent = "Up to " + biomarkers.value + " biomarker" + (biomarkers.value === 1 ? "" : "s") + " and up to " + branches + " hypothesis branch" + (branches === 1 ? "" : "es") + ".";
        } else {
          elements.branchPreview.textContent = "Enter valid ceilings to preview requested capacity.";
        }
        elements.paperPreview.textContent = papers.valid
          ? "The illustrative mapper may inspect up to " + papers.value + " paper record" + (papers.value === 1 ? "" : "s") + ". Returned counts may be lower."
          : "The literature ceiling is invalid; no count has been assumed.";
        elements.runButton.disabled = !valid || state.submitting;
        return {
          valid: valid,
          indication: indication,
          biomarkers: biomarkers.value,
          papers: papers.value,
          hypotheses: hypotheses.value
        };
      }

      function updateDualRange(name, changed) {
        var low = document.getElementById(name + "-low");
        var high = document.getElementById(name + "-high");
        var names = name === "biomarker" ? BIOMARKER_LEVELS : HYPOTHESIS_LEVELS;
        var lowValue = Number(low.value);
        var highValue = Number(high.value);
        if (changed === "low" && lowValue > highValue) {
          low.value = String(highValue);
          lowValue = highValue;
        }
        if (changed === "high" && highValue < lowValue) {
          high.value = String(lowValue);
          highValue = lowValue;
        }
        var denominator = Number(low.max) - Number(low.min);
        var lowPercent = ((lowValue - Number(low.min)) / denominator) * 100;
        var highPercent = ((highValue - Number(high.min)) / denominator) * 100;
        var fill = document.getElementById(name + "-fill");
        fill.style.left = lowPercent + "%";
        fill.style.width = (highPercent - lowPercent) + "%";
        document.getElementById(name + "-low-value").textContent = names[lowValue];
        document.getElementById(name + "-high-value").textContent = names[highValue];
        document.getElementById(name + "-interval").textContent = "Selected interval: " + names[lowValue] + " through " + names[highValue] + ".";
        low.setAttribute("aria-valuetext", names[lowValue] + "; complete interval " + names[lowValue] + " through " + names[highValue]);
        high.setAttribute("aria-valuetext", names[highValue] + "; complete interval " + names[lowValue] + " through " + names[highValue]);
        low.style.zIndex = lowValue === Number(low.max) ? "5" : "3";
        high.style.zIndex = "4";
      }

      function buildRunData(snapshot) {
        var biomarkers = [];
        var programs = [];
        var returnedBiomarkers = Math.min(snapshot.biomarkers, BIOMARKER_TEMPLATES.length);
        var lane = 0;

        for (var b = 0; b < snapshot.biomarkers; b += 1) {
          var template = b < returnedBiomarkers ? BIOMARKER_TEMPLATES[b] : null;
          if (template) {
            biomarkers.push({
              slot: b,
              id: "bio-slot-" + b,
              label: template.label,
              summary: template.summary,
              metrics: template.metrics,
              uncertainty: template.uncertainty
            });
          }
          for (var h = 0; h < snapshot.hypotheses; h += 1) {
            var hypothesisTemplate = template && HYPOTHESIS_TEMPLATES[b] && h < HYPOTHESIS_TEMPLATES[b].length
              ? HYPOTHESIS_TEMPLATES[b][h]
              : null;
            if (hypothesisTemplate) {
              programs.push({
                id: "program-" + (programs.length + 1),
                lane: lane,
                biomarkerSlot: b,
                hypothesisSlot: h,
                hypothesisNodeId: "hyp-slot-" + lane,
                roiNodeId: "roi-slot-" + lane,
                recruitNodeId: "recruitability-slot-" + lane,
                simulationNodeId: "simulation-slot-" + lane,
                label: hypothesisTemplate.label,
                short: hypothesisTemplate.short,
                metrics: {
                  boldness: hypothesisTemplate.boldness,
                  evidence: hypothesisTemplate.evidence,
                  plausibility: hypothesisTemplate.plausibility,
                  rnpv: hypothesisTemplate.rnpv,
                  positive: hypothesisTemplate.positive,
                  impact: hypothesisTemplate.impact,
                  recruit: hypothesisTemplate.recruit,
                  duration: hypothesisTemplate.duration,
                  screens: hypothesisTemplate.screens,
                  risk: hypothesisTemplate.risk,
                  support: null,
                  occupancy: null,
                  convergence: null
                },
                uncertainty: hypothesisTemplate.uncertainty,
                publicWhy: hypothesisTemplate.publicWhy,
                roiFailed: Boolean(hypothesisTemplate.roiFailed),
                recruitFailed: Boolean(hypothesisTemplate.recruitFailed),
                overflowRnpv: Boolean(hypothesisTemplate.overflowRnpv),
                notAmenable: Boolean(hypothesisTemplate.notAmenable),
                revision: "packet-r1",
                hash: "mock-" + String(b + 1) + String(h + 1) + "a7"
              });
            }
            lane += 1;
          }
        }

        var seamProgram = programs.find(function (program) { return program.lane === 1; });
        if (seamProgram) seamProgram.stationPayloads = { recruitability: STATION_EXAMPLE_RECRUITABILITY };

        return {
          biomarkers: biomarkers,
          programs: programs,
          requestedLanes: snapshot.biomarkers * snapshot.hypotheses,
          biomarkerShortfall: snapshot.biomarkers - biomarkers.length,
          hypothesisShortfall: snapshot.biomarkers * snapshot.hypotheses - programs.length
        };
      }

      function laneX(lane) {
        return GRAPH_GEOMETRY.xOrigin + lane * GRAPH_GEOMETRY.lane;
      }

      function groupX(slot) {
        var startLane = slot * state.snapshot.hypotheses;
        var endLane = startLane + state.snapshot.hypotheses - 1;
        var halfNode = GRAPH_GEOMETRY.nodeWidth / 2;
        return ((laneX(startLane) + halfNode) + (laneX(endLane) + halfNode)) / 2 - halfNode;
      }

      function rootX() {
        var laneCount = Math.max(1, state.runData.requestedLanes);
        var halfNode = GRAPH_GEOMETRY.nodeWidth / 2;
        var start = laneX(0) + halfNode;
        var end = laneX(laneCount - 1) + halfNode;
        return (start + end) / 2 - halfNode;
      }

      function scaffoldNode(id, stage, label, lane, parentId, metadata) {
        var x = stage === "biomarker" ? groupX(metadata.slot) : laneX(lane);
        return {
          id: id,
          stage: stage,
          label: label,
          lane: lane,
          x: x,
          parentId: parentId,
          kind: "scaffold",
          execution: null,
          resultBasis: null,
          runtime: null,
          metrics: {},
          uncertainty: null,
          reason: null,
          metadata: metadata || {}
        };
      }

      function buildScaffold() {
        var nodes = [{
          id: "indication-root",
          stage: "indication",
          label: state.snapshot.indication,
          lane: null,
          x: rootX(),
          parentId: null,
          kind: "real",
          execution: "COMPLETE",
          resultBasis: "USER INPUT",
          runtime: "STATIC SNAPSHOT",
          metrics: {},
          uncertainty: "Not applicable",
          reason: null,
          metadata: { summary: "Immutable clinical indication submitted for this mock run." }
        }];

        for (var b = 0; b < state.snapshot.biomarkers; b += 1) {
          var groupStart = b * state.snapshot.hypotheses;
          nodes.push(scaffoldNode("bio-slot-" + b, "biomarker", "Requested biomarker slot B" + (b + 1), groupStart, "indication-root", { slot: b }));
          for (var h = 0; h < state.snapshot.hypotheses; h += 1) {
            var lane = groupStart + h;
            nodes.push(scaffoldNode("hyp-slot-" + lane, "hypothesis", "Candidate pending", lane, "bio-slot-" + b, { slot: h, biomarkerSlot: b }));
            nodes.push(scaffoldNode("roi-slot-" + lane, "roi", "Requested ROI capacity", lane, "hyp-slot-" + lane, { slot: h, biomarkerSlot: b }));
            nodes.push(scaffoldNode("recruitability-slot-" + lane, "recruitability", "Requested recruitability capacity", lane, "roi-slot-" + lane, { slot: h, biomarkerSlot: b }));
            nodes.push(scaffoldNode("simulation-slot-" + lane, "simulation", "Requested simulation capacity", lane, "recruitability-slot-" + lane, { slot: h, biomarkerSlot: b }));
          }
        }
        state.nodes = nodes;
        resizeGraph();
      }

      function resizeGraph() {
        var width = Math.max(
          GRAPH_GEOMETRY.canvasMinWidth,
          GRAPH_GEOMETRY.xOrigin + state.runData.requestedLanes * GRAPH_GEOMETRY.lane + 260
        );
        elements.graphSurface.style.width = width + "px";
        elements.connectors.setAttribute("viewBox", "0 0 " + width + " " + GRAPH_GEOMETRY.canvasHeight);
      }

      function findNode(id) {
        return state.nodes.find(function (node) { return node.id === id; }) || null;
      }

      function findProgramForNode(node) {
        if (!node || !state.runData) return null;
        return state.runData.programs.find(function (program) {
          return program.hypothesisNodeId === node.id ||
            program.roiNodeId === node.id ||
            program.recruitNodeId === node.id ||
            program.simulationNodeId === node.id;
        }) || null;
      }

      function actualBiomarker(slot) {
        return state.runData.biomarkers.find(function (biomarker) { return biomarker.slot === slot; }) || null;
      }

      function actualProgramForLane(lane) {
        return state.runData.programs.find(function (program) { return program.lane === lane; }) || null;
      }

      function markStagePending(stage) {
        state.nodes.forEach(function (node) {
          if (node.stage !== stage) return;
          var biomarker = stage === "biomarker" ? actualBiomarker(node.metadata.slot) : null;
          var program = stage !== "biomarker" ? actualProgramForLane(node.lane) : null;
          if (!biomarker && !program) return;

          node.kind = "pending";
          node.execution = "RUNNING";
          node.resultBasis = "AWAITING RESULT";
          node.runtime = stage === "simulation" ? "NOT WIRED" : "LOCAL TARGET / MOCK UI";
          node.metrics = {};
          node.uncertainty = "Pending; no value placed on the metric axis.";
          if (stage === "biomarker") node.label = biomarker.label;
          if (stage === "hypothesis") node.label = program.label;
          if (stage === "roi") node.label = "Economics · " + program.short;
          if (stage === "recruitability") node.label = "Recruitment · " + program.short;
          if (stage === "simulation") node.label = "Atomistic · " + program.short;
        });
      }

      function retireUnusedCapacity() {
        state.nodes.forEach(function (node) {
          if (node.stage === "indication") return;
          var isActual = node.stage === "biomarker"
            ? Boolean(actualBiomarker(node.metadata.slot))
            : Boolean(actualProgramForLane(node.lane));
          if (!isActual && node.kind === "scaffold") {
            node.metadata.retired = true;
            if (node.stage === "hypothesis") node.label = "Unused requested capacity";
          }
        });
      }

      function bindStage(stage) {
        state.nodes.forEach(function (node) {
          if (node.stage !== stage) return;
          var biomarker = stage === "biomarker" ? actualBiomarker(node.metadata.slot) : null;
          var program = stage !== "biomarker" ? actualProgramForLane(node.lane) : null;
          if (!biomarker && !program) return;

          node.kind = "real";
          node.reason = null;
          if (stage === "biomarker") {
            node.label = biomarker.label;
            node.execution = "COMPLETE";
            node.resultBasis = "ILLUSTRATIVE PROXY";
            node.runtime = "TARGET ADAPTER";
            node.metrics = biomarker.metrics;
            node.uncertainty = biomarker.uncertainty;
            node.metadata.summary = biomarker.summary;
          }
          if (stage === "hypothesis") {
            node.label = program.label;
            node.execution = "COMPLETE";
            node.resultBasis = "ILLUSTRATIVE PROXY";
            node.runtime = "NOT WIRED";
            node.metrics = {
              boldness: program.metrics.boldness,
              evidence: program.metrics.evidence,
              plausibility: program.metrics.plausibility
            };
            node.uncertainty = "Proxy scores are ordinal product fixtures.";
            node.metadata.summary = "Illustrative terminal hypothesis; no generator module was called.";
          }
          if (stage === "roi") {
            node.label = "Economics · " + program.short;
            node.execution = program.roiFailed ? "FAILED" : "COMPLETE";
            node.resultBasis = program.roiFailed ? "MISSING" : "SYNTHETIC MODELED";
            node.runtime = "LOCAL MODULE TARGET";
            node.metrics = {
              rnpv: program.metrics.rnpv,
              positive: program.metrics.positive,
              impact: program.metrics.impact
            };
            node.uncertainty = program.uncertainty;
            node.reason = program.roiFailed ? "MOCK_ECONOMICS_FAILURE · value remains missing" : null;
            node.metadata.overflow = program.overflowRnpv;
            node.metadata.summary = "Synthetic AnalysisSummary-compatible fields; NOT_DECISION_GRADE.";
          }
          if (stage === "recruitability") {
            node.label = "Recruitment · " + program.short;
            node.execution = program.recruitFailed ? "FAILED" : "COMPLETE";
            node.resultBasis = program.recruitFailed ? "MISSING" : "SIMULATED PROXY";
            node.runtime = "LOCAL MODULE TARGET";
            node.metrics = {
              recruit: program.metrics.recruit,
              duration: program.metrics.duration,
              screens: program.metrics.screens,
              risk: program.metrics.risk
            };
            node.uncertainty = program.recruitFailed ? "No numeric output returned." : "Illustrative duration range ±4 months.";
            node.reason = program.recruitFailed ? "MOCK_FORECAST_FAILURE · sibling branches continued" : null;
            node.metadata.summary = "Synthetic RecruitabilityResult-compatible fields.";
          }
          if (stage === "simulation") {
            node.label = "Atomistic · " + program.short;
            node.execution = "SKIPPED";
            node.resultBasis = program.notAmenable ? "NO RESULT" : "NOT WIRED";
            node.runtime = "NOT WIRED";
            node.metrics = { support: null, occupancy: null, convergence: null };
            node.uncertainty = "Not available; missing values stay on the shelf.";
            node.reason = program.notAmenable
              ? "NOT_AMENABLE · resolving evidence would be an experimentally supported binding mechanism"
              : "MODULE_NOT_WIRED";
            node.metadata.summary = "No atomistic capability was called by this standalone mockup.";
          }
          // When a real station produced this record, its verbatim output rides along
          // and overrides the mock provenance labels. Key names are never renamed.
          var payload = program && program.stationPayloads ? program.stationPayloads[stage] : null;
          if (payload) {
            node.metadata.stationPayload = payload;
            node.execution = "COMPLETE";
            node.resultBasis = "MODELED · VERBATIM STATION OUTPUT";
            node.runtime = "STATION ATTACHED";
            node.reason = null;
            node.metadata.summary = "Verbatim station output attached (input id: " + (payload.input && payload.input.id ? payload.input.id : "unknown") + "). Displayed keys are never renamed.";
          }
        });
        retireUnusedCapacity();
      }

      function metricDefinition(node) {
        if (!METRICS[node.stage]) return null;
        var metricKey = state.metrics[node.stage];
        return METRICS[node.stage][metricKey];
      }

      function metricValue(node) {
        if (!METRICS[node.stage]) return null;
        return Object.prototype.hasOwnProperty.call(node.metrics, state.metrics[node.stage])
          ? node.metrics[state.metrics[node.stage]]
          : null;
      }

      function formatMetric(node) {
        if (node.kind === "scaffold") return "Capacity shell · no scientific record";
        var definition = metricDefinition(node);
        if (!definition) return "Fixed root";
        var value = metricValue(node);
        if (value === null || typeof value !== "number" || Number.isNaN(value)) {
          return node.kind === "pending" ? "Pending · shelf" : "Missing · shelf";
        }
        if (definition.names) return definition.names[Math.round(value)] + " · ordinal";
        if (state.metrics[node.stage] === "rnpv") return "$" + value + "M · modeled";
        if (state.metrics[node.stage] === "positive" || state.metrics[node.stage] === "occupancy" || state.metrics[node.stage] === "convergence") return value + "% · " + definition.unit.replace("% ", "");
        if (state.metrics[node.stage] === "duration") return value + " months · simulated";
        if (state.metrics[node.stage] === "screens") return value.toFixed(1) + "× · simulated";
        return value + " " + definition.unit;
      }

      function nodeTop(node) {
        var bandTop = BAND_INDEX[node.stage] * GRAPH_GEOMETRY.band;
        if (node.stage === "indication") return bandTop + GRAPH_GEOMETRY.rootOffset;
        if (node.kind === "scaffold" || node.kind === "pending") return bandTop + GRAPH_GEOMETRY.shelfOffset;
        var definition = metricDefinition(node);
        var value = metricValue(node);
        if (!definition || value === null || typeof value !== "number" || Number.isNaN(value)) return bandTop + GRAPH_GEOMETRY.shelfOffset;
        var normalized = (value - definition.domain[0]) / (definition.domain[1] - definition.domain[0]);
        normalized = Math.max(0, Math.min(1, normalized));
        return bandTop + GRAPH_GEOMETRY.plotOffset + normalized * GRAPH_GEOMETRY.plotTravel;
      }

      function descendantsOf(id) {
        var result = new Set();
        var queue = [id];
        while (queue.length) {
          var current = queue.shift();
          state.nodes.forEach(function (node) {
            if (node.parentId === current && !result.has(node.id)) {
              result.add(node.id);
              queue.push(node.id);
            }
          });
        }
        return result;
      }

      function ancestorsOf(id) {
        var result = new Set();
        var node = findNode(id);
        while (node && node.parentId) {
          result.add(node.parentId);
          node = findNode(node.parentId);
        }
        return result;
      }

      function lineageOf(id) {
        var lineage = descendantsOf(id);
        ancestorsOf(id).forEach(function (ancestor) { lineage.add(ancestor); });
        lineage.add(id);
        return lineage;
      }

      function previewSet() {
        if (!state.previewId) return new Set();
        var preview = descendantsOf(state.previewId);
        preview.add(state.previewId);
        return preview;
      }

      function renderGraph() {
        if (!state.snapshot) return;
        var selection = state.selectedId ? lineageOf(state.selectedId) : new Set();
        var preview = previewSet();
        elements.graphNodes.innerHTML = "";

        state.nodes.forEach(function (node) {
          var nodeElement = document.createElement(node.kind === "scaffold" ? "div" : "button");
          nodeElement.className = "graph-node " + node.kind;
          if (node.kind !== "scaffold") nodeElement.type = "button";
          nodeElement.dataset.nodeId = node.id;
          nodeElement.dataset.stage = node.stage;
          nodeElement.dataset.state = node.kind === "scaffold" ? "requested-capacity" : String(node.execution || "unknown").toLowerCase();
          nodeElement.style.left = node.x + "px";
          nodeElement.style.top = nodeTop(node) + "px";

          if (node.kind === "scaffold") {
            nodeElement.setAttribute("aria-hidden", "true");
            if (node.metadata.retired) nodeElement.classList.add("retired");
          } else {
            var accessibleValue = formatMetric(node);
            nodeElement.setAttribute("aria-label", node.label + "; " + node.stage + "; " + accessibleValue + "; execution " + node.execution + "; result basis " + node.resultBasis + "; runtime " + node.runtime + "; uncertainty " + (node.uncertainty || "not supplied"));
            nodeElement.addEventListener("mouseenter", function () { setPreview(node.id); });
            nodeElement.addEventListener("mouseleave", function () { clearPreview(node.id); });
            nodeElement.addEventListener("focus", function () { setPreview(node.id); });
            nodeElement.addEventListener("blur", function () { clearPreview(node.id); });
            nodeElement.addEventListener("click", function () { selectNode(node.id, true); });
          }

          if (node.execution === "FAILED") nodeElement.classList.add("failed");
          if (node.execution === "SKIPPED") nodeElement.classList.add("skipped");
          if (node.metadata.overflow && state.metrics[node.stage] === "rnpv") nodeElement.classList.add("overflow");
          if (node.id === state.selectedId) nodeElement.classList.add("selected");
          else if (selection.has(node.id)) nodeElement.classList.add("lineage");
          if (preview.has(node.id)) nodeElement.classList.add("preview");
          if (state.previewId && !preview.has(node.id) && !selection.has(node.id)) nodeElement.classList.add("dimmed");

          var badges = "";
          if (node.kind !== "scaffold") {
            var executionClass = String(node.execution || "").toLowerCase();
            badges = '<div class="node-badges"><span class="badge ' + executionClass + '">' + escapeHTML(node.execution) + '</span><span class="badge proxy">' + escapeHTML(node.resultBasis) + '</span><span class="badge">' + escapeHTML(node.runtime) + "</span></div>";
          }
          var nodeDetail = node.kind === "scaffold"
            ? (node.metadata.retired ? "Unused requested capacity · no scientific record created." : "Requested capacity · identity has not been created.")
            : node.kind === "pending"
              ? "Candidate identity exists · selected stage output is pending."
              : (node.reason || node.metadata.summary || node.uncertainty || "No additional public summary supplied.");
          nodeElement.innerHTML = '<span class="node-stage-label">' + escapeHTML(node.kind === "scaffold" ? "requested capacity" : node.stage) + '</span><span class="node-label">' + escapeHTML(node.label) + '</span><span class="node-value">' + escapeHTML(formatMetric(node)) + '</span><span class="node-detail">' + escapeHTML(nodeDetail) + "</span>" + badges;
          elements.graphNodes.appendChild(nodeElement);
        });

        renderConnectors();
        renderSemanticOutline();
        if (state.inspectorVisible && state.selectedId) renderInspector(findNode(state.selectedId));
      }

      function renderConnectors() {
        var selection = state.selectedId ? lineageOf(state.selectedId) : new Set();
        var preview = previewSet();
        elements.connectors.innerHTML = "";
        state.nodes.forEach(function (node) {
          if (!node.parentId) return;
          var parent = findNode(node.parentId);
          if (!parent) return;
          var halfNode = GRAPH_GEOMETRY.nodeWidth / 2;
          var startX = parent.x + halfNode;
          var startY = nodeTop(parent) + GRAPH_GEOMETRY.nodeHeight;
          var endX = node.x + halfNode;
          var endY = nodeTop(node);
          var parentIndex = BAND_INDEX[parent.stage];
          var downstream = parent.stage === "hypothesis" || parent.stage === "roi" || parent.stage === "recruitability";
          var pathValue;
          if (downstream && Math.abs(startX - endX) < 0.01) {
            pathValue = "M " + startX + " " + startY + " V " + endY;
          } else {
            var busY = (parentIndex + 1) * GRAPH_GEOMETRY.band - GRAPH_GEOMETRY.busInset;
            pathValue = "M " + startX + " " + startY + " V " + busY + " H " + endX + " V " + endY;
          }
          var path = document.createElementNS(elements.connectors.namespaceURI, "path");
          path.setAttribute("d", pathValue);
          path.setAttribute("class", "connector");
          path.dataset.parentId = parent.id;
          path.dataset.childId = node.id;
          if (selection.has(parent.id) && selection.has(node.id)) path.classList.add("selected");
          if (preview.has(parent.id) && preview.has(node.id)) path.classList.add("preview");
          if (state.previewId && !(preview.has(parent.id) && preview.has(node.id)) && !(selection.has(parent.id) && selection.has(node.id))) path.classList.add("dimmed");
          elements.connectors.appendChild(path);
        });
      }

      function renderSemanticOutline() {
        var root = findNode("indication-root");
        if (!root) return;
        var html = "<ul><li>" + escapeHTML(root.label) + "<ul>";
        state.runData.biomarkers.forEach(function (biomarker) {
          html += "<li>" + escapeHTML(biomarker.label) + "<ul>";
          state.runData.programs.filter(function (program) { return program.biomarkerSlot === biomarker.slot; }).forEach(function (program) {
            html += "<li>" + escapeHTML(program.label) + "<ul><li>ROI record</li><li>Recruitability record</li><li>Atomistic simulation record</li></ul></li>";
          });
          html += "</ul></li>";
        });
        html += "</ul></li></ul>";
        document.getElementById("semantic-outline").innerHTML = html;
      }

      function setPreview(id) {
        state.previewId = id;
        applyInteractionClasses();
      }

      function clearPreview(id) {
        if (state.previewId !== id) return;
        state.previewId = null;
        applyInteractionClasses();
      }

      function applyInteractionClasses() {
        var selection = state.selectedId ? lineageOf(state.selectedId) : new Set();
        var preview = previewSet();
        elements.graphNodes.querySelectorAll(".graph-node").forEach(function (nodeElement) {
          var id = nodeElement.dataset.nodeId;
          nodeElement.classList.toggle("selected", id === state.selectedId);
          nodeElement.classList.toggle("lineage", id !== state.selectedId && selection.has(id));
          nodeElement.classList.toggle("preview", preview.has(id));
          nodeElement.classList.toggle("dimmed", Boolean(state.previewId) && !preview.has(id) && !selection.has(id));
        });
        elements.connectors.querySelectorAll(".connector").forEach(function (path) {
          var parentId = path.dataset.parentId;
          var childId = path.dataset.childId;
          var selectedEdge = selection.has(parentId) && selection.has(childId);
          var previewEdge = preview.has(parentId) && preview.has(childId);
          path.classList.toggle("selected", selectedEdge);
          path.classList.toggle("preview", previewEdge);
          path.classList.toggle("dimmed", Boolean(state.previewId) && !previewEdge && !selectedEdge);
        });
      }

      function selectNode(id, moveFocus) {
        var node = findNode(id);
        if (!node || node.kind === "scaffold") return;
        state.selectedId = id;
        state.inspectorVisible = true;
        state.inspectorCollapsed = false;
        elements.inspector.classList.add("visible");
        elements.inspector.classList.remove("collapsed");
        elements.inspector.setAttribute("aria-hidden", "false");
        elements.graphScreen.classList.add("inspector-open");
        renderGraph();
        if (moveFocus) {
          window.setTimeout(function () { elements.inspectorHeading.focus(); }, 0);
        }
      }

      function evidenceCopy(node) {
        if (node.stage === "biomarker") return "Illustrative supporting findings: 6; contradictory findings: 2; shared literature cap applies across the run.";
        if (node.stage === "hypothesis") return "Illustrative synthesis cites the parent biomarker record and two mock finding IDs. No generator or mapper was called.";
        if (node.stage === "roi") return "Synthetic economics fields mirror AnalysisSummary-style outputs; the basis remains NOT_DECISION_GRADE.";
        if (node.stage === "recruitability") return "Synthetic record mirrors score, simulatedMonthsToEnroll, screensPerEnrollee, sites basis, and counterfactual fields.";
        if (node.stage === "simulation") return "No artifact exists because execution was skipped. Missing atomistic evidence is not evidence against the program.";
        return "User-submitted indication snapshot; no scientific evidence is attached to the root.";
      }

      function renderInspector(node) {
        if (!node) return;
        var definition = metricDefinition(node);
        var warning = node.resultBasis === "NOT WIRED" || node.runtime === "NOT WIRED" || node.resultBasis === "MISSING" || node.resultBasis === "NO RESULT"
          ? '<div class="state-warning">This record has a terminal gap. ' + escapeHTML(node.reason || "A target module is not wired.") + " It must not be read as positive or negative scientific evidence.</div>"
          : '<div class="state-warning">ILLUSTRATIVE MOCK DATA · inspect structure and handoffs, not scientific validity.</div>';
        var value = formatMetric(node);
        var definitionCopy = definition ? definition.label + " · " + definition.unit + " · domain " + definition.domain[0] + "–" + definition.domain[1] + ". " + definition.basis : "Fixed submitted root.";
        var program = findProgramForNode(node);
        var rationale = program ? program.publicWhy : (node.metadata.summary || "This record anchors the available public lineage.");
        var parent = node.parentId ? findNode(node.parentId) : null;
        var childCount = state.nodes.filter(function (candidate) { return candidate.parentId === node.id; }).length;
        var interaction = state.previewId === node.id ? "SELECTED + PREVIEWED" : "SELECTED";
        var payloadSection = "";
        if (node.metadata.stationPayload) {
          payloadSection = '<details class="inspector-section" open><summary>Station output (verbatim)</summary><p class="micro">Key names are the station’s own honesty contract — simulated_* stays simulated_*; nothing is renamed for display, and score is not a probability of approval.</p><pre class="mono" style="overflow:auto;max-height:260px;background:#f0eee5;padding:9px;border-radius:8px;font-size:9px;white-space:pre-wrap;">' + escapeHTML(JSON.stringify(node.metadata.stationPayload, null, 2)) + "</pre></details>";
        }

        elements.inspectorHeading.textContent = node.label;
        elements.inspectorSubtitle.textContent = node.stage + " · " + node.id;
        elements.collapsedIdentity.textContent = node.label + " · " + node.execution;
        elements.inspectorBody.innerHTML =
          warning +
          '<div class="inspector-status-grid">' +
            '<div class="status-card"><span>Execution</span><strong>' + escapeHTML(node.execution || "NONE") + "</strong></div>" +
            '<div class="status-card"><span>Result basis</span><strong>' + escapeHTML(node.resultBasis || "NONE") + "</strong></div>" +
            '<div class="status-card"><span>Runtime maturity</span><strong>' + escapeHTML(node.runtime || "NONE") + "</strong></div>" +
            '<div class="status-card"><span>UI freshness</span><strong>' + escapeHTML(state.freshness.toUpperCase()) + "</strong></div>" +
            '<div class="status-card"><span>Interaction</span><strong>' + interaction + "</strong></div>" +
            '<div class="status-card"><span>Design status</span><strong>PROPOSED TARGET</strong></div>' +
          "</div>" +
          '<div class="primary-result"><span>Active display value</span><strong>' + escapeHTML(value) + '</strong><p>' + escapeHTML(definitionCopy) + " Uncertainty: " + escapeHTML(node.uncertainty || "not supplied") + ".</p></div>" +
          payloadSection +
          '<details class="inspector-section" open><summary>Evidence, counterevidence & public rationale</summary><p><strong>Evidence:</strong> ' + escapeHTML(evidenceCopy(node)) + '</p><p><strong>Counterevidence:</strong> Mock contradictory evidence is retained; it is never collapsed into the support value.</p><p><strong>Public rationale:</strong> ' + escapeHTML(rationale) + "</p><p><strong>Assumption:</strong> Field compatibility is a proposed adapter contract, not verified module interoperability.</p></details>" +
          '<details class="inspector-section"><summary>Falsifier, sensitivity & limitations</summary><p><strong>Would change this:</strong> grounded contradictory findings, a failed recruitment precedent, a decision-grade economics replay, or validated structural evidence.</p><p><strong>Limitations:</strong> deterministic fixture, no live papers, no identity, no authorization, no module invocation.</p><p><strong>Resolution reason:</strong> ' + escapeHTML(node.reason || "No failure or skip reason on this mock record.") + ".</p></details>" +
          '<details class="inspector-section"><summary>Rich artifact · evidence balance</summary><div class="evidence-artifact"><strong>Text alternative:</strong> illustrative evidence balance with more support than counterevidence; availability MOCK ONLY.<div class="evidence-bars"><div class="evidence-row"><span>support</span><div class="evidence-bar"><span style="width:68%"></span></div><strong>6</strong></div><div class="evidence-row"><span>counter</span><div class="evidence-bar"><span style="width:24%"></span></div><strong>2</strong></div><div class="evidence-row"><span>unknown</span><div class="evidence-bar"><span style="width:36%"></span></div><strong>3</strong></div></div><span class="micro">Source: local product fixture · revision artifact-r1 · no external asset.</span></div></details>' +
          '<details class="inspector-section"><summary>Lineage & inherited qualifiers</summary><ul><li>Parent: ' + escapeHTML(parent ? parent.label : "none · root") + "</li><li>Direct descendants: " + childCount + "</li><li>Inherited: ILLUSTRATIVE MOCK DATA; NO MODULES WIRED.</li><li>Selection locks all available ancestors and descendants.</li></ul></details>" +
          '<details class="inspector-section"><summary>Provenance & audit</summary><ul><li>Module/model: ' + escapeHTML(node.runtime || "none") + "</li><li>Configuration: frozen setup snapshot</li><li>Timestamp: " + escapeHTML(state.lastUpdated || "awaiting update") + "</li><li>Hash: " + escapeHTML(program ? program.hash : "mock-root-a1") + "</li><li>Attempts: 1 illustrative</li><li>Cost: $0 · standalone HTML</li><li>Packet revision: " + escapeHTML(program ? program.revision : "not applicable") + "</li><li>Public audit: bound once in accelerated mock demo</li></ul></details>";
      }

      function collapseInspector(returnFocus) {
        if (!state.inspectorVisible) return;
        state.inspectorCollapsed = true;
        elements.inspector.classList.add("collapsed");
        elements.inspector.querySelector(".collapse-inspector").setAttribute("aria-label", "Expand inspector");
        if (returnFocus && state.selectedId) {
          var nodeElement = elements.graphNodes.querySelector('[data-node-id="' + state.selectedId + '"]');
          if (nodeElement) nodeElement.focus();
        }
      }

      function expandInspector() {
        state.inspectorCollapsed = false;
        elements.inspector.classList.remove("collapsed");
        elements.inspector.querySelector(".collapse-inspector").setAttribute("aria-label", "Collapse inspector");
        elements.inspectorHeading.focus();
      }

      function clearSelection() {
        var selectedId = state.selectedId;
        state.selectedId = null;
        state.inspectorVisible = false;
        state.inspectorCollapsed = false;
        elements.inspector.classList.remove("visible", "collapsed");
        elements.inspector.setAttribute("aria-hidden", "true");
        elements.graphScreen.classList.remove("inspector-open");
        renderGraph();
        if (selectedId) {
          var nodeElement = elements.graphNodes.querySelector('[data-node-id="' + selectedId + '"]');
          if (nodeElement) nodeElement.focus();
        }
      }

      function renderProgress() {
        elements.progress.innerHTML = "";
        STAGES.forEach(function (stage, index) {
          var item = document.createElement("div");
          item.className = "progress-step";
          item.dataset.stage = stage.id;
          item.dataset.state = state.stageStates[index];
          item.innerHTML = '<span class="stage-num">0' + (index + 1) + '</span><strong>' + escapeHTML(stage.label) + '</strong><span class="stage-state">' + escapeHTML(state.stageNotes[index]) + "</span>";
          elements.progress.appendChild(item);
        });
      }

      function updateFreshness(label) {
        var source = BOOT.mode === "http" ? "backend poll" : "mock update";
        state.lastUpdated = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        if (state.freshness === "fresh") {
          elements.freshness.dataset.state = "fresh";
          elements.freshness.textContent = "UI freshness: LIVE · last " + source + " " + state.lastUpdated + " · poll interval 5s";
        } else {
          elements.freshness.dataset.state = "stale";
          elements.freshness.textContent = "UI freshness: STALE / RECONNECTING · retained last confirmed data from " + state.lastUpdated;
        }
        if (label) announce(label + ". Last successful " + source + " " + state.lastUpdated + ".");
      }

      // Transport-state display for http mode; never touches execution or result status.
      function setFreshnessFromBackend(freshness) {
        if (freshness.state === "LIVE") {
          state.freshness = "fresh";
          updateFreshness();
          return;
        }
        if (freshness.state === "POLLING") return; // in-flight; keep the last confirmed display
        state.freshness = "stale";
        elements.freshness.dataset.state = "stale";
        elements.freshness.textContent = "UI freshness: " + freshness.state + " after " + freshness.failures + " failed poll" + (freshness.failures === 1 ? "" : "s") + " · retained last confirmed data" + (state.lastUpdated ? " from " + state.lastUpdated : "");
        if (freshness.state === "REFRESH_ERROR") announce("Run updates are failing; last confirmed data is retained and retries continue with backoff.");
      }

      // ---- HTTP mode: wire-snapshot ingestion (contract: ../API-CONTRACT.md) ----

      function translateWire(ws) {
        var biomarkers = (ws.biomarkers || []).map(function (item) {
          return { slot: item.slot, id: "bio-slot-" + item.slot, label: item.label, summary: item.summary || "", metrics: item.metrics || {}, uncertainty: item.uncertainty || "not supplied" };
        });
        var programs = (ws.programs || []).map(function (item, index) {
          return {
            id: item.id || "program-" + (index + 1),
            lane: item.lane,
            biomarkerSlot: item.biomarker_slot,
            hypothesisSlot: item.hypothesis_slot,
            hypothesisNodeId: "hyp-slot-" + item.lane,
            roiNodeId: "roi-slot-" + item.lane,
            recruitNodeId: "recruitability-slot-" + item.lane,
            simulationNodeId: "simulation-slot-" + item.lane,
            label: item.label,
            short: item.short_label || item.label,
            metrics: item.metrics || {},
            uncertainty: item.uncertainty || "not supplied",
            publicWhy: item.public_why || "No public rationale supplied by the backend for this record.",
            roiFailed: Boolean(item.roi_failed),
            recruitFailed: Boolean(item.recruit_failed),
            overflowRnpv: Boolean(item.overflow_rnpv),
            notAmenable: Boolean(item.not_amenable),
            revision: item.revision || "r1",
            hash: item.hash || "unhashed",
            stationPayloads: item.station_payloads || {}
          };
        });
        var requestedLanes = state.snapshot.biomarkers * state.snapshot.hypotheses;
        return {
          biomarkers: biomarkers,
          programs: programs,
          requestedLanes: requestedLanes,
          biomarkerShortfall: Math.max(0, state.snapshot.biomarkers - biomarkers.length),
          hypothesisShortfall: Math.max(0, requestedLanes - programs.length)
        };
      }

      function ingestSnapshot(ws) {
        state.runData = translateWire(ws);
        var stageIds = STAGES.map(function (stage) { return stage.id; });
        (ws.stages || []).forEach(function (stage) {
          var index = stageIds.indexOf(stage.stage_id);
          if (index === -1) return;
          var status = stage.execution_status || "QUEUED";
          state.stageStates[index] =
            status === "RUNNING" ? "running" :
            status === "COMPLETE" ? "complete" :
            status === "COMPLETE_WITH_WARNINGS" ? "warning" :
            status === "FAILED" ? "failed" : "queued";
          state.stageNotes[index] = stage.note || status.toLowerCase();
          if (status === "RUNNING") markStagePending(stage.stage_id);
          if (status === "COMPLETE" || status === "COMPLETE_WITH_WARNINGS" || status === "FAILED") bindStage(stage.stage_id);
        });
        renderProgress();
        renderGraph();
        if (state.selectedId && state.inspectorVisible) renderInspector(findNode(state.selectedId));
        var allTerminal = state.stageStates.every(function (item) { return item === "complete" || item === "warning" || item === "failed"; });
        if (allTerminal) {
          state.highlanderReady = state.runData.programs.length > 0;
          if (!state.selectedProgramId && state.runData.programs.length) state.selectedProgramId = state.runData.programs[0].id;
          if (state.highlanderLaunched) renderHighlander();
        }
        renderReadiness();
      }

      var httpPoller = null;

      function startHttpRun(runId) {
        if (httpPoller) httpPoller.stop();
        state.stageStates = ["queued", "queued", "queued", "queued", "queued"];
        state.stageNotes = ["awaiting backend", "awaiting backend", "awaiting backend", "awaiting backend", "awaiting backend"];
        buildScaffold();
        renderProgress();
        renderGraph();
        renderReadiness();
        updateFreshness("Run created on backend; polling snapshots");
        httpPoller = BOOT.http.startPolling(runId, {
          onSnapshot: function (ws) {
            state.freshness = "fresh";
            updateFreshness();
            ingestSnapshot(ws);
          },
          onFreshness: setFreshnessFromBackend
        });
      }

      function startStage(index) {
        if (index >= STAGES.length) {
          finishPipeline();
          return;
        }
        var stage = STAGES[index];
        state.stageStates[index] = "running";
        var branchCount = stage.id === "biomarker" ? state.runData.biomarkers.length : state.runData.programs.length;
        state.stageNotes[index] = "0 complete · " + branchCount + " running";
        markStagePending(stage.id);
        renderProgress();
        renderGraph();
        updateFreshness(stage.label + " stage running with branches concurrently");

        setTimer(function () {
          bindStage(stage.id);
          var warning = false;
          var note = branchCount + " complete";
          if (stage.id === "biomarker" && state.runData.biomarkerShortfall > 0) {
            warning = true;
            note += " · " + state.runData.biomarkerShortfall + " shortfall";
          }
          if (stage.id === "hypothesis" && state.runData.hypothesisShortfall > 0) {
            warning = true;
            note += " · " + state.runData.hypothesisShortfall + " capacity unused";
          }
          if (stage.id === "roi") {
            var roiFailures = state.runData.programs.filter(function (program) { return program.roiFailed; }).length;
            if (roiFailures) {
              warning = true;
              note = (branchCount - roiFailures) + " complete · " + roiFailures + " failed";
            }
          }
          if (stage.id === "recruitability") {
            var recruitFailures = state.runData.programs.filter(function (program) { return program.recruitFailed; }).length;
            if (recruitFailures) {
              warning = true;
              note = (branchCount - recruitFailures) + " complete · " + recruitFailures + " failed";
            }
          }
          if (stage.id === "simulation") {
            warning = true;
            note = branchCount + " terminal gaps · skipped";
          }
          state.stageStates[index] = warning ? "warning" : "complete";
          state.stageNotes[index] = note;
          renderProgress();
          renderGraph();
          updateFreshness(stage.label + " stage terminal");
          if (stage.id === "hypothesis" && state.runData.hypothesisShortfall > 0) {
            showToast(state.runData.programs.length + " hypotheses returned; " + state.runData.hypothesisShortfall + " requested lanes remain unused without shifting bound lanes.");
          }
          setTimer(function () { startStage(index + 1); }, 230);
        }, 620);
      }

      function finishPipeline() {
        state.highlanderReady = state.runData.programs.length > 0;
        renderReadiness();
        announce("All eligible mock records are terminal. Highlander is ready with acknowledged gaps required.");
      }

      function renderReadiness() {
        var nonterminal = state.stageStates.filter(function (stage) { return stage === "queued" || stage === "running"; }).length;
        var programCount = state.runData ? state.runData.programs.length : 0;
        if (!programCount) {
          elements.readinessState.textContent = "BLOCKED · no candidates";
          elements.packetCounts.innerHTML = '<span class="packet-count">0 complete</span><span class="packet-count">0 partial</span><span class="packet-count">0 blocked</span><span class="packet-count">no candidates</span>';
          elements.gapConfirm.classList.remove("visible");
          elements.launchHighlander.disabled = true;
          elements.launchHighlander.textContent = "Launch Highlander · no candidates";
          return;
        }
        if (nonterminal > 0) {
          elements.readinessState.textContent = "BLOCKED · " + nonterminal + " nonterminal stage" + (nonterminal === 1 ? "" : "s");
          elements.packetCounts.innerHTML = '<span class="packet-count">0 complete</span><span class="packet-count">0 partial</span><span class="packet-count">' + programCount + ' running</span><span class="packet-count">' + nonterminal + " nonterminal stages</span>";
          elements.gapConfirm.classList.remove("visible");
          elements.launchHighlander.disabled = true;
          elements.launchHighlander.textContent = "Launch Highlander · blocked";
          return;
        }
        elements.readinessState.textContent = "READY WITH TERMINAL GAPS · no nonterminal records";
        elements.packetCounts.innerHTML = '<span class="packet-count">0 complete</span><span class="packet-count">' + programCount + ' partial</span><span class="packet-count">0 blocked</span><span class="packet-count">0 nonterminal</span>';
        elements.gapConfirm.classList.add("visible");
        elements.launchHighlander.disabled = !elements.gapConfirmInput.checked;
        elements.launchHighlander.textContent = elements.gapConfirmInput.checked ? "Launch Highlander →" : "Acknowledge gaps to launch";
      }

      function resetDemo() {
        if (!state.snapshot) return;
        if (BOOT.mode === "http") {
          if (httpPoller) httpPoller.refreshNow();
          announce("Manual snapshot refresh requested from the backend.");
          return;
        }
        clearTimers();
        state.stageStates = ["queued", "queued", "queued", "queued", "queued"];
        state.stageNotes = ["queued", "queued", "queued", "queued", "queued"];
        state.selectedId = null;
        state.previewId = null;
        state.inspectorVisible = false;
        state.highlanderReady = false;
        state.highlanderLaunched = false;
        elements.gapConfirmInput.checked = false;
        document.querySelector('[data-nav="highlander"]').disabled = true;
        document.querySelector('[data-nav="highlander"]').classList.add("locked");
        elements.inspector.classList.remove("visible", "collapsed");
        elements.graphScreen.classList.remove("inspector-open");
        buildScaffold();
        renderProgress();
        renderGraph();
        renderReadiness();
        updateFreshness("Illustrative arrivals restarted");
        setTimer(function () { startStage(0); }, 400);
      }

      function switchScreen(screen) {
        if (screen === "graph" && !state.runId) return;
        if (screen === "highlander" && !state.highlanderLaunched) return;
        state.screen = screen;
        document.querySelectorAll("[data-screen]").forEach(function (section) {
          section.classList.toggle("active", section.dataset.screen === screen);
        });
        document.querySelectorAll("[data-nav]").forEach(function (button) {
          if (button.dataset.nav === screen) button.setAttribute("aria-current", "page");
          else button.removeAttribute("aria-current");
        });
        if (screen === "graph") {
          renderGraph();
          renderReadiness();
        }
        if (screen === "highlander") renderHighlander();
        window.scrollTo(0, 0);
      }

      function enterRun(runId, validation) {
        state.runId = runId;
        state.snapshot = Object.freeze({
          indication: validation.indication,
          biomarkers: validation.biomarkers,
          papers: validation.papers,
          hypotheses: validation.hypotheses,
          biomarkerRange: [Number(document.getElementById("biomarker-low").value), Number(document.getElementById("biomarker-high").value)],
          hypothesisRange: [Number(document.getElementById("hypothesis-low").value), Number(document.getElementById("hypothesis-high").value)]
        });
        state.packetSnapshot = "PKT-" + String(runId).slice(-6) + "-R1";
        state.submitting = false;
        elements.snapshotNote.classList.add("visible");
        elements.snapshotNote.textContent = "Snapshot " + state.runId + " is frozen. Editing the form now would define a different run.";
        elements.runButton.textContent = "Create another run →";
        document.getElementById("graph-indication").textContent = state.snapshot.indication;
        document.getElementById("graph-run-id").textContent = state.runId;
        document.getElementById("graph-snapshot").textContent = "up to " + state.snapshot.biomarkers + " × " + state.snapshot.hypotheses + "; up to " + state.snapshot.papers + " papers";
        document.getElementById("highlander-run-id").textContent = state.runId;
        document.getElementById("packet-snapshot").textContent = state.packetSnapshot;
        document.getElementById("chat-scope").textContent = "Read-only evidence scope · " + state.runId + " · one Highlander job only";
        var graphNav = document.querySelector('[data-nav="graph"]');
        graphNav.disabled = false;
        graphNav.classList.remove("locked");
        switchScreen("graph");
        announce("Run " + state.runId + " created. Program Graph opened with requested capacity scaffolding.");
        validateSetup();
      }

      function submitFailed(message) {
        state.submitting = false;
        elements.snapshotNote.classList.add("visible");
        elements.snapshotNote.textContent = message + " Every valid input has been preserved; activate Run to retry.";
        elements.runButton.textContent = "Retry run creation →";
        validateSetup();
        announce("Run creation failed. Inputs preserved; retry available.");
      }

      function submitRun(event) {
        event.preventDefault();
        var validation = validateSetup();
        if (!validation.valid || state.submitting) return;
        state.submitting = true;
        elements.runButton.textContent = "Creating immutable snapshot…";
        validateSetup();

        if (BOOT.mode === "http") {
          var setupWire = {
            clinical_indication: { submitted_text: validation.indication },
            biomarker_exploration_range: {
              lower: Number(document.getElementById("biomarker-low").value),
              upper: Number(document.getElementById("biomarker-high").value)
            },
            maximum_biomarkers: validation.biomarkers,
            maximum_literature_papers: validation.papers,
            hypothesis_boldness_range: {
              lower: Number(document.getElementById("hypothesis-low").value),
              upper: Number(document.getElementById("hypothesis-high").value)
            },
            maximum_hypotheses_per_biomarker: validation.hypotheses
          };
          BOOT.http.createRun(setupWire).then(function (created) {
            if (!created || !created.run || !created.run.run_id) {
              submitFailed("Backend responded without a run_id.");
              return;
            }
            state.runData = { biomarkers: [], programs: [], requestedLanes: validation.biomarkers * validation.hypotheses, biomarkerShortfall: 0, hypothesisShortfall: 0 };
            state.selectedProgramId = null;
            enterRun(created.run.run_id, validation);
            startHttpRun(created.run.run_id);
          }).catch(function (error) {
            submitFailed("Run creation failed against " + BOOT.base + " (" + String(error && error.message) + ").");
          });
          return;
        }

        setTimer(function () {
          if (/simulate failure/i.test(validation.indication)) {
            submitFailed("Simulated submission error.");
            return;
          }
          var runId = "LR-MOCK-" + Date.now().toString(36).toUpperCase().slice(-6);
          state.runData = { biomarkers: [], programs: [], requestedLanes: validation.biomarkers * validation.hypotheses, biomarkerShortfall: 0, hypothesisShortfall: 0 };
          enterRun(runId, validation);
          state.runData = buildRunData(state.snapshot);
          state.selectedProgramId = state.runData.programs.length ? state.runData.programs[0].id : null;
          resetDemo();
        }, 320);
      }

      function dominates(a, b) {
        var keys = ["rnpv", "recruit", "plausibility"];
        if (keys.some(function (key) { return a.metrics[key] === null || b.metrics[key] === null; })) return false;
        var noWorse = keys.every(function (key) { return a.metrics[key] >= b.metrics[key]; });
        var better = keys.some(function (key) { return a.metrics[key] > b.metrics[key]; });
        return noWorse && better;
      }

      function programStatus(program) {
        if (program.metrics.rnpv === null || program.metrics.recruit === null || program.metrics.plausibility === null) return "incomparable";
        var dominated = state.runData.programs.some(function (other) {
          return other.id !== program.id && dominates(other, program);
        });
        return dominated ? "dominated" : "non-dominated";
      }

      function scenarioSort(programs) {
        var copy = programs.slice();
        copy.sort(function (a, b) {
          var statusOrder = { "non-dominated": 0, incomparable: 1, dominated: 2 };
          var statusDifference = statusOrder[programStatus(a)] - statusOrder[programStatus(b)];
          if (statusDifference) return statusDifference;
          if (state.scenario === "speed") return (b.metrics.recruit || -1) - (a.metrics.recruit || -1);
          if (state.scenario === "capital") return (b.metrics.positive || -1) - (a.metrics.positive || -1);
          return (b.metrics.plausibility || -1) - (a.metrics.plausibility || -1);
        });
        return copy;
      }

      function metricCell(value, prefix, suffix) {
        if (value === null || typeof value !== "number") return '<span class="badge failed">MISSING</span>';
        return (prefix || "") + value + (suffix || "");
      }

      function renderScenario() {
        var scenario = SCENARIOS[state.scenario];
        elements.scenarioMeta.innerHTML = '<strong>' + escapeHTML(scenario.name + " " + scenario.version) + '</strong><br>' + escapeHTML(scenario.description) + '<br><span class="muted">Author/source: ' + escapeHTML(scenario.author) + " · " + escapeHTML(scenario.timestamp) + "</span>";
        elements.weightList.innerHTML = "";
        scenario.weights.forEach(function (weight) {
          var row = document.createElement("div");
          row.className = "weight-row";
          row.innerHTML = '<span>' + escapeHTML(weight[0]) + " · " + weight[1] + '%</span><span class="weight-track"><span style="width:' + weight[1] + '%"></span></span>';
          elements.weightList.appendChild(row);
        });
      }

      function visiblePrograms() {
        var showDominated = document.getElementById("show-dominated").checked;
        var showIncomparable = document.getElementById("show-incomparable").checked;
        return scenarioSort(state.runData.programs).filter(function (program) {
          var status = programStatus(program);
          if (status === "dominated" && !showDominated) return false;
          if (status === "incomparable" && !showIncomparable) return false;
          return true;
        });
      }

      function selectProgram(id) {
        state.selectedProgramId = id;
        renderHighlander();
      }

      function renderProgramList() {
        elements.programList.innerHTML = "";
        visiblePrograms().forEach(function (program) {
          var button = document.createElement("button");
          button.type = "button";
          button.className = "program-item" + (program.id === state.selectedProgramId ? " selected" : "");
          var status = programStatus(program);
          button.dataset.programId = program.id;
          button.innerHTML = "<strong>" + escapeHTML(program.short) + "</strong><span>" + escapeHTML(status) + " · packet r1 · selection is not a winner</span>";
          button.addEventListener("click", function () { selectProgram(program.id); });
          elements.programList.appendChild(button);
        });
      }

      function renderComparison() {
        elements.comparisonBody.innerHTML = "";
        visiblePrograms().forEach(function (program) {
          var row = document.createElement("tr");
          var status = programStatus(program);
          row.dataset.status = status;
          row.innerHTML =
            '<td><button class="table-program" type="button">' + escapeHTML(program.short) + '</button><br><span class="micro muted">' + escapeHTML(program.uncertainty) + "</span></td>" +
            "<td>" + metricCell(program.metrics.rnpv, "$", "M") + (program.overflowRnpv ? '<br><span class="badge failed">above display domain</span>' : "") + "</td>" +
            "<td>" + metricCell(program.metrics.positive, "", "%") + "</td>" +
            "<td>" + metricCell(program.metrics.recruit, "", "/100") + "</td>" +
            "<td>" + metricCell(program.metrics.duration, "", " mo") + "</td>" +
            "<td>" + metricCell(program.metrics.plausibility, "", "/100") + "</td>" +
            '<td><span class="badge skipped">NOT WIRED</span></td>' +
            "<td><strong>" + escapeHTML(status) + "</strong></td>";
          row.querySelector(".table-program").addEventListener("click", function () { selectProgram(program.id); });
          elements.comparisonBody.appendChild(row);
        });
      }

      function renderParetoPlot() {
        var svg = elements.paretoPlot;
        svg.innerHTML = '<line x1="46" y1="126" x2="616" y2="126" stroke="#7f857e"/><line x1="46" y1="12" x2="46" y2="126" stroke="#7f857e"/><text x="330" y="149" text-anchor="middle" font-size="9" fill="#56615a">P50 rNPV · $M modeled →</text><text x="12" y="75" transform="rotate(-90 12 75)" text-anchor="middle" font-size="9" fill="#56615a">Recruitability /100 →</text><text x="48" y="10" font-size="7" fill="#7a817b">high</text><text x="48" y="138" font-size="7" fill="#7a817b">missing shelf</text>';
        state.runData.programs.forEach(function (program) {
          var status = programStatus(program);
          var x = program.metrics.rnpv === null ? 58 : 46 + Math.max(0, Math.min(300, program.metrics.rnpv)) / 300 * 570;
          var y = program.metrics.recruit === null ? 133 : 126 - program.metrics.recruit / 100 * 108;
          var circle = document.createElementNS(svg.namespaceURI, "circle");
          circle.setAttribute("cx", String(x));
          circle.setAttribute("cy", String(y));
          circle.setAttribute("r", program.id === state.selectedProgramId ? "7" : "5");
          circle.setAttribute("class", "plot-point " + status + (program.id === state.selectedProgramId ? " selected" : ""));
          circle.setAttribute("tabindex", "0");
          circle.setAttribute("role", "button");
          circle.setAttribute("aria-label", program.short + "; " + status + "; select program");
          var title = document.createElementNS(svg.namespaceURI, "title");
          title.textContent = program.short + " · " + status;
          circle.appendChild(title);
          circle.addEventListener("click", function () { selectProgram(program.id); });
          circle.addEventListener("keydown", function (event) {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              selectProgram(program.id);
            }
          });
          svg.appendChild(circle);
        });
      }

      function selectedProgram() {
        return state.runData.programs.find(function (program) { return program.id === state.selectedProgramId; }) || state.runData.programs[0] || null;
      }

      function renderProgramDetail() {
        var program = selectedProgram();
        if (!program) {
          elements.programDetail.innerHTML = '<div class="state-warning">No candidates exist, so no program can be selected.</div>';
          return;
        }
        var status = programStatus(program);
        var whyStatus = status === "non-dominated"
          ? "No other complete record is at least as strong on P50 rNPV, recruitability, and plausibility while being strictly stronger on one."
          : status === "dominated"
            ? "At least one complete record is no worse on all three baseline axes and stronger on at least one."
            : "A required objective is missing, so dominance is not inferred.";
        var tradeoffs = state.runData.programs.filter(function (candidate) { return candidate.id !== program.id && programStatus(candidate) === "non-dominated"; }).slice(0, 2).map(function (candidate) { return candidate.short; }).join("; ");
        elements.programDetail.innerHTML =
          '<div class="detail-callout"><strong>' + escapeHTML(program.short) + " · " + escapeHTML(status) + '</strong><p>' + escapeHTML(program.publicWhy) + "</p></div>" +
          '<div class="objective-vector"><div class="objective"><span>P50 rNPV</span><strong>' + metricCell(program.metrics.rnpv, "$", "M") + '</strong></div><div class="objective"><span>Recruitability</span><strong>' + metricCell(program.metrics.recruit, "", "/100") + '</strong></div><div class="objective"><span>Plausibility</span><strong>' + metricCell(program.metrics.plausibility, "", "/100") + "</strong></div></div>" +
          '<div class="detail-sections"><details open><summary>Why this Pareto status?</summary><p>' + escapeHTML(whyStatus) + "</p><p><strong>Selected viewing profile:</strong> " + escapeHTML(SCENARIOS[state.scenario].name) + " changes presentation order only. Baseline unweighted status remains <strong>" + escapeHTML(status) + "</strong>.</p><p><strong>Closest tradeoffs:</strong> " + escapeHTML(tradeoffs || "none with complete common axes") + ".</p></details>" +
          "<details><summary>Packet, uncertainty & qualifiers</summary><ul><li>Source branch: " + escapeHTML(program.short) + "</li><li>Packet revision/hash: " + escapeHTML(program.revision + " · " + program.hash) + "</li><li>Uncertainty: " + escapeHTML(program.uncertainty) + "</li><li>Simulation: SKIPPED · MODULE_NOT_WIRED or NOT_AMENABLE · NOT WIRED</li><li>Economics basis: synthetic modeled · NOT_DECISION_GRADE</li></ul></details>" +
          "<details><summary>Evidence, counterevidence & gaps</summary><p><strong>Support:</strong> illustrative evidence and branch-linked proxy outputs.</p><p><strong>Counterevidence:</strong> retained contradictory findings and modeled downside.</p><p><strong>Gaps:</strong> atomistic records not wired; live citations absent; module interop unverified.</p><p><strong>Failure history:</strong> " + escapeHTML(program.roiFailed || program.recruitFailed ? "one or more mock downstream records failed; sibling branches continued." : "no branch failure beyond the terminal simulation gap.") + "</p></details>" +
          "<details><summary>What would change the conclusion?</summary><p>A grounded contradictory finding, validated atomistic evidence, decision-grade economic inputs, a materially different enrollment precedent, or a confirmed hard constraint could create a new decision-set version. Viewing weights alone cannot.</p></details></div>";
        document.getElementById("open-source-node").dataset.nodeId = program.hypothesisNodeId;
      }

      function renderHighlander() {
        if (!state.runData) return;
        renderScenario();
        renderProgramList();
        renderComparison();
        renderParetoPlot();
        renderProgramDetail();
        var frontier = state.runData.programs.filter(function (program) { return programStatus(program) === "non-dominated"; }).length;
        var gaps = state.runData.programs.length;
        document.getElementById("frontier-total").textContent = String(frontier);
        document.getElementById("gap-total").textContent = String(gaps);
      }

      function appendChatMessage(role, content, options) {
        var message = document.createElement("div");
        message.className = "chat-message " + role + (options && options.abstain ? " abstain" : "");
        if (role === "user") {
          message.textContent = content;
        } else {
          var text = document.createElement("div");
          if (options && options.labels) {
            options.labels.forEach(function (label) {
              var span = document.createElement("span");
              span.className = "answer-label";
              span.textContent = label;
              text.appendChild(span);
            });
            text.appendChild(document.createElement("br"));
          }
          text.appendChild(document.createTextNode(content));
          message.appendChild(text);
          if (options && options.citations) {
            var citations = document.createElement("div");
            citations.style.marginTop = "7px";
            options.citations.forEach(function (citation) {
              var button = document.createElement("button");
              button.type = "button";
              button.className = "citation-button";
              button.textContent = citation.label;
              button.dataset.citeNode = citation.nodeId;
              button.addEventListener("click", function () { openGraphRecord(citation.nodeId); });
              citations.appendChild(button);
              citations.appendChild(document.createTextNode(" "));
            });
            message.appendChild(citations);
          }
        }
        elements.chatLog.appendChild(message);
        elements.chatLog.scrollTop = elements.chatLog.scrollHeight;
      }

      function answerChat(question) {
        var normalized = question.toLowerCase();
        var program = selectedProgram();
        appendChatMessage("user", question);
        if (BOOT.mode === "http") {
          BOOT.http.askChat(state.runId, question).then(function (response) {
            appendChatMessage("assistant", response.answer || "The backend returned no answer text.", {
              abstain: Boolean(response.abstention),
              labels: response.labels || (response.abstention ? ["abstention"] : ["source output"]),
              citations: (response.citations || []).map(function (citation) {
                return { label: citation.label || citation.record_id, nodeId: citation.node_id || citation.record_id };
              })
            });
          });
          return;
        }
        if (!program) {
          appendChatMessage("assistant", "Evidence-gap abstention: this run has no candidate packet to ground an answer.", { abstain: true, labels: ["abstention", "evidence gap"] });
          return;
        }
        if (/latest|external|web|guideline|news|outside|other run/.test(normalized)) {
          appendChatMessage("assistant", "Scope abstention: external information is outside this immutable run snapshot. The mock chat cannot browse or import evidence.", { abstain: true, labels: ["abstention", "outside run"] });
          return;
        }
        if (/why|non-dominated|tradeoff|evidence|gap|change|risk|compare/.test(normalized)) {
          var status = programStatus(program);
          var content = program.short + " is " + status + " on the baseline common axes. " + program.publicWhy + " The synthesis is uncertain because atomistic evidence is NOT WIRED and all displayed outputs are illustrative.";
          appendChatMessage("assistant", content, {
            labels: ["source output", "inference / synthesis", "uncertainty"],
            citations: [
              { label: "Hypothesis record", nodeId: program.hypothesisNodeId },
              { label: "ROI record", nodeId: program.roiNodeId },
              { label: "Recruitability record", nodeId: program.recruitNodeId }
            ]
          });
          return;
        }
        appendChatMessage("assistant", "Evidence-gap abstention: the packet snapshot does not support that claim. Ask about visible tradeoffs, evidence gaps, or what could change the Pareto status.", { abstain: true, labels: ["abstention", "evidence gap"] });
      }

      function openGraphRecord(nodeId) {
        switchScreen("graph");
        window.setTimeout(function () {
          var node = findNode(nodeId);
          if (node) selectNode(nodeId, true);
        }, 0);
      }

      function openActionDialog(action) {
        var program = selectedProgram();
        if (!program) return;
        state.pendingAction = action;
        elements.actionTitle.textContent = action;
        elements.actionDescription.textContent = action + " for " + program.short + ". This creates a mock audit event only and does not change source scientific records.";
        elements.actionRationale.value = "";
        elements.actionError.textContent = "";
        elements.actionDialog.showModal();
        elements.actionRationale.focus();
      }

      function recordAction(event) {
        event.preventDefault();
        var rationale = elements.actionRationale.value.trim();
        if (!rationale) {
          elements.actionError.textContent = "A rationale is required; no event has been recorded.";
          return;
        }
        var program = selectedProgram();
        var before = "decision-set-v" + state.decisionSetVersion;
        if (state.pendingAction === "Add hard constraint") state.decisionSetVersion += 1;
        var after = "decision-set-v" + state.decisionSetVersion;
        state.auditEvents.unshift({
          action: state.pendingAction,
          program: program.short,
          rationale: rationale,
          timestamp: new Date().toLocaleTimeString(),
          actor: "UNVERIFIED MOCK ACTOR",
          before: before,
          after: after
        });
        elements.actionDialog.close();
        renderAuditLog();
        showToast(state.pendingAction + " recorded as a prototype audit event; scientific records unchanged.");
      }

      function renderAuditLog() {
        elements.auditLog.innerHTML = "";
        state.auditEvents.forEach(function (event) {
          var item = document.createElement("li");
          item.innerHTML = "<strong>" + escapeHTML(event.action) + " · " + escapeHTML(event.program) + "</strong><br>actor " + escapeHTML(event.actor) + " · " + escapeHTML(event.timestamp) + "<br>rationale: " + escapeHTML(event.rationale) + "<br>source " + escapeHTML(event.before) + " → " + escapeHTML(event.after);
          elements.auditLog.appendChild(item);
        });
        if (!state.auditEvents.length) elements.auditLog.innerHTML = "<li>No review events yet. Source scientific records remain unchanged.</li>";
      }

      function launchHighlander() {
        if (!state.highlanderReady || !elements.gapConfirmInput.checked) return;
        if (!state.highlanderLaunched) {
          state.highlanderLaunched = true;
          var nav = document.querySelector('[data-nav="highlander"]');
          nav.disabled = false;
          nav.classList.remove("locked");
          showToast("One idempotent mock Highlander job created from " + state.packetSnapshot + ".");
        }
        switchScreen("highlander");
      }

      function bindEvents() {
        elements.form.addEventListener("submit", submitRun);
        [elements.indication, elements.maxBiomarkers, elements.maxPapers, elements.maxHypotheses].forEach(function (input) {
          input.addEventListener("input", validateSetup);
          input.addEventListener("blur", validateSetup);
        });

        document.querySelectorAll("[data-step-target]").forEach(function (button) {
          button.addEventListener("click", function () {
            var input = document.getElementById(button.dataset.stepTarget);
            var current = Number(input.value);
            if (!Number.isInteger(current) || current < Number(input.min) || current > Number(input.max)) {
              validateSetup();
              return;
            }
            var next = current + Number(button.dataset.step);
            next = Math.max(Number(input.min), Math.min(Number(input.max), next));
            input.value = String(next);
            validateSetup();
          });
        });

        ["biomarker", "hypothesis"].forEach(function (name) {
          ["low", "high"].forEach(function (handle) {
            var rangeInput = document.getElementById(name + "-" + handle);
            rangeInput.addEventListener("input", function () {
              updateDualRange(name, handle);
            });
            rangeInput.addEventListener("keydown", function (event) {
              var handled = ["ArrowLeft", "ArrowDown", "ArrowRight", "ArrowUp", "PageDown", "PageUp", "Home", "End"];
              if (!handled.includes(event.key)) return;
              event.preventDefault();
              var value = Number(rangeInput.value);
              if (event.key === "Home") value = Number(rangeInput.min);
              else if (event.key === "End") value = Number(rangeInput.max);
              else if (event.key === "ArrowLeft" || event.key === "ArrowDown" || event.key === "PageDown") value -= Number(rangeInput.step);
              else value += Number(rangeInput.step);
              value = Math.max(Number(rangeInput.min), Math.min(Number(rangeInput.max), value));
              rangeInput.value = String(value);
              updateDualRange(name, handle);
            });
          });
        });

        document.querySelectorAll("[data-nav]").forEach(function (button) {
          button.addEventListener("click", function () { switchScreen(button.dataset.nav); });
        });

        document.querySelectorAll("[data-metric-stage]").forEach(function (select) {
          select.addEventListener("change", function () {
            var priorX = new Map(state.nodes.map(function (node) { return [node.id, node.x]; }));
            state.metrics[select.dataset.metricStage] = select.value;
            renderGraph();
            var xStable = state.nodes.every(function (node) { return priorX.get(node.id) === node.x; });
            announce(METRICS[select.dataset.metricStage][select.value].label + " selected. Presentation changed; stored records and x lanes " + (xStable ? "remain unchanged." : "changed unexpectedly."));
          });
        });

        document.getElementById("restart-demo").addEventListener("click", resetDemo);
        document.getElementById("module-map-button").addEventListener("click", function () { document.getElementById("module-dialog").showModal(); });
        elements.freshnessButton.addEventListener("click", function () {
          if (state.freshness === "fresh") {
            state.freshness = "stale";
            elements.freshnessButton.textContent = "Retry mock connection";
            updateFreshness("UI is stale; last confirmed graph retained");
            renderGraph();
          } else {
            elements.freshnessButton.disabled = true;
            elements.freshnessButton.textContent = "Reconnecting…";
            setTimer(function () {
              state.freshness = "fresh";
              elements.freshnessButton.disabled = false;
              elements.freshnessButton.textContent = "Simulate stale UI";
              updateFreshness("Mock UI reconnected");
              renderGraph();
            }, 650);
          }
        });

        elements.gapConfirmInput.addEventListener("change", renderReadiness);
        elements.launchHighlander.addEventListener("click", launchHighlander);

        elements.inspector.querySelector(".collapse-inspector").addEventListener("click", function () {
          if (state.inspectorCollapsed) expandInspector();
          else collapseInspector(true);
        });
        elements.inspector.querySelector(".close-inspector").addEventListener("click", clearSelection);
        document.addEventListener("keydown", function (event) {
          if (event.key === "Escape" && state.screen === "graph" && state.inspectorVisible && !elements.actionDialog.open) {
            event.preventDefault();
            collapseInspector(true);
          }
        });

        document.getElementById("scenario-profile").addEventListener("change", function (event) {
          state.scenario = event.target.value;
          renderHighlander();
          announce("Viewing profile changed to " + SCENARIOS[state.scenario].name + ". Raw objectives and baseline Pareto membership are unchanged.");
        });
        document.getElementById("show-dominated").addEventListener("change", renderHighlander);
        document.getElementById("show-incomparable").addEventListener("change", renderHighlander);
        document.getElementById("open-source-node").addEventListener("click", function (event) { openGraphRecord(event.currentTarget.dataset.nodeId); });

        document.querySelectorAll(".starter").forEach(function (button) {
          button.addEventListener("click", function () { answerChat(button.dataset.question); });
        });
        document.getElementById("chat-form").addEventListener("submit", function (event) {
          event.preventDefault();
          var input = document.getElementById("chat-input");
          var question = input.value.trim();
          if (!question) return;
          input.value = "";
          answerChat(question);
        });

        document.querySelectorAll(".review-action").forEach(function (button) {
          button.addEventListener("click", function () { openActionDialog(button.dataset.action); });
        });
        document.getElementById("action-form").addEventListener("submit", recordAction);

        document.querySelectorAll("[data-close-dialog]").forEach(function (button) {
          button.addEventListener("click", function () {
            var dialog = document.getElementById(button.dataset.closeDialog);
            if (dialog.open) dialog.close();
          });
        });
      }

      function applyBootMode() {
        var indicator = document.getElementById("backend-indicator");
        indicator.textContent = BOOT.mode === "http" ? "backend: http · " + BOOT.base : "backend: mock (in-page demo)";
        if (BOOT.mode !== "http") return;

        // Real-backend mode: repurpose the dev controls and let the backend
        // declare its own truth labels via GET /api/meta.
        document.getElementById("restart-demo").textContent = "Refresh snapshot now";
        elements.freshnessButton.style.display = "none"; // freshness is real in http mode
        BOOT.http.fetchMeta().then(function (meta) {
          if (!meta || !Array.isArray(meta.truth_labels) || !meta.truth_labels.length) return;
          var strip = document.querySelector("[data-truth-strip]");
          strip.innerHTML = "";
          meta.truth_labels.forEach(function (label) {
            var chip = document.createElement("span");
            chip.className = "truth-chip";
            chip.textContent = label;
            strip.appendChild(chip);
          });
        });
      }

      function initialize() {
        updateDualRange("biomarker", "low");
        updateDualRange("hypothesis", "low");
        bindEvents();
        applyBootMode();
        validateSetup();
        renderProgress();
        renderAuditLog();
      }

      initialize();
    }());
