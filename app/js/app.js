    import { createHttpBackend } from "./backend-http.js";
    import {
      interpretabilityView,
      isScientificSnapshot,
      normalizeStageTruth,
      resolveBackendBase,
      scientificCandidateId,
      scientificComparisonStatus,
      scientificHighlanderCandidate,
      scientificModuleId,
      scientificNodeForStage,
      scientificStageId,
      stationPayloadFor
    } from "./snapshot-contract.js";

    // Backend selection: http (default — the served link is the production-shaped
    // build; real run API per ../API-CONTRACT.md, same-origin by default or
    // ?base=…) or ?backend=mock (in-page deterministic demo, zero network).
    var BOOT = (function () {
      var params = new URLSearchParams(window.location.search);
      var mode = params.get("backend") === "mock" ? "mock" : "http";
      var base = resolveBackendBase(window.location.search, window.location.origin);
      var launchMode = params.get("mode") === "scientific" ? "scientific" : "legacy";
      var runId = params.get("run");
      return {
        mode: mode,
        base: base,
        launchMode: launchMode,
        runId: runId && runId.trim() ? runId.trim() : null,
        http: mode === "http" ? createHttpBackend(base) : null
      };
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
          recruit: { label: "Recruitability", unit: "/100 representative", domain: [0, 100], basis: "Representative planning field; native station output remains attached separately." },
          duration: { label: "Enrollment duration", unit: "months representative", domain: [12, 40], basis: "Representative planning estimate; native station output remains attached separately." },
          screens: { label: "Screens per enrollee", unit: "ratio representative", domain: [1, 8], basis: "Representative planning estimate; native station output remains attached separately." },
          risk: { label: "Recruitability risk", unit: "/100 representative", domain: [0, 100], basis: "Representative planning transformation; higher appears lower on this low-to-high axis." }
        },
        simulation: {
          support: { label: "Atomistic support", unit: "/100", domain: [0, 100], basis: "No values available: target module is not wired." },
          occupancy: { label: "Pose occupancy", unit: "%", domain: [0, 100], basis: "No values available: target module is not wired." },
          convergence: { label: "Convergence", unit: "%", domain: [0, 100], basis: "No values available: target module is not wired." },
          tractability_fit: { label: "Branch tractability fit", unit: "/100 representative", domain: [0, 100], basis: "Representative branch-context fit; not an atomistic metric or native module output." }
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
          { label: "Trained-immunity brake", short: "NLRP3 · trained immunity", boldness: 8, evidence: 62, plausibility: 66, rnpv: 280, positive: 49, impact: 91, recruit: 52, duration: 31, screens: 5.4, risk: 68, overflowRnpv: true, notAmenable: true, uncertainty: "rNPV P10–P90: $44M–$426M", publicWhy: "The raw $280M modeled value exceeds the display domain and trades against slower enrollment." }
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
        highlanderLaunching: false,
        highlanderResult: null,
        highlanderResultHash: null,
        scientificSnapshot: false,
        representativeDemo: false,
        scientificPacketExcludesRepresentativeValues: false,
        presentationMode: null,
        executionMode: null,
        selectedProgramId: null,
        scenario: "balanced",
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
        representativeWatermark: document.getElementById("representative-watermark"),
        serverHighlanderResult: document.getElementById("server-highlander-result")
      };

      function escapeHTML(value) {
        return String(value)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");
      }

      function normalizeDisplayText(value) {
        return typeof value === "string" ? value.replace(/\$-/g, "-$") : value;
      }

      function judgeFacingText(value) {
        if (typeof value !== "string") return value;
        return normalizeDisplayText(value)
          .replace(/simulated[_ ]months[_ ]to[_ ]enroll/gi, "modeled enrollment duration")
          .replace(/simulated[_ ]months[_ ]range/gi, "modeled enrollment range")
          .replace(/\bsimulated\b/gi, "modeled");
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
        if (BOOT.mode === "http" && indication.toLowerCase() !== "rheumatoid arthritis") {
          indicationValid = false;
        }
        elements.indication.setAttribute("aria-invalid", indicationValid ? "false" : "true");
        indicationError.textContent = indicationValid
          ? ""
          : (BOOT.mode === "http"
            ? "This judging build supports Rheumatoid arthritis only."
            : "Enter a clinical indication; whitespace alone is not valid.");

        var biomarkers = numberFieldState(elements.maxBiomarkers, "Maximum biomarkers");
        var papers = numberFieldState(elements.maxPapers, "Maximum literature papers");
        var hypotheses = numberFieldState(elements.maxHypotheses, "Maximum hypotheses per biomarker");
        var valid = indicationValid && biomarkers.valid && papers.valid && hypotheses.valid;

        if (biomarkers.valid && hypotheses.valid) {
          if (BOOT.launchMode === "scientific") {
            elements.branchPreview.textContent = "Up to " + biomarkers.value + " evidence focus branch" + (biomarkers.value === 1 ? "" : "es") + "; one full HypGen run per focus. Scientific packets exclude presentation values.";
          } else {
            var branches = biomarkers.value * hypotheses.value;
            elements.branchPreview.textContent = "Up to " + biomarkers.value + " biomarker" + (biomarkers.value === 1 ? "" : "s") + " and up to " + branches + " hypothesis branch" + (branches === 1 ? "" : "es") + ".";
          }
        } else {
          elements.branchPreview.textContent = "Enter valid ceilings to preview requested capacity.";
        }
        elements.runButton.disabled = !valid || state.submitting;
        return {
          valid: valid,
          indication: indication,
          biomarkers: biomarkers.value,
          papers: papers.value,
          hypotheses: hypotheses.value
        };
      }

      function buildScientificSetup(validation) {
        return {
          schemaVersion: "labrador.run-setup.v3",
          execution: {
            mode: "REPLAY",
            presentationMode: "SCIENTIFIC"
          },
          exploration: {
            evidenceRequest: {
              ask: "new_question",
              target: "can a small-molecule IRAK4 inhibitor suppress synovial fibroblast-driven inflammation in rheumatoid arthritis, or is its effect confined to the myeloid compartment?",
              depth: "deep",
              reason: "frozen golden path for the REagent-LABrador integration demo"
            },
            focus: { maxBranches: validation.biomarkers },
            hypothesis: {
              profile: "default",
              roi: {
                requestId: "IRAK4-RA-scientific-roi",
                comparables: [],
                execution: {
                  simulations: 128,
                  seed: 42,
                  simulationAssumptions: {}
                }
              }
            }
          },
          program: {
            frame: {
              schemaVersion: "labrador.scientific-program-frame.v1",
              frameId: "IRAK4-RA-scientific",
              basis: "ANALYST_SUPPLIED",
              asset: {
                name: "IRAK4 inhibitor",
                modality: "small_molecule",
                sponsor: null
              },
              target: {
                symbol: "IRAK4",
                direction: "inhibit",
                uniprotAccession: "Q9NWZ3"
              },
              disease: { name: validation.indication, subtype: null },
              biomarkerDefaults: {
                prevalenceInDisease: 0.4,
                assayAvailable: true
              },
              endpoint: {
                name: "ACR50 response",
                type: "binary",
                expectedEffectSize: 0.3
              },
              tissue: "synovium",
              simulationContext: {
                interactionToDisrupt: "IRAK4 catalytic function",
                mechanismHypothesis: "orthosteric",
                asOfDate: null
              },
              notes: [
                "Scientific assembly may use only this frame plus branch evidence and hypothesis output."
              ]
            },
            valuationFrame: {
              base_year: 2026,
              valuation_year: 2026,
              launch_year: 2034,
              filing_year: 2026,
              currency: "USD",
              geography: "United States",
              therapeutic_area: "Immunology",
              target_population: "Adults with active rheumatoid arthritis",
              line_of_therapy: "Second line",
              route: "ORAL",
              current_stage: "Preclinical",
              modality: "SMALL_MOLECULE",
              target: "IRAK4",
              expansion_launch_year: null,
              notes: "Analyst-supplied valuation assumptions; separate from scientific thesis fields."
            }
          }
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
        low.setAttribute("aria-valuetext", names[lowValue] + "; complete interval " + names[lowValue] + " through " + names[highValue]);
        high.setAttribute("aria-valuetext", names[highValue] + "; complete interval " + names[lowValue] + " through " + names[highValue]);
        low.style.zIndex = lowValue === Number(low.max) ? "5" : "3";
        high.style.zIndex = "4";
      }

      // Derive a program's display metrics from an attached verbatim recruitability
      // station payload so the node, the Highlander table, and the Pareto plot all
      // agree with the attached record. Never applied to failed recruitment records.
      function applyStationDerivations(program) {
        if (program.displayMetricBasis === "REPRESENTATIVE_DEMO_SCENARIO_V1") return;
        if (!program.stationPayloads || !program.stationPayloads.recruitability || program.recruitFailed) return;
        var payload = program.stationPayloads.recruitability;
        if (typeof payload.score === "number") program.metrics.recruit = Math.round(payload.score * 100);
        if (typeof payload.simulated_months_to_enroll === "number") program.metrics.duration = payload.simulated_months_to_enroll;
        if (typeof payload.screens_per_enrollee === "number") program.metrics.screens = payload.screens_per_enrollee;
        if (Array.isArray(payload.simulated_months_range)) {
          program.recruitmentUncertainty = "modeled enrollment range: " + payload.simulated_months_range[0] + "–" + payload.simulated_months_range[1] + " months";
          if (!program.uncertainty || program.uncertainty === "not supplied") {
            program.uncertainty = program.recruitmentUncertainty;
          }
        }
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
        if (seamProgram) {
          seamProgram.stationPayloads = { recruitability: STATION_EXAMPLE_RECRUITABILITY };
          applyStationDerivations(seamProgram);
        }

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
          outputOrigin: null,
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
          outputOrigin: "USER_INPUT",
          metrics: {},
          uncertainty: "Not applicable",
          reason: null,
          metadata: { summary: "Immutable clinical indication submitted for this run." }
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

      // Presentation only: before results, center the requested-capacity root.
      // Once a real lineage exists, center its first bound lane instead so the
      // record cannot remain hidden behind the sticky metric rail.
      function centerGraphOnActiveLineage() {
        var scroller = elements.graphScroller;
        var targetX = rootX() + GRAPH_GEOMETRY.nodeWidth / 2;
        if (state.runData && state.runData.programs && state.runData.programs.length) {
          targetX = laneX(state.runData.programs[0].lane) + GRAPH_GEOMETRY.nodeWidth / 2;
        } else if (state.runData && state.runData.biomarkers && state.runData.biomarkers.length) {
          targetX = groupX(state.runData.biomarkers[0].slot) + GRAPH_GEOMETRY.nodeWidth / 2;
        }
        scroller.scrollTop = 0;
        scroller.scrollLeft = Math.max(0, targetX - scroller.clientWidth / 2);
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
          node.runtime = BOOT.mode === "http" ? "BACKEND SNAPSHOT" : (stage === "simulation" ? "NOT WIRED" : "LOCAL TARGET / MOCK UI");
          node.outputOrigin = BOOT.mode === "http" ? "NOT_RUN" : "MOCK";
          node.metrics = {};
          node.uncertainty = "Pending; no value placed on the metric axis.";
          if (stage === "biomarker") node.label = biomarker.label;
          if (stage === "hypothesis") node.label = program.label;
          if (stage === "roi") node.label = "Economics · " + program.short;
          if (stage === "recruitability") node.label = "Recruitment · " + program.short;
          if (stage === "simulation") node.label = (BOOT.mode === "http" ? "Tractability · " : "Atomistic · ") + program.short;
        });
      }

      function stageTerminal(index) {
        var stageState = state.stageStates[index];
        return stageState === "complete" || stageState === "warning" || stageState === "failed";
      }

      function retireUnusedCapacity() {
        // A slot may only retire once the stage that would have filled it is terminal;
        // a partial snapshot (e.g. hypothesis stage still queued) must not retire lanes.
        state.nodes.forEach(function (node) {
          if (node.stage === "indication") return;
          if (node.stage === "biomarker" ? !stageTerminal(0) : !stageTerminal(1)) return;
          var isActual = node.stage === "biomarker"
            ? Boolean(actualBiomarker(node.metadata.slot))
            : Boolean(actualProgramForLane(node.lane));
          if (!isActual && node.kind === "scaffold") {
            node.metadata.retired = true;
            if (node.stage === "hypothesis") node.label = "Unused requested capacity";
          }
        });
      }

      function applyBackendStageTruth(node, stage) {
        if (BOOT.mode !== "http" || !state.runData || !state.runData.stageRows) return;
        var stageRow = state.runData.stageRows[stage];
        if (!stageRow) return;
        var truth = normalizeStageTruth(stageRow, {
          execution: node.execution,
          outputOrigin: node.outputOrigin,
          resultBasis: node.resultBasis,
          runtime: node.runtime,
          reason: node.reason
        });
        node.execution = truth.moduleExecution;
        node.outputOrigin = truth.outputOrigin;
        node.resultBasis = truth.resultBasis;
        node.runtime = truth.runtimeMaturity;
        node.reason = truth.reasonCode;
        node.metadata.presentationStatus = truth.presentationStatus;
        node.metadata.outputOrigin = truth.outputOrigin;
        node.metadata.reasonCode = truth.reasonCode;
        node.metadata.qualifiers = truth.qualifiers;
        node.metadata.warnings = Array.isArray(stageRow.warnings) ? stageRow.warnings.slice() : [];
      }

      function applyScientificNodeTruth(node, stage, program) {
        if (!state.scientificSnapshot || !program || stage === "biomarker") return;
        var source = scientificNodeForStage(program.scientificBranch, stage);
        if (!source) return;
        var producer = source.producer && typeof source.producer === "object"
          ? source.producer
          : {};
        var producerIdentity = [producer.repository, producer.git_sha].filter(Boolean).join(" @ ");
        node.execution = source.status === "CANNOT_COMPLETE" ? "FAILED" : (source.status || "UNREPORTED");
        node.outputOrigin = source.output_origin || "UNREPORTED";
        node.resultBasis = source.status === "COMPLETE" ? "NATIVE PRODUCER ARTIFACT" : "MISSING";
        node.runtime = producerIdentity || source.module_id || scientificModuleId(stage);
        node.reason = source.reason_code || null;
        node.metadata.presentationStatus = source.status || "UNREPORTED";
        node.metadata.outputOrigin = source.output_origin || "UNREPORTED";
        node.metadata.reasonCode = source.reason_code || null;
        node.metadata.terminalMessage = source.message || null;
        node.metadata.inputRef = source.input_ref || null;
        node.metadata.inputHash = source.input_hash || null;
        node.metadata.outputRef = source.output_ref || null;
        node.metadata.outputHash = source.output_hash || null;
        node.metadata.durationMs = source.duration_ms;
        node.metadata.exitCode = source.exit_code;
        node.metadata.producer = producer;
        node.metadata.qualifiers = [];
        node.metadata.warnings = source.message ? [source.message] : [];
      }

      function bindStage(stage) {
        var httpMode = BOOT.mode === "http";
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
            node.resultBasis = httpMode ? "BACKEND-REPORTED" : "ILLUSTRATIVE PROXY";
            node.runtime = httpMode ? "BACKEND SNAPSHOT" : "TARGET ADAPTER";
            node.outputOrigin = httpMode ? "UNREPORTED" : "MOCK";
            node.metrics = biomarker.metrics;
            node.uncertainty = biomarker.uncertainty;
            node.metadata.summary = biomarker.summary;
            node.metadata.displayMetricBasis = biomarker.displayMetricBasis || null;
            node.metadata.displayMetricNote = biomarker.displayMetricNote || null;
          }
          if (stage === "hypothesis") {
            node.label = program.label;
            node.execution = "COMPLETE";
            node.resultBasis = httpMode ? "BACKEND-REPORTED" : "ILLUSTRATIVE PROXY";
            node.runtime = httpMode ? "BACKEND SNAPSHOT" : "NOT WIRED";
            node.outputOrigin = httpMode ? "UNREPORTED" : "MOCK";
            node.metrics = {
              boldness: program.metrics.boldness,
              evidence: program.metrics.evidence,
              plausibility: program.metrics.plausibility
            };
            node.uncertainty = httpMode ? (program.hypothesisUncertainty || program.uncertainty || "No calibrated hypothesis interval supplied; inspect native provenance.") : "Proxy scores are ordinal product fixtures.";
            node.metadata.summary = httpMode ? "Hypothesis record returned by the orchestrated run." : "Illustrative terminal hypothesis; no generator module was called.";
            node.metadata.displayMetricBasis = program.displayMetricBasis || null;
            node.metadata.displayMetricNote = program.displayMetricNote || null;
          }
          if (stage === "roi") {
            node.label = "Economics · " + program.short;
            node.execution = program.roiFailed ? "FAILED" : "COMPLETE";
            node.resultBasis = program.roiFailed ? "MISSING" : (httpMode ? "MODELED (backend)" : "SYNTHETIC MODELED");
            node.runtime = httpMode ? "BACKEND SNAPSHOT" : "LOCAL MODULE TARGET";
            node.outputOrigin = httpMode ? "UNREPORTED" : "MOCK";
            node.metrics = {
              rnpv: program.metrics.rnpv,
              positive: program.metrics.positive,
              impact: program.metrics.impact
            };
            node.uncertainty = program.uncertainty;
            node.reason = program.roiFailed ? "MOCK_ECONOMICS_FAILURE · value remains missing" : null;
            node.metadata.overflow = program.overflowRnpv;
            node.metadata.summary = httpMode ? "Economics result returned by the orchestrated run; inspect basis and qualifiers." : "Synthetic AnalysisSummary-compatible fields; NOT_DECISION_GRADE.";
            node.metadata.displayMetricBasis = program.displayMetricBasis || null;
            node.metadata.displayMetricNote = program.displayMetricNote || null;
          }
          if (stage === "recruitability") {
            node.label = "Recruitment · " + program.short;
            node.execution = program.recruitFailed ? "FAILED" : "COMPLETE";
            node.resultBasis = program.recruitFailed ? "MISSING" : (httpMode ? "MODELED FORECAST" : "REPRESENTATIVE PROXY");
            node.runtime = httpMode ? "BACKEND SNAPSHOT" : "LOCAL MODULE TARGET";
            node.outputOrigin = httpMode ? "UNREPORTED" : "MOCK";
            node.metrics = {
              recruit: program.metrics.recruit,
              duration: program.metrics.duration,
              screens: program.metrics.screens,
              risk: program.metrics.risk
            };
            node.uncertainty = program.recruitFailed ? "No numeric output returned." : (httpMode ? (program.recruitmentUncertainty || "not supplied") : "Illustrative duration range ±4 months.");
            node.reason = program.recruitFailed ? "MOCK_FORECAST_FAILURE · sibling branches continued" : null;
            node.metadata.summary = httpMode ? "Recruitability result returned by the orchestrated run; inspect origin and limitations." : "Synthetic RecruitabilityResult-compatible fields.";
            node.metadata.displayMetricBasis = program.displayMetricBasis || null;
            node.metadata.displayMetricNote = program.displayMetricNote || null;
          }
          if (stage === "simulation") {
            node.label = (httpMode ? "Tractability · " : "Atomistic · ") + program.short;
            var hasSimulationPayload = Boolean(program.stationPayloads && program.stationPayloads.simulation);
            node.execution = httpMode ? (hasSimulationPayload ? "COMPLETE" : "SKIPPED") : "SKIPPED";
            node.resultBasis = httpMode ? (hasSimulationPayload ? "BACKEND-REPORTED" : "MISSING") : (program.notAmenable ? "NO RESULT" : "NOT WIRED");
            node.runtime = httpMode ? "BACKEND SNAPSHOT" : "NOT WIRED";
            node.outputOrigin = httpMode ? (hasSimulationPayload ? "UNREPORTED" : "NOT_RUN") : "NOT_RUN";
            node.metrics = program.displayMetricBasis === "REPRESENTATIVE_DEMO_SCENARIO_V1"
              ? { tractability_fit: program.metrics.tractability_fit }
              : { support: null, occupancy: null, convergence: null };
            node.uncertainty = httpMode
              ? (program.tractabilityUncertainty || "No scalar atomistic metric is imputed; inspect the native tractability interpretation.")
              : "Not available; missing values stay on the shelf.";
            node.reason = httpMode ? null : (program.notAmenable
              ? "NOT_AMENABLE · resolving evidence would be an experimentally supported binding mechanism"
              : "MODULE_NOT_WIRED");
            node.metadata.summary = httpMode
              ? "The orchestrator supplied a tractability station record. No scalar atomistic score is imputed when the module keeps its evidence axes separate."
              : "No atomistic capability was called by this standalone mockup.";
            node.metadata.displayMetricBasis = program.displayMetricBasis || null;
            node.metadata.displayMetricNote = program.displayMetricNote || null;
          }
          applyBackendStageTruth(node, stage);
          applyScientificNodeTruth(node, stage, program);
          // When a real station produced this record, its verbatim output rides along.
          // The payload never overwrites execution status or a failure/skip reason;
          // provenance labels upgrade only for records that actually resolved.
          var payload = null;
          if (stage === "biomarker") {
            payload = stationPayloadFor(biomarker, stage);
            if (!payload) {
              var biomarkerProgram = state.runData.programs.find(function (candidate) {
                return candidate.biomarkerSlot === node.metadata.slot;
              });
              payload = stationPayloadFor(biomarkerProgram, stage);
            }
          } else {
            payload = stationPayloadFor(program, stage);
          }
          if (payload) {
            node.metadata.stationPayload = payload;
            node.metadata.summary = "Native station artifact attached (input id: " + (payload.input && payload.input.id ? payload.input.id : "unknown") + "). The readable interpretation is a display projection; the stored artifact remains unchanged.";
            if (!httpMode && node.execution !== "FAILED" && node.execution !== "SKIPPED" && node.execution !== "NOT_AMENABLE") {
              node.resultBasis = "MODELED · VERBATIM STATION OUTPUT";
              node.runtime = "STATION ATTACHED";
            }
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
        if (state.metrics[node.stage] === "rnpv") {
          return (value < 0 ? "-$" + Math.abs(value) : "$" + value) + "M · modeled";
        }
        if (state.metrics[node.stage] === "positive" || state.metrics[node.stage] === "occupancy" || state.metrics[node.stage] === "convergence") return value + "% · " + definition.unit.replace("% ", "");
        if (state.metrics[node.stage] === "duration") return value + " months · representative";
        if (state.metrics[node.stage] === "screens") return value.toFixed(1) + "× · representative";
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
            nodeElement.setAttribute("aria-label", node.label + "; " + node.stage + "; " + accessibleValue + "; module execution " + node.execution + "; stage presentation " + (node.metadata.presentationStatus || node.execution) + "; output origin " + (node.outputOrigin || "unreported") + "; result basis " + node.resultBasis + "; runtime " + node.runtime + "; uncertainty " + (node.uncertainty || "not supplied"));
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
            badges = BOOT.mode === "http"
              ? '<div class="node-badges http-truth"><span class="badge ' + executionClass + '">' + escapeHTML(node.execution) + '</span><span class="badge proxy">' + escapeHTML(node.resultBasis) + '</span><span class="badge">' + escapeHTML(node.outputOrigin || "UNREPORTED") + '</span><span class="badge">' + escapeHTML(node.runtime) + "</span></div>"
              : '<div class="node-badges"><span class="badge ' + executionClass + '">' + escapeHTML(node.execution) + '</span><span class="badge proxy">' + escapeHTML(node.resultBasis) + '</span><span class="badge">' + escapeHTML(node.runtime) + "</span></div>";
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

      function interpretabilityItems(value) {
        if (Array.isArray(value)) return value;
        if (value && typeof value === "object") return [value];
        return [];
      }

      function interpretabilityText(item, fields) {
        if (item === null || item === undefined) return "Not supplied";
        if (typeof item !== "object") return String(item);
        var parts = [];
        fields.forEach(function (field) {
          var value = item[field];
          if (value === null || value === undefined || value === "") return;
          if (Array.isArray(value)) value = value.join(", ");
          if (typeof value === "object") value = JSON.stringify(value);
          parts.push(String(value));
        });
        return parts.length ? parts.join(" · ") : JSON.stringify(item);
      }

      function interpretabilityList(items, fields) {
        var values = interpretabilityItems(items);
        if (!values.length) return '<p class="micro">Not supplied by this module.</p>';
        return "<ul>" + values.slice(0, 6).map(function (item) {
          return "<li>" + escapeHTML(judgeFacingText(interpretabilityText(item, fields))) + "</li>";
        }).join("") + "</ul>";
      }

      // One renderer for every module's optional interpretability 1.0 object.
      // Native JSON remains available below it; this is only a compact projection.
      function renderInterpretability(interpretability) {
        var supplied = Boolean(interpretability && typeof interpretability === "object" && !Array.isArray(interpretability));
        var raw = supplied
          ? interpretability
          : {};
        var view = supplied ? interpretabilityView({ interpretability: raw }) : null;
        var headline = view ? view.headline : {
          title: "Interpretability unavailable",
          result: "UNREPORTED",
          plainLanguage: "This module did not emit the shared interpretability object.",
          status: "UNREPORTED",
          basis: []
        };
        var uncertainty = raw.uncertainty && typeof raw.uncertainty === "object" ? raw.uncertainty : {};
        var uncertaintySummary = judgeFacingText([uncertainty.method, uncertainty.draws !== null && uncertainty.draws !== undefined ? uncertainty.draws + " draws" : null, uncertainty.seed !== null && uncertainty.seed !== undefined ? "seed " + uncertainty.seed : null].filter(Boolean).join(" · ") || "Not supplied by this module.");
        var schemaVersion = raw.schema_version || "unreported";
        return '<div class="interpretability-view" data-interpretability-view="' + escapeHTML(schemaVersion) + '">' +
          '<section data-interpretability-section="headline"><h4>' + escapeHTML(judgeFacingText(headline.title)) + '</h4><p><strong>' + escapeHTML(judgeFacingText(headline.result)) + " · " + escapeHTML(judgeFacingText(headline.status)) + '</strong></p><p>' + escapeHTML(judgeFacingText(headline.plainLanguage)) + '</p><p class="micro">Basis: ' + escapeHTML(judgeFacingText(headline.basis.length ? headline.basis.join(" + ") : "not supplied")) + "</p></section>" +
          '<details class="inspector-section" open data-interpretability-section="metrics"><summary>Key metrics</summary>' + interpretabilityList(raw.metrics, ["label", "display", "meaning"]) + "</details>" +
          '<details class="inspector-section" data-interpretability-section="steps"><summary>Calculation steps</summary>' + interpretabilityList(raw.steps, ["label", "method", "formula", "result"]) + "</details>" +
          '<details class="inspector-section" data-interpretability-section="evidence"><summary>Evidence</summary>' + interpretabilityList(raw.evidence, ["claim", "source_id", "grade"]) + "</details>" +
          '<details class="inspector-section" data-interpretability-section="assumptions"><summary>Assumptions</summary>' + interpretabilityList(raw.assumptions, ["path", "value", "unit", "basis"]) + "</details>" +
          '<details class="inspector-section" data-interpretability-section="uncertainty"><summary>Uncertainty</summary><p>' + escapeHTML(uncertaintySummary) + "</p>" + interpretabilityList(uncertainty.limitations, ["message"]) + "</details>" +
          '<details class="inspector-section" open data-interpretability-section="limitations"><summary>Limitations</summary>' + interpretabilityList(raw.limitations, ["code", "severity", "message"]) + "</details>" +
          '<details class="inspector-section" data-interpretability-section="counterfactuals"><summary>Counterfactuals</summary>' + interpretabilityList(raw.counterfactuals, ["change", "result", "meaning"]) + "</details>" +
          '<details class="inspector-section" data-interpretability-section="lineage"><summary>Lineage</summary>' + interpretabilityList(raw.lineage, ["output_path", "input_paths", "transformation"]) + "</details>" +
        "</div>";
      }

      function evidenceCopy(node) {
        if (node.stage === "biomarker") return "Illustrative supporting findings: 6; contradictory findings: 2; shared literature cap applies across the run.";
        if (node.stage === "hypothesis") return "Illustrative synthesis cites the parent biomarker record and two mock finding IDs. No generator or mapper was called.";
        if (node.stage === "roi") return "Synthetic economics fields mirror AnalysisSummary-style outputs; the basis remains NOT_DECISION_GRADE.";
        if (node.stage === "recruitability") return "Representative planning record mirrors enrollment score, duration, screening burden, sites basis, and counterfactual fields.";
        if (node.stage === "simulation") return "No artifact exists because execution was skipped. Missing atomistic evidence is not evidence against the program.";
        return "User-submitted indication snapshot; no scientific evidence is attached to the root.";
      }

      function renderInspector(node) {
        if (!node) return;
        var definition = metricDefinition(node);
        var httpMode = BOOT.mode === "http";
        var value = formatMetric(node);
        var program = findProgramForNode(node);
        var rationale = program ? program.publicWhy : (node.metadata.summary || "This record anchors the available public lineage.");
        var parent = node.parentId ? findNode(node.parentId) : null;
        var childCount = state.nodes.filter(function (candidate) { return candidate.parentId === node.id; }).length;
        var interaction = state.previewId === node.id ? "SELECTED + PREVIEWED" : "SELECTED";
        var payloadSection = "";
        if (node.metadata.stationPayload) {
          payloadSection = state.scientificSnapshot
            ? '<details class="inspector-section" open data-inspector-section="station-artifact"><summary>Native producer artifact</summary><p class="micro">Exact producer field names and values are shown below. This includes native <span class="mono">simulated_*</span> clinical fields; the browser does not rename or rewrite the stored artifact.</p><pre class="mono native-artifact" data-native-artifact="true">' + escapeHTML(JSON.stringify(node.metadata.stationPayload, null, 2)) + "</pre></details>"
            : httpMode
            ? '<details class="inspector-section" data-inspector-section="station-artifact"><summary>Native station artifact</summary><p class="micro">The complete module payload is retained unchanged and bound to this run by hash. Technical field names are omitted from the judging presentation; the readable interpretation above is display-only.</p></details>'
            : '<details class="inspector-section" open><summary>Station output (verbatim)</summary><p class="micro">Key names are the station’s own honesty contract; nothing is renamed for display, and score is not a probability of approval.</p><pre class="mono" style="overflow:auto;max-height:260px;background:#f0eee5;padding:9px;border-radius:8px;font-size:9px;white-space:pre-wrap;">' + escapeHTML(JSON.stringify(node.metadata.stationPayload, null, 2)) + "</pre></details>";
        }

        if (httpMode) {
          var warnings = Array.isArray(node.metadata.warnings) ? node.metadata.warnings : [];
          var visibleWarnings = warnings.filter(function (warning) {
            return !/module-owned replay\/revalidation command ran successfully over recorded scientific evidence; the scientific result remains CACHED\./i.test(warning);
          });
          var qualifiers = Array.isArray(node.metadata.qualifiers) ? node.metadata.qualifiers : [];
          var origin = node.metadata.outputOrigin || node.outputOrigin || "UNREPORTED";
          var liveDefinition = definition
            ? definition.label + " · " + definition.unit + " · display domain " + definition.domain[0] + "–" + definition.domain[1] + "."
            : "Backend-provided run record.";
          if (node.stage === "simulation") liveDefinition = "Native tractability dossier; no scalar atomistic metric is imputed.";
          if (node.metadata.displayMetricBasis === "REPRESENTATIVE_DEMO_SCENARIO_V1") {
            liveDefinition = (definition ? definition.label + " · " + definition.unit + ". " : "") + "Representative branch value for demo comparison; not a native module output. The native artifact remains attached unchanged.";
          }
          var interpretability = node.metadata.stationPayload && (
            node.metadata.stationPayload.interpretability ||
            (node.metadata.stationPayload.cards && node.metadata.stationPayload.cards.interpretability)
          );
          var readableInterpretability = renderInterpretability(interpretability);
          var scientificTruth = state.scientificSnapshot
            ? '<div class="status-card"><span>Producer terminal status</span><strong>' + escapeHTML(node.metadata.presentationStatus || "UNREPORTED") + "</strong></div>"
            : "";
          var scientificAudit = state.scientificSnapshot
            ? '<details class="inspector-section" open data-inspector-section="scientific-lineage"><summary>Artifact lineage & hashes</summary><ul>' +
              "<li>Input ref: <span class=\"mono\">" + escapeHTML(node.metadata.inputRef || "not supplied") + "</span></li>" +
              "<li>Input hash: <span class=\"mono\">" + escapeHTML(node.metadata.inputHash || "not supplied") + "</span></li>" +
              "<li>Output ref: <span class=\"mono\">" + escapeHTML(node.metadata.outputRef || "not supplied") + "</span></li>" +
              "<li>Output hash: <span class=\"mono\">" + escapeHTML(node.metadata.outputHash || "not supplied") + "</span></li>" +
              "<li>Producer: <span class=\"mono\">" + escapeHTML(JSON.stringify(node.metadata.producer || {})) + "</span></li>" +
              "<li>Duration / exit: " + escapeHTML(node.metadata.durationMs === null || node.metadata.durationMs === undefined ? "not supplied" : node.metadata.durationMs + " ms") + " / " + escapeHTML(node.metadata.exitCode === null || node.metadata.exitCode === undefined ? "not supplied" : node.metadata.exitCode) + "</li>" +
              "</ul></details>"
            : "";

          elements.inspectorHeading.textContent = node.label;
          elements.inspectorSubtitle.textContent = node.stage + " · " + node.id;
          elements.collapsedIdentity.textContent = node.label + " · " + node.execution;
          elements.inspectorBody.innerHTML =
            '<div class="inspector-status-grid">' +
              '<div class="status-card"><span>Module execution</span><strong>' + escapeHTML(node.execution || "UNREPORTED") + "</strong></div>" +
              '<div class="status-card"><span>Output origin</span><strong>' + escapeHTML(origin.replace(/_/g, " ")) + "</strong></div>" +
              '<div class="status-card"><span>Result basis</span><strong>' + escapeHTML(node.resultBasis || "UNREPORTED") + "</strong></div>" +
              '<div class="status-card"><span>Runtime maturity</span><strong>' + escapeHTML(node.runtime || "UNREPORTED") + "</strong></div>" +
              '<div class="status-card"><span>UI freshness</span><strong>' + escapeHTML(state.freshness.toUpperCase()) + "</strong></div>" +
              '<div class="status-card"><span>Stage result</span><strong>' + escapeHTML(node.metadata.presentationStatus || node.execution || "UNREPORTED") + "</strong></div>" +
              '<div class="status-card"><span>Display metric basis</span><strong>' + escapeHTML(String(node.metadata.displayMetricBasis || "NATIVE_DERIVED").replace(/_/g, " ")) + "</strong></div>" +
              scientificTruth +
            "</div>" +
            '<div class="primary-result"><span>Active display value</span><strong>' + escapeHTML(value) + '</strong><p>' + escapeHTML(liveDefinition) + " Uncertainty: " + escapeHTML(judgeFacingText(node.uncertainty || "not supplied")) + ".</p></div>" +
            readableInterpretability +
            '<details class="inspector-section" open><summary>Run qualifications</summary><p><strong>Reason code:</strong> ' + escapeHTML(node.reason || "No stage reason code reported.") + '</p><p><strong>Terminal message:</strong> ' + escapeHTML(node.metadata.terminalMessage || "No terminal message reported.") + '</p><p><strong>Qualifiers:</strong> ' + escapeHTML(judgeFacingText(qualifiers.length ? qualifiers.join(" · ") : "none reported")) + '</p><p><strong>Warnings:</strong> ' + escapeHTML(judgeFacingText(visibleWarnings.length ? visibleWarnings.join(" · ") : "none reported")) + "</p></details>" +
            scientificAudit +
            '<details class="inspector-section"><summary>Lineage & audit</summary><ul><li>Parent: ' + escapeHTML(parent ? parent.label : "none · root") + "</li><li>Direct descendants: " + childCount + "</li><li>Output origin: " + escapeHTML(origin) + "</li><li>Timestamp: " + escapeHTML(state.lastUpdated || "awaiting update") + "</li><li>Hash: " + escapeHTML(node.metadata.outputHash || (program ? program.hash : "unreported")) + "</li></ul></details>" +
            payloadSection;
          return;
        }

        var terminalGap = node.resultBasis === "NOT WIRED" || node.runtime === "NOT WIRED" || node.resultBasis === "MISSING" || node.resultBasis === "NO RESULT";
        var warning = terminalGap
          ? '<div class="state-warning">This record has a terminal gap. ' + escapeHTML(node.reason || "A target module is not wired.") + " It must not be read as positive or negative scientific evidence.</div>"
          : '<div class="state-warning">ILLUSTRATIVE MOCK DATA · inspect structure and handoffs, not scientific validity.</div>';
        var definitionCopy = definition ? definition.label + " · " + definition.unit + " · domain " + definition.domain[0] + "–" + definition.domain[1] + ". " + definition.basis : "Fixed submitted root.";
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

      // Every metric key the UI tests with === null; wire omissions must become
      // null (missing shelf), never undefined, or dominates()/renderParetoPlot misbehave.
      var WIRE_METRIC_KEYS = ["boldness", "evidence", "plausibility", "rnpv", "positive", "impact", "recruit", "duration", "screens", "risk", "support", "occupancy", "convergence", "tractability_fit"];

      function finiteNumber(value) {
        return typeof value === "number" && Number.isFinite(value) ? value : null;
      }

      function normalizedScale(value, maximum) {
        var number = finiteNumber(value);
        if (number === null) return null;
        return number >= 0 && number <= 1 ? number * maximum : number;
      }

      function dollarsToMillions(value) {
        var number = finiteNumber(value);
        return number === null ? null : Math.round(number / 10000) / 100;
      }

      function scientificHypothesisProjection(branch) {
        var node = scientificNodeForStage(branch, "hypothesis");
        var artifact = node && node.artifact && typeof node.artifact === "object"
          ? node.artifact
          : {};
        var document = artifact.hypothesis && typeof artifact.hypothesis === "object"
          ? artifact.hypothesis
          : {};
        var hypothesis = document.hypothesis && typeof document.hypothesis === "object"
          ? document.hypothesis
          : {};
        var cards = artifact.cards && typeof artifact.cards === "object" ? artifact.cards : {};
        var firstCard = Array.isArray(cards.hypotheses) && cards.hypotheses.length
          ? cards.hypotheses[0]
          : {};
        var scores = hypothesis.scores && typeof hypothesis.scores === "object"
          ? hypothesis.scores
          : (firstCard.scores && typeof firstCard.scores === "object" ? firstCard.scores : {});
        var articulation = hypothesis.articulation && typeof hypothesis.articulation === "object"
          ? hypothesis.articulation
          : {};
        var statement = articulation.statement || articulation.mechanism || null;
        var focus = branch.focus && typeof branch.focus === "object" ? branch.focus : {};
        var fallback = focus.display_label || focus.name || branch.branch_id || "Scientific branch";
        return {
          id: scientificCandidateId(branch) || branch.branch_id,
          label: statement || fallback,
          short: (focus.display_label || fallback) + (statement ? " · " + statement : ""),
          publicWhy: articulation.novel_because || statement || "Native hypothesis artifact; inspect the producer output and lineage.",
          metrics: {
            boldness: normalizedScale(scores.novelty, 10),
            evidence: normalizedScale(scores.support, 100),
            plausibility: normalizedScale(scores.testability, 100)
          },
          uncertainty: cards.interpretability && cards.interpretability.uncertainty
            ? cards.interpretability.uncertainty.method || "native hypothesis uncertainty attached"
            : "native hypothesis uncertainty not summarized"
        };
      }

      function scientificRoiProjection(branch) {
        var node = scientificNodeForStage(branch, "roi");
        var artifact = node && node.artifact && typeof node.artifact === "object"
          ? node.artifact
          : {};
        var payload = artifact.payload && typeof artifact.payload === "object" ? artifact.payload : artifact;
        var summary = payload.summary && typeof payload.summary === "object" ? payload.summary : {};
        var p10 = dollarsToMillions(summary.p10_rnpv);
        var p50 = dollarsToMillions(summary.p50_rnpv);
        var p90 = dollarsToMillions(summary.p90_rnpv);
        var uncertainty = p10 !== null && p90 !== null
          ? "rNPV P10–P90: " + metricCell(p10, "$", "M") + " to " + metricCell(p90, "$", "M")
          : "native ROI uncertainty not summarized";
        return {
          rnpv: p50,
          positive: normalizedScale(summary.probability_positive_rnpv, 100),
          impact: null,
          uncertainty: uncertainty
        };
      }

      function scientificStationPayloads(branch) {
        var payloads = {};
        ["hypothesis", "roi", "recruitability", "simulation"].forEach(function (stageId) {
          var node = scientificNodeForStage(branch, stageId);
          if (node && node.artifact && typeof node.artifact === "object") {
            payloads[stageId] = node.artifact;
          }
        });
        return payloads;
      }

      function translateScientificWire(ws) {
        var branches = Array.isArray(ws.branches) ? ws.branches : [];
        var biomarkers = branches.map(function (branch, index) {
          var focus = branch.focus && typeof branch.focus === "object" ? branch.focus : {};
          return {
            slot: index,
            id: "bio-slot-" + index,
            label: focus.display_label || focus.name || focus.thing_id || branch.branch_id,
            summary: (focus.kind === "process" ? "Mechanistic/PD readout focus" : "Biomarker focus") + " selected from live evidence; " + (focus.support_count || 0) + " supporting finding(s).",
            metrics: { exploration: null, evidence: null, pursuit: null },
            nativeMetrics: { exploration: null, evidence: null, pursuit: null },
            uncertainty: "Focus selection preserves mapper finding and link IDs; no display score is imputed.",
            displayMetricBasis: null,
            displayMetricNote: null,
            stationPayload: null,
            scientificFocus: focus,
            branchId: branch.branch_id
          };
        });
        var programs = branches.map(function (branch, index) {
          var hypothesis = scientificHypothesisProjection(branch);
          var roi = scientificRoiProjection(branch);
          var clinicalNode = scientificNodeForStage(branch, "recruitability");
          var simulationNode = scientificNodeForStage(branch, "simulation");
          var metrics = {
            boldness: hypothesis.metrics.boldness,
            evidence: hypothesis.metrics.evidence,
            plausibility: hypothesis.metrics.plausibility,
            rnpv: roi.rnpv,
            positive: roi.positive,
            impact: roi.impact,
            recruit: null,
            duration: null,
            screens: null,
            risk: null,
            support: null,
            occupancy: null,
            convergence: null,
            tractability_fit: null
          };
          var program = {
            id: branch.branch_id || "scientific-branch-" + (index + 1),
            candidateId: hypothesis.id,
            lane: index,
            biomarkerSlot: index,
            hypothesisSlot: 0,
            hypothesisNodeId: "hyp-slot-" + index,
            roiNodeId: "roi-slot-" + index,
            recruitNodeId: "recruitability-slot-" + index,
            simulationNodeId: "simulation-slot-" + index,
            label: hypothesis.label,
            short: hypothesis.short,
            metrics: metrics,
            nativeMetrics: Object.assign({}, metrics),
            uncertainty: roi.uncertainty,
            hypothesisUncertainty: hypothesis.uncertainty,
            recruitmentUncertainty: "native clinical output not summarized",
            tractabilityUncertainty: "Native dossier is categorical; no scalar tractability score is imputed.",
            displayMetricBasis: null,
            displayMetricNote: null,
            publicWhy: hypothesis.publicWhy,
            roiFailed: !scientificNodeForStage(branch, "roi") || scientificNodeForStage(branch, "roi").status !== "COMPLETE",
            recruitFailed: !clinicalNode || clinicalNode.status !== "COMPLETE",
            overflowRnpv: false,
            notAmenable: Boolean(simulationNode && simulationNode.artifact && simulationNode.artifact.verdict === "not_tractable"),
            revision: "scientific-packet-v1",
            hash: (scientificNodeForStage(branch, "hypothesis") || {}).output_hash || "unhashed",
            stationPayloads: scientificStationPayloads(branch),
            scientificBranch: branch,
            scientificNodes: branch.nodes || {},
            branchStatus: branch.status
          };
          applyStationDerivations(program);
          program.nativeMetrics = Object.assign({}, program.metrics);
          return program;
        });
        var stageRows = {};
        (ws.stages || []).forEach(function (stage) {
          if (!stage || !stage.stage_id) return;
          var mapped = Object.assign({}, stage, { stage_id: scientificStageId(stage.stage_id) });
          stageRows[mapped.stage_id] = mapped;
        });
        var requestedLanes = Math.max(
          state.snapshot && Number.isInteger(state.snapshot.biomarkers) ? state.snapshot.biomarkers : 0,
          branches.length
        );
        return {
          biomarkers: biomarkers,
          programs: programs,
          stageRows: stageRows,
          requestedLanes: requestedLanes,
          biomarkerShortfall: Math.max(0, requestedLanes - biomarkers.length),
          hypothesisShortfall: Math.max(0, requestedLanes - programs.length)
        };
      }

      function translateWire(ws) {
        if (isScientificSnapshot(ws)) return translateScientificWire(ws);
        var biomarkers = (ws.biomarkers || []).map(function (item) {
          var nativeMetrics = Object.assign({}, item.metrics || {});
          var displayMetrics = item.display_metric_basis === "REPRESENTATIVE_DEMO_SCENARIO_V1" && item.display_metrics
            ? Object.assign({}, item.display_metrics)
            : nativeMetrics;
          return {
            slot: item.slot,
            id: "bio-slot-" + item.slot,
            label: item.label,
            summary: item.summary || "",
            metrics: displayMetrics,
            nativeMetrics: nativeMetrics,
            uncertainty: normalizeDisplayText(item.display_uncertainty || item.uncertainty || "not supplied"),
            displayMetricBasis: item.display_metric_basis || null,
            displayMetricNote: item.display_note || null,
            stationPayload: stationPayloadFor(item, "biomarker")
          };
        });
        var programs = (ws.programs || []).map(function (item, index) {
          var nativeMetrics = Object.assign({}, item.metrics || {});
          var metrics = item.display_metric_basis === "REPRESENTATIVE_DEMO_SCENARIO_V1" && item.display_metrics
            ? Object.assign({}, item.display_metrics)
            : nativeMetrics;
          WIRE_METRIC_KEYS.forEach(function (key) {
            if (metrics[key] === undefined) metrics[key] = null;
            if (nativeMetrics[key] === undefined) nativeMetrics[key] = null;
          });
          var program = {
            id: item.id || "program-" + (index + 1),
            lane: item.lane,
            biomarkerSlot: item.biomarker_slot,
            hypothesisSlot: item.hypothesis_slot,
            hypothesisNodeId: "hyp-slot-" + item.lane,
            roiNodeId: "roi-slot-" + item.lane,
            recruitNodeId: "recruitability-slot-" + item.lane,
            simulationNodeId: "simulation-slot-" + item.lane,
            label: item.display_label || item.label,
            short: item.display_label || item.short_label || item.label,
            metrics: metrics,
            nativeMetrics: nativeMetrics,
            uncertainty: normalizeDisplayText(item.display_uncertainty || item.uncertainty || "not supplied"),
            hypothesisUncertainty: normalizeDisplayText(item.display_uncertainty || item.uncertainty || "not supplied"),
            recruitmentUncertainty: normalizeDisplayText(item.display_recruitment_uncertainty || "not supplied"),
            tractabilityUncertainty: normalizeDisplayText(item.display_tractability_uncertainty || "not supplied"),
            displayMetricBasis: item.display_metric_basis || null,
            displayMetricNote: item.display_note || null,
            publicWhy: item.public_why || "No public rationale supplied by the backend for this record.",
            roiFailed: Boolean(item.roi_failed),
            recruitFailed: Boolean(item.recruit_failed),
            overflowRnpv: Boolean(item.overflow_rnpv),
            notAmenable: Boolean(item.not_amenable),
            revision: item.revision || "r1",
            hash: item.hash || "unhashed",
            stationPayloads: item.station_payloads || {}
          };
          applyStationDerivations(program);
          return program;
        });
        var stageRows = {};
        (ws.stages || []).forEach(function (stage) {
          if (stage && stage.stage_id) stageRows[stage.stage_id] = stage;
        });
        var requestedLanes = state.snapshot.biomarkers * state.snapshot.hypotheses;
        return {
          biomarkers: biomarkers,
          programs: programs,
          stageRows: stageRows,
          requestedLanes: requestedLanes,
          biomarkerShortfall: Math.max(0, state.snapshot.biomarkers - biomarkers.length),
          hypothesisShortfall: Math.max(0, requestedLanes - programs.length)
        };
      }

      function applyScientificSnapshotChrome(ws) {
        state.representativeDemo =
          ws.representative_demo === true && ws.presentation_mode === "REPRESENTATIVE_DEMO";
        state.scientificPacketExcludesRepresentativeValues =
          ws.scientific_packet_excludes_representative_values === true;
        state.presentationMode = ws.presentation_mode || null;
        state.executionMode = ws.execution_mode || null;
        elements.representativeWatermark.hidden = !state.representativeDemo;
        elements.representativeWatermark.textContent = state.representativeDemo
          ? (ws.watermark || "REPRESENTATIVE DEMO VALUES")
          : "";
        document.getElementById("scenario-profile").disabled = true;
        document.getElementById("highlander-mode-description").textContent = "Server-native producer packet comparison";
        document.getElementById("highlander-mode-chip").textContent = "SERVER HIGHLANDER";
        document.getElementById("highlander-mode-chip").classList.remove("mock");
        document.getElementById("highlander-server-chip").textContent = "RFC 8785 PACKETS";
        document.getElementById("comparison-mode-badge").textContent = "server result";
        document.getElementById("gap-confirm-copy").textContent = "I acknowledge terminal producer failures remain visible and incomparable. Run the pinned server Highlander consumer.";
        document.getElementById("module-dialog-summary").textContent = "This scientific run exposes exact per-branch producer artifacts, refs, hashes, origins, terminal reasons, and the server Highlander result.";
      }

      function ingestSnapshot(ws) {
        var hadPrograms = Boolean(state.runData && state.runData.programs && state.runData.programs.length);
        var scientific = isScientificSnapshot(ws);
        var rebuildScientificScaffold = scientific && state.snapshot && state.snapshot.hypotheses !== 1;
        state.scientificSnapshot = scientific;
        if (scientific) applyScientificSnapshotChrome(ws);
        else {
          state.representativeDemo = false;
          elements.representativeWatermark.hidden = true;
          elements.representativeWatermark.textContent = "";
        }
        state.runData = translateWire(ws);
        if (rebuildScientificScaffold) {
          state.snapshot = Object.freeze(Object.assign({}, state.snapshot, {
            biomarkers: Math.max(state.snapshot.biomarkers, state.runData.biomarkers.length),
            hypotheses: 1
          }));
          state.runData.requestedLanes = state.snapshot.biomarkers;
          state.runData.biomarkerShortfall = Math.max(0, state.snapshot.biomarkers - state.runData.biomarkers.length);
          state.runData.hypothesisShortfall = Math.max(0, state.snapshot.biomarkers - state.runData.programs.length);
          buildScaffold();
        }
        var stageIds = STAGES.map(function (stage) { return stage.id; });
        (ws.stages || []).forEach(function (stage) {
          var mappedStageId = scientific ? scientificStageId(stage.stage_id) : stage.stage_id;
          var index = stageIds.indexOf(mappedStageId);
          if (index === -1) return;
          var truth = normalizeStageTruth(stage, { execution: "QUEUED" });
          var status = truth.presentationStatus;
          state.stageStates[index] =
            status === "RUNNING" ? "running" :
            status === "COMPLETE" ? "complete" :
            status === "COMPLETE_WITH_WARNINGS" ? "warning" :
            status === "FAILED" ? "failed" : "queued";
          state.stageNotes[index] = stage.note || status.toLowerCase();
          if (status === "RUNNING") markStagePending(mappedStageId);
          if (status === "COMPLETE" || status === "COMPLETE_WITH_WARNINGS" || status === "FAILED") bindStage(mappedStageId);
        });
        if (scientific) {
          var highlander = ws.highlander && typeof ws.highlander === "object" ? ws.highlander : {};
          state.highlanderLaunched = highlander.launched === true;
          state.highlanderResult = highlander.result && typeof highlander.result === "object" ? highlander.result : null;
          state.highlanderResultHash = highlander.result_hash || null;
          var packet = highlander.packet_snapshot;
          if (packet && typeof packet === "object") {
            state.packetSnapshot = packet.id || packet.snapshotId || state.packetSnapshot;
          } else if (typeof packet === "string") {
            state.packetSnapshot = packet;
          }
          if (state.highlanderResult && state.highlanderResult.snapshotId) {
            state.packetSnapshot = state.highlanderResult.snapshotId;
          }
          document.getElementById("packet-snapshot").textContent = state.packetSnapshot || "awaiting server packet";
          var highlanderNav = document.querySelector('[data-nav="highlander"]');
          if (state.highlanderLaunched && highlanderNav) {
            highlanderNav.disabled = false;
            highlanderNav.classList.remove("locked");
          }
        }
        renderProgress();
        renderGraph();
        if (!hadPrograms && state.runData.programs.length) centerGraphOnActiveLineage();
        if (state.selectedId && state.inspectorVisible) renderInspector(findNode(state.selectedId));
        var allTerminal = state.stageStates.every(function (item) { return item === "complete" || item === "warning" || item === "failed"; });
        if (allTerminal) {
          // A backend that explicitly says highlander_ready: false blocks launch;
          // true or absent defers to the client's own gate (programs exist).
          state.highlanderReady = state.runData.programs.length > 0 && ws.highlander_ready !== false;
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
        // Run-scoped resets mirroring resetDemo: a second run must not inherit the
        // previous run's selection, inspector, or Highlander gate state.
        state.selectedId = null;
        state.previewId = null;
        state.inspectorVisible = false;
        state.inspectorCollapsed = false;
        state.highlanderReady = false;
        state.highlanderLaunched = false;
        state.highlanderLaunching = false;
        state.highlanderResult = null;
        state.highlanderResultHash = null;
        state.scientificSnapshot = false;
        state.representativeDemo = false;
        elements.representativeWatermark.hidden = true;
        elements.representativeWatermark.textContent = "";
        elements.gapConfirmInput.checked = false;
        var highlanderNav = document.querySelector('[data-nav="highlander"]');
        if (highlanderNav) {
          highlanderNav.disabled = true;
          highlanderNav.classList.add("locked");
        }
        elements.inspector.classList.remove("visible", "collapsed");
        elements.graphScreen.classList.remove("inspector-open");
        buildScaffold();
        renderProgress();
        renderGraph();
        renderReadiness();
        centerGraphOnActiveLineage();
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
        var launchName = state.scientificSnapshot
          ? (state.highlanderLaunched ? "Open server Highlander result" : "Run server Highlander")
          : (BOOT.mode === "http" ? "Open client-side comparison" : "Launch Highlander");
        if (!programCount) {
          elements.readinessState.textContent = "BLOCKED · no candidates";
          elements.packetCounts.innerHTML = '<span class="packet-count">0 complete</span><span class="packet-count">0 partial</span><span class="packet-count">0 blocked</span><span class="packet-count">no candidates</span>';
          elements.gapConfirm.classList.remove("visible");
          elements.launchHighlander.disabled = true;
          elements.launchHighlander.textContent = launchName + " · no candidates";
          return;
        }
        if (nonterminal > 0) {
          elements.readinessState.textContent = "BLOCKED · " + nonterminal + " nonterminal stage" + (nonterminal === 1 ? "" : "s");
          elements.packetCounts.innerHTML = '<span class="packet-count">0 complete</span><span class="packet-count">0 partial</span><span class="packet-count">' + programCount + ' running</span><span class="packet-count">' + nonterminal + " nonterminal stages</span>";
          elements.gapConfirm.classList.remove("visible");
          elements.launchHighlander.disabled = true;
          elements.launchHighlander.textContent = launchName + " · blocked";
          return;
        }
        var completeCount = state.scientificSnapshot
          ? state.runData.programs.filter(function (program) { return program.branchStatus === "COMPLETE"; }).length
          : 0;
        var blockedCount = state.scientificSnapshot ? programCount - completeCount : 0;
        elements.readinessState.textContent = state.scientificSnapshot
          ? "SERVER HIGHLANDER READY · terminal producer packets"
          : "READY WITH TERMINAL GAPS · no nonterminal records";
        elements.packetCounts.innerHTML = '<span class="packet-count">' + completeCount + ' complete</span><span class="packet-count">' + (state.scientificSnapshot ? 0 : programCount) + ' partial</span><span class="packet-count">' + blockedCount + ' blocked</span><span class="packet-count">0 nonterminal</span>';
        elements.gapConfirm.classList.add("visible");
        elements.launchHighlander.disabled = !elements.gapConfirmInput.checked;
        elements.launchHighlander.textContent = elements.gapConfirmInput.checked
          ? launchName + " →"
          : (state.scientificSnapshot ? "Acknowledge terminal packets to run" : (BOOT.mode === "http" ? "Acknowledge gaps to continue" : "Acknowledge gaps to launch"));
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
        var highlanderNav = document.querySelector('[data-nav="highlander"]');
        if (highlanderNav) {
          highlanderNav.disabled = true;
          highlanderNav.classList.add("locked");
        }
        elements.inspector.classList.remove("visible", "collapsed");
        elements.graphScreen.classList.remove("inspector-open");
        buildScaffold();
        renderProgress();
        renderGraph();
        renderReadiness();
        centerGraphOnActiveLineage();
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
          biomarkerRange: validation.biomarkerRange,
          hypothesisRange: validation.hypothesisRange
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
        document.getElementById("chat-scope").textContent = BOOT.mode === "http"
          ? "Read-only evidence scope · " + state.runId + " · backend snapshot only"
          : "Read-only evidence scope · " + state.runId + " · one Highlander job only";
        var graphNav = document.querySelector('[data-nav="graph"]');
        if (graphNav) {
          graphNav.disabled = false;
          graphNav.classList.remove("locked");
        }
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

      function attachConfiguredRun(runId) {
        if (BOOT.mode !== "http" || !runId) return;
        var validation = validateSetup();
        if (!validation.valid) {
          submitFailed("Cannot attach until the visible setup fields are valid.");
          return;
        }
        validation.biomarkerRange = [Number(document.getElementById("biomarker-low").value), Number(document.getElementById("biomarker-high").value)];
        validation.hypothesisRange = [Number(document.getElementById("hypothesis-low").value), Number(document.getElementById("hypothesis-high").value)];
        if (BOOT.launchMode === "scientific") validation.hypotheses = 1;
        state.runData = {
          biomarkers: [],
          programs: [],
          requestedLanes: validation.biomarkers * validation.hypotheses,
          biomarkerShortfall: 0,
          hypothesisShortfall: 0
        };
        enterRun(runId, validation);
        elements.snapshotNote.textContent = "Attached read-only to backend run " + runId + ". No new run was created.";
        startHttpRun(runId);
      }

      function submitRun(event) {
        event.preventDefault();
        var validation = validateSetup();
        if (!validation.valid || state.submitting) return;
        // Capture the four range values exactly once; the POSTed setup and the
        // frozen snapshot in enterRun must use these same values, never a DOM
        // re-read after the await (the user could move a slider mid-flight).
        validation.biomarkerRange = [Number(document.getElementById("biomarker-low").value), Number(document.getElementById("biomarker-high").value)];
        validation.hypothesisRange = [Number(document.getElementById("hypothesis-low").value), Number(document.getElementById("hypothesis-high").value)];
        state.submitting = true;
        elements.runButton.textContent = "Creating immutable snapshot…";
        validateSetup();

        if (BOOT.mode === "http") {
          var setupWire = BOOT.launchMode === "scientific"
            ? buildScientificSetup(validation)
            : {
              clinical_indication: { submitted_text: validation.indication },
              biomarker_exploration_range: {
                lower: validation.biomarkerRange[0],
                upper: validation.biomarkerRange[1]
              },
              maximum_biomarkers: validation.biomarkers,
              maximum_literature_papers: validation.papers,
              hypothesis_boldness_range: {
                lower: validation.hypothesisRange[0],
                upper: validation.hypothesisRange[1]
              },
              maximum_hypotheses_per_biomarker: validation.hypotheses
            };
          BOOT.http.createRun(setupWire).then(function (created) {
            var createdRunId = created && created.run && created.run.run_id
              ? created.run.run_id
              : (created && created.runId ? created.runId : null);
            if (!createdRunId) {
              submitFailed("Backend responded without a run_id.");
              return;
            }
            if (BOOT.launchMode === "scientific") validation.hypotheses = 1;
            state.runData = { biomarkers: [], programs: [], requestedLanes: validation.biomarkers * validation.hypotheses, biomarkerShortfall: 0, hypothesisShortfall: 0 };
            state.selectedProgramId = null;
            enterRun(createdRunId, validation);
            startHttpRun(createdRunId);
          }).catch(function (error) {
            submitFailed("Run creation failed against " + BOOT.base + " (" + String(error && error.message) + ").");
          });
          return;
        }

        setTimer(function () {
          if (/simulate failure/i.test(validation.indication)) {
            submitFailed("Mock submission error.");
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

      function simulationParetoValue(program) {
        var metrics = program && program.metrics ? program.metrics : {};
        if (Number.isFinite(metrics.tractability_fit)) return metrics.tractability_fit;
        if (Number.isFinite(metrics.support)) return metrics.support <= 1 ? metrics.support * 100 : metrics.support;
        return null;
      }

      function paretoVector(program) {
        return {
          roi: program && program.metrics ? program.metrics.rnpv : null,
          recruitability: program && program.metrics ? program.metrics.recruit : null,
          simulation: simulationParetoValue(program)
        };
      }

      function dominates(a, b) {
        var aVector = paretoVector(a);
        var bVector = paretoVector(b);
        var keys = ["roi", "recruitability", "simulation"];
        if (keys.some(function (key) { return !Number.isFinite(aVector[key]) || !Number.isFinite(bVector[key]); })) return false;
        var noWorse = keys.every(function (key) { return aVector[key] >= bVector[key]; });
        var better = keys.some(function (key) { return aVector[key] > bVector[key]; });
        return noWorse && better;
      }

      function programStatus(program) {
        if (state.scientificSnapshot) {
          var serverStatus = scientificComparisonStatus(state.highlanderResult, program.candidateId);
          return serverStatus === "FRONTIER"
            ? "non-dominated"
            : serverStatus === "DOMINATED"
              ? "dominated"
              : "incomparable";
        }
        var vector = paretoVector(program);
        if (![vector.roi, vector.recruitability, vector.simulation].every(Number.isFinite)) return "incomparable";
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
          if (state.scientificSnapshot) return String(a.candidateId || a.id).localeCompare(String(b.candidateId || b.id));
          if (state.scenario === "speed") return (b.metrics.recruit || -1) - (a.metrics.recruit || -1);
          if (state.scenario === "capital") return (b.metrics.positive || -1) - (a.metrics.positive || -1);
          return (b.metrics.plausibility || -1) - (a.metrics.plausibility || -1);
        });
        return copy;
      }

      function serverStatusLabel(program) {
        return scientificComparisonStatus(state.highlanderResult, program.candidateId) || "AWAITING_SERVER_HIGHLANDER";
      }

      function serverCandidateObjectives(program) {
        var candidate = scientificHighlanderCandidate(state.highlanderResult, program.candidateId);
        if (!candidate || !Array.isArray(candidate.observations)) return [];
        return candidate.observations.map(function (observation) {
          return {
            id: observation.objectiveId || "unreported objective",
            value: observation.rawValue,
            unit: observation.unit || "",
            direction: observation.direction || "",
            basis: observation.evidenceBasis || "UNREPORTED"
          };
        });
      }

      function formatServerObjectives(program) {
        var objectives = serverCandidateObjectives(program);
        if (!objectives.length) return "No comparable server objectives returned.";
        return objectives.map(function (objective) {
          return objective.id + " = " + JSON.stringify(objective.value) + (objective.unit ? " " + objective.unit : "") + " · " + objective.direction + " · " + objective.basis;
        }).join("; ");
      }

      function metricCell(value, prefix, suffix) {
        if (value === null || typeof value !== "number") return '<span class="badge failed">MISSING</span>';
        if (prefix === "$" && value < 0) return "-$" + Math.abs(value) + (suffix || "");
        return (prefix || "") + value + (suffix || "");
      }

      function renderServerHighlanderResult() {
        if (!state.scientificSnapshot) {
          elements.serverHighlanderResult.hidden = true;
          elements.serverHighlanderResult.innerHTML = "";
          return;
        }
        elements.serverHighlanderResult.hidden = false;
        var result = state.highlanderResult;
        if (!result) {
          elements.serverHighlanderResult.innerHTML =
            '<div class="card-head"><div><h2>Server Highlander result</h2><p>No browser frontier is substituted.</p></div><span class="badge skipped">awaiting launch</span></div>' +
            '<p class="micro">Terminal producer packets are ready. Launch the pinned server consumer to create the comparison snapshot.</p>';
          return;
        }
        var frontier = Array.isArray(result.frontier) ? result.frontier : [];
        var dominated = Array.isArray(result.dominated) ? result.dominated : [];
        var incomparable = Array.isArray(result.incomparable) ? result.incomparable : [];
        var action = result.nextEvidenceAction && typeof result.nextEvidenceAction === "object"
          ? result.nextEvidenceAction
          : null;
        var actionHtml = action
          ? '<div class="next-evidence-action" data-server-next-evidence-action="true"><span class="eyebrow">Producer-grounded next evidence action</span><strong>' + escapeHTML(action.actionType || "action") + " · " + escapeHTML(action.target || "unreported target") + '</strong><p>' + escapeHTML(action.description || "No description supplied.") + '</p><p class="micro">Producer: ' + escapeHTML(action.producerModuleId || "unreported") + " · output " + escapeHTML(action.producerOutputSha256 || "unreported") + " · candidates " + escapeHTML(Array.isArray(action.candidateIds) ? action.candidateIds.join(", ") : "unreported") + "</p></div>"
          : '<p class="micro">No producer emitted a grounded next evidence action.</p>';
        elements.serverHighlanderResult.innerHTML =
          '<div class="card-head"><div><h2>Server Highlander result</h2><p>Pareto membership comes from the pinned packet consumer, not browser display values.</p></div><span class="badge complete">server native</span></div>' +
          '<div class="server-result-grid">' +
            '<div><span>Frontier</span><strong data-server-frontier="true">' + escapeHTML(frontier.length ? frontier.join(", ") : "none") + "</strong></div>" +
            '<div><span>Dominated</span><strong>' + escapeHTML(dominated.length ? dominated.join(", ") : "none") + "</strong></div>" +
            '<div><span>Incomparable</span><strong>' + escapeHTML(incomparable.length ? incomparable.map(function (item) { return item.candidateId; }).join(", ") : "none") + "</strong></div>" +
          "</div>" +
          '<p class="micro mono">Packet: ' + escapeHTML(state.packetSnapshot || "unreported") + " · request/result hash: " + escapeHTML(state.highlanderResultHash || "unreported") + " · result snapshot: " + escapeHTML(result.snapshotId || "unreported") + "</p>" +
          actionHtml;
      }

      function renderScenario() {
        if (state.scientificSnapshot) {
          var result = state.highlanderResult;
          var policy = result && result.objectivePolicy && typeof result.objectivePolicy === "object"
            ? result.objectivePolicy
            : null;
          elements.scenarioMeta.innerHTML = '<strong>Server objective policy</strong><br>' + escapeHTML(policy ? (policy.policyId || result.objectivePolicyId || "unreported") : "awaiting server Highlander") + '<br><span class="muted">Presentation controls are disabled for scientific comparison.</span>';
          elements.weightList.innerHTML = "";
          var objectives = policy && Array.isArray(policy.objectives) ? policy.objectives : [];
          objectives.forEach(function (objective) {
            var row = document.createElement("div");
            row.className = "weight-row";
            row.innerHTML = '<span>' + escapeHTML(objective.objectiveId || "unreported") + " · " + escapeHTML(objective.direction || "unreported") + '</span><span class="mono">server rule</span>';
            elements.weightList.appendChild(row);
          });
          return;
        }
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
          button.innerHTML = "<strong>" + escapeHTML(program.short) + "</strong><span>" + escapeHTML(state.scientificSnapshot ? serverStatusLabel(program) : status) + " · " + escapeHTML(state.scientificSnapshot ? program.candidateId : "packet r1") + " · selection is not a winner</span>";
          button.addEventListener("click", function () { selectProgram(program.id); });
          elements.programList.appendChild(button);
        });
      }

      function simulationComparisonCell(program) {
        if (BOOT.mode !== "http") return '<span class="badge skipped">NOT WIRED</span>';
        var node = findNode(program.simulationNodeId);
        if (!node) return '<span class="badge skipped">UNREPORTED</span>';
        var view = interpretabilityView(node.metadata.stationPayload);
        var label = program.displayMetricBasis === "REPRESENTATIVE_DEMO_SCENARIO_V1" && typeof program.metrics.tractability_fit === "number"
          ? "Fit " + program.metrics.tractability_fit + "/100"
          : (view ? view.headline.result : (node.execution || "UNREPORTED"));
        var badgeClass = String(node.execution || "").toLowerCase();
        return '<span class="badge ' + escapeHTML(badgeClass) + '">' + escapeHTML(label) + '</span><br><span class="micro muted">' + escapeHTML(node.outputOrigin || "UNREPORTED") + " · " + escapeHTML(node.resultBasis || "UNREPORTED") + "</span>";
      }

      function renderComparison() {
        elements.comparisonBody.innerHTML = "";
        visiblePrograms().forEach(function (program) {
          var row = document.createElement("tr");
          var status = programStatus(program);
          row.dataset.status = status;
          var scientificObjectives = state.scientificSnapshot
            ? '<br><span class="micro muted" data-server-objectives="true">' + escapeHTML(formatServerObjectives(program)) + "</span>"
            : "";
          row.innerHTML =
            '<td><button class="table-program" type="button">' + escapeHTML(program.short) + '</button><br><span class="micro muted">' + escapeHTML(program.uncertainty) + "</span>" + scientificObjectives + "</td>" +
            "<td>" + metricCell(program.metrics.rnpv, "$", "M") + (program.overflowRnpv ? '<br><span class="badge failed">above display domain</span>' : "") + "</td>" +
            "<td>" + metricCell(program.metrics.positive, "", "%") + "</td>" +
            "<td>" + metricCell(program.metrics.recruit, "", "/100") + "</td>" +
            "<td>" + metricCell(program.metrics.duration, "", " mo") + "</td>" +
            "<td>" + metricCell(program.metrics.plausibility, "", "/100") + "</td>" +
            "<td>" + simulationComparisonCell(program) + "</td>" +
            "<td><strong>" + escapeHTML(state.scientificSnapshot ? serverStatusLabel(program) : status) + "</strong></td>";
          row.querySelector(".table-program").addEventListener("click", function () { selectProgram(program.id); });
          elements.comparisonBody.appendChild(row);
        });
      }

      function renderParetoPlot() {
        var svg = elements.paretoPlot;
        if (state.scientificSnapshot) {
          document.getElementById("pareto-caption").innerHTML = "<strong>Server-native Pareto set:</strong> categorical membership from the pinned Highlander result. Positions below separate frontier, dominated, and incomparable packets; they do not encode browser-computed scientific magnitude.";
          svg.setAttribute("data-pareto-dimensions", "server-native-objective-policy");
          svg.setAttribute("aria-label", "Server-native Highlander Pareto membership");
          svg.innerHTML = '<line class="pareto-axis" x1="70" y1="210" x2="630" y2="210"/><text class="pareto-axis-label" x="150" y="35" text-anchor="middle">FRONTIER</text><text class="pareto-axis-label" x="350" y="35" text-anchor="middle">DOMINATED</text><text class="pareto-axis-label" x="550" y="35" text-anchor="middle">INCOMPARABLE / AWAITING</text>';
          var columnCounts = { "non-dominated": 0, dominated: 0, incomparable: 0 };
          state.runData.programs.forEach(function (program, index) {
            var status = programStatus(program);
            var columnX = status === "non-dominated" ? 150 : status === "dominated" ? 350 : 550;
            var rowIndex = columnCounts[status] || 0;
            columnCounts[status] = rowIndex + 1;
            var y = 70 + rowIndex * 45;
            var circle = document.createElementNS(svg.namespaceURI, "circle");
            circle.setAttribute("cx", String(columnX));
            circle.setAttribute("cy", String(y));
            circle.setAttribute("r", program.id === state.selectedProgramId ? "10" : "8");
            circle.setAttribute("class", "plot-point " + status + (program.id === state.selectedProgramId ? " selected" : ""));
            circle.setAttribute("data-plan-id", program.id);
            circle.setAttribute("data-server-status", serverStatusLabel(program));
            circle.setAttribute("tabindex", "0");
            circle.setAttribute("role", "button");
            circle.setAttribute("aria-label", "Candidate " + program.candidateId + "; server status " + serverStatusLabel(program));
            circle.addEventListener("click", function () { selectProgram(program.id); });
            svg.appendChild(circle);
            var label = document.createElementNS(svg.namespaceURI, "text");
            label.setAttribute("x", String(columnX + 16));
            label.setAttribute("y", String(y + 3));
            label.setAttribute("class", "plot-server-label");
            label.textContent = String(index + 1) + " · " + program.candidateId;
            svg.appendChild(label);
          });
          return;
        }
        document.getElementById("pareto-caption").innerHTML = '<strong>Three-dimensional Pareto view:</strong> P50 rNPV × recruitability × simulation / tractability. Each numbered point is one plan. Plans with identical vectors fan slightly around their shared coordinate. <span class="pareto-frontier-key">Nominal frontier projection</span> The line is a projected guide through complete non-dominated records, not a frontier surface or decision threshold. Missing values remain on a separate shelf. The current RA demo uses a labeled representative tractability fit on the Z axis; its native cached dossier remains shared across plans.';
        svg.setAttribute("data-pareto-dimensions", "roi,recruitability,simulation");
        svg.innerHTML = '<g class="pareto-depth-grid" aria-hidden="true"><line class="back-edge" x1="145" y1="135" x2="645" y2="135"/><line class="back-edge" x1="145" y1="135" x2="145" y2="15"/><line class="back-edge" x1="70" y1="60" x2="570" y2="60"/><line class="back-edge" x1="70" y1="60" x2="145" y2="15"/><line class="back-edge" x1="570" y1="180" x2="645" y2="135"/><line class="back-edge" x1="570" y1="180" x2="570" y2="60"/><line class="back-edge" x1="570" y1="60" x2="645" y2="15"/><line class="back-edge" x1="645" y1="135" x2="645" y2="15"/><line class="back-edge" x1="145" y1="15" x2="645" y2="15"/></g><line class="pareto-axis" x1="70" y1="180" x2="570" y2="180"/><line class="pareto-axis" x1="70" y1="180" x2="70" y2="60"/><line class="pareto-axis" x1="70" y1="180" x2="145" y2="135"/><text class="pareto-axis-label" x="320" y="207" text-anchor="middle">P50 rNPV · $M modeled →</text><text class="pareto-axis-label" x="18" y="120" transform="rotate(-90 18 120)" text-anchor="middle">Recruitability /100 →</text><text class="pareto-axis-label" x="89" y="151" transform="rotate(-31 89 151)">Simulation / tractability /100 →</text><line class="pareto-shelf" x1="70" y1="230" x2="645" y2="230"/><text x="70" y="244" font-size="7" fill="#7a817b">missing objective shelf · not plotted as zero</text><polyline id="nominal-pareto-frontier" class="pareto-frontier-line" data-pareto-frontier-line="nominal-projection" points="" role="img" aria-label="Nominal Pareto frontier projection"></polyline><text id="pareto-selected-plan" class="pareto-selection-label" x="350" y="28"></text>';
        var planCount = state.runData.programs.length;
        var plottedPrograms = state.runData.programs.map(function (program, index) {
          var vector = paretoVector(program);
          var complete = [vector.roi, vector.recruitability, vector.simulation].every(Number.isFinite);
          var roiPosition = complete ? Math.max(0, Math.min(250, vector.roi)) / 250 : null;
          var recruitabilityPosition = complete ? Math.max(0, Math.min(100, vector.recruitability)) / 100 : null;
          var simulationPosition = complete ? Math.max(0, Math.min(100, vector.simulation)) / 100 : null;
          return {
            program: program,
            status: programStatus(program),
            vector: vector,
            planNumber: index + 1,
            complete: complete,
            baseX: complete ? 70 + roiPosition * 500 + simulationPosition * 75 : 85 + (planCount <= 1 ? 0 : index / (planCount - 1) * 545),
            baseY: complete ? 180 - recruitabilityPosition * 120 - simulationPosition * 45 : 230,
            x: null,
            y: null,
            clustered: false
          };
        });
        plottedPrograms.forEach(function (point) {
          point.x = point.baseX;
          point.y = point.baseY;
        });
        var vectorClusters = new Map();
        plottedPrograms.filter(function (point) { return point.complete; }).forEach(function (point) {
          var key = [point.vector.roi, point.vector.recruitability, point.vector.simulation].join("|");
          if (!vectorClusters.has(key)) vectorClusters.set(key, []);
          vectorClusters.get(key).push(point);
        });
        vectorClusters.forEach(function (cluster) {
          if (cluster.length < 2) return;
          var radius = Math.min(16, 8 + cluster.length * 2);
          cluster.forEach(function (point, clusterIndex) {
            var angle = -Math.PI / 2 + clusterIndex * Math.PI * 2 / cluster.length;
            point.x = point.baseX + Math.cos(angle) * radius;
            point.y = point.baseY + Math.sin(angle) * radius;
            point.clustered = true;
          });
        });
        var nominalFrontier = plottedPrograms.filter(function (point) {
          return point.status === "non-dominated" && point.complete;
        }).sort(function (a, b) {
          return a.vector.roi - b.vector.roi || a.vector.recruitability - b.vector.recruitability || a.vector.simulation - b.vector.simulation || a.program.id.localeCompare(b.program.id);
        }).filter(function (point, index, points) {
          return index === 0 || point.vector.roi !== points[index - 1].vector.roi || point.vector.recruitability !== points[index - 1].vector.recruitability || point.vector.simulation !== points[index - 1].vector.simulation;
        });
        var frontierLine = document.getElementById("nominal-pareto-frontier");
        if (nominalFrontier.length === 1) {
          var onlyPoint = nominalFrontier[0];
          frontierLine.setAttribute("points", Math.max(46, onlyPoint.baseX - 20) + "," + onlyPoint.baseY + " " + Math.min(654, onlyPoint.baseX + 20) + "," + onlyPoint.baseY);
        } else if (nominalFrontier.length > 1) {
          frontierLine.setAttribute("points", nominalFrontier.map(function (point) { return point.baseX + "," + point.baseY; }).join(" "));
        } else {
          frontierLine.setAttribute("visibility", "hidden");
        }
        plottedPrograms.forEach(function (point) {
          var program = point.program;
          var status = point.status;
          var programLabel = program.short || program.label || program.id;
          if (point.clustered) {
            var stem = document.createElementNS(svg.namespaceURI, "line");
            stem.setAttribute("x1", String(point.baseX));
            stem.setAttribute("y1", String(point.baseY));
            stem.setAttribute("x2", String(point.x));
            stem.setAttribute("y2", String(point.y));
            stem.setAttribute("class", "pareto-cluster-stem");
            svg.appendChild(stem);
          }
          var circle = document.createElementNS(svg.namespaceURI, "circle");
          circle.setAttribute("cx", String(point.x));
          circle.setAttribute("cy", String(point.y));
          circle.setAttribute("r", program.id === state.selectedProgramId ? "9" : "7");
          circle.setAttribute("class", "plot-point " + status + (program.id === state.selectedProgramId ? " selected" : ""));
          circle.setAttribute("data-plan-id", program.id);
          circle.setAttribute("tabindex", "0");
          circle.setAttribute("role", "button");
          circle.setAttribute("aria-label", "Plan " + point.planNumber + ": " + programLabel + "; ROI " + (Number.isFinite(point.vector.roi) ? "$" + point.vector.roi + "M" : "missing") + "; recruitability " + (Number.isFinite(point.vector.recruitability) ? point.vector.recruitability + "/100" : "missing") + "; simulation or tractability " + (Number.isFinite(point.vector.simulation) ? point.vector.simulation + "/100" : "missing") + "; " + status + "; select plan");
          var title = document.createElementNS(svg.namespaceURI, "title");
          title.textContent = "Plan " + point.planNumber + " · " + programLabel + " · ROI " + (Number.isFinite(point.vector.roi) ? "$" + point.vector.roi + "M" : "missing") + " · recruitability " + (Number.isFinite(point.vector.recruitability) ? point.vector.recruitability + "/100" : "missing") + " · simulation / tractability " + (Number.isFinite(point.vector.simulation) ? point.vector.simulation + "/100" : "missing") + " · " + status;
          circle.appendChild(title);
          circle.addEventListener("click", function () { selectProgram(program.id); });
          circle.addEventListener("keydown", function (event) {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              selectProgram(program.id);
            }
          });
          svg.appendChild(circle);
          var planIndex = document.createElementNS(svg.namespaceURI, "text");
          planIndex.setAttribute("x", String(point.x));
          planIndex.setAttribute("y", String(point.y));
          planIndex.setAttribute("class", "plot-plan-index");
          planIndex.textContent = String(point.planNumber);
          svg.appendChild(planIndex);
          if (program.id === state.selectedProgramId) {
            var selectedLabel = document.getElementById("pareto-selected-plan");
            selectedLabel.textContent = "Selected plan " + point.planNumber + " · " + (programLabel.length > 52 ? programLabel.slice(0, 49) + "…" : programLabel);
          }
        });
      }

      function selectedProgram() {
        return state.runData.programs.find(function (program) { return program.id === state.selectedProgramId; }) || state.runData.programs[0] || null;
      }

      function renderScientificProgramDetail(program) {
        var candidate = scientificHighlanderCandidate(state.highlanderResult, program.candidateId);
        var status = serverStatusLabel(program);
        var qualifiers = candidate && Array.isArray(candidate.qualifiers) ? candidate.qualifiers : [];
        var incomparable = candidate && Array.isArray(candidate.incomparableReasons)
          ? candidate.incomparableReasons
          : [];
        var nodeRows = ["hypothesis", "recruitability", "simulation", "roi"].map(function (stageId) {
          var node = scientificNodeForStage(program.scientificBranch, stageId);
          if (!node) return "<li>" + escapeHTML(stageId) + ": not returned</li>";
          return "<li><strong>" + escapeHTML(node.module_id || scientificModuleId(stageId)) + ":</strong> " + escapeHTML(node.status || "UNREPORTED") + " · " + escapeHTML(node.output_origin || "UNREPORTED") + " · " + escapeHTML(node.reason_code || "no reason code") + "<br><span class=\"mono\">" + escapeHTML(node.output_hash || "no output hash") + "</span></li>";
        }).join("");
        elements.programDetail.innerHTML =
          '<div class="detail-callout"><strong>' + escapeHTML(program.candidateId + " · " + status) + '</strong><p>' + escapeHTML(program.publicWhy) + "</p></div>" +
          '<div class="objective-vector"><div class="objective"><span>Server status</span><strong>' + escapeHTML(status) + '</strong></div><div class="objective"><span>Branch status</span><strong>' + escapeHTML(program.branchStatus || "UNREPORTED") + '</strong></div><div class="objective"><span>Output hash</span><strong class="mono hash-clip">' + escapeHTML(program.hash) + "</strong></div></div>" +
          '<div class="detail-sections"><details open><summary>Server objective observations</summary><p>' + escapeHTML(formatServerObjectives(program)) + "</p><p><strong>Qualifiers:</strong> " + escapeHTML(qualifiers.length ? qualifiers.join(" · ") : "none reported") + "</p><p><strong>Incomparable reasons:</strong> " + escapeHTML(incomparable.length ? incomparable.join(" · ") : "none reported") + "</p></details>" +
          "<details open><summary>Producer terminal packets</summary><ul>" + nodeRows + "</ul></details>" +
          '<details><summary>Comparison provenance</summary><ul><li>Packet snapshot: <span class="mono">' + escapeHTML(state.packetSnapshot || "unreported") + '</span></li><li>Result hash: <span class="mono">' + escapeHTML(state.highlanderResultHash || "unreported") + '</span></li><li>Representative values excluded from scientific packet: ' + escapeHTML(state.scientificPacketExcludesRepresentativeValues ? "yes" : "not confirmed") + "</li></ul></details></div>";
        document.getElementById("open-source-node").dataset.nodeId = program.hypothesisNodeId;
      }

      function renderProgramDetail() {
        var program = selectedProgram();
        if (!program) {
          elements.programDetail.innerHTML = '<div class="state-warning">No candidates exist, so no program can be selected.</div>';
          return;
        }
        if (state.scientificSnapshot) {
          renderScientificProgramDetail(program);
          return;
        }
        var status = programStatus(program);
        var simulationMetric = simulationParetoValue(program);
        var whyStatus = status === "non-dominated"
          ? "No other complete record is at least as strong on P50 rNPV, recruitability, and simulation / tractability while being strictly stronger on one."
          : status === "dominated"
            ? "At least one complete record is no worse on all three baseline axes and stronger on at least one."
            : "A required objective is missing, so dominance is not inferred.";
        var tradeoffs = state.runData.programs.filter(function (candidate) { return candidate.id !== program.id && programStatus(candidate) === "non-dominated"; }).slice(0, 2).map(function (candidate) { return candidate.short; }).join("; ");
        var simulationNode = findNode(program.simulationNodeId);
        var simulationPacket = BOOT.mode === "http" && simulationNode
          ? (program.displayMetricBasis === "REPRESENTATIVE_DEMO_SCENARIO_V1"
            ? "representative fit " + program.metrics.tractability_fit + "/100 · native dossier " + (simulationNode.outputOrigin || "UNREPORTED")
            : (simulationNode.execution || "UNREPORTED") + " · " + (simulationNode.outputOrigin || "UNREPORTED") + " · " + (simulationNode.resultBasis || "UNREPORTED"))
          : "SKIPPED · MODULE_NOT_WIRED or NOT_AMENABLE · NOT WIRED";
        var evidenceAndGaps = BOOT.mode === "http"
          ? "Native station outputs and their shared interpretability objects remain inspectable. Module execution, output origin, basis, and qualifiers stay separate."
          : "Illustrative evidence and branch-linked proxy outputs; atomistic records are not wired and live citations are absent.";
        var failureHistory = BOOT.mode === "http"
          ? "Inspect each graph node for module execution and any fallback reason; a schema-valid fallback does not erase the failed live attempt."
          : (program.roiFailed || program.recruitFailed ? "one or more mock downstream records failed; sibling branches continued." : "no branch failure beyond the terminal simulation gap.");
        elements.programDetail.innerHTML =
          '<div class="detail-callout"><strong>' + escapeHTML(program.short) + " · " + escapeHTML(status) + '</strong><p>' + escapeHTML(program.publicWhy) + "</p></div>" +
          '<div class="objective-vector"><div class="objective"><span>P50 rNPV</span><strong>' + metricCell(program.metrics.rnpv, "$", "M") + '</strong></div><div class="objective"><span>Recruitability</span><strong>' + metricCell(program.metrics.recruit, "", "/100") + '</strong></div><div class="objective"><span>Simulation / tractability</span><strong>' + metricCell(simulationMetric, "", "/100") + "</strong></div></div>" +
          '<div class="detail-sections"><details open><summary>Why this Pareto status?</summary><p>' + escapeHTML(whyStatus) + "</p><p><strong>Selected viewing profile:</strong> " + escapeHTML(SCENARIOS[state.scenario].name) + " changes presentation order only. Baseline unweighted status remains <strong>" + escapeHTML(status) + "</strong>.</p><p><strong>Closest tradeoffs:</strong> " + escapeHTML(tradeoffs || "none with complete common axes") + ".</p></details>" +
          "<details><summary>Packet, uncertainty & qualifiers</summary><ul><li>Source branch: " + escapeHTML(program.short) + "</li><li>Packet revision/hash: " + escapeHTML(program.revision + " · " + program.hash) + "</li><li>Uncertainty: " + escapeHTML(program.uncertainty) + "</li><li>Simulation: " + escapeHTML(simulationPacket) + "</li><li>Comparison: HIGHLANDER CLIENT-SIDE · SERVER CONSUMER NOT WIRED</li></ul></details>" +
          "<details><summary>Evidence, counterevidence & gaps</summary><p>" + escapeHTML(evidenceAndGaps) + "</p><p><strong>Failure history:</strong> " + escapeHTML(failureHistory) + "</p></details>" +
          "<details><summary>What would change the conclusion?</summary><p>A grounded contradictory finding, validated atomistic evidence, decision-grade economic inputs, a materially different enrollment precedent, or a confirmed hard constraint could create a new decision-set version. Viewing weights alone cannot.</p></details></div>";
        document.getElementById("open-source-node").dataset.nodeId = program.hypothesisNodeId;
      }

      function renderHighlander() {
        if (!state.runData) return;
        renderServerHighlanderResult();
        renderScenario();
        renderProgramList();
        renderComparison();
        renderParetoPlot();
        renderProgramDetail();
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

      function launchHighlander() {
        if (!state.highlanderReady || !elements.gapConfirmInput.checked) return;
        if (state.scientificSnapshot) {
          if (state.highlanderLaunched) {
            switchScreen("highlander");
            return;
          }
          if (state.highlanderLaunching) return;
          state.highlanderLaunching = true;
          elements.launchHighlander.disabled = true;
          elements.launchHighlander.textContent = "Running server Highlander…";
          BOOT.http.launchHighlander(state.runId, true).then(function (response) {
            var snapshot = response && response.scientific ? response.scientific : response;
            if (!isScientificSnapshot(snapshot)) {
              throw new Error("server response did not include labrador.scientific-snapshot.v1");
            }
            ingestSnapshot(snapshot);
            if (!state.highlanderLaunched) {
              throw new Error("server did not mark the Highlander job launched");
            }
            showToast(state.highlanderResult
              ? "Server Highlander result loaded from " + (state.packetSnapshot || "the pinned packet") + "."
              : "Server launch completed without a comparison result; no browser substitute was created.");
            switchScreen("highlander");
          }).catch(function (error) {
            showToast("Server Highlander could not complete: " + String(error && error.message));
            announce("Server Highlander failed. Terminal producer packets remain visible; no browser comparison was substituted.");
          }).finally(function () {
            state.highlanderLaunching = false;
            renderReadiness();
          });
          return;
        }
        if (!state.highlanderLaunched) {
          state.highlanderLaunched = true;
          var nav = document.querySelector('[data-nav="highlander"]');
          if (nav) {
            nav.disabled = false;
            nav.classList.remove("locked");
          }
          showToast(BOOT.mode === "http"
            ? "Client-side advisory comparison opened from " + state.packetSnapshot + "; server Highlander consumer remains NOT WIRED."
            : "One idempotent mock Highlander job created from " + state.packetSnapshot + ".");
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

        document.querySelectorAll(".metric-button").forEach(function (button) {
          button.addEventListener("click", function () {
            var stage = button.dataset.metricStage;
            var value = button.dataset.metricValue;
            var priorX = new Map(state.nodes.map(function (node) { return [node.id, node.x]; }));
            state.metrics[stage] = value;
            document.querySelectorAll('[data-metric-stage="' + stage + '"]').forEach(function (candidate) {
              candidate.setAttribute("aria-pressed", candidate === button ? "true" : "false");
            });
            renderGraph();
            var xStable = state.nodes.every(function (node) { return priorX.get(node.id) === node.x; });
            announce(METRICS[stage][value].label + " selected. Presentation changed; stored records and x lanes " + (xStable ? "remain unchanged." : "changed unexpectedly."));
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

        document.querySelectorAll("[data-close-dialog]").forEach(function (button) {
          button.addEventListener("click", function () {
            var dialog = document.getElementById(button.dataset.closeDialog);
            if (dialog.open) dialog.close();
          });
        });
      }

      function applyBootMode() {
        if (BOOT.mode !== "http") return;

        var setupModeChip = document.getElementById("setup-mode-chip");
        setupModeChip.textContent = "Local orchestrated run";
        setupModeChip.classList.remove("mock");
        elements.runButton.textContent = "Run local exploration →";
        document.querySelector('.rail-band[data-stage="simulation"] h2').textContent = "Target tractability";
        state.metrics.simulation = "tractability_fit";
        document.querySelectorAll('[data-metric-stage="simulation"]').forEach(function (button) {
          if (button.dataset.metricValue === "support") {
            button.dataset.metricValue = "tractability_fit";
            button.textContent = "Branch tractability fit";
            button.hidden = false;
            button.setAttribute("aria-pressed", "true");
          } else {
            button.hidden = true;
            button.setAttribute("aria-pressed", "false");
          }
        });
        document.getElementById("simulation-axis-source").innerHTML = "0–100<br>representative";
        document.getElementById("gap-confirm-copy").textContent = "I acknowledge terminal packet gaps, cached outputs, and labeled fallbacks. Continue to the advisory client-side comparison.";
        document.getElementById("restart-demo").textContent = "Refresh snapshot now";
        elements.freshnessButton.style.display = "none"; // freshness is real in http mode
        document.getElementById("highlander-mode-description").textContent = "Client-side Pareto comparison";
        document.getElementById("highlander-mode-chip").textContent = "CLIENT-SIDE COMPARISON";
        document.getElementById("highlander-mode-chip").classList.remove("mock");
        document.getElementById("highlander-server-chip").textContent = "SERVER CONSUMER NOT WIRED";
        document.getElementById("comparison-mode-badge").textContent = "backend snapshot";
        elements.chatLog.innerHTML = '<div class="chat-message assistant"><span class="answer-label">Scope</span> I can synthesize only the immutable backend run snapshot. I cannot browse, mutate a station record, or create new evidence.</div>';
        document.querySelector('label[for="chat-input"]').textContent = "Ask about this run";
        document.getElementById("module-dialog-summary").textContent = "This judging UI reads the local orchestrator snapshot. Each node reports module execution, output origin, result basis, runtime maturity, and qualifiers separately.";
        document.querySelector("#module-dialog .module-table thead th:last-child").textContent = "Local judging truth";
        document.querySelector("#module-dialog .module-table tbody").innerHTML =
          "<tr><td>Evidence mapping</td><td>research-evidence-mapper</td><td>Rendered from the orchestrator packet; inspect LIVE/CACHED/FALLBACK origin on the node.</td></tr>" +
          "<tr><td>Hypothesis generation</td><td>Hypothesis_Generator</td><td>Rendered from the orchestrator packet with the native station payload preserved.</td></tr>" +
          "<tr><td>ROI / impact</td><td>rnpv-roi-calculator</td><td>Rendered with decision-grade qualifiers kept visible.</td></tr>" +
          "<tr><td>Recruitability</td><td>clinical_simulation</td><td>A failed live attempt and schema-valid DEMO_FALLBACK remain separate truths.</td></tr>" +
          "<tr><td>Tractability</td><td>simulation</td><td>Validated cached output is inspectable; no scalar atomistic score is imputed.</td></tr>" +
          "<tr><td>Highlander</td><td>hypothesis-highlander</td><td>CLIENT-SIDE COMPARISON · SERVER CONSUMER NOT WIRED.</td></tr>";

        if (BOOT.launchMode === "scientific") {
          setupModeChip.textContent = "Scientific replay · explicit IRAK4 preset";
          elements.runButton.textContent = "Run scientific branch pipeline →";
          elements.maxHypotheses.value = "1";
          elements.maxHypotheses.disabled = true;
          state.metrics.simulation = "support";
          document.querySelectorAll('[data-metric-stage="simulation"]').forEach(function (button) {
            if (button.dataset.metricValue === "tractability_fit") {
              button.dataset.metricValue = "support";
              button.textContent = "Native dossier (categorical)";
              button.hidden = false;
              button.setAttribute("aria-pressed", "true");
            } else {
              button.hidden = true;
              button.setAttribute("aria-pressed", "false");
            }
          });
          document.getElementById("simulation-axis-source").innerHTML = "categorical<br>native artifact";
          document.getElementById("highlander-mode-description").textContent = "Server-native producer packet comparison";
          document.getElementById("highlander-mode-chip").textContent = "SERVER HIGHLANDER";
          document.getElementById("highlander-server-chip").textContent = "AWAITING PACKETS";
          document.getElementById("comparison-mode-badge").textContent = "server result";
          document.getElementById("gap-confirm-copy").textContent = "I acknowledge terminal producer failures remain visible and incomparable. Run the pinned server Highlander consumer.";
          document.getElementById("module-dialog-summary").textContent = "Explicit scientific mode uses the checked-in IRAK4/RA v3 setup frame, deterministic replay, one HypGen run per evidence focus, and server-native Highlander.";
          document.querySelector("#module-dialog .module-table tbody").innerHTML =
            "<tr><td>Evidence mapping</td><td>research-evidence-mapper</td><td>One explicit replay; only real biomarker and supported process focuses become branches.</td></tr>" +
            "<tr><td>Hypothesis generation</td><td>Hypothesis_Generator</td><td>One full provider-shaped replay per selected focus.</td></tr>" +
            "<tr><td>ROI / impact</td><td>rnpv-roi-calculator</td><td>Native output uses the separate analyst-supplied valuation frame.</td></tr>" +
            "<tr><td>Recruitability</td><td>clinical_simulation</td><td>Native simulated_* fields remain unchanged and visible.</td></tr>" +
            "<tr><td>Tractability</td><td>simulation</td><td>Native categorical dossier; no browser scalar is invented.</td></tr>" +
            "<tr><td>Highlander</td><td>hypothesis-highlander</td><td>Pinned server consumer; packet hashes, Pareto membership, and next evidence action are rendered verbatim.</td></tr>";
        }
        if (BOOT.runId) {
          setupModeChip.textContent = "Attach read-only · " + BOOT.runId;
          elements.runButton.textContent = "Attach to configured run →";
        }
      }

      function initialize() {
        updateDualRange("biomarker", "low");
        updateDualRange("hypothesis", "low");
        bindEvents();
        applyBootMode();
        validateSetup();
        renderProgress();
        if (BOOT.runId) attachConfiguredRun(BOOT.runId);
      }

      initialize();
    }());
