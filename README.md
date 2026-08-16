# frontend

The user-facing layer for the REagent-LABrador pipeline: renders each
station's output for a human — the evidence graph, the ranked hypotheses, the
recruitability verdict, and the tractability dossier — with the honesty
labels (SIMULATED / ASSUMED / NOT decision-grade) impossible to miss.

## Contract

This app consumes the stations' **published JSON schemas** and nothing else:

| Station | Renders | Schema |
|---|---|---|
| research-evidence-mapper | knowledge graph | `SCHEMA.md` in that repo |
| Hypothesis_Generator | hypotheses + evidence trails | `schemas/hypotheses.schema.json` |
| clinical_simulation | recruitability verdict | `schemas/output.schema.json` |
| simulation | druggability dossier | `schemas/output.schema.json` |

Design precedent: the self-contained observatory/pipeline pages in the
original LABrador workspace (no-server HTML, one alarm colour reserved for
honesty flags). Stack: TBD by the team.
