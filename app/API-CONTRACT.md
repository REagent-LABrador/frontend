# LABrador frontend ↔ backend API contract (v0)

The functional frontend runs in two modes. The hackathon judging path serves
the UI and API from one orchestrator process at `http://127.0.0.1:8787/`.

| Mode | URL | Data source |
|---|---|---|
| http (default) | `/` | The REST API below on the same origin that served the frontend. Split-process development can override it with `?base=…`. |
| mock | `/?backend=mock` | In-page deterministic demo. Zero network. |

Everything the graph, inspector, Highlander screen, and chat render in http mode
comes from these endpoints. Wire format is **snake_case** (REagent-LABrador org
convention). A backend that implements `POST /api/runs` and
`GET /api/runs/:id/snapshot` gets the full three-screen UI for free.

When the frontend is served separately on `:4173`, open
`http://localhost:4173/?base=http://localhost:8787`; an unqualified `:4173/`
now correctly targets `:4173` itself.

## CORS (split-process development only)

The deployment story is cross-origin: the frontend on `:4173` calls the
backend on `:8787`. Backends **MUST** send `Access-Control-Allow-Origin`
(dev: `*`) on every API response and **MUST** handle `OPTIONS` preflight
requests, responding `204 No Content` with the CORS headers. The `204`
preflight response is a documented exception to the "every response is
`application/json`" rule.

## Endpoints

### `GET /api/meta` — optional
Lets the backend declare its own honesty labels for the header truth strip.

```json
{
  "backend": "labrador-orchestrator",
  "truth_labels": ["PROPOSED TARGET", "1 OF 5 STATIONS LIVE"],
  "modules": [
    { "name": "clinical_simulation", "runtime_maturity": "LOCAL" },
    { "name": "hypothesis_generation", "runtime_maturity": "NOT WIRED" }
  ]
}
```
If absent (404), HTTP mode keeps conservative local-backend labels and never
shows the static mock labels. When `/api/meta` responds, its labels
**REPLACE** those temporary labels — they describe the active backend, so
stale labels must not linger. (The
qualifiers-accumulate rule governs data lineage fields elsewhere in the
contract, not this strip.) **Never claim more maturity than is live-verified.**

### `POST /api/runs`
Body — the immutable setup snapshot exactly as submitted (ceilings are
ceilings, not quotas):

```json
{
  "clinical_indication": { "submitted_text": "Rheumatoid arthritis" },
  "biomarker_exploration_range": { "lower": 1, "upper": 10 },
  "maximum_biomarkers": 3,
  "maximum_literature_papers": 40,
  "hypothesis_boldness_range": { "lower": 1, "upper": 10 },
  "maximum_hypotheses_per_biomarker": 3
}
```

Response `201`/`200`:

```json
{ "run": { "run_id": "LR-2026-000123" } }
```

The run record is immutable once created; a changed setup is a different run.

### `GET /api/runs/:id/snapshot`
Polled every 5s until every stage is terminal (then polling stops). On failure
the client keeps the last confirmed data, backs off 5s → 10s → 20s → 60s, and
shows STALE / REFRESH_ERROR; it never fabricates a snapshot.

```json
{
  "run_id": "LR-2026-000123",
  "updated_at": "2026-08-16T00:55:00Z",
  "last_event_id": 41,
  "stages": [
    {
      "stage_id": "biomarker",
      "execution_status": "COMPLETE_WITH_WARNINGS",
      "module_execution_status": "SKIPPED",
      "output_origin": "CACHED",
      "result_basis": ["OBSERVED", "INFERRED"],
      "runtime_maturity": "UNVERIFIED",
      "reason_code": "MODULE_CONFIGURED_CACHED",
      "qualifiers": ["CACHED_EVIDENCE_INPUT"],
      "warnings": ["Pinned evidence artifact; live mapper not invoked."],
      "note": "2 complete · 1 shortfall",
      "requested": 3,
      "returned": 2
    },
    { "stage_id": "hypothesis",     "execution_status": "COMPLETE_WITH_WARNINGS", "note": "5 complete · 4 capacity unused", "requested": 9, "returned": 5 },
    { "stage_id": "roi",            "execution_status": "RUNNING",                "note": "3 complete · 2 running", "requested": 5, "returned": 3 },
    { "stage_id": "recruitability", "execution_status": "QUEUED",                 "note": "queued", "requested": 5, "returned": 0 },
    { "stage_id": "simulation",     "execution_status": "QUEUED",                 "note": "queued", "requested": 5, "returned": 0 }
  ],
  "biomarkers": [
    {
      "slot": 0,
      "label": "IL6R",
      "summary": "Inflammatory signaling anchor",
      "metrics": { "exploration": 1, "evidence": 86, "pursuit": 3 },
      "uncertainty": "±8 points, search scope: 40-paper cap",
      "display_metric_basis": "REPRESENTATIVE_DEMO_SCENARIO_V1",
      "display_metrics": { "exploration": 4, "evidence": 60, "pursuit": 2 },
      "display_uncertainty": "Representative biomarker posture; native evidence packet remains attached.",
      "station_payload": {
        "interpretability": {
          "schema_version": "1.0.0",
          "headline": {
            "title": "Evidence coverage",
            "result": "QUALIFIED_SUPPORT",
            "plain_language": "Evidence supports the mechanism with material coverage gaps.",
            "status": "QUALIFIED",
            "basis": ["OBSERVED", "INFERRED"]
          },
          "metrics": [], "steps": [], "evidence": [], "assumptions": [],
          "uncertainty": {
            "method": "coverage assessment", "intervals": [],
            "seed": null, "draws": null,
            "limitations": ["Search coverage was truncated."]
          },
          "limitations": [], "counterfactuals": [], "lineage": [],
          "extensions": {}
        }
      }
    }
  ],
  "programs": [
    {
      "id": "program-1",
      "lane": 0,
      "biomarker_slot": 0,
      "hypothesis_slot": 0,
      "label": "Stromal memory disruption",
      "short_label": "IL6R · stromal memory",
      "metrics": {
        "boldness": 5, "evidence": 72, "plausibility": 70,
        "rnpv": 145, "positive": 58, "impact": 82,
        "recruit": 89, "duration": 18, "screens": 2.2, "risk": 24,
        "support": null, "occupancy": null, "convergence": null
      },
      "uncertainty": "rNPV P10–P90: $52M–$261M",
      "display_metric_basis": "REPRESENTATIVE_DEMO_SCENARIO_V1",
      "display_label": "Myeloid response · IRAK4 blockade",
      "display_metrics": {
        "boldness": 7, "evidence": 72, "plausibility": 79,
        "rnpv": 145, "positive": 62, "impact": 82,
        "recruit": 82, "duration": 18, "screens": 2.3, "risk": 18,
        "tractability_fit": 86
      },
      "display_uncertainty": "Representative rNPV P10–P90: -$35M to $310M",
      "display_recruitment_uncertainty": "Representative enrollment range: 14–23 months",
      "display_tractability_uncertainty": "Representative branch-context fit: 86/100; native dossier remains attached.",
      "display_note": "Presentation-only representative values; native module artifacts and hashes are unchanged.",
      "public_why": "One-paragraph public rationale for this record.",
      "roi_failed": false,
      "recruit_failed": false,
      "overflow_rnpv": false,
      "not_amenable": false,
      "revision": "packet-r2",
      "hash": "sha256-…",
      "station_payloads": {
        "recruitability": { "…": "VERBATIM station output — see next section" }
      }
    }
  ],
  "highlander_ready": false,
  "highlander_blocked_reason": "2 stages nonterminal"
}
```

**Semantics the backend must honor** (the UI enforces/renders these):

- **`execution_status` is a closed enum:** `QUEUED | RUNNING | COMPLETE |
  COMPLETE_WITH_WARNINGS | FAILED`. Terminal = `COMPLETE`,
  `COMPLETE_WITH_WARNINGS`, `FAILED`. No other values.
- **Presentation and execution are separate when fallback/cached output exists.**
  `execution_status` is the terminal stage result used by progress. Optional
  `module_execution_status` preserves the actual invocation (`SKIPPED` or
  `FAILED` can still yield a validated cached/fallback result). Optional
  `output_origin`, `result_basis`, `runtime_maturity`, `reason_code`,
  `qualifiers`, and `warnings` are rendered verbatim as run truth.
- **Ceilings, not quotas.** `requested` vs `returned` with a human `note`; never
  pad weak candidates to fill capacity. Unreturned lanes stay scaffolds.
- **`requested` for downstream stages** (roi, recruitability, simulation)
  before the hypothesis stage is terminal: RECOMMENDED = the lane ceiling
  (`maximum_biomarkers × maximum_hypotheses_per_biomarker`); `returned` = 0
  until records exist.
- **Stable lanes.** A program's `lane` is immutable for the life of the run.
- **Missing is not zero.** A metric the module didn't produce is `null` (the UI
  keeps that node on the pending/missing shelf, never at a favorable position).
- **Separate classifications.** `execution_status` (per stage),
  failure flags (`roi_failed`, `recruit_failed`, `not_amenable`) and the
  station payload's own basis are never collapsed into one green badge.
- **Snapshots are monotonic.** `last_event_id` is monotonic per run; the
  client DROPS any snapshot whose numeric `last_event_id` is lower than one
  it has already seen — it may coalesce but never rolls back.
- **`highlander_ready` semantics.** `true` or absent = advisory only: the
  client still requires every stage terminal plus ≥1 program before enabling
  launch. `false` = blocks launch regardless of client-side checks.
  `highlander_blocked_reason` is `null` when ready.
- **Representative display overlays are explicit.** `display_metrics` are
  presentation-only scenario values and are used only when
  `display_metric_basis` is `REPRESENTATIVE_DEMO_SCENARIO_V1`. The UI labels
  that basis, uses it for graph placement and client-side Pareto comparison,
  and never rewrites the native `metrics` or station artifact. Backends MUST
  omit these fields outside a deliberately configured representative demo.
- **Station payload precedence.** Without an explicit representative display
  basis, `station_payloads.recruitability` remains authoritative for
  `metrics.recruit`, `metrics.duration`, `metrics.screens`, and uncertainty.
  With the representative basis, the payload remains attached unchanged but
  does not overwrite the presentation values.
- **Native artifacts are retained.** Biomarker records may use singular
  `station_payload`; program stages use `station_payloads.<stage>`. A payload
  may include the shared optional `interpretability` object. The UI projects
  that object into headline, metrics, steps, evidence, assumptions,
  uncertainty, limitations, counterfactuals, and lineage while retaining the
  native artifact unchanged. The judging presentation does not expose raw
  technical JSON; it shows the readable projection and an artifact-retention
  notice instead.

### First real station: `clinical_simulation` (recruitability)

The recruitability engine already exists and emits a schema-valid 18-key result
(`clinical_simulation/schemas/output.schema.json`). To populate a program from
it:

| Snapshot field | From station output |
|---|---|
| `metrics.recruit` | `score * 100` (score is 0–1 recruitability; **not** probability of approval) |
| `metrics.duration` | `simulated_months_to_enroll` (months) |
| `metrics.screens` | `screens_per_enrollee` |
| `uncertainty` | from the native enrollment-range field, e.g. `"modeled enrollment range: 8–35 months"`; the UI does not invent an IQR/percentile meaning |
| `public_why` | the output's `why` paragraph |
| `recruit_failed` | `true` only if the station errored (not for a bad score — score 0 is a result) |
| `station_payloads.recruitability` | **the entire result object, verbatim** |

The frontend retains `station_payloads.*` unchanged and binds the artifact to
the run by hash. Judge-facing copy uses modeled/representative language while
the module's native field names remain untouched in transport and storage.

### `POST /api/runs/:id/chat` — optional
Body: `{ "question": "…" }`. Response:

```json
{
  "answer": "…grounded in the run snapshot only…",
  "labels": ["source output", "inference / synthesis"],
  "citations": [ { "record_id": "hyp-slot-1", "node_id": "hyp-slot-1", "label": "Hypothesis record" } ],
  "abstention": false
}
```

`node_id` must be a graph node id (`bio-slot-N`, `hyp-slot-N`, `roi-slot-N`,
`recruitability-slot-N`, `simulation-slot-N`) so citations can open the record.
Abstain (`abstention: true` + reason in `answer`) when the run can't support an
answer. If the endpoint is missing, the client abstains on the backend's behalf
— it never invents an answer.

## Not in v0 (documented gaps)

- **Highlander runs client-side** off the snapshot's programs (same Pareto
  logic in mock and http modes). Its baseline vector is exactly
  `metrics.rnpv` (ROI), `metrics.recruit` (recruitability), and the simulation
  / tractability value (`metrics.tractability_fit`, or native `metrics.support`
  when that scalar is actually supplied). Plausibility is displayed but is not
  a Pareto axis. Missing any of the three required values makes the plan
  incomparable; the client never substitutes zero. Every returned plan is
  mapped to a stable numbered point, and the projected 3D view fills the
  remaining comparison-panel height beneath the objective table. The RA demo's
  Z value is explicitly labeled representative branch-context fit; the shared
  native cached dossier remains attached and is not presented as a
  candidate-specific simulation result. A server-side Highlander job endpoint
  is a future addition.
- **Review actions** (shortlist/constraint/exclude) are recorded in a
  client-side audit log only; `POST /api/runs/:id/actions` is future work.
- **No auth/identity.** Do not present actor fields as verified.
- **Polling only.** SSE/WebSocket transport can replace polling later without
  changing the snapshot shape.

## Error envelope

Non-2xx responses should be `{ "error": { "code": "…", "message": "…" } }`.
The client surfaces status + body excerpt and keeps the last confirmed data.
