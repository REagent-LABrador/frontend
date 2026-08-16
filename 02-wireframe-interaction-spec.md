# LABrador Whisperflow desktop wireframe interaction specification

**Status:** Parallel concept draft for wireframe review  
**Version:** `0.1`  
**Last updated:** 2026-08-15  
**Draft scope:** Proposed interaction, geometry, state, and desktop layout in the Whisperflow parallel direction  
**Does not supersede:** [Existing interaction specification](../02-wireframe-interaction-spec.md)  
**Product context:** [Parallel product PRD](./01-product-prd.md)  
**Data context:** [Parallel interpretability contract](./03-interpretability-node-contract.md)

## 1. Purpose

This document turns the parallel PRD into a wireframe-ready interaction model for three desktop screens. It defines what each control means, how the target updating graph changes as results arrive, how lineage remains legible, and how Highlander presents tradeoffs without inventing an automatic winner.

The wireframe separates three linked structures:

1. The program execution graph on Screen 2.
2. Scientific evidence graphs or other rich artifacts opened in the inspector.
3. Highlander's Pareto, scenario, and review views on Screen 3.

These structures may cross-highlight one another but must not be flattened into one graph.

## 2. Desktop support envelope

This concept has no mobile or tablet layout.

| Property | Provisional requirement |
| --- | --- |
| Reference viewport | `1440 × 900` CSS px |
| Minimum acceptance viewport | `1280 × 720` CSS px |
| Wide/docked-inspector threshold | `1800 px` viewport width |
| Below minimum | Preserve data and controls, show an unsupported-size notice, and allow scrolling; no compact/mobile reflow is required. |
| Dense graph | Horizontal graph-space scrolling/panning; never compress nodes or lanes until they overlap or change meaning. |

The app may adapt within supported desktop widths. “Desktop-only” does not permit clipping essential controls, changing branch identity, or losing access to the inspector.

## 3. Initial editable design tokens

All tokens are provisional, centralized, and adjustable during wireframe review.

### 3.1 Visual tokens

| Token | Initial value | Use |
| --- | --- | --- |
| `color_page_cream` | `#F4EEDF` | Page background |
| `color_panel_dark` | `#202521` | Setup cards, major headers, dark surfaces |
| `color_panel_text` | `#F8F4EA` | Text on dark panels |
| `color_action_run` | `#237A4D` | Primary Run/Highlander actions |
| `color_graph_canvas` | `#151A17` | Program graph plotting surface |
| `color_node_surface` | `#ECEBE5` | Default result-node surface |
| `radius_panel` | `10 px` | Slight panel rounding |
| `radius_control` | `6 px` | Control rounding |
| `focus_ring` | `3 px` | Visible keyboard focus indicator |

Color is never the only carrier of status, evidence basis, or selection. Final colors require contrast validation.

### 3.2 Geometry and motion tokens

| Token | Initial value | Use |
| --- | ---: | --- |
| `node_width` | `112 px` | Default graph node width |
| `node_height` | `72 px` | Default graph node height |
| `branch_lane_width` | `136 px` | Center-to-center hypothesis lane spacing |
| `stage_band_height` | `220 px` | One metric-bearing stage band |
| `fork_zone_height` | `72 px` | Dedicated fan-out routing area |
| `stage_control_rail_width` | `184 px` | Sticky left rail for stage label, chooser, and axis summary |
| `axis_plot_height` | `132 px` | Proportional metric plotting region within a band |
| `pending_shelf_height` | `32 px` | Nonmetric shelf for pending/missing nodes |
| `inspector_open_width` | `380 px` | Open right-side inspector |
| `inspector_collapsed_width` | `40 px` | Persistent collapsed rail |
| `highlander_chat_width` | `380 px` | Default Screen 3 chat region |
| `metric_move_duration` | `400 ms` | Default y-position transition; `0 ms` for reduced motion |
| `poll_interval` | `5 s` | Fallback data-refresh interval while work is nonterminal |

Token changes pass only if node content remains legible, axes remain truthful, branch x-coordinates remain stable, and connectors remain uncrossed.

## 4. Screen 1 — Run Setup

### 4.1 Layout

The screen uses the cream page background. A dark, slightly rounded setup panel anchors the left side of the desktop composition. Optional explanatory copy or a maximum-branch preview may occupy the right side, but it must remain visually subordinate.

The setup panel order is fixed:

1. Product title and short run explanation.
2. Clinical indication field.
3. Biomarker/target exploration dual-handle range.
4. Maximum biomarkers stepper.
5. Maximum literature papers stepper.
6. Hypothesis boldness dual-handle range.
7. Maximum hypotheses per biomarker stepper.
8. Validation summary when needed.
9. Green **Run** button.

Within the desktop panel, each exploration range shares a horizontal field group with its associated candidate-count stepper: the flexible dual-handle slider is on the left, and the compact minus/value/plus control is on the right. The shared literature-paper ceiling occupies its own labeled row so it cannot be mistaken for a second biomarker or hypothesis count.

The branch preview reads, for example, “Up to 3 biomarkers and up to 9 hypothesis branches.” It never presents a ceiling as a guaranteed return count.

### 4.2 Text field

- The indication field has a persistent visible label, not placeholder-only labeling.
- Leading and trailing whitespace are ignored for validation but the submitted value is preserved in the run record.
- Empty input is invalid.
- Pressing `Enter` does not submit while focus is in the field unless all values are valid and the behavior is explicitly announced.

### 4.3 Dual-handle ranges

Both range controls:

- Show named left and right anchors.
- Display the selected lower and upper values as text.
- Prevent the lower handle from passing the upper handle.
- Support arrow-key adjustment, larger `Page Up`/`Page Down` steps, and announced values.
- Treat the full selected interval as inclusive.
- Use a declared ordinal vocabulary. Visual spacing does not claim equal scientific distance unless the scale is calibrated that way.

Range labels are:

| Range | Left anchor | Right anchor |
| --- | --- | --- |
| Biomarker/target exploration | Established | Untested but plausible |
| Hypothesis boldness | Standard | Radical |

### 4.4 Numeric steppers

Each count control contains a minus button, an editable numeric value, and a plus button.

- Buttons have explicit accessible names, such as “Decrease maximum biomarkers.”
- The value cannot fall below `1` or exceed the provisional product limit shown by the wireframe; that limit remains to be ratified and wired.
- Holding a button does not create uncontrolled rapid changes.
- Direct typed values validate on blur and before submission.
- The operational limit and current value are visible.
- Invalid text does not silently coerce to a different number.

### 4.5 Run submission

The **Run** button has `disabled`, `ready`, `submitting`, and `error` states.

When activated in the ready state:

1. Lock one immutable setup snapshot.
2. Show an in-button progress cue without replacing the accessible label.
3. Create the run.
4. Navigate to the graph associated with the created run only after creation succeeds; concrete route design is outside this wireframe contract.
5. On failure, retain all input and show a public error plus retry path.

Double activation must not create duplicate runs.

## 5. Screen 2 — Program Graph frame

The screen contains:

1. A fixed application/run header.
2. A persistent stage-progress strip.
3. A vertically scrollable graph viewport.
4. A sticky left stage-control rail.
5. A horizontally pannable graph canvas.
6. A right-side interpretability inspector or collapsed inspector rail.
7. A footer area containing Highlander readiness and the launch action.

The stacked bands and stable lanes should read like sheet music at a glance: stages form horizontal bands, while each hypothesis branch provides a consistent vertical through-line. Unlike decorative staff notation, every metric coordinate and connector retains the disclosed semantics below.

At widths below `1800 px`, the open inspector overlays the right side of the graph viewport without altering graph-space coordinates. At or above `1800 px`, it may dock beside the viewport. Opening, docking, collapsing, or closing the inspector never recomputes a branch x-coordinate.

## 6. Graph topology and lane geometry

### 6.1 Ordered bands

The canvas contains one root band and five computational bands:

1. Indication root.
2. Biomarker/target.
3. Hypothesis.
4. ROI / clinical impact.
5. Clinical recruitability.
6. Atomistic simulation.

Band order never changes. Highlander is a separate page and evidence-packet assembly is a data operation, not another visible band.

### 6.2 Requested-capacity scaffolding

After run creation, the canvas can reserve up to:

```text
requested_biomarker_ceiling × requested_hypotheses_per_biomarker_ceiling
```

hypothesis lane slots.

Before identification, each slot is an unbound capacity scaffold with a neutral shape and text such as “Candidate pending.” It has no scientific name, metric, packet, or result badge. Assistive text explicitly says that it is requested capacity, not a returned candidate.

At this initial state, scaffold centers are evenly spaced by `branch_lane_width` and share a clearly unpositioned shelf. This equal spacing describes available layout capacity only; it is never presented as a measured or ranked result.

Under working assumption `WF-A19`, every reserved hypothesis lane displays a neutral provisional shell in the Hypothesis, ROI, Recruitability, and Simulation bands from the start of Screen 2. Biomarker-group shells appear above their reserved child intervals. These linked shells make the full eventual topology visible but remain one visual scaffold, not four returned scientific records. A shell becomes a real node only when a validated candidate or downstream execution record binds to it.

When a stage returns fewer candidates:

- Returned candidates bind to stable slots.
- Unused slots become quiet `NOT RETURNED` capacity markers or disappear from emphasis without shifting any bound branch.
- The stage summary exposes requested count, returned count, and reasons.
- Unbound slots never acquire downstream scientific identities, metrics, or evidence packets; their downstream shells remain view scaffolding only.

### 6.3 Fixed hypothesis lanes

Each returned hypothesis receives an immutable `branch_lane_index`:

```text
x(branch) = graph_origin_x + branch_lane_index × branch_lane_width
```

The hypothesis node and its ROI, recruitability, and simulation records share this x-coordinate. A metric switch, status transition, refresh, selection, or inspector action cannot move the branch horizontally.

Hypotheses belonging to one biomarker occupy a contiguous lane interval. Different biomarker intervals cannot overlap.

### 6.4 Parent placement and fork zones

- The indication root is centered over the returned biomarker span.
- Each biomarker is centered over its bound hypothesis-lane span.
- Indication-to-biomarker and biomarker-to-hypothesis fan-outs use dedicated fork zones.
- Each parent owns one contiguous, non-overlapping child interval.
- One-to-one hypothesis-to-ROI-to-recruitability-to-simulation connectors are vertical.

Fork routing uses a vertical trunk, one horizontal bus inside the parent's interval, and vertical child drops. Connectors cannot enter another parent's interval. Diagonal shortcut routing and crossed connectors are prohibited.

## 7. Dynamic graph population

### 7.1 Stage dependency model

The global stage order is sequential:

```text
Biomarker -> Hypothesis -> ROI -> Recruitability -> Simulation
```

Eligible work within the active stage may run concurrently across returned branches. A branch does not enter a downstream stage until its required parent record is terminal and the branch meets that module's declared prerequisites.

### 7.2 Before a metric exists

A real node without the active metric is placed on the stage's labeled pending shelf. It is not positioned at the midpoint of the metric axis and does not claim a neutral score. Pending, missing, failed, and nonnumeric results use distinct shelf treatments.

Requested-capacity scaffolds are separate from real pending nodes:

- **Capacity scaffold:** Candidate identity does not yet exist.
- **Pending node:** Candidate exists; its module output or selected metric does not yet exist.

### 7.3 When a result arrives

On a successful data refresh:

1. Validate the new node record and metric contract.
2. Keep its branch x-coordinate unchanged.
3. Move only its y-coordinate from the pending shelf to the proportional metric coordinate.
4. Update node value, unit, uncertainty cue, evidence basis, and status.
5. Keep the user's scroll, selection, inspector, and keyboard focus stable.

Default motion is short and causal. With reduced motion enabled, the node updates without animation.

### 7.4 Refresh behavior

This is `PROPOSED TARGET / NOT WIRED` behavior. The wireframe requires observable automatic updates and freshness state; it does not claim an event or polling service exists.

- Prefer server-sent events, WebSocket events, or an equivalent event transport if later architecture supports one.
- Under `WF-A07`, while any work is nonterminal, poll every five seconds if event delivery is unavailable.
- Refresh run data; never reload the full browser page.
- Coalesce rapid updates so the graph remains understandable.
- Show `Last updated {time}` and a liveness state.
- If updates fail, keep the last confirmed data, mark it stale, use retry backoff, and offer a manual retry.
- Never infer completion solely because no visual node moved.

## 8. Proportional metric geometry

### 8.1 Continuous values

For a disclosed domain `[domain_min, domain_max]` and plot range `[plot_top, plot_bottom]`:

```text
normalized = clamp((value - domain_min) / (domain_max - domain_min), 0, 1)
y = plot_top + normalized × (plot_bottom - plot_top)
```

Low is at the top and high is at the bottom. Values outside the domain pin to the nearest boundary, show an overflow marker, and retain the raw value.

### 8.2 Ordinal values

Named ordinal steps use a published mapping. Equal visual intervals are allowed only when the product declares the steps equidistant. Otherwise, use the calibrated coordinates. Rank or array order cannot substitute for values.

### 8.3 Ties, missing values, and uncertainty

- Equal values share exactly the same y-coordinate.
- Nodes remain distinguishable through fixed x-lanes; do not add arbitrary jitter.
- Missing or nonnumeric values remain on a labeled shelf.
- Uncertainty is shown through a declared cue such as interval whiskers, bands, or a compact label.
- Uncertainty marks must not imply a distribution the source did not provide.

### 8.4 Axis disclosure

Every metric axis shows:

- Metric name and definition.
- Unit or named scale.
- Domain, ticks, and domain source.
- Direction: low at top, high at bottom.
- Material qualifier: scenario, time horizon, population, valuation date, or similar.
- Evidence basis: observed, modeled, inferred, or proxy.
- Uncertainty method or `not available` reason.

## 9. Stage metric choosers

The chooser sits in the sticky left rail for its stage. It changes y-position, axis copy, node primary values, and uncertainty marks for that band only.

| Stage | Default | Initial alternatives | Required qualifier examples |
| --- | --- | --- | --- |
| Biomarker | Exploration posture | Evidence support; prior pursuit | Named ordinal scale, literature search scope |
| Hypothesis | Boldness | Evidence support; biological plausibility | Named ordinal scale, testability definition |
| ROI | P50 rNPV | Probability of positive rNPV; clinical impact | Currency, valuation date, horizon, scenario |
| Recruitability | Recruitability | Enrollment duration; screens per enrollee; recruitability risk | Scale direction; months; count ratio; population |
| Simulation | Atomistic support | Pose occupancy; convergence | Engine/model, structure, statistic, uncertainty |

The setup ranges constrain candidate generation. Selecting the corresponding graph metric visualizes the returned per-node values; it does not merely replay the input handle positions.

A metric change cannot:

- Rerun or reprioritize a module.
- Change stored output or evidence-packet data.
- Move branch lanes.
- Change parent-child relationships.
- Alter execution status.
- Change Highlander scenarios, constraints, inputs, or frontier membership.

## 10. Node, hover, focus, and selection

### 10.1 Node summary

Every bound node shows, as space permits:

- Short label.
- Active metric value and unit, or explicit pending/missing state.
- Execution state.
- Result-basis badge.
- Uncertainty cue.
- Proxy/not-wired warning when applicable.

### 10.2 Interaction precedence

| Interaction | Emphasis | Persistence | Inspector effect |
| --- | --- | --- | --- |
| Hover | Hovered node plus existing descendants | Ends on pointer exit | None |
| Keyboard focus | Focused node plus existing descendants | While focused | None until activation |
| Selection | Ancestors, selected node, and existing descendants | Until another selection or explicit clear | Opens selected record |

Hover or focus cannot replace, clear, or visually obscure an existing selection. When selection and hover differ, the selected lineage remains visible and the hover preview uses a secondary treatment.

Selecting a Highlander item on Screen 3 records a navigation target so returning to Screen 2 can highlight its source branch.

## 11. Interpretability inspector

### 11.1 States

The inspector supports `collapsed`, `opening`, `loading`, `loaded`, `empty-with-reason`, and `error` states.

- It enters from the right.
- Its collapse control remains at the top and is always keyboard reachable.
- The collapsed rail retains the selected node's short identity, state, and expand control.
- `Enter` or `Space` activates a focused node and moves focus to the inspector heading.
- `Escape` collapses the inspector and returns focus to the selected node; it does not clear selection.
- Reopening restores the same node, section, and scroll position when the record is unchanged.
- Live record updates do not reset inspector scroll or steal focus.

### 11.2 Content regions

The inspector renders the common contract in this order:

1. Summary and state warnings.
2. Public result and uncertainty.
3. Evidence, counterevidence, assumptions, and public rationale.
4. What would change the conclusion: falsifier, sensitivity, limitations, failure/skip reason.
5. Rich artifacts: literature graphs, tables, charts, structure views, reports, or logs.
6. Inputs, lineage, module/model, configuration, timestamps, hashes, cost, and audit history.

An artifact error cannot make the rest of the record unavailable. Proxy/not-wired warnings remain visible above collapsed disclosures.

## 12. Progress and state model

### 12.1 Progress strip

The top strip shows:

- Current run state.
- Five ordered stage labels.
- Current active stage.
- Completed, running, warning, and failed branch counts for the active stage.
- Last successful update time and liveness.
- A textual explanation when visible progress cannot be quantified.

Do not display an invented overall percentage when stages do not publish valid progress denominators.

### 12.2 Separate classifications

Execution, evidence basis, runtime maturity, UI freshness, and interaction state are independent. Design approval is separately `PROPOSED TARGET` or `APPROVED TARGET` and is never a runtime result:

| Classification | Values |
| --- | --- |
| Execution | `QUEUED`, `RUNNING`, `COMPLETE`, `FAILED`, `SKIPPED`, `NOT_AMENABLE` |
| Result basis | `OBSERVED`, `MODELED`, `INFERRED`, `PROXY`, `NOT RUN`, `NOT WIRED` |
| Runtime maturity | `LIVE`, `LOCAL`, `PROXY`, `NOT WIRED` |
| UI freshness | `LIVE`, `POLLING`, `STALE`, `REFRESH_ERROR` |
| Interaction | `DEFAULT`, `HOVER`, `FOCUS`, `SELECTED`, `DISABLED` |

A node may be execution `COMPLETE`, result basis `MODELED + PROXY`, runtime maturity `PROXY`, and UI freshness `LIVE` at the same time. The UI must not collapse those facts into one green badge.

## 13. Highlander readiness and launch

The footer shows:

- Number of complete, partial, blocked, and still-running packets.
- Which stages are not terminal.
- Proxy and not-wired warnings.
- The **Run Hypothesis Highlander** action.

Under open decision `WF-A14`, the action is disabled while any eligible branch has a nonterminal required record and also when no hypothesis packet exists. When at least one packet exists and all branches are terminal, it becomes available even if some executions are failed, skipped, or not amenable. An unavailable module uses execution `SKIPPED` with `MODULE_NOT_WIRED`, plus result basis and runtime maturity `NOT WIRED`; `NOT WIRED` is not an execution status. Incomplete evidence produces a confirmation warning and is never silently imputed. A zero-hypothesis run shows a no-candidates explanation and cannot create a vacuous Highlander job.

Activation:

1. Captures the exact version and hash of every input packet.
2. Creates one idempotent Highlander job.
3. Navigates to the Highlander result associated with the run and job; concrete route design is outside this wireframe contract.
4. Preserves the graph view state for return navigation.

## 14. Screen 3 — Hypothesis Highlander

### 14.1 Page states

The page supports `queued`, `running`, `complete`, `complete-with-gaps`, `failed`, and `empty` states. `empty` means a valid Highlander job had at least one input packet but produced no comparable programs under the recorded policy or constraints; a zero-hypothesis run cannot launch a job. While running, the page shows real stage/activity messages and the packet snapshot being analyzed. It does not fabricate partial conclusions before a valid result exists.

### 14.2 Desktop regions

The complete state includes:

1. **Header:** Run identity, Highlander version, packet snapshot, scenario profile, completeness, and maturity warnings.
2. **Scenario and objective controls:** Named profiles, visible weights where used, hard constraints, and viewing preferences.
3. **Program comparison:** Pareto plot, parallel coordinates, or a table showing raw objectives and uncertainty.
4. **Program list:** Non-dominated programs first; explicit filters for dominated and incomparable programs.
5. **Selected program detail:** Terminal hypothesis, status, objective vector, tradeoffs, public justification, evidence/counterevidence, assumptions, lineage, and gaps.
6. **Run-grounded chat:** Read-only Q&A in a right-side panel, promoted from the transcript's aspirational “ideally” language under `WF-A15`.
7. **Human actions:** Shortlist, add constraint, request another run, and exclude with rationale.

At the reference viewport, chat may occupy its token width while comparison and detail scroll within the remaining region. The screen does not convert to a mobile stack.

### 14.3 Scenario profiles

- Each profile has a name, version, description, objective weights or preferences, author/source, and timestamp.
- Raw objective values remain visible beside any weighted representation.
- The UI distinguishes hard constraints from weights and viewing preferences.
- Changing a viewing preference cannot alter the recorded frontier.
- Applying a hard constraint creates an attributed audit event and a new decision-set version.
- The baseline unweighted Pareto status remains inspectable.

### 14.4 Selected-program justification

The selected detail explains:

- What the terminal hypothesis is.
- Why the program is non-dominated, dominated, or incomparable under the current scenario.
- Which evidence and counterevidence materially affected the result.
- Which assumptions and uncertainty remain.
- What failed, was skipped, was not amenable, or was not wired.
- Which alternative programs expose the most important tradeoffs.
- What evidence or constraint would change the conclusion.

This is a structured public rationale, not hidden model chain-of-thought.

## 15. Highlander chat interaction

Chat is scoped to the current run and selected Highlander job.

- The empty state suggests questions tied to visible evidence, such as “Why is Program A non-dominated?”
- Material statements include clickable citations to node records, packet fields, or artifacts.
- Selecting a citation opens the cited record without losing the conversation.
- Answers label source output, synthesis/inference, and uncertainty separately.
- If the ledger cannot support an answer, chat states what is missing and abstains.
- Chat preserves proxy, not-decision-grade, missing, and not-wired qualifiers.
- Chat cannot change source records, scenario weights, hard constraints, shortlists, or exclusions.
- A separate explicit human action is required for any product-state change.
- Chat history is not treated as a new scientific result or as persistent cross-run learning.

## 16. Accessibility and keyboard behavior

- Every control and bound graph node is keyboard reachable with visible focus.
- A semantic outline exposes indication → biomarker → hypothesis → downstream relationships to assistive technology.
- Node names include label, stage, active value/unit or missing state, execution status, and result basis.
- Range handles announce both their own value and the selected interval.
- Status and evidence basis never rely on color alone.
- Live announcements are polite and batched; five-second updates do not overwhelm users.
- Reduced-motion preference disables node animation without hiding state changes.
- Rich artifacts provide accessible text alternatives and source metadata.
- Focus remains stable through polling, metric changes, and inspector updates.

## 17. Validated decisions and rejected patterns

| Required behavior | Rejected pattern | Reason |
| --- | --- | --- |
| Reserved capacity is visibly provisional | Placeholder presented as a named finding | Fabricates scientific output before a module returns it |
| Result y-distance is proportional | Rank-only equal spacing | Hides magnitude and separates ties arbitrarily |
| One fixed x-lane per hypothesis | Horizontal re-ranking after each update | Loses lineage and creates diagonal/crossed edges |
| Orthogonal fan-outs in owned fork zones | Free-form curved/crossed connectors | Makes parent ownership ambiguous |
| Pending/missing shelf outside the axis | Unknown placed at midpoint or zero | Converts absence into a metric claim |
| Metric controls change view only | Metric switch reruns modules | Makes inspection mutate the scientific record |
| Execution graph and evidence artifacts stay linked but distinct | Flattened mega-graph | Mixes scientific evidence, execution, and search lineage |
| Highlander exposes raw objectives and a Pareto set | Hidden composite score or automatic winner | Conceals tradeoffs and unsupported judgment |
| Data refresh preserves screen state | Full page reload every five seconds | Loses focus, selection, context, and accessibility state |
| Desktop overflow preserves geometry | Fit-to-screen or mobile reflow | Compresses nodes, changes lanes, and can create crossings |
| Public rationale with citations | Hidden chain-of-thought display | Neither required for trust nor appropriate as a product contract |

## 18. Interaction requirements

| ID | Requirement |
| --- | --- |
| WF-UX-001 | Screen 1 shall use a cream page with a dark, slightly rounded setup panel. |
| WF-UX-002 | The setup controls shall appear in the order defined in section 4.1. |
| WF-UX-003 | The primary action shall be a green button labeled **Run**. |
| WF-UX-004 | Run submission shall be idempotent, preserve input on error, and navigate only after run creation succeeds. |
| WF-UX-005 | Both exploration controls shall use keyboard-accessible ordered dual handles with visible named values. |
| WF-UX-006 | Each numeric ceiling shall provide minus, editable value, and plus controls with declared bounds. |
| WF-UX-007 | Setup validation shall not silently coerce, clear, or submit invalid values. |
| WF-UX-008 | The branch preview and all count copy shall say “up to” and distinguish ceilings from returned counts. |
| WF-UX-009 | Screen 2 shall render one indication root and five fixed module bands. |
| WF-UX-010 | Under `WF-A19`, the graph shall render neutral provisional shells across every reserved downstream band while distinguishing all scaffolds from real nodes. |
| WF-UX-011 | Unreturned capacity shall never create scientific identities, descendants, metrics, or packets. |
| WF-UX-012 | Under downstream-cardinality assumption `WF-A04`, every returned hypothesis shall receive an immutable horizontal lane. |
| WF-UX-013 | All one-to-one downstream records shall retain their branch x-coordinate. |
| WF-UX-014 | Biomarker child ranges shall be contiguous and non-overlapping. |
| WF-UX-015 | Fan-outs shall use dedicated fork zones and orthogonal routing. |
| WF-UX-016 | Connector crossings shall be zero in every accepted walkthrough. |
| WF-UX-017 | A real node without the active metric shall occupy a labeled nonmetric shelf. |
| WF-UX-018 | When a result arrives, only the node's y-coordinate within its band may change. |
| WF-UX-019 | Polling, refresh, selection, and inspector changes shall not reassign branch coordinates. |
| WF-UX-020 | Every metric-bearing band shall have one left-rail metric chooser. |
| WF-UX-021 | Node y-position shall be proportional to a disclosed continuous or calibrated ordinal metric. |
| WF-UX-022 | Equal values shall share the same y-coordinate without jitter. |
| WF-UX-023 | Every axis shall expose metric, unit/scale, domain, direction, qualifiers, basis, and uncertainty treatment. |
| WF-UX-024 | A metric change shall update presentation only and shall not mutate any product record or Highlander input. |
| WF-UX-025 | Hover and keyboard focus shall transiently emphasize the node and descendants. |
| WF-UX-026 | Selection shall persistently emphasize full lineage and open the selected record. |
| WF-UX-027 | Hover shall not clear or obscure a persistent selection. |
| WF-UX-028 | The inspector shall support collapsed, loading, loaded, empty-with-reason, and error states. |
| WF-UX-029 | Inspector collapse/restore and live updates shall preserve selection, focus, section, and scroll state. |
| WF-UX-030 | Under `WF-A11`, module stages shall activate in the declared sequential dependency order while eligible work inside the active stage may execute concurrently. |
| WF-UX-031 | The progress strip shall show active stage, branch counts, liveness, and last update without inventing progress. |
| WF-UX-032 | Under `WF-A07` and `WF-A17`, running data shall update automatically with event delivery preferred and five-second fallback polling, without a full page reload; this is `PROPOSED TARGET / NOT WIRED`. |
| WF-UX-033 | Refresh failure shall retain last confirmed data and expose a stale/retry state. |
| WF-UX-034 | Execution, result basis, runtime maturity, freshness, interaction state, and design-approval status shall remain distinct. |
| WF-UX-035 | Under `WF-A14`, the Highlander action shall remain disabled while any eligible required record is nonterminal or when no hypothesis packet exists. |
| WF-UX-036 | Under `WF-A14`, terminal gaps shall allow launch only with a visible completeness warning and explicit missing-data policy. |
| WF-UX-037 | Highlander launch shall use an immutable packet snapshot and preserve graph return state. |
| WF-UX-038 | Screen 3 shall expose run/frontier summary, program comparison, selected detail, chat, and human actions. |
| WF-UX-039 | Named scenario profiles shall disclose their weights/preferences, source, version, and timestamp. |
| WF-UX-040 | Raw objective values and baseline Pareto status shall remain visible under weighted views. |
| WF-UX-041 | Hard constraints shall be distinguished from viewing preferences and shall create attributed decision-set versions. |
| WF-UX-042 | Selected-program detail shall expose terminal hypothesis, public justification, evidence, tradeoffs, uncertainty, lineage, and gaps. |
| WF-UX-043 | Under `WF-A15`, chat shall be a required region scoped to one run and Highlander job. |
| WF-UX-044 | Material chat claims shall cite inspectable node, packet, or artifact records. |
| WF-UX-045 | Chat shall label inference and uncertainty and shall abstain when the run cannot support an answer. |
| WF-UX-046 | Chat shall be read-only with respect to scientific records and human-review state. |
| WF-UX-047 | Under provisional viewport assumption `WF-A09`, the accepted wireframe shall function at `1280 × 720` and `1440 × 900` without a mobile or tablet reflow. |
| WF-UX-048 | Dense runs shall use desktop scrolling/panning while preserving token minimums, metric geometry, and zero crossings. |
| WF-UX-049 | All essential controls, node relationships, states, and rich artifacts shall have keyboard and noncolor equivalents. |
| WF-UX-050 | The graph shall preserve the intended sheet-music-like reading: fixed horizontal stage bands, stable vertical branch through-lines, and metric-positioned nodes with disclosed semantics. |

## 19. Acceptance scenarios

| ID | Given / When / Then |
| --- | --- |
| WF-AC-001 | **Given** valid six-field setup, **when** Run is activated twice rapidly, **then** one run is created and Screen 2 opens once. |
| WF-AC-002 | **Given** a 3 × 3 request, **when** Screen 2 opens before results, **then** capacity for at most nine branches is visible only as provisional scaffolding. |
| WF-AC-003 | **Given** only two biomarkers return, **when** the biomarker stage completes, **then** the shortfall is explained and no third biomarker result or descendant exists. |
| WF-AC-004 | **Given** a real pending node, **when** its metric is absent, **then** it is on the pending shelf and not at zero or midpoint. |
| WF-AC-005 | **Given** two equal stage values, **when** plotted, **then** their y-coordinates are identical and x-lanes remain distinct. |
| WF-AC-006 | **Given** unequal values, **when** plotted, **then** their distance matches the disclosed domain rather than rank. |
| WF-AC-007 | **Given** an already-bound node receives a new value for an existing metric, **when** data refreshes, **then** only its affected y-position and contents update; focus, selection, inspector, and x-lanes remain stable. |
| WF-AC-008 | **Given** a selected branch and another hovered node, **when** hover begins, **then** both selected and preview treatments remain distinguishable. |
| WF-AC-009 | **Given** an open inspector, **when** it is collapsed and restored, **then** the same node, section, scroll, and focus context return. |
| WF-AC-010 | **Given** a not-amenable simulation, **when** the branch becomes terminal, **then** its missing-state record and reason remain visible and enter the packet ledger. |
| WF-AC-011 | **Given** any nonterminal required branch or zero hypothesis packets, **when** the footer renders, **then** Highlander is disabled and the remaining-work or no-candidates reason is named. |
| WF-AC-012 | **Given** all branches terminal with some failures, **when** Highlander launches, **then** the exact incomplete packet snapshot is used and Screen 3 displays a warning. |
| WF-AC-013 | **Given** a scenario-weight change, **when** the view updates, **then** raw objectives and baseline Pareto status remain available and source packets do not change. |
| WF-AC-014 | **Given** a question supported by the run, **when** chat answers, **then** material claims link to the specific supporting records. |
| WF-AC-015 | **Given** a question unsupported by the run, **when** chat answers, **then** it identifies the gap and abstains without creating a new claim. |
| WF-AC-016 | **Given** a dense graph at `1280 × 720`, **when** the user opens the inspector and pans, **then** node minimums, fixed lanes, proportional y-geometry, sticky controls, and zero crossings are preserved. |
| WF-AC-017 | **Given** a returned candidate binds to a provisional shell, **when** topology updates, **then** existing hypothesis lanes do not shift, the new node gains a scientific identity only once, and unbound downstream shells remain scaffolding. |
| WF-AC-018 | **Given** no hypotheses return, **when** every generation stage is terminal, **then** Highlander remains disabled and the screen explains the no-candidates outcome without creating an empty job. |
| WF-AC-019 | **Given** `1280 × 720` and `1440 × 900`, **when** Screen 1 loads, **then** all six inputs, range values, validation, and the Run action remain reachable without essential clipping or mobile reflow. |
| WF-AC-020 | **Given** `1280 × 720` and `1440 × 900`, **when** Screen 3 loads, **then** comparison, selected detail, chat, warnings, and human actions remain reachable through desktop-region scrolling without essential clipping. |
| WF-AC-021 | **Given** the graph viewport crosses the `1800 px` threshold, **when** the inspector changes between overlay and docked presentation, **then** branch graph-space coordinates, selection, focus, and inspector state remain unchanged. |
| WF-AC-022 | **Given** a viewport below the provisional minimum, **when** any screen loads, **then** an unsupported-size notice appears, data is preserved, and scrolling remains possible without a compact/mobile layout claim. |
| WF-AC-023 | **Given** keyboard-only operation, **when** the reviewer completes setup, traverses the graph, opens/collapses the inspector, changes a metric, reviews Highlander, and follows a chat citation, **then** every action and state is available without pointer hover or color alone. |
| WF-AC-024 | **Given** the running graph at a supported viewport, **when** viewed as a whole, **then** fixed horizontal bands and stable vertical branch through-lines create the intended sheet-music-like reading without weakening metric or lineage semantics. |
| WF-AC-025 | **Given** scientific, clinical, and commercial review lenses, **when** each reviewer opens the same branch and Highlander item, **then** the underlying record IDs, hashes, qualifiers, objectives, and audit history are identical; no lens creates a separate version of truth. |
| WF-AC-026 | **Given** automatic updates stop succeeding, **when** the freshness threshold passes, **then** the view retains the last confirmed data, labels it stale with its timestamp, and offers retry without changing execution or result status. |
| WF-AC-027 | **Given** a ratified identity contract and a reviewer action, **when** shortlist, constraint, rerun, or exclusion is submitted, **then** the event records actor, time, rationale, source version, and before/after review state without mutating scientific records. |
