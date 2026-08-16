# LABrador Whisperflow interpretability and node contract

**Status:** Parallel concept draft for contract and wireframe review  
**Version:** `0.1`  
**Last updated:** 2026-08-15  
**Draft scope:** Proposed inspectable records, evidence packets, Highlander results, and run-grounded chat in the Whisperflow parallel direction  
**Does not supersede:** [Existing interpretability contract](../03-interpretability-node-contract.md)  
**Product context:** [Parallel product PRD](./01-product-prd.md)  
**Interaction context:** [Parallel interaction specification](./02-wireframe-interaction-spec.md)

## 1. Purpose

Every scientific result, missing state, Highlander comparison, and material chat claim in this wireframe must resolve to an inspectable record. A reviewer should be able to identify what was requested, what ran, what it received, what it produced, how certain it is, which sources and assumptions support it, what failed or was omitted, and how it influenced a later comparison.

This is a target product contract. It does not claim that current modules emit every field. Missing adapters and fields remain `NOT WIRED`; the interface must not fill them with invented values.

## 2. Interpretability principles

1. **Public rationale, not hidden chain-of-thought.** Store a concise decision record that can be evaluated and cited. Do not expose, persist, or require private model reasoning traces.
2. **Raw result before display transformation.** Preserve the module's native result, units, uncertainty, and artifacts beside any normalized coordinate or summary.
3. **Capacity is not evidence.** Requested graph slots are layout scaffolding until bound to returned scientific records.
4. **Qualifiers survive every handoff.** Population, scenario, horizon, simulated/synthetic basis, proxy status, and decision-grade limits stay attached to descendants and chat answers.
5. **Missing is not favorable.** Failed, skipped, not-amenable, absent, or unwired work cannot become zero risk, a pass, or an imputed positive result.
6. **Stage observations remain separate.** Biomarker, hypothesis, ROI, recruitability, and simulation records keep their own identities in the packet ledger.
7. **Provenance is navigable.** Derived records link to parents, sources, configuration, implementation identity, hashes, and artifacts.
8. **Human decisions are attributable.** Constraints, shortlists, rerun requests, and exclusions record actor, time, rationale, and decision-set version.
9. **Chat is an interface, not a new evaluator.** It explains the recorded run and abstains beyond it; it does not silently create or change scientific results.

## 3. Separate state classifications

The UI and data model keep these classifications independent.

### 3.1 Requirement status

| Value | Meaning |
| --- | --- |
| `PROPOSED_TARGET` | Specified by this parallel draft but not yet ratified |
| `APPROVED_TARGET` | Explicitly approved product requirement |

Requirement status describes design authority, never runtime availability or result quality.

### 3.2 Runtime maturity

| Value | Meaning |
| --- | --- |
| `LIVE` | Verified deployed and registered in the checked environment |
| `LOCAL` | Verified runnable locally but not composed into the target workflow |
| `PROXY` | Mechanics exist, but a proxy, mock, synthetic, or stub evaluator stands in for the target capability |
| `NOT WIRED` | Module, adapter, or end-to-end connection is absent or incomplete |

### 3.3 Execution status

`QUEUED`, `RUNNING`, `COMPLETE`, `FAILED`, `SKIPPED`, and `NOT_AMENABLE` describe what happened to a requested execution. Each terminal non-success status requires a structured reason.

### 3.4 Result evidence basis

| Value | Meaning |
| --- | --- |
| `OBSERVED` | Directly measured or retrieved from a named source and method |
| `MODELED` | Produced by a disclosed statistical, clinical, economic, or physical model |
| `INFERRED` | Derived through a stated inference from other evidence |
| `PROXY` | Substitute measure or evaluator stands in for the intended result |
| `NOT RUN` | Intended computation did not execute; reason required |
| `NOT WIRED` | Intended product capability was unavailable in the run environment |

A record may be execution `COMPLETE`, basis `MODELED + PROXY`, and maturity `PROXY` simultaneously. Those facts cannot be compressed into one status.

### 3.5 UI freshness

`LIVE`, `POLLING`, `STALE`, and `REFRESH_ERROR` describe only the client view's connection to the stored run. A stale view does not change server-side execution or result status.

## 4. Immutable run configuration

Starting Screen 1 creates an immutable configuration snapshot:

```yaml
run_id: immutable identifier
configuration_schema: LABradorRunSetup.v1
clinical_indication:
  submitted_text: exact submitted text
  normalized_text: optional normalized display value
biomarker_exploration_range:
  scale_id: stable scale identifier
  scale_version: version
  lower: named value
  upper: named value
maximum_biomarkers: positive integer ceiling
maximum_literature_papers: positive integer ceiling
hypothesis_boldness_range:
  scale_id: stable scale identifier
  scale_version: version
  lower: named value
  upper: named value
maximum_hypotheses_per_biomarker: positive integer ceiling
submitted_by: actor identifier
submitted_at: timestamp with timezone
configuration_hash: canonical hash
```

Any terminology resolution, population refinement, or system configuration added later is stored as a derived record. It cannot overwrite what the user submitted.

## 5. Capacity scaffold contract

Requested-capacity scaffolds are view records, not scientific nodes:

| Field | Requirement |
| --- | --- |
| `capacity_slot_id` | Immutable view identifier within the run |
| `run_id` | Owning run |
| `biomarker_slot_index` | Requested biomarker-group position |
| `hypothesis_slot_index` | Requested child position when applicable |
| `status` | `RESERVED`, `BOUND`, or `NOT_RETURNED` |
| `bound_node_id` | Required only when `BOUND` |
| `shortfall_record_id` | Required when `NOT_RETURNED` after a generation stage terminates |

A scaffold has no `claim`, scientific `metric`, evidence basis, output hash, or packet membership. Binding a returned candidate creates or links a real node record. Unbound capacity cannot be cited as a result.

## 6. Minimum node record

Every indication, biomarker, hypothesis, ROI, recruitability, simulation, packet, Highlander, and human-review record exposes the applicable fields below.

### 6.1 Identity and lineage

| Field | Required | Description |
| --- | --- | --- |
| `run_id` | Yes | Immutable source run |
| `node_id` | Yes | Immutable record identifier |
| `node_type` | Yes | `INDICATION`, `BIOMARKER`, `HYPOTHESIS`, `ROI`, `RECRUITABILITY`, `SIMULATION`, `PACKET`, `HIGHLANDER`, or `HUMAN_REVIEW` |
| `parent_node_ids` | Yes | Direct parent identifiers; empty only for the indication root |
| `biomarker_id` | After biomarker creation | Stable returned biomarker identity |
| `hypothesis_id` | After hypothesis creation | Stable returned hypothesis identity |
| `branch_id` | After hypothesis creation | Stable branch shared by the hypothesis and all downstream records |
| `branch_lane_index` | After hypothesis creation | Immutable presentation-lineage index; not a scientific result |
| `capacity_slot_id` | When bound from a reserved slot | Link back to the view scaffold |
| `schema_name` | Yes | Record contract name |
| `schema_version` | Yes | Record contract version |

Downstream records preserve the same `branch_id` and `branch_lane_index`. A retry creates a new immutable attempt record; it does not replace the failed record.

### 6.2 Execution and implementation provenance

| Field | Required | Description |
| --- | --- | --- |
| `module_name` | Yes | Module or adapter responsible for the record |
| `module_version` | Yes | Commit, build, or release identifier |
| `model_provider` | When applicable | Public provider/engine identity; no secret |
| `model_name` | When applicable | Public model or simulation engine name |
| `model_version` | When applicable | Pinned version when available |
| `effective_configuration` | Yes | Nonsecret thresholds, scenario, and settings actually used |
| `requirement_status` | Yes for target-only fields | `PROPOSED_TARGET` or `APPROVED_TARGET`; not a runtime claim |
| `runtime_maturity` | Yes | `LIVE`, `LOCAL`, `PROXY`, or `NOT WIRED` for this execution environment |
| `execution_status` | Yes | Status from section 3.3 |
| `queued_at` | When queued | Timestamp with timezone |
| `started_at` | When started | Timestamp with timezone |
| `completed_at` | When terminal | Timestamp with timezone |
| `duration_ms` | When measurable | Wall-clock duration |
| `attempt` | Yes | Attempt number |

### 6.3 Integrity, cost, and provenance

| Field | Required | Description |
| --- | --- | --- |
| `input_hash` | Yes | Canonical hash of the effective input envelope |
| `configuration_hash` | Yes | Canonical hash of effective nonsecret configuration |
| `output_hash` | When output exists | Canonical hash of raw output |
| `code_snapshot` | Yes | Commit/build/deployment reference |
| `data_snapshot` | When applicable | Dataset, registry, literature-query, or structure snapshot and retrieval date |
| `cost` | Yes | Amount, currency, basis, and estimated/billed/unknown qualifier |
| `source_references` | Yes, may be empty | Typed upstream records, citations, datasets, or registries |
| `artifact_references` | Yes, may be empty | Typed rich artifacts governed by section 9 |

Hashes establish record identity, not scientific correctness.

## 7. Stage execution and progress records

Each module stage emits a summary record containing:

- `stage_id` and display name.
- Dependency stage IDs.
- Overall stage execution status.
- Eligible, queued, running, complete, failed, skipped, and not-amenable record counts.
- Start and terminal timestamps.
- Whether a valid progress denominator exists.
- Last stage event identifier and timestamp.
- Public stage message.
- Shortfall records when returned generation counts are below ceilings.

The client may derive display progress from this record. It may not invent a percentage when the module does not supply a valid denominator.

## 8. Metric contract

Every displayed or spatially encoded value is a separate metric record:

| Field | Required | Description |
| --- | --- | --- |
| `metric_id` | Yes | Stable semantic identifier, for example `roi.p50_rnpv` |
| `label` | Yes | Human-readable name |
| `definition` | Yes | What the metric measures and does not measure |
| `raw_value` | When result exists | Native module representation |
| `display_value` | When displayable | Nonlossy or explicitly transformed value |
| `unit` | Quantitative metrics | Currency, months, percentage, count ratio, or other unit |
| `scale_type` | Yes | `CONTINUOUS`, `DISCRETE`, or `ORDINAL` |
| `ordinal_mapping` | Ordinal metrics | Named steps and calibrated coordinates, or an explicit uncalibrated warning |
| `direction` | Yes | Meaning of lower and higher values |
| `domain` | When plotted | Minimum, maximum, tick policy, clipping rule, and domain source |
| `qualifiers` | Yes, may be empty | Population, scenario, horizon, valuation date, simulated/synthetic basis, and other conditions |
| `result_basis` | Yes | One or more values from section 3.4 |
| `uncertainty` | Yes | Interval/distribution/method or explicit `not_available` reason |
| `source_references` | Yes | Records or artifacts that support the value |
| `missing_reason` | When absent | Structured reason; absence cannot be represented as zero |

The client may compute a normalized y-coordinate for display, but that coordinate is view state. It cannot replace the raw value or enter Highlander as a new scientific metric.

## 9. Rich artifact contract

Interpretability content may include text, tables, charts, literature/evidence graphs, reports, molecular structures, trajectories, images, notebooks, or logs. Every artifact reference contains:

| Field | Requirement |
| --- | --- |
| `artifact_id` | Immutable identifier |
| `title` | Human-readable title |
| `artifact_type` | Declared semantic type such as `LITERATURE_GRAPH`, `CHART`, `STRUCTURE`, `REPORT`, or `LOG` |
| `mime_type` | Content type |
| `uri_or_object_ref` | Authorization-aware reference; never a credential-bearing URL |
| `content_hash` | Integrity hash when content exists |
| `source_and_provenance` | Source records, module/model, version, and generation method |
| `generated_at` | Timestamp with timezone |
| `availability` | `AVAILABLE`, `LOADING`, `MISSING`, `FORBIDDEN`, or `ERROR` with reason |
| `text_alternative` | Accessible description or data-table equivalent |
| `limitations` | Scope, fidelity, or interpretation caveats |

Artifact access must eventually obey an authorization contract and must never reveal secrets, private storage paths, protected health information, or hidden prompts. That authorization layer is a `PROPOSED TARGET / NOT WIRED` dependency in this wireframe, not a claim that current access control exists. A failed artifact does not erase the node's other inspectable content.

## 10. Structured public decision record

Every successful scientific result or explicit scientific abstention includes the full decision record below. A failed, skipped, or not-amenable execution may have no defensible scientific claim; it instead requires the work/evidence checked, structured reason, affected outputs, limitations, and resolving evidence from section 12. It must not fabricate claim or evidence fields merely to satisfy a schema.

| Field | Requirement |
| --- | --- |
| `claim` | One bounded conclusion naming the relevant population, intervention, comparator, condition, or scenario; optional for non-success execution records |
| `evidence` | Typed supporting records and artifacts with relevant qualifiers |
| `counterevidence` | Conflicting, negative, or limiting evidence; empty means none found in the searched scope, not that none exists |
| `assumptions` | Premises not established by cited evidence |
| `public_rationale` | Concise explanation connecting evidence and assumptions to the claim; no hidden chain-of-thought; optional when no scientific claim exists, with structured execution reason required instead |
| `confidence_or_uncertainty` | Calibrated confidence when valid, otherwise the uncertainty form and limits |
| `falsifier` | Evidence or experiment that would materially weaken the claim, when applicable |
| `limitations` | Coverage, generalizability, model, data, and implementation limits |
| `skip_reason` | Required for `SKIPPED` or `NOT_AMENABLE` |
| `failure_reason` | Required for `FAILED`, including what was not produced |

A module may abstain. A valid abstention explains the unsupported question, evidence searched, remaining gap, and what could resolve it.

## 11. Stage-specific minimum records

### 11.1 Indication

- Submitted clinical indication and immutable setup snapshot.
- Resolved identifiers and terminology source, if resolution occurred.
- Derived population or scope assumptions, labeled as derived.
- Requested ceilings and eventual returned counts.

### 11.2 Biomarker/target

- Identity, type, aliases, and biological context.
- Exploration-posture metric on the declared scale.
- Evidence-support and prior-pursuit metrics with search scope.
- Supporting literature, negative evidence, prior programs, and deduplication history.
- Why it falls within the selected setup interval.

### 11.3 Literature evidence set

Because the run exposes a maximum-paper control, its evidence record includes:

- Search query or plan and query timestamp.
- Sources/databases searched and date ranges.
- Candidate-paper count before the cap.
- Ranking, filtering, and deduplication method.
- Requested paper ceiling and included-paper count.
- Exclusion counts and structured reasons.
- Included paper identifiers and graph artifact reference.
- Coverage limitations and known retrieval failures.

The maximum paper count cannot be presented as evidence quality or completeness.

### 11.4 Hypothesis

- Testable intervention claim, parent biomarker, mechanism, population, and intended consequence.
- Boldness metric on the declared scale.
- Evidence support, biological plausibility, and counterevidence.
- Concrete falsifier and proposed validation path.
- Sibling hypotheses and reason for inclusion within the requested range.

### 11.5 ROI / clinical impact

- P50 rNPV with currency, valuation date, horizon, discounting, and scenario.
- Probability of positive rNPV and its model definition.
- Clinical-impact measure and definition.
- Assumption ledger, sensitivity drivers, cost basis, and uncertainty.
- Observed, synthetic, simulated, inferred, proxy, and decision-grade qualifiers.

### 11.6 Clinical recruitability

- Recruitability metric and direction definition.
- Recruitability risk when separately reported.
- Enrollment duration and interval.
- Screens per enrollee and funnel assumptions.
- Trial design, geography, prevalence, site, and competing-study assumptions.
- Registry/query snapshot and observed-versus-modeled qualifiers.

### 11.7 Atomistic simulation

- Exact biological component/intervention interaction simulated and amenability decision.
- Engine/model, force field, structure source, preparation, configuration, seed, and replicates when applicable.
- Atomistic support, pose occupancy, convergence, and uncertainty.
- Raw structures, trajectories, plots, or reports as artifact references.
- What was not simulated and scientific limitations.
- Explicit result basis `NOT RUN` plus execution `NOT_AMENABLE`, `SKIPPED`, or `FAILED` when no result exists. An unwired module uses execution `SKIPPED` with reason `MODULE_NOT_WIRED`, plus runtime maturity and result basis `NOT WIRED`.

A tractability review or geometric pocket score may be related evidence but cannot be relabeled as an atomistic simulation.

## 12. Shortfall and non-success records

Every failed, skipped, not-amenable, not-returned, or unwired outcome uses a structured record:

| Field | Description |
| --- | --- |
| `reason_code` | Stable code such as `INSUFFICIENT_EVIDENCE`, `DUPLICATE_COLLAPSED`, `NOT_RETURNED`, `NOT_AMENABLE`, `UNSUPPORTED_INPUT`, `MODULE_NOT_WIRED`, or `EXECUTION_ERROR` |
| `public_message` | Plain-language explanation |
| `requested_ceiling` | Applicable requested count |
| `returned_count` | Applicable returned count |
| `affected_record_types` | Results not produced or made uncertain |
| `evidence_checked` | Work completed before the outcome |
| `retryable` | `true`, `false`, or `unknown`, with conditions |
| `resolving_evidence` | Data, configuration, module, or experiment needed to proceed |
| `source_node_id` | Module/stage record that issued the outcome |
| `timestamp` | Time with timezone |

Candidate generation also records exclusion and deduplication counts. Paper search additionally records the pre-cap candidate count and selection method.

## 13. Evidence packet ledger

Every returned hypothesis branch owns an append-only logical packet:

```yaml
packet_id: immutable identifier
run_id: immutable identifier
branch_id: stable hypothesis branch
revision: monotonically increasing integer
records:
  biomarker: node reference and hash
  literature_evidence: record and artifact references
  hypothesis: node reference and hash
  roi: node reference and hash or missing-state reference
  recruitability: node reference and hash or missing-state reference
  simulation: node reference and hash or missing-state reference
completeness:
  state: COMPLETE | PARTIAL | BLOCKED
  missing_or_qualified_records: explicit list
accumulated_qualifiers: explicit list
failure_history: immutable record references
packet_hash: canonical hash
created_at: timestamp
updated_at: timestamp
```

Packet revisions reference immutable node records rather than copying a lossy summary over them. Eligibility for Highlander requires the packet's completeness and qualifier state, not scientific sufficiency or decision grade.

## 14. Highlander job and decision-set contract

### 14.1 Input snapshot

Every Highlander job records:

- `highlander_job_id`, source `run_id`, algorithm/module/model versions, requirement status, and runtime maturity.
- Exact packet revision IDs and hashes.
- Objective definitions, raw units, direction, qualifiers, and uncertainty treatment.
- Missing-data and comparability policy.
- Scenario profile and any weights or preferences.
- Hard constraints with attributed source.
- Job timestamps, configuration, hashes, and cost.

It consumes complete, partial, and blocked records explicitly. It cannot silently impute favorable values for missing objectives.

### 14.2 Decision set

The output includes:

- Non-dominated, dominated, and incomparable program IDs.
- Each program's raw objective vector and uncertainty.
- Pairwise or local tradeoffs relevant to the current view.
- Pareto status, frontier version, and dominance relationships.
- Scenario profile and the effect of weights/preferences.
- Evidence and counterevidence materially used.
- Assumptions, gaps, proxy/not-wired warnings, and failure history.
- Source-branch lineage and within-job comparison/failure history. Candidate generation or mutation is outside this three-screen wireframe; any future generated variant would require a new immutable derived-record contract and could not alter source hypotheses or packets.
- A structured public justification for inclusion, exclusion, dominance, or incomparability.

There is no `global_winner` field. A human shortlist or selection is a separate attributed audit event. “Learning” in this wireframe means synthesis and adaptation within this run/job only; it does not imply persistent model training or silent cross-run memory.

## 15. Highlander selected-program record

The selected detail on Screen 3 resolves to:

- The terminal hypothesis statement and source branch.
- Packet revision and record hashes.
- Objective vector with units, uncertainty, and qualifiers.
- Pareto status under the baseline and selected scenario.
- Closest meaningful tradeoff programs.
- Evidence, counterevidence, assumptions, limitations, and missing results.
- Complete public justification.
- Conditions, evidence, or constraints that would change its status.
- Human review state and audit events.

Selection in the UI does not promote the program to winner status.

## 16. Grounded chat response contract

Chat is read-only, run-scoped Q&A. Each assistant response is stored as an interface record with:

| Field | Requirement |
| --- | --- |
| `conversation_id` | Scoped to one run and Highlander job |
| `message_id` | Immutable response identifier |
| `question` | User's submitted question |
| `answer` | Concise public explanation; no hidden chain-of-thought |
| `citations` | Field-level references to node, packet, Highlander, or artifact records supporting each material claim |
| `inferences` | Explicitly labeled synthesis distinct from source output |
| `uncertainty` | Known uncertainty and limits of the answer |
| `abstention` | Boolean plus evidence-gap reason when unsupported |
| `qualifiers_carried` | Proxy, modeled, missing, scenario, decision-grade, and other material qualifiers |
| `generated_by` | Chat model/provider/version and configuration identity |
| `generated_at` | Timestamp with timezone |

A citation contains the source record ID, version/hash, field or artifact anchor, and display label. A link opens the cited item through the same authorization boundary as the inspector.

Chat cannot:

- Modify module outputs, packet membership, or packet hashes.
- Change Highlander objectives, scenario profiles, or constraints.
- Shortlist or exclude a program.
- Create persistent scientific evidence from its own answer.
- Use information outside the recorded run as support. External retrieval is outside this wireframe's chat scope and requires a separately approved future contract.

If the ledger cannot answer, the response states what is missing and abstains. The absence of an answer is not a negative scientific conclusion.

## 17. Human review audit events

| Action | Required fields | Effect |
| --- | --- | --- |
| Shortlist | Program IDs, actor, timestamp, rationale, source decision-set version | Adds attributed review state; does not change source results |
| Add hard constraint | Definition, scope, unit, actor, timestamp, rationale, prior version | Creates a new decision-set version under the constraint |
| Request another run | Source programs, requested change/question, actor, timestamp, rationale | Creates a linked run request; prior run remains immutable |
| Exclude | Program IDs, actor, timestamp, rationale, source version | Removes from the human review view while retaining the scientific ledger |

Every event records before/after review state and the client/user identity when an identity contract is available. Authorization and identity are `PROPOSED TARGET / NOT WIRED` dependencies; until they exist, draft/wireframe actor fields are conditional and cannot be portrayed as a verified access boundary. Acknowledging incomplete or proxy evidence does not upgrade its basis.

## 18. Qualifier propagation invariants

1. A derived value inherits every material qualifier from its sources unless it explicitly narrows or transforms them.
2. Transformations append method and transformation metadata; they do not erase source basis.
3. `PROXY`, `NOT_DECISION_GRADE`, synthetic, simulated, partial-coverage, and out-of-distribution qualifiers cannot be promoted by summarization.
4. A downstream module that cannot accept a material qualifier rejects or abstains; it cannot drop the qualifier.
5. A packet is no more complete than its referenced records. A node shell or capacity slot is not evidence.
6. Highlander may compare qualified values only under a disclosed policy and may mark programs incomparable.
7. Chat carries qualifiers into its answer and citations.
8. Human review adds decision metadata but cannot rewrite source qualifiers.

## 19. Inspector information architecture

The shared Screen 2 inspector presents:

1. **Identity and status:** Node, stage, branch, execution, evidence basis, runtime maturity, requirement status, and freshness warning.
2. **Result:** Claim, raw metric, unit, uncertainty, and material qualifiers.
3. **Why this result:** Public rationale, evidence, counterevidence, and assumptions.
4. **What would change it:** Falsifier, sensitivity drivers, limitations, skip/failure reason, and resolving evidence.
5. **Rich artifacts:** Evidence graph, charts, tables, structures, reports, and text alternatives.
6. **Inputs and lineage:** Parents, descendants, sibling records, setup constraints, and inherited qualifiers.
7. **Provenance and audit:** Module/model, versions, configuration, timestamps, hashes, cost, retries, packet revisions, and human actions.

The primary result and proxy/not-wired warning are visible without expanding a disclosure. An unavailable rich artifact does not hide the public decision record.

## 20. Interpretability requirements

| ID | Requirement |
| --- | --- |
| WF-INT-001 | Every run, visible result node, Highlander item, and material chat citation shall resolve to an inspectable versioned record. |
| WF-INT-002 | The run record shall preserve the exact submitted indication, range endpoints, scale versions, numeric ceilings, actor, timestamp, and hash. |
| WF-INT-003 | Every scientific node shall have immutable run, node, type, schema, and parent identity. |
| WF-INT-004 | Every downstream record shall preserve applicable biomarker, hypothesis, branch, and lane identity. |
| WF-INT-005 | Capacity scaffolds shall remain separate from scientific nodes and shall never contain claims, metrics, evidence basis, or packet membership. |
| WF-INT-006 | Every execution shall expose module/model identity, effective configuration, maturity, status, attempt, and timestamps. |
| WF-INT-007 | Every record shall expose input/configuration hashes and output hash when output exists. |
| WF-INT-008 | Stage records shall expose valid status counts, activity, event time, and progress denominator or its absence. |
| WF-INT-009 | Requirement status, execution state, evidence basis, runtime maturity, UI freshness, and interaction state shall remain distinct. |
| WF-INT-010 | Every material metric shall preserve definition, raw/display value, unit/scale, direction, domain, qualifiers, basis, uncertainty, and sources. |
| WF-INT-011 | Missing metric values shall carry a structured reason and shall never be encoded as zero, midpoint, or a favorable endpoint. |
| WF-INT-012 | Client y-coordinates and metric-choice state shall remain presentation data and shall not alter scientific records or packets. |
| WF-INT-013 | Every successful result or scientific abstention shall include the full public decision record; failed, skipped, and not-amenable executions shall require structured work-checked and reason records without fabricating a scientific claim. |
| WF-INT-014 | The contract shall neither expose nor require hidden chain-of-thought. |
| WF-INT-015 | Biomarker, hypothesis, and literature-paper setup values shall be stored and described as ceilings. |
| WF-INT-016 | Returned-count shortfalls shall expose requested/returned counts, exclusions, deduplication, evidence checked, and structured reasons. |
| WF-INT-017 | Biomarker records shall expose identity, exploration posture, evidence support, prior pursuit, sources, counterevidence, and inclusion reason. |
| WF-INT-018 | Literature records shall expose search scope, candidate count, ranking/filtering method, cap, included count, exclusions, and graph artifact. |
| WF-INT-019 | Hypothesis records shall expose testable claim, parent biomarker, mechanism, boldness, plausibility, counterevidence, and falsifier. |
| WF-INT-020 | ROI records shall expose rNPV and impact metrics with currency/date/horizon/scenario, assumptions, sensitivity, uncertainty, and decision-grade basis. |
| WF-INT-021 | Recruitability records shall expose metric direction, enrollment duration, screens per enrollee, trial/population assumptions, sources, and uncertainty. |
| WF-INT-022 | Simulation records shall expose amenability, scientific target, engine/configuration, atomistic metrics, artifacts, uncertainty, and limitations. |
| WF-INT-023 | A missing simulation shall remain a result-basis `NOT RUN` record with explicit failed/skipped/not-amenable execution; unwired capability shall use `SKIPPED` + `MODULE_NOT_WIRED` and runtime/result `NOT WIRED`. |
| WF-INT-024 | Every rich artifact shall expose type, source, version, generation time, hash, availability, limitations, and accessible text alternative. |
| WF-INT-025 | Every returned hypothesis branch shall own an append-only packet preserving biomarker, evidence, hypothesis, ROI, recruitability, and simulation records separately. |
| WF-INT-026 | Packet completeness, qualifiers, failures, revisions, and hashes shall accompany every Highlander input. |
| WF-INT-027 | Highlander launch shall record the exact immutable packet snapshot and cannot silently impute missing objectives. |
| WF-INT-028 | Every Highlander job shall disclose objective definitions, raw units, direction, uncertainty policy, scenario profile, constraints, versions, hashes, and cost. |
| WF-INT-029 | Highlander output shall preserve non-dominated, dominated, and incomparable sets with objective vectors, tradeoffs, lineage, gaps, and failure history. |
| WF-INT-030 | Scenario weights/preferences and hard constraints shall retain source, version, and effect without hiding raw objectives or baseline Pareto status. |
| WF-INT-031 | No Highlander schema or view shall emit an unexplained `global_winner`; human selection remains a separate audit event. |
| WF-INT-032 | Selected-program detail shall resolve to the terminal hypothesis, exact packet revision, objective vector, evidence, tradeoffs, and status. |
| WF-INT-033 | Highlander shall expose a complete public justification for inclusion, exclusion, dominance, or incomparability. |
| WF-INT-034 | “Learning” shall mean run-local synthesis only unless a separately approved persistent-learning contract exists. |
| WF-INT-035 | Chat shall be scoped to one run and Highlander job and shall identify its own model/version. |
| WF-INT-036 | Every material chat claim shall cite a versioned node field, packet field, Highlander record, or artifact. |
| WF-INT-037 | Chat shall distinguish source output from synthesis/inference and shall preserve uncertainty and all material qualifiers. |
| WF-INT-038 | Chat shall abstain with an evidence-gap reason when the recorded run cannot support an answer. |
| WF-INT-039 | Chat responses shall not modify scientific records, packets, Highlander configuration, or human-review state. |
| WF-INT-040 | Chat history shall not become scientific evidence or persistent cross-run learning by implication. |
| WF-INT-041 | Artifact, citation, actor, and audit access shall depend on a separately ratified authorization/identity contract and shall not imply current access control while that dependency is `NOT WIRED`. |
| WF-INT-042 | Every shortlist, constraint, rerun request, and exclusion shall preserve the actor when available, timestamp, rationale, source decision-set version, before/after review state, and immutable scientific source records. |

## 21. Contract validation scenarios

| ID | Scenario | Contract checks |
| --- | --- | --- |
| WF-CON-001 | Valid setup submitted | Immutable setup contains six fields, scale versions, actor/session provenance, time, and hash; identity is conditional on the unwired authorization dependency. |
| WF-CON-002 | 3 × 3 capacity reserved | Nine capacity slots may exist, but none has a claim, metric, evidence badge, or packet before binding. |
| WF-CON-003 | Fewer candidates or papers returned | Shortfall records explain requested/returned counts, search or generation scope, exclusions, and deduplication. |
| WF-CON-004 | Node result arrives | Immutable identity and x-lane persist; raw metric and provenance exist before a client plots the y-coordinate. |
| WF-CON-005 | Equal metric values | Metric records prove equality; display coordinates may match without mutating records. |
| WF-CON-006 | Metric chooser changed | Node, output, packet, and Highlander hashes remain identical before and after; only view state changes. |
| WF-CON-007 | Rich literature graph opened | Artifact exposes source, hash, module/version, time, availability, limitations, and text alternative. |
| WF-CON-008 | Failed/skipped execution | Structured work-checked, affected-output, reason, and resolving-evidence fields exist; no scientific claim is fabricated. |
| WF-CON-009 | Missing/not-amenable simulation | Packet references an explicit missing-state record with reason and resolving evidence; absence is not favorable. |
| WF-CON-010 | Unwired simulation | Execution is `SKIPPED` with `MODULE_NOT_WIRED`; runtime maturity/result basis is `NOT WIRED`; `NOT WIRED` is not used as execution status. |
| WF-CON-011 | Highlander launched with gaps | Input snapshot contains exact partial packets and missing-data policy; output preserves gaps and warnings. |
| WF-CON-012 | Scenario profile changed | New decision-set view records profile/version while raw objectives and baseline Pareto status remain available. |
| WF-CON-013 | Public rationale inspected | Evidence, counterevidence, assumptions, uncertainty, tradeoffs, and falsifier/gaps are present; hidden chain-of-thought is absent. |
| WF-CON-014 | Supported chat question | Every material claim resolves to a cited record field or artifact within the run; authorization remains an explicit target dependency. |
| WF-CON-015 | Unsupported chat question | Response records an abstention and evidence gap; it creates no new scientific claim or product mutation. |
| WF-CON-016 | External-information chat request | Chat refuses to use outside information as support and identifies external retrieval as out of scope. |
| WF-CON-017 | Human action before identity contract exists | Wireframe shows the authorization dependency and does not portray the actor/audit event as a verified access-controlled action. |

## 22. Current integration note

This proposed target contract requires adapters over current module outputs. The indication-first discovery workflow, complete hypothesis fan-out, general atomistic simulation, updating sequential orchestration, shared packet ledger, authorization/identity dependency, and run-grounded Highlander chat are not currently wired end to end. Current synthetic economics retains `NOT_DECISION_GRADE`, and a tractability prototype cannot be presented as atomistic simulation.

The reproducible checkout metadata, conflicting evidence-mapper claims, and source anchors are recorded in the [PRD maturity snapshot](./01-product-prd.md#12-current-implementation-maturity). Implementation must add validated adapters and explicit missing-state records rather than making current outputs appear more complete or certain than they are.
