# frontend

The user-facing layer for the REagent-LABrador pipeline: renders each
station's output for a human — the evidence graph, the ranked hypotheses, the
recruitability verdict, and the tractability dossier — with the honesty
labels (REPRESENTATIVE / MODELED / NOT decision-grade) impossible to miss.

## Quickstart

```bash
# Integrated judging path (run from labrador-demo-orchestrator after bootstrap)
uv run python app.py serve             # UI + API on one process, port 8787
open http://127.0.0.1:8787/

# Split-process frontend development
bun serve.ts 4173                      # serve app/ (loopback, port 4173)
bun app/dev-backend.ts                 # reference backend on :8787
open "http://localhost:4173/?base=http://localhost:8787"
open "http://localhost:4173/?backend=mock"  # in-page mock demo, zero network
node verify_mockup.mjs                 # frozen-artifact contract check (reads the
                                       #   mockup file directly; it is not served)
node verify_functional_app.mjs         # orchestrator-integration contract
node --test tests/frontend-live-contract.test.mjs
```

## Layout

| Path | What it is |
|---|---|
| `index.html` | **Frozen** verified wireframe mockup — byte-identical to the reviewed artifact. Do not edit. Kept for `verify_mockup.mjs`; no longer served. |
| `verify_mockup.mjs` | Checks the frozen mockup file still matches its reviewed contract. |
| `01-product-prd.md`, `02-wireframe-interaction-spec.md`, `03-interpretability-node-contract.md` | The three spec docs. |
| `serve.ts` | Dependency-free static server for `app/` only (`bun serve.ts [port]`, default 4173) — the served root IS the functional app. |
| `app/` | The functional frontend. |
| `app/index.html`, `app/styles.css`, `app/js/app.js` | View layer plus the in-page mock backend. |
| `app/js/backend-http.js` | REST client: run creation, 5s snapshot polling, stale/backoff handling. |
| `app/js/snapshot-contract.js` | Pure adapters for stage truth, native payloads, interpretability, and same-origin API selection. |
| `app/API-CONTRACT.md` | The wire contract — the source of truth for backend integration. |
| `app/dev-backend.ts` | Reference API server on `:8787` implementing `API-CONTRACT.md`. |
| `verify_functional_app.mjs`, `tests/frontend-live-contract.test.mjs` | Regression checks for the orchestrator judging path. |

## Two modes

The app in `app/` runs against one of two data sources:

- **http (default)** — uses the origin that served the frontend. The integrated
  judging URL is `http://127.0.0.1:8787/`. A separately served frontend must
  use `http://localhost:4173/?base=http://localhost:8787`. Talks the REST
  contract in `app/API-CONTRACT.md` via `app/js/backend-http.js`: `POST
  /api/runs` to create a run, then `GET /api/runs/:id/snapshot` polled every
  5s until all stages are terminal. On failure the client keeps the last
  confirmed data, backs off 5s → 10s → 20s → 60s, and shows STALE /
  REFRESH_ERROR — it never fabricates a snapshot.
- **mock** — `http://localhost:4173/?backend=mock`. A deterministic in-page
  demo; zero network.

Any backend that implements `POST /api/runs` and `GET /api/runs/:id/snapshot`
gets the full three-screen UI for free.

## Honesty rules the UI enforces

- **Ceilings, not quotas.** Setup numbers are caps. Stages report `requested`
  vs `returned`; unreturned lanes stay visible scaffolds, never padded with
  weak candidates.
- **Missing is not zero.** A metric a module didn't produce is `null` and the
  node sits on the pending/missing shelf — it is never plotted at a favorable
  position.
- **Native station artifacts.** `station_payloads.*` remain unchanged and are
  bound to the run by hash. The judge-facing inspector projects readable
  interpretation instead of exposing raw technical JSON.
- **Explicit representative overlay.** A configured judging scenario may
  supply `display_metrics` with
  `display_metric_basis=REPRESENTATIVE_DEMO_SCENARIO_V1`. Those values drive
  graph placement and the client-side Pareto view while native metrics and
  station artifacts remain unchanged and inspectable through run artifacts.
- **Shared interpretability.** An optional top-level `interpretability` object
  is rendered through one module-independent reader (headline, metrics,
  derivation steps, evidence, assumptions, uncertainty, limitations,
  counterfactuals, and lineage), while the entire native payload remains
  retained in the run artifact.
- One alarm colour is reserved for honesty flags; execution status, failure
  flags, and a payload's own basis are never collapsed into one green badge.

## Contract with the stations

This app consumes the stations' **published JSON schemas** and nothing else:

| Station | Renders | Schema |
|---|---|---|
| research-evidence-mapper | knowledge graph | `SCHEMA.md` in that repo |
| Hypothesis_Generator | hypotheses + evidence trails | `schemas/hypotheses.schema.json` |
| clinical_simulation | recruitability verdict | `schemas/output.schema.json` |
| simulation | druggability dossier | `schemas/output.schema.json` |

**First real integration: `clinical_simulation` (recruitability).** The
mapping from its 18-key output to a snapshot program — `score * 100` →
`metrics.recruit`, its native enrollment-duration field → `metrics.duration`, the
whole result object verbatim into `station_payloads.recruitability` — is
specified in `app/API-CONTRACT.md` under "First real station:
clinical_simulation (recruitability)". The mock backend already ships one
program with the real committed `dupi-eoe-2018-hindcast` result attached, so
the render path is proven.

## Notes

- `.env` is gitignored. Keep keys there; never commit it.
- Design precedent: the self-contained observatory/pipeline pages in the
  original LABrador workspace (no-server HTML).
