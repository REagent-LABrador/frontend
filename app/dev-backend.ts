// LABrador reference dev backend — a dependency-free Bun server implementing
// frontend/app/API-CONTRACT.md exactly, so backend engineers have a runnable
// reference and the frontend's http mode is demonstrable today.
//
// Run (from the frontend/ directory — the station example is resolved relative
// to this file, so any cwd works):
//
//   bun app/dev-backend.ts          # listens on http://localhost:8787
//   bun app/dev-backend.ts 9000     # optional first arg overrides the port
//
// Then serve the frontend on :4173 and open:
//
//   http://localhost:4173/app/?backend=http&base=http://localhost:8787
//
// What it does:
//   GET  /api/meta                  — honesty labels + module maturity
//   POST /api/runs                  — immutable setup snapshot -> { run: { run_id } }
//   GET  /api/runs/:id/snapshot     — STAGED REPLAY driven by elapsed time since
//                                     run creation (biomarker terminal at +3s,
//                                     hypothesis +6s, roi +9s, recruitability +12s,
//                                     simulation skipped/terminal +14s)
//   POST /api/runs/:id/chat         — canned answer grounded in the run's own
//                                     returned records; abstains on out-of-scope
//
// Honesty notes:
//   - This is a STATIC REPLAY of illustrative reference data (the same values as
//     the frontend's in-page mock, so the two modes are comparable). No module
//     is actually called.
//   - The ONE real thing served: the committed clinical_simulation station result
//     (dupi-eoe-2018-hindcast) is read from disk at startup and attached VERBATIM
//     to one program's station_payloads.recruitability.
//   - Ceilings are ceilings, not quotas: the replay never returns more
//     biomarkers/programs than the run's own submitted setup requested; when the
//     setup requests fewer than the reference data holds, the data is truncated
//     and the stage note says so.

type StageId = "biomarker" | "hypothesis" | "roi" | "recruitability" | "simulation";

type RunSetup = {
  clinical_indication?: { submitted_text?: string };
  biomarker_exploration_range?: { lower?: number; upper?: number };
  maximum_biomarkers?: number;
  maximum_literature_papers?: number;
  hypothesis_boldness_range?: { lower?: number; upper?: number };
  maximum_hypotheses_per_biomarker?: number;
};

type RunRecord = {
  runId: string;
  createdAtMs: number;
  createdAtIso: string;
  setup: RunSetup; // stored verbatim as submitted — the run record is immutable
};

type WireProgram = {
  id: string;
  lane: number;
  biomarker_slot: number;
  hypothesis_slot: number;
  label: string;
  short_label: string;
  metrics: Record<string, number | null>;
  uncertainty: string;
  public_why: string;
  roi_failed: boolean;
  recruit_failed: boolean;
  overflow_rnpv: boolean;
  not_amenable: boolean;
  revision: string;
  hash: string;
  station_payloads: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Reference data — the SAME illustrative values as the frontend mock
// (frontend/app/js/app.js BIOMARKER_TEMPLATES / HYPOTHESIS_TEMPLATES), so mock
// mode and http mode render comparable runs. Illustrative, not decision-grade.
// ---------------------------------------------------------------------------

const REFERENCE_BIOMARKERS = [
  {
    label: "IL6R",
    summary: "Inflammatory signaling anchor",
    metrics: { exploration: 1, evidence: 86, pursuit: 3 },
    uncertainty: "±8 proxy points",
  },
  {
    label: "TYK2",
    summary: "Cytokine pathway regulator",
    metrics: { exploration: 4, evidence: 74, pursuit: 2 },
    uncertainty: "±11 proxy points",
  },
  {
    label: "NLRP3",
    summary: "Inflammasome activation node",
    metrics: { exploration: 7, evidence: 62, pursuit: 2 },
    uncertainty: "±14 proxy points",
  },
] as const;

type ReferenceHypothesis = {
  label: string;
  short: string;
  boldness: number;
  evidence: number;
  plausibility: number;
  rnpv: number | null;
  positive: number | null;
  impact: number | null;
  recruit: number | null;
  duration: number | null;
  screens: number | null;
  risk: number | null;
  roiFailed?: boolean;
  recruitFailed?: boolean;
  overflowRnpv?: boolean;
  notAmenable?: boolean;
  uncertainty: string;
  publicWhy: string;
};

const REFERENCE_HYPOTHESES: ReferenceHypothesis[][] = [
  [
    {
      label: "Stromal memory disruption",
      short: "IL6R · stromal memory",
      boldness: 5, evidence: 72, plausibility: 70,
      rnpv: 145, positive: 58, impact: 82,
      recruit: 89, duration: 18, screens: 2.2, risk: 24,
      uncertainty: "rNPV P10–P90: $52M–$261M",
      publicWhy: "Strong recruitability and clinical-impact proxies offset a lower modeled cash value than several alternatives.",
    },
    {
      label: "Peripheral tolerance pulse",
      short: "IL6R · tolerance pulse",
      boldness: 7, evidence: 64, plausibility: 84,
      rnpv: 120, positive: 54, impact: 76,
      recruit: 91, duration: 17, screens: 2.0, risk: 20,
      uncertainty: "rNPV P10–P90: $30M–$236M",
      publicWhy: "Highest biological-plausibility and recruitability proxies preserve a frontier tradeoff despite lower modeled value.",
    },
    {
      label: "Synovial clock reset",
      short: "IL6R · synovial reset",
      boldness: 8, evidence: 41, plausibility: 52,
      rnpv: 98, positive: 39, impact: 64,
      recruit: 68, duration: 25, screens: 3.6, risk: 46,
      uncertainty: "rNPV P10–P90: −$18M–$205M",
      publicWhy: "The record is dominated on the available baseline axes and remains useful as an explicit comparison.",
    },
  ],
  [
    {
      label: "Immune checkpoint reset",
      short: "TYK2 · checkpoint reset",
      boldness: 7, evidence: 68, plausibility: 78,
      rnpv: 182, positive: 61, impact: 84,
      recruit: 74, duration: 22, screens: 3.1, risk: 38,
      uncertainty: "rNPV P10–P90: $61M–$312M",
      publicWhy: "Balanced modeled value, plausibility, and recruitability make this record non-dominated without making it a winner.",
    },
    {
      label: "Isoform-selective switch",
      short: "TYK2 · isoform switch",
      boldness: 9, evidence: 57, plausibility: 72,
      rnpv: 195, positive: 57, impact: 79,
      recruit: 60, duration: 28, screens: 4.2, risk: 54,
      uncertainty: "rNPV P10–P90: $38M–$347M",
      publicWhy: "Higher modeled value trades against weaker recruitment, retaining a distinct frontier position.",
    },
    {
      label: "Tissue-selective modulation",
      short: "TYK2 · tissue selective",
      boldness: 9, evidence: 46, plausibility: 80,
      rnpv: null, positive: null, impact: 88,
      recruit: null, duration: null, screens: null, risk: null,
      roiFailed: true, recruitFailed: true,
      uncertainty: "Economics and recruitment outputs missing",
      publicWhy: "Incomparable because required objective records failed; missing values are not treated as zero.",
    },
  ],
  [
    {
      label: "Trained-immunity brake",
      short: "NLRP3 · trained immunity",
      boldness: 8, evidence: 62, plausibility: 66,
      rnpv: 280, positive: 49, impact: 91,
      recruit: 52, duration: 31, screens: 5.4, risk: 68,
      overflowRnpv: true, notAmenable: true,
      uncertainty: "rNPV P10–P90: $44M–$426M",
      publicWhy: "The raw $280M modeled value exceeds the display domain and trades against slower simulated recruitment.",
    },
  ],
];

// ---------------------------------------------------------------------------
// The one REAL artifact: the committed clinical_simulation station result,
// read at startup and attached verbatim (never renamed, never edited).
// ---------------------------------------------------------------------------

const STATION_EXAMPLE_PATH = new URL(
  "../../clinical_simulation/schemas/examples/dupi-eoe-2018-hindcast.result.json",
  import.meta.url,
).pathname;

let STATION_EXAMPLE_RECRUITABILITY: Record<string, unknown>;
try {
  STATION_EXAMPLE_RECRUITABILITY = await Bun.file(STATION_EXAMPLE_PATH).json();
} catch (error) {
  console.error(
    `FATAL: could not read the real station example at ${STATION_EXAMPLE_PATH}\n` +
    "The reference backend refuses to start without it — attaching the real " +
    "clinical_simulation output verbatim is the point of this server.\n" +
    String(error),
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Staged replay schedule (elapsed ms since run creation until stage terminal)
// ---------------------------------------------------------------------------

const STAGE_SCHEDULE: { stageId: StageId; completeAtMs: number }[] = [
  { stageId: "biomarker", completeAtMs: 3_000 },
  { stageId: "hypothesis", completeAtMs: 6_000 },
  { stageId: "roi", completeAtMs: 9_000 },
  { stageId: "recruitability", completeAtMs: 12_000 },
  { stageId: "simulation", completeAtMs: 14_000 },
];
const REPLAY_TOTAL_MS = 14_000;

// ---------------------------------------------------------------------------
// In-memory run store
// ---------------------------------------------------------------------------

const runs = new Map<string, RunRecord>();
let runCounter = 0;

function nextRunId(): string {
  runCounter += 1;
  return `LR-DEV-${String(runCounter).padStart(6, "0")}`;
}

// ---------------------------------------------------------------------------
// Snapshot assembly — everything derived from the run's OWN submitted ceilings
// ---------------------------------------------------------------------------

function ceilingNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return Math.floor(value);
}

function buildSnapshot(run: RunRecord) {
  const elapsedMs = Date.now() - run.createdAtMs;

  // Ceilings from the run's own immutable setup (validated at POST time).
  const maxBiomarkers = ceilingNumber(run.setup.maximum_biomarkers) ?? 0;
  const maxHypotheses = ceilingNumber(run.setup.maximum_hypotheses_per_biomarker) ?? 0;
  const maxPapers = ceilingNumber(run.setup.maximum_literature_papers);

  const terminal = (stageId: StageId): boolean => {
    const entry = STAGE_SCHEDULE.find((item) => item.stageId === stageId);
    return entry !== undefined && elapsedMs >= entry.completeAtMs;
  };

  // --- Biomarkers: never more than requested; truncate reference data to the
  // ceiling; a request beyond the reference set is an honest shortfall.
  const returnedBiomarkerCount = Math.min(maxBiomarkers, REFERENCE_BIOMARKERS.length);
  const biomarkers = terminal("biomarker")
    ? REFERENCE_BIOMARKERS.slice(0, returnedBiomarkerCount).map((template, slot) => ({
        slot,
        label: template.label,
        summary: template.summary,
        metrics: { ...template.metrics },
        uncertainty:
          template.uncertainty +
          (maxPapers === null ? "" : ` · search scope: ${maxPapers}-paper cap`),
      }))
    : [];

  // --- Programs: lanes are b * maxHypotheses + h and immutable for the run;
  // unreturned lanes stay scaffolds (they are simply absent from `programs`).
  const requestedLanes = maxBiomarkers * maxHypotheses;
  const roiTerminal = terminal("roi");
  const recruitTerminal = terminal("recruitability");
  let hypothesisTruncated = false;

  const programs: WireProgram[] = [];
  if (terminal("hypothesis")) {
    for (let b = 0; b < returnedBiomarkerCount; b += 1) {
      const templates = REFERENCE_HYPOTHESES[b] ?? [];
      if (maxHypotheses < templates.length) hypothesisTruncated = true;
      for (let h = 0; h < Math.min(maxHypotheses, templates.length); h += 1) {
        const template = templates[h];
        const roiFailed = roiTerminal && Boolean(template.roiFailed);
        const recruitFailed = recruitTerminal && Boolean(template.recruitFailed);
        programs.push({
          id: `program-${programs.length + 1}`,
          lane: b * maxHypotheses + h,
          biomarker_slot: b,
          hypothesis_slot: h,
          label: template.label,
          short_label: template.short,
          metrics: {
            boldness: template.boldness,
            evidence: template.evidence,
            plausibility: template.plausibility,
            // Missing is not zero: a metric a stage has not produced yet is null.
            rnpv: roiTerminal ? template.rnpv : null,
            positive: roiTerminal ? template.positive : null,
            impact: roiTerminal ? template.impact : null,
            recruit: recruitTerminal ? template.recruit : null,
            duration: recruitTerminal ? template.duration : null,
            screens: recruitTerminal ? template.screens : null,
            risk: recruitTerminal ? template.risk : null,
            support: null, // simulation module NOT WIRED — never fabricated
            occupancy: null,
            convergence: null,
          },
          uncertainty: roiTerminal
            ? template.uncertainty
            : "modeled ranges pending · roi stage not terminal",
          public_why: template.publicWhy,
          roi_failed: roiFailed,
          recruit_failed: recruitFailed,
          overflow_rnpv: roiTerminal && Boolean(template.overflowRnpv),
          not_amenable: recruitTerminal && Boolean(template.notAmenable),
          revision: "packet-r1",
          hash: `dev-unhashed-b${b + 1}h${h + 1}`,
          station_payloads: {},
        });
      }
    }
  }

  // Attach the REAL station result verbatim to one program (lane 1 when it
  // exists, mirroring the mock; otherwise the first program) once the
  // recruitability stage is terminal.
  if (recruitTerminal && programs.length > 0) {
    const host = programs.find((program) => program.lane === 1) ?? programs[0];
    host.station_payloads = { recruitability: STATION_EXAMPLE_RECRUITABILITY };
  }

  const roiFailures = programs.filter((program) => program.roi_failed).length;
  const recruitFailures = programs.filter((program) => program.recruit_failed).length;

  // --- Stage rows: requested/returned + honest note per stage.
  const stageRows = STAGE_SCHEDULE.map(({ stageId, completeAtMs }, index) => {
    const previousCompleteAt = index === 0 ? 0 : STAGE_SCHEDULE[index - 1].completeAtMs;
    const isTerminal = elapsedMs >= completeAtMs;
    const isRunning = !isTerminal && elapsedMs >= previousCompleteAt;

    let requested = 0;
    let returned = 0;
    let note = "queued";
    let status: "QUEUED" | "RUNNING" | "COMPLETE" | "COMPLETE_WITH_WARNINGS" = "QUEUED";

    if (stageId === "biomarker") requested = maxBiomarkers;
    else if (stageId === "hypothesis") requested = requestedLanes;
    else requested = programs.length || (isTerminal || isRunning ? requestedLanes : 0);

    if (isRunning) {
      status = "RUNNING";
      note = `0 complete · ${requested} running`;
    } else if (isTerminal) {
      switch (stageId) {
        case "biomarker": {
          returned = returnedBiomarkerCount;
          const shortfall = maxBiomarkers - returnedBiomarkerCount;
          if (shortfall > 0) {
            status = "COMPLETE_WITH_WARNINGS";
            note = `${returned} complete · ${shortfall} shortfall (reference set holds ${REFERENCE_BIOMARKERS.length} candidates)`;
          } else if (maxBiomarkers < REFERENCE_BIOMARKERS.length) {
            status = "COMPLETE";
            note = `${returned} complete · truncated to submitted ceiling of ${maxBiomarkers} (reference set holds ${REFERENCE_BIOMARKERS.length})`;
          } else {
            status = "COMPLETE";
            note = `${returned} complete`;
          }
          break;
        }
        case "hypothesis": {
          returned = programs.length;
          const unused = requestedLanes - programs.length;
          const parts = [`${returned} complete`];
          if (unused > 0) parts.push(`${unused} capacity unused`);
          if (hypothesisTruncated)
            parts.push(`truncated to submitted ceiling of ${maxHypotheses}/biomarker`);
          status = unused > 0 ? "COMPLETE_WITH_WARNINGS" : "COMPLETE";
          note = parts.join(" · ");
          break;
        }
        case "roi": {
          returned = programs.length - roiFailures;
          status = roiFailures > 0 ? "COMPLETE_WITH_WARNINGS" : "COMPLETE";
          note = roiFailures > 0
            ? `${returned} complete · ${roiFailures} failed`
            : `${returned} complete`;
          break;
        }
        case "recruitability": {
          returned = programs.length - recruitFailures;
          status = recruitFailures > 0 ? "COMPLETE_WITH_WARNINGS" : "COMPLETE";
          note = (recruitFailures > 0
            ? `${returned} complete · ${recruitFailures} failed`
            : `${returned} complete`) + " · static replay; 1 real station example attached verbatim";
          break;
        }
        case "simulation": {
          returned = 0;
          status = "COMPLETE_WITH_WARNINGS";
          note = `${programs.length} terminal gaps · skipped (module NOT WIRED)`;
          break;
        }
        default:
          break;
      }
    }

    return { stage_id: stageId, execution_status: status, note, requested, returned };
  });

  const nonterminalCount = stageRows.filter(
    (row) => row.execution_status === "QUEUED" || row.execution_status === "RUNNING",
  ).length;
  const highlanderReady = nonterminalCount === 0 && programs.length > 0;

  return {
    run_id: run.runId,
    updated_at: new Date().toISOString(),
    // Monotonic within a run: grows with replay progress, then holds steady.
    last_event_id: Math.floor(Math.min(elapsedMs, REPLAY_TOTAL_MS) / 500),
    stages: stageRows,
    biomarkers,
    programs,
    highlander_ready: highlanderReady,
    highlander_blocked_reason: highlanderReady
      ? null
      : nonterminalCount > 0
        ? `${nonterminalCount} stages nonterminal`
        : "no candidate programs returned",
  };
}

// ---------------------------------------------------------------------------
// Chat — grounded strictly in the run's own returned records; abstains honestly
// ---------------------------------------------------------------------------

function buildChatResponse(run: RunRecord, question: string) {
  const normalized = String(question).toLowerCase();

  if (/latest|external|web|guideline|news|outside|other run/.test(normalized)) {
    return {
      answer:
        "Scope abstention: external information is outside this immutable run snapshot. " +
        "This reference backend cannot browse or import evidence.",
      labels: ["abstention", "outside run"],
      citations: [],
      abstention: true,
    };
  }

  const snapshot = buildSnapshot(run);
  const programs = snapshot.programs;
  if (programs.length === 0) {
    return {
      answer:
        "Evidence-gap abstention: this run has no returned candidate records yet " +
        "(the hypothesis stage is not terminal, or the submitted ceilings requested zero candidates), " +
        "so no grounded answer exists.",
      labels: ["abstention", "evidence gap"],
      citations: [],
      abstention: true,
    };
  }

  const lead = programs[0];
  const failed = programs.filter((program) => program.roi_failed || program.recruit_failed);
  const answer =
    `This run returned ${programs.length} candidate program record${programs.length === 1 ? "" : "s"}. ` +
    `${lead.short_label} (lane ${lead.lane}) leads the returned set: ${lead.public_why} ` +
    (failed.length > 0
      ? `${failed.length} record${failed.length === 1 ? "" : "s"} carr${failed.length === 1 ? "ies" : "y"} failed objective outputs and stay${failed.length === 1 ? "s" : ""} incomparable rather than being scored as zero. `
      : "") +
    "All displayed metrics are an illustrative static replay from this reference backend; " +
    "the only real artifact is the clinical_simulation station output attached verbatim to one recruitability record.";

  return {
    answer,
    labels: ["source output", "inference / synthesis"],
    citations: programs.slice(0, 3).map((program) => ({
      record_id: `hyp-slot-${program.lane}`,
      node_id: `hyp-slot-${program.lane}`,
      label: `Hypothesis record · ${program.short_label}`,
    })),
    abstention: false,
  };
}

// ---------------------------------------------------------------------------
// HTTP plumbing — CORS on everything (frontend is served from :4173), every
// body application/json, contract error envelope on every non-2xx.
// ---------------------------------------------------------------------------

const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-max-age": "86400",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json", ...CORS_HEADERS },
  });
}

function errorEnvelope(status: number, code: string, message: string): Response {
  return json({ error: { code, message } }, status);
}

const META = {
  backend: "labrador-dev-reference",
  truth_labels: [
    "PROPOSED TARGET",
    "REFERENCE DEV BACKEND",
    "STATIC REPLAY — 1 REAL STATION EXAMPLE",
  ],
  modules: [
    { name: "clinical_simulation", runtime_maturity: "LOCAL" },
    { name: "biomarker_discovery", runtime_maturity: "NOT WIRED" },
    { name: "hypothesis_generation", runtime_maturity: "NOT WIRED" },
    { name: "roi_modeling", runtime_maturity: "NOT WIRED" },
    { name: "atomistic_simulation", runtime_maturity: "NOT WIRED" },
  ],
};

const port = Number(Bun.argv[2]) || 8787;

const server = Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // GET /api/meta
    if (path === "/api/meta" && request.method === "GET") {
      return json(META);
    }

    // POST /api/runs
    if (path === "/api/runs" && request.method === "POST") {
      let setup: RunSetup;
      try {
        setup = (await request.json()) as RunSetup;
      } catch {
        return errorEnvelope(400, "INVALID_JSON", "Request body must be valid JSON.");
      }
      if (
        ceilingNumber(setup?.maximum_biomarkers) === null ||
        ceilingNumber(setup?.maximum_hypotheses_per_biomarker) === null
      ) {
        return errorEnvelope(
          400,
          "INVALID_SETUP",
          "maximum_biomarkers and maximum_hypotheses_per_biomarker must be non-negative numbers.",
        );
      }
      const now = Date.now();
      const run: RunRecord = {
        runId: nextRunId(),
        createdAtMs: now,
        createdAtIso: new Date(now).toISOString(),
        setup, // verbatim; immutable — a changed setup is a different run
      };
      runs.set(run.runId, run);
      console.log(`[${run.createdAtIso}] created ${run.runId} (replay terminal in ${REPLAY_TOTAL_MS / 1000}s)`);
      return json({ run: { run_id: run.runId } }, 201);
    }

    // GET /api/runs/:id/snapshot
    const snapshotMatch = path.match(/^\/api\/runs\/([^/]+)\/snapshot$/);
    if (snapshotMatch && request.method === "GET") {
      const run = runs.get(decodeURIComponent(snapshotMatch[1]));
      if (!run) {
        return errorEnvelope(404, "RUN_NOT_FOUND", "No run with that id exists on this in-memory reference backend (runs do not survive a restart).");
      }
      return json(buildSnapshot(run));
    }

    // POST /api/runs/:id/chat
    const chatMatch = path.match(/^\/api\/runs\/([^/]+)\/chat$/);
    if (chatMatch && request.method === "POST") {
      const run = runs.get(decodeURIComponent(chatMatch[1]));
      if (!run) {
        return errorEnvelope(404, "RUN_NOT_FOUND", "No run with that id exists on this in-memory reference backend (runs do not survive a restart).");
      }
      let body: { question?: unknown };
      try {
        body = (await request.json()) as { question?: unknown };
      } catch {
        return errorEnvelope(400, "INVALID_JSON", "Request body must be valid JSON.");
      }
      if (typeof body?.question !== "string" || body.question.trim() === "") {
        return errorEnvelope(400, "INVALID_QUESTION", 'Body must be { "question": "…" } with a non-empty string.');
      }
      return json(buildChatResponse(run, body.question));
    }

    return errorEnvelope(404, "NOT_FOUND", `No route for ${request.method} ${url.pathname}.`);
  },
});

console.log(
  `LABrador reference dev backend listening on http://localhost:${server.port}\n` +
  `Frontend: http://localhost:4173/app/?backend=http&base=http://localhost:${server.port}\n` +
  `Real station example loaded from ${STATION_EXAMPLE_PATH}`,
);
