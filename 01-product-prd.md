# LABrador Whisperflow desktop wireframe PRD

**Status:** Parallel concept draft for product and wireframe review  
**Version:** `0.1`  
**Last updated:** 2026-08-15  
**Draft scope:** This proposed Whisperflow-derived wireframe direction only  
**Does not supersede:** [Existing product PRD](../01-product-prd.md), [existing interaction specification](../02-wireframe-interaction-spec.md), or [existing interpretability contract](../03-interpretability-node-contract.md)  
**Companion documents:** [Parallel interaction specification](./02-wireframe-interaction-spec.md) · [Parallel interpretability contract](./03-interpretability-node-contract.md)

## 1. Purpose

This document defines a proposed desktop-only, three-screen wireframe for LABrador. It translates the supplied Whisperflow dialogue into testable product requirements while preserving the existing product pack's safeguards around lineage, missing evidence, qualified results, and human decision-making.

This is a parallel design direction. It does not claim that the target workflow is implemented, and it does not alter the existing product documents or the frozen `labrador-ui-mockup.html` research artifact.

## 2. Product goal

LABrador should let scientific, clinical, and commercial reviewers:

1. Start from a clinical indication and choose how conservative or exploratory the run should be.
2. Watch a therapeutic-program graph populate as sequential modules complete.
3. Inspect the evidence, assumptions, uncertainty, provenance, and artifacts behind any node.
4. Compare a transparent set of non-dominated hypotheses in Hypothesis Highlander.
5. Ask grounded questions about Highlander's conclusions without exposing or relying on hidden chain-of-thought.

LABrador is a decision-support workspace. It does not autonomously choose which program to advance.

## 3. Supported product surface

The first wireframe contains exactly three screens:

| Screen | Name | Primary job |
| --- | --- | --- |
| 1 | Run Setup | Define the indication, exploration ranges, and run ceilings, then start the run. |
| 2 | Program Graph | Watch the sequential workflow populate, understand lineage, change stage-level display metrics, and inspect nodes. |
| 3 | Hypothesis Highlander | Review Pareto-optimal programs, inspect a selected program's public justification, and ask questions grounded in the completed run. |

The wireframe is designed for laptop and desktop browsers only. It does not need a mobile or tablet layout. The supported viewport assumptions and overflow behavior are specified in the interaction document.

## 4. Users and collaboration model

Scientific, clinical, and commercial reviewers are equal collaborators. Every reviewer sees the same underlying node records and evidence packets.

| Reviewer | Core question | Required support |
| --- | --- | --- |
| Scientific | Is the biomarker supported and is the intervention hypothesis biologically plausible? | Literature graph, evidence and counterevidence, mechanism, falsifier, simulation amenability, uncertainty |
| Clinical | Is the proposed population meaningful and can an informative trial recruit? | Population and trial assumptions, recruitability, enrollment duration, screens per enrollee, uncertainty |
| Commercial | Is the program attractive relative to time, cost, and clinical value? | rNPV, probability of positive value, clinical impact, scenario assumptions, uncertainty |

No discipline's result silently overrides another. Disagreement across stages remains visible through Highlander.

## 5. Screen 1 — Run Setup

### 5.1 Visual direction

The page uses a cream background with dark, slightly rounded panels and controls. The primary **Run** action is green. These are semantic wireframe tokens, not final brand design.

The run-setup panel is the dominant landing-page element. It may sit on the left side of a wider desktop composition, but no other element may compete with the setup task.

### 5.2 Setup inputs

The parallel wireframe contains six top-level inputs:

| # | Input | Control | Meaning and validation |
| ---: | --- | --- | --- |
| 1 | Clinical indication | Text field | Required human-readable disease or condition. Submitted text and any later terminology resolution are stored separately. |
| 2 | Biomarker/target exploration range | Dual-handle range | Inclusive range from **Established** to **Untested but plausible**. Handles cannot cross. Both selected endpoints are displayed in text. |
| 3 | Maximum biomarkers/targets | Minus button, editable numeric display, plus button | Positive integer ceiling on returned biomarkers, within a product limit that remains to be ratified and implemented. |
| 4 | Maximum literature papers | Minus button, editable numeric display, plus button | Positive integer ceiling on papers included in the run's literature evidence graph. Search scope, ranking, considered count, included count, and exclusions remain inspectable. |
| 5 | Hypothesis boldness range | Dual-handle range | Inclusive range from **Standard** to **Radical**. Handles cannot cross. Both selected endpoints are displayed in text. |
| 6 | Maximum hypotheses per biomarker | Minus button, editable numeric display, plus button | Positive integer ceiling on hypotheses returned for each biomarker, within a product limit that remains to be ratified and implemented. |

The paper control is one shared run-level cap in this draft. The transcript mentions it twice; whether the final product needs separate biomarker- and hypothesis-stage caps remains an open decision in section 15.

All three numeric values are ceilings, not promises or quotas. A module may return fewer qualifying papers, biomarkers, or hypotheses, but it must record requested versus returned counts and a structured reason. The product must not fabricate weak candidates or irrelevant papers to fill a requested number.

Coverage-distribution, modality, budget, evidence-depth, simulation-depth, and advanced execution controls remain excluded from this first setup. The paper cap bounds the evidence set; it is not a user-facing evidence-quality setting.

### 5.3 Run action

The green **Run** button:

- Remains disabled until all required fields are valid.
- Shows field-level errors without clearing valid input.
- Creates an immutable run record containing the submitted setup.
- Takes the user directly to Screen 2 after successful run creation.
- Never claims that unwired modules have begun when run creation or orchestration fails.

## 6. Screen 2 — Program Graph

### 6.1 Graph topology

The transcript's “five levels” is interpreted as five module-result layers beneath one indication root. The screen therefore has six visible bands, stacked top to bottom:

1. Indication root.
2. Biomarker/target identification.
3. Hypothesis generation.
4. ROI / clinical impact.
5. Clinical recruitability.
6. Atomistic simulation.

Evidence packets are assembled behind the graph and exposed through inspection; they are not a seventh visual pipeline band. Hypothesis Highlander is Screen 3, not a graph band.

### 6.2 Branch cardinality

For a run requesting up to `B` biomarkers and up to `H` hypotheses per biomarker:

- There is one indication root.
- Up to `B` returned biomarker nodes may exist.
- Up to `B × H` returned hypothesis branches may exist.
- Every returned hypothesis branch has one ROI node, one recruitability node, and one simulation node or explicit missing-state record.

This draft treats downstream evaluations as hypothesis-specific, because ROI, recruitability, and atomistic support can change with the intervention hypothesis. The transcript's later reference to one downstream node “for each biomarker” is treated as a dictation conflict and remains an explicit assumption pending confirmation.

### 6.3 Immediate layout and truthful placeholders

Under `WF-A19`, the graph reserves horizontal capacity from the submitted ceilings and shows neutral linked shells through every downstream band so its overall shape is visible immediately. Reserved slots and shells are loading scaffolds, not scientific result nodes. They carry no biomarker or hypothesis identity and never enter an evidence packet.

As each generation stage completes:

- Returned candidates replace reserved slots with identified nodes.
- Unused capacity is retired with requested-versus-returned shortfall information.
- A created hypothesis branch receives an immutable horizontal lane.
- No completed branch changes lanes later in the run.

Before a node has a quantified value for the selected stage metric, it sits on a labeled neutral/loading shelf within its band. Once the output arrives, the node moves to its proportional metric position. The interface must never place an unknown value at a favorable or unfavorable endpoint.

### 6.4 Sequential execution and progress

Target module order is:

```text
Biomarker identification
  -> hypothesis generation
    -> ROI / clinical impact
      -> clinical recruitability
        -> atomistic simulation
```

A downstream stage begins for an eligible branch only after its required upstream record reaches a terminal state. Failure, non-amenability, or insufficient evidence remains visible and may create an explicit downstream skip rather than aborting unrelated branches.

The top of the page includes a persistent progress stepper/bar showing each stage as queued, running, complete, complete-with-warnings, or failed. The proposed target updates automatically, using event delivery when available and five-second polling as a provisional fallback. The screen shows the last successful refresh time and a visible stale/reconnecting state. No composed implementation is claimed to exist today.

### 6.5 Stage metric placement

Each metric-bearing band has a selector on the left side. Only one metric controls vertical position within a band at a time. Low values appear at the top, high values at the bottom, equal values share the same y-coordinate, and distance is proportional to the disclosed numeric or calibrated ordinal difference.

| Band | Default metric | Initial alternatives |
| --- | --- | --- |
| Biomarker | Exploration posture: established → untested but plausible | Evidence support; prior pursuit |
| Hypothesis | Boldness: standard → radical | Evidence support; biological plausibility |
| ROI | P50 rNPV: low → high cash value | Probability of positive rNPV; clinical impact |
| Recruitability | Recruitability: low → high | Enrollment duration; screens per enrollee; recruitability risk |
| Simulation | Atomistic support: low → high | Pose occupancy; convergence |

The simulation default corrects the transcript's apparent repetition of “recruitability” in the atomistic layer. Every axis discloses unit or named scale, domain, direction, qualifiers, evidence basis, and uncertainty treatment.

Changing a stage metric is presentation-only. It does not rerun a module, change outputs, reassign lanes, alter evidence packets, or change Highlander inputs.

### 6.6 Lineage interactions

- **Hover:** Highlight the hovered node and all existing descendants. De-emphasize unrelated nodes without hiding them.
- **Select/click:** Lock the selected state, highlight the complete available lineage in both directions, and open the interpretability panel.
- **Keyboard focus:** Provide the same preview and selection affordances without requiring hover.
- **Clear selection:** Return the graph to its normal emphasis without changing run state.

### 6.7 Interpretability panel

Selecting any node opens a panel from the right. A persistent control at the top collapses it to a narrow rail and restores it without losing selection, active section, or scroll position.

The panel may include text, tables, citations, uncertainty visualizations, evidence graphs, molecular/structural artifacts, model outputs, and run metadata. All content is governed by the shared interpretability contract. The panel displays a public rationale and source record; it never displays or requests hidden chain-of-thought.

### 6.8 Transition to Highlander

A **Run Hypothesis Highlander** button appears after the simulation band. Under this draft's provisional partial-run policy, it is enabled when at least one hypothesis packet exists and every eligible branch has reached a terminal execution state across its required evaluations. `FAILED`, `SKIPPED`, and `NOT_AMENABLE` are terminal but incomplete outcomes. An unwired capability is represented as execution `SKIPPED` with reason `MODULE_NOT_WIRED`, plus result basis and runtime maturity `NOT WIRED`; `NOT WIRED` is not itself an execution status. The action may enable with a prominent completeness warning. If no hypotheses are returned, the action remains disabled with an explanation.

Starting Highlander creates a versioned Highlander job from the exact evidence-packet revisions shown on Screen 2 and takes the user to Screen 3. It does not mutate the underlying run.

## 7. Screen 3 — Hypothesis Highlander

### 7.1 Purpose

Highlander compares the completed and explicitly incomplete program packets across scientific, clinical, and commercial objectives. It returns a human-reviewed Pareto decision set, not an unexplained global score or automatic winner.

### 7.2 Required regions

The desktop screen contains:

1. **Run and frontier summary:** Source run, packet completeness, proxy/unwired warnings, scenario, objective definitions, and Highlander status.
2. **Optimized program set:** Multiple non-dominated hypotheses/programs with their raw objective values, uncertainty, and tradeoffs. Dominated and incomparable programs remain available through explicit filters.
3. **Selected program detail:** The terminal hypothesis statement, full public justification, supporting and counterevidence, assumptions, uncertainty, lineage, failure history, and why it is non-dominated, dominated, or incomparable.
4. **Run-grounded chat:** A conversational interface for questions about Highlander's output and the preceding run.
5. **Human review actions:** Shortlist, add a hard constraint, request another run, or exclude with an attributed rationale.

### 7.3 Scenario weights and Pareto integrity

The transcript requests optimized hypotheses under different scenario weights. In this draft:

- Weight sets are named, versioned, and fully disclosed.
- They may choose a comparison view, preference ordering, or search scenario.
- Raw objectives remain visible in their original units.
- A weighted view does not relabel one program as the universally best program.
- The unweighted Pareto status remains available.
- Hard constraints are recorded human actions and are distinct from presentation preferences.

### 7.4 Public justification and chat

Highlander shows a concise, complete public justification supported by the packet ledger. “Reasoning” means this inspectable decision record, not private chain-of-thought.

Chat answers must:

- Be grounded only in the selected run, its evidence packets, Highlander artifacts, and linked sources.
- Link material claims back to inspectable records.
- Preserve units, scenarios, uncertainty, missingness, and proxy/not-wired qualifiers.
- Distinguish an answer from a hypothesis or inference.
- Abstain when the run does not contain enough evidence.
- Never silently change a shortlist, constraint, exclusion, packet, or source result.

## 8. Cross-screen state and navigation

- The run identifier and submitted indication remain visible on Screens 2 and 3.
- Browser refresh restores the current run and screen when the run record is available.
- Back navigation from Screen 3 returns to the same graph view, selection, metric choices, inspector state, and scroll position when feasible.
- Screen-level errors retain the run identifier and provide a safe retry or return path.
- No screen invents completed data to make a partially wired workflow appear finished.

## 9. Functional requirements

Requirements marked with an assumption ID are provisional until that decision is ratified. `DIRECT INTENT` records clear transcript or user scope; `NORMALIZATION` records a corrected dictation; `GUARDRAIL` carries a truthfulness or safety rule from the existing product pack.

| ID | Requirement | Basis |
| --- | --- | --- |
| WF-PRD-001 | The first wireframe shall contain exactly three desktop screens: Run Setup, Program Graph, and Hypothesis Highlander. | `DIRECT INTENT` |
| WF-PRD-002 | The product shall not require a mobile or tablet layout in this wireframe scope. | `DIRECT USER SCOPE` |
| WF-PRD-003 | Run Setup shall use a cream page, dark slightly rounded panels, and a green **Run** action. | `DIRECT INTENT` |
| WF-PRD-004 | Run Setup shall expose the six inputs in section 5.2 and no advanced execution controls. | `WF-A01`; conflicts with the existing parallel source's five-input rule |
| WF-PRD-005 | The biomarker and hypothesis range controls shall use two ordered handles and expose their named endpoints textually. | `DIRECT INTENT` |
| WF-PRD-006 | Biomarker, hypothesis, and literature-paper values shall be ceilings with requested-versus-returned accounting and structured shortfall reasons. | `WF-A13` |
| WF-PRD-007 | A successful **Run** action shall create an immutable run record and navigate to the Program Graph. | `DIRECT INTENT`; storage is `PROPOSED TARGET / NOT WIRED` |
| WF-PRD-008 | The Program Graph shall contain one indication root plus five module bands stacked top to bottom. | `WF-A03` |
| WF-PRD-009 | Every returned hypothesis shall own a stable branch through ROI, recruitability, and simulation or explicit missing-state records. | `WF-A04` |
| WF-PRD-010 | Requested-capacity scaffolds shall remain visually and semantically distinct from returned scientific result nodes. | `WF-A19`, `GUARDRAIL` |
| WF-PRD-011 | Target module stages shall progress sequentially and expose stage and run status. | `WF-A11` |
| WF-PRD-012 | The graph shall update automatically, with event delivery preferred and five-second polling as a provisional fallback, and shall expose refresh health. | `WF-A07`, `WF-A17`; transport is `PROPOSED TARGET / NOT WIRED` |
| WF-PRD-013 | Quantified node results shall move from a neutral shelf to truthful proportional positions within their stage band. | `DIRECT INTENT`, `GUARDRAIL` |
| WF-PRD-014 | Changing a stage metric shall affect presentation only. | `GUARDRAIL` |
| WF-PRD-015 | Hover shall highlight a node and its descendants; selection shall highlight full available lineage and open the inspector. | `DIRECT INTENT`, `NORMALIZATION` |
| WF-PRD-016 | The inspector shall be collapsible and support rich artifacts under the common interpretability contract. | `DIRECT INTENT` |
| WF-PRD-017 | Failed, skipped, not-amenable, proxy, and not-wired states shall remain visible and shall never be treated as positive evidence. | `GUARDRAIL` |
| WF-PRD-018 | Highlander shall run against versioned evidence packets only after at least one packet exists and all eligible branches reach terminal execution states. | `WF-A14` |
| WF-PRD-019 | Highlander shall return a Pareto decision set with raw objectives, tradeoffs, uncertainty, lineage, and completeness warnings. | `WF-A08`, `GUARDRAIL` |
| WF-PRD-020 | Scenario weights shall be disclosed and shall not create an unexplained automatic global winner. | `WF-A08`, `GUARDRAIL` |
| WF-PRD-021 | Highlander shall expose a selected program's terminal hypothesis and complete public justification without hidden chain-of-thought. | `WF-A18` |
| WF-PRD-022 | Highlander chat shall be grounded in the terminal run snapshot, cite inspectable records, preserve qualifiers, and abstain when evidence is insufficient. | `WF-A12`, `WF-A15` |
| WF-PRD-023 | Human review actions shall be attributed, rationalized, versioned, and auditable. | `GUARDRAIL` |
| WF-PRD-024 | Proposed target behavior and current runtime maturity shall remain separately labeled. | `GOVERNANCE` |
| WF-PRD-025 | Scientific, clinical, and commercial reviewers shall have equal access to the shared evidence and decision surface. | `CARRIED PRODUCT DECISION` |
| WF-PRD-026 | Cross-screen navigation and refresh shall preserve the run identity and recoverable view state without mutating records. | `PROPOSED TARGET` |
| WF-PRD-027 | Essential controls, state, lineage, and evidence shall have keyboard and noncolor equivalents. | `ACCESSIBILITY GUARDRAIL` |

## 10. Product rules

1. **No fabricated capacity.** A reserved slot is not a result.
2. **No missing-as-pass.** Missing, failed, skipped, or unwired work stays explicit.
3. **No visual fiction.** Spatial distance corresponds to a disclosed metric and domain.
4. **No silent compression.** Scientific, clinical, commercial, and simulation results remain separate.
5. **No automatic winner.** Highlander exposes tradeoffs; people decide.
6. **No hidden reasoning requirement.** Public rationale and evidence are required; private chain-of-thought is not.
7. **No qualifier loss.** Units, scenarios, uncertainty, evidence basis, and maturity warnings survive every handoff and chat answer.

## 11. Scope boundaries

### Included

- One new desktop run.
- Dynamic, sequential program graph.
- Stage metric controls.
- Hover lineage preview and click selection.
- Shared collapsible interpretability panel.
- Highlander Pareto review, selected-program justification, and run-grounded chat.
- Attributed human review actions.

### Excluded

- Mobile and tablet layouts.
- Run history, portfolio administration, and team administration.
- Authentication and permissions UI design. Authorization-safe artifact access remains a required `PROPOSED TARGET / NOT WIRED` dependency; actor and access fields are conditional until an identity contract exists.
- Exports and formal report generation.
- Advanced execution controls, manual retries, budgets, scheduling, or user-selected modality.
- Editing module-generated scientific records in place.
- Production deployment, billing, or external-system configuration.

## 12. Current implementation maturity

Design approval and runtime maturity are separate:

- `PROPOSED TARGET`: specified by this draft but not yet approved.
- `APPROVED TARGET`: ratified product requirement; none is implied merely by this draft.
- `LIVE`: verified deployed and registered in the checked environment.
- `LOCAL`: verified runnable in the checkout but not composed into the target workflow.
- `PROXY`: mechanics exist, but mock, synthetic, stub, or proxy evaluators stand in for the target capability.
- `NOT WIRED`: absent, partial, or not connected end to end.
- `UNVERIFIED`: an audit label for an external/deployment claim that was not tested live; it is not a runtime state shown as success.

Snapshot metadata:

| Field | Value |
| --- | --- |
| Checkout branch | `vaalessi/program-strategy-valuation` |
| Checkout HEAD | `11c0bb1f25a185178e85fba878a8591d63b3b544` |
| Checked date | 2026-08-15 America/Los_Angeles |
| Live deployment verification | Not performed |
| Evidence precedence | Executable checkout and root integration inventory first; later coordination claims are recorded but external deployment is `UNVERIFIED` until a smoke test and router-registration check pass. |

| Target capability | Runtime status in the target flow | Evidence-backed snapshot |
| --- | --- | --- |
| Indication-first intake and discovery | `NOT WIRED` | The target starts from an indication, while the current spec starts from a structured thesis and the root inventory says stages have not adopted one contract. See [SPEC: Input—the thesis](../../../SPEC.md#input-the-thesis) and [README: Integration gaps](../../../README.md#integration-gaps). |
| Literature/evidence mapping | `NOT WIRED`; standalone deployment `UNVERIFIED` | The root README describes a design packet, the component README says deployment was never run, and later coordination notes claim deployment. No live smoke or root-router registration was verified in this task. See [root README](../../../README.md#research-evidence-mapper), [component status](../../../managed/research-evidence-mapper/README.md#status-and-gaps), and [coordination snapshot](../../../COORDINATION.md#3-done--per-person). |
| Biomarker discovery and hypothesis generation | `NOT WIRED` | Coordination says no hypothesis-node code was pushed, and the root README says no orchestrator exists. See [COORDINATION: pending](../../../COORDINATION.md#4-pending--per-person) and [README: Integration gaps](../../../README.md#integration-gaps). |
| ROI/economics evaluation | `LOCAL` | A runnable economics package exists, but bundled inputs are synthetic and `NOT_DECISION_GRADE`. See [README: Therapeutic Program Economics](../../../README.md#therapeutic-program-economics). |
| Recruitability forecasting | `LOCAL` | A runnable forecaster exists for structured inputs and remains uncomposed. See [README: Trial Recruitment Forecaster](../../../README.md#trial-recruitment-forecaster) and [README: Integration gaps](../../../README.md#integration-gaps). |
| Atomistic simulation | `NOT WIRED` | The repository contains a partial small-molecule tractability prototype, not the general atomistic simulation required here. See [README: Small-Molecule Tractability Review](../../../README.md#small-molecule-tractability-review). |
| Highlander search and Pareto mechanics | `LOCAL` + `PROXY` | The local loop, archive, and Pareto mechanics are described as running, while four evaluation bodies are mocked and real-node interoperation is unverified. See [Highlander: Honest status](../../../managed/hypothesis-highlander/README.md#honest-status) and [COORDINATION: active hazards](../../../COORDINATION.md#5-unowned-work--active-hazards). |
| End-to-end orchestration and updating graph | `NOT WIRED` | The root inventory states that no top-level orchestrator connects the stages and no product capability is registered with the root router. See [README: Integration gaps](../../../README.md#integration-gaps). |
| Run-grounded Highlander chat | `NOT WIRED` | No run-scoped chat, citation, or mutation-boundary surface was found in the checked Highlander component; the component's stated local surface is loop/dashboard mechanics. See [Highlander: Honest status](../../../managed/hypothesis-highlander/README.md#honest-status). |

The UI must show operational reality when source documents disagree. No external capability is called `LIVE` in this snapshot without current live verification.

## 13. Acceptance walkthroughs

| Scenario | Expected outcome |
| --- | --- |
| Default 3 × 3 run | The screen reserves capacity for up to three biomarkers and nine hypothesis branches; only returned candidates become result nodes; every real branch stays traceable. |
| Fewer papers or candidates returned | Requested and returned counts, search scope, and shortfall reasons are inspectable; no placeholder enters an evidence packet. |
| Stage starts with no quantified outputs | Nodes remain on the neutral shelf while the progress stepper and last-refresh state show that work is active. |
| Stage result arrives | The node moves only within its band to the correct proportional coordinate; its branch lane remains fixed. |
| Equal metric values | Equal values share a y-coordinate and remain distinguishable by their x-lanes. |
| Hover and selection | Hover previews descendants; click locks full lineage and opens the correct node record. |
| Missing/not-amenable simulation | The branch retains an explicit missing-state node; Highlander receives and displays the missingness. |
| Metric changed | Only the selected band's view changes; the run, records, lanes, packets, and Highlander inputs do not. |
| Stale polling | The interface stops implying freshness, shows last successful refresh, and offers a safe retry. |
| Highlander with partial packets | The action can proceed only after terminal states; Screen 3 prominently warns about incomplete evidence and never imputes favorable values. |
| Scenario weights changed | The named view changes while raw objectives and unweighted Pareto status remain available. |
| Chat asks beyond the run | Chat identifies the evidence gap and abstains rather than inventing an answer. |

## 14. Traceability matrix

The source-location labels refer to the supplied Whisperflow dialogue unless marked as a carried product decision. Assumption-linked rows remain provisional.

| Source intent / location | Decision status | Requirement coverage | Acceptance coverage |
| --- | --- | --- | --- |
| Exactly three computer-only screens / user request + all three transcript page headings | `DIRECT USER SCOPE` | WF-PRD-001–WF-PRD-002; WF-UX-047–WF-UX-048 | WF-AC-019–WF-AC-022 |
| Equal scientific, clinical, and commercial collaboration / carried existing product decision | `CARRIED PRODUCT DECISION` | WF-PRD-025 | WF-AC-025 |
| Cream landing page, dark rounded boxes, green Run / `LANDING PAGE` | `DIRECT INTENT` | WF-PRD-003, WF-PRD-007; WF-UX-001–WF-UX-004 | WF-AC-001, WF-AC-019 |
| Dual-handle exploration and boldness ranges / `LANDING PAGE` | `DIRECT INTENT` + `WF-A02` | WF-PRD-004–WF-PRD-005; WF-UX-005–WF-UX-007; WF-INT-002, WF-INT-015 | WF-AC-001, WF-AC-019; WF-CON-001 |
| Biomarker, hypothesis, and literature numbers / `LANDING PAGE` | `WF-A01`, `WF-A13`; six inputs conflict with existing five-input pack | WF-PRD-004, WF-PRD-006; WF-UX-006–WF-UX-008; WF-INT-015–WF-INT-018 | WF-AC-001–WF-AC-003; WF-CON-001–WF-CON-003 |
| One root plus five module bands / `GRAPH NETWORK VIEW` | `WF-A03`, `WF-A04`, `WF-A10` | WF-PRD-008–WF-PRD-009; WF-UX-009, WF-UX-012–WF-UX-016; WF-INT-003–WF-INT-004 | WF-AC-002–WF-AC-003, WF-AC-017 |
| Immediate full graph skeleton and sheet-music reading / `GRAPH NETWORK VIEW`, `DYNAMIC POPULATION` | `WF-A19` | WF-PRD-010; WF-UX-010–WF-UX-011, WF-UX-050; WF-INT-005 | WF-AC-002–WF-AC-004, WF-AC-017, WF-AC-024; WF-CON-002 |
| Sequential modules, visible progress, and five-second refresh / `DYNAMIC POPULATION` | `WF-A07`, `WF-A11`, `WF-A17` | WF-PRD-011–WF-PRD-012; WF-UX-030–WF-UX-034; WF-INT-006–WF-INT-009 | WF-AC-004, WF-AC-007, WF-AC-026 |
| Low-to-high stage geometry and selectable dimension / `GRAPH NETWORK VIEW` | `DIRECT INTENT`, `WF-A05`, `WF-A06`, `WF-A16` | WF-PRD-013–WF-PRD-014; WF-UX-017–WF-UX-024; WF-INT-010–WF-INT-012 | WF-AC-004–WF-AC-007; WF-CON-004–WF-CON-006 |
| Hover highlights children; click opens lineage / `HOVER HIGHLIGHT` + `INTERPRETABILITY PANEL` | `DIRECT INTENT`, normalized interaction precedence | WF-PRD-015; WF-UX-025–WF-UX-027; WF-INT-004 | WF-AC-008, WF-AC-023 |
| Right-side collapsible inspector with rich artifacts / `INTERPRETABILITY PANEL` | `DIRECT INTENT` | WF-PRD-016; WF-UX-028–WF-UX-029; WF-INT-013–WF-INT-024 | WF-AC-009–WF-AC-010, WF-AC-021, WF-AC-023; WF-CON-007–WF-CON-010, WF-CON-013 |
| Failures, non-amenability, proxy, and unwired states remain truthful / carried existing product guardrail | `GUARDRAIL` | WF-PRD-017; WF-UX-034, WF-UX-036; WF-INT-009, WF-INT-013, WF-INT-016, WF-INT-023 | WF-AC-010–WF-AC-012; WF-CON-008–WF-CON-011 |
| Footer action opens Highlander after work is done / `HYPOTHESIS HIGHLANDER PAGE` | `WF-A14` | WF-PRD-018; WF-UX-035–WF-UX-037; WF-INT-025–WF-INT-027 | WF-AC-011–WF-AC-012, WF-AC-018; WF-CON-011 |
| Optimized hypotheses under scenario weights and Pareto comparison / `HYPOTHESIS HIGHLANDER PAGE` | `WF-A08`, `WF-A16` | WF-PRD-019–WF-PRD-020; WF-UX-038–WF-UX-041; WF-INT-028–WF-INT-031 | WF-AC-013, WF-AC-020; WF-CON-012 |
| Terminal hypothesis and complete detailed justification / `HYPOTHESIS HIGHLANDER PAGE` | `WF-A18` | WF-PRD-021; WF-UX-042; WF-INT-032–WF-INT-034 | WF-CON-013 |
| Chat to understand Highlander / `HYPOTHESIS HIGHLANDER PAGE` | `WF-A12`, `WF-A15` | WF-PRD-022; WF-UX-043–WF-UX-046; WF-INT-035–WF-INT-040 | WF-AC-014–WF-AC-015, WF-AC-020, WF-AC-023; WF-CON-014–WF-CON-016 |
| Attributed human review actions / carried existing product guardrail | `GUARDRAIL` | WF-PRD-023; WF-UX-038, WF-UX-041; WF-INT-031, WF-INT-042 | WF-AC-027 |
| Proposed target versus current runtime state / carried existing product guardrail | `GOVERNANCE` | WF-PRD-024; WF-UX-034; WF-INT-009 | WF-CON-010, WF-CON-017 |
| Cross-screen state restoration / derived three-screen usability need | `PROPOSED TARGET` | WF-PRD-026; WF-UX-004, WF-UX-029, WF-UX-037 | WF-AC-009, WF-AC-021, WF-AC-023 |
| Keyboard, noncolor, and accessible artifacts / desktop quality guardrail | `ACCESSIBILITY GUARDRAIL` | WF-PRD-027; WF-UX-049; WF-INT-024, WF-INT-041 | WF-AC-023; WF-CON-007, WF-CON-014, WF-CON-017 |
| Authorization-safe artifacts and actions / dependency, not UI scope | `PROPOSED TARGET / NOT WIRED` | WF-INT-041–WF-INT-042 | WF-CON-014, WF-CON-017 |

## 15. Explicit assumptions and open decisions

These interpretations are required to draw a coherent wireframe, but they do not all have the same authority. `TRANSCRIPT NORMALIZATION` corrects likely dictation without intending a product change. `WORKING ASSUMPTION` makes a reversible product choice. `IMPLEMENTATION ASSUMPTION` proposes a mechanism, not current infrastructure. `OPEN FOUNDER DECISION` changes scope or behavior and requires explicit approval.

| ID | Type | Interpretation used in this draft | Decision needed |
| --- | --- | --- | --- |
| WF-A01 | `TRANSCRIPT NORMALIZATION` | The repeated literature-paper control is one shared run-level cap shown once. | Confirm one shared cap versus separate biomarker and hypothesis caps; this parallel variant intentionally conflicts with the existing five-input pack by adding a sixth visible input. |
| WF-A02 | `TRANSCRIPT NORMALIZATION` | The numeric control beside hypothesis boldness means maximum hypotheses per biomarker, not another biomarker count. | Confirm label and product limit. |
| WF-A03 | `TRANSCRIPT NORMALIZATION` | “Five levels” means five module bands beneath the indication root, for six visible graph bands total. | Confirm whether any band should be removed or combined. |
| WF-A04 | `WORKING ASSUMPTION` | ROI, recruitability, and simulation are one record each per returned hypothesis branch. | Confirm downstream cardinality. |
| WF-A05 | `TRANSCRIPT NORMALIZATION` | The simulation band's default axis is atomistic support; the repeated recruitability phrase is a dictation error. | Ratify the simulation metric and scale. |
| WF-A06 | `WORKING ASSUMPTION` | Recruitability defaults to a positive low-to-high recruitability measure; risk, duration, and screens per enrollee are alternatives. | Ratify the default and direction. |
| WF-A07 | `IMPLEMENTATION ASSUMPTION` | Five-second polling is a fallback; event delivery is preferred when available. | Confirm update transport and acceptable freshness; neither mechanism is claimed to be wired. |
| WF-A08 | `WORKING ASSUMPTION` | Highlander presents a Pareto set; “terminal hypothesis” means the currently selected program detail, not an automatic winner. | Confirm decision-set framing. |
| WF-A09 | `IMPLEMENTATION ASSUMPTION` | Desktop support begins at a provisional `1280 × 720` CSS-pixel viewport. | Confirm minimum supported desktop viewport. |
| WF-A10 | `TRANSCRIPT NORMALIZATION` | “Target area” on the top graph node means the submitted clinical indication, not a biomarker or drug target. | Confirm the root label and terminology. |
| WF-A11 | `IMPLEMENTATION ASSUMPTION` | Stages respect the global dependency order, while eligible branches within the active stage may execute concurrently. | Confirm orchestration semantics. |
| WF-A12 | `WORKING ASSUMPTION` | Highlander “learning” is limited to synthesis within the current run; chat is explanatory and cannot mutate decisions. | Approve separately if persistent learning or chat-driven actions are desired. |
| WF-A13 | `WORKING ASSUMPTION` | Biomarker, hypothesis, and literature-paper numbers are maximum ceilings rather than hard quotas. | Confirm ceiling behavior and the required shortfall explanations. |
| WF-A14 | `OPEN FOUNDER DECISION` | Highlander may start with failed, skipped, or not-amenable terminal packets if at least one hypothesis packet exists and the gaps are disclosed. | Confirm whether Highlander should instead require every evaluation to succeed. |
| WF-A15 | `WORKING ASSUMPTION` | The transcript's “ideally” chat interface is promoted to a required Screen 3 region in this draft. | Confirm required for v1 versus optional/future. |
| WF-A16 | `WORKING ASSUMPTION` | “Cash value” is normalized to P50 rNPV, with currency, horizon, scenario, and valuation date always shown. | Confirm the default ROI metric and its canonical qualifiers. |
| WF-A17 | `TRANSCRIPT NORMALIZATION` | “Refresh the page” means refresh run data in place without reloading the browser document or losing view state. | Confirm acceptable update behavior. |
| WF-A18 | `PRODUCT SAFETY INTERPRETATION` | “Show Highlander's reasoning” means an evidence-backed public rationale, not hidden chain-of-thought. | Confirm that the public rationale fields meet the trust requirement. |
| WF-A19 | `WORKING ASSUMPTION` | “Lay out the graph immediately” means neutral scaffolds across every reserved downstream band, not only empty hypothesis lanes. | Confirm the desired amount of provisional skeleton before identities and outputs exist. |
