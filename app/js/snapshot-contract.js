// Small, dependency-free adapters for the additive orchestrator snapshot fields.
// Kept pure so the judging path can be regression-tested without a browser DOM.

function nonEmptyString(value, fallback) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function stringList(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string" && item.trim())
    : [];
}

export function resolveBackendBase(search, origin) {
  const params = new URLSearchParams(search || "");
  return params.get("base") || origin;
}

export function normalizeStageTruth(stage, fallback) {
  const source = stage && typeof stage === "object" ? stage : {};
  const defaults = fallback && typeof fallback === "object" ? fallback : {};
  const basis = stringList(source.result_basis);
  const presentationStatus = nonEmptyString(
    source.result_status,
    nonEmptyString(source.execution_status, defaults.execution || "QUEUED"),
  );
  const moduleExecution = nonEmptyString(
    source.module_execution_status,
    nonEmptyString(source.execution_status, defaults.execution || "QUEUED"),
  );
  return {
    presentationStatus,
    moduleExecution,
    outputOrigin: nonEmptyString(source.output_origin, defaults.outputOrigin || "UNREPORTED"),
    resultBasis: basis.length ? basis.join(" + ") : (defaults.resultBasis || "BACKEND-REPORTED"),
    runtimeMaturity: nonEmptyString(source.runtime_maturity, defaults.runtime || "BACKEND SNAPSHOT"),
    reasonCode: nonEmptyString(source.reason_code, defaults.reason || null),
    qualifiers: stringList(source.qualifiers),
  };
}

export function stationPayloadFor(record, stageId) {
  if (!record || typeof record !== "object") return null;
  if (record.station_payload && typeof record.station_payload === "object") {
    return record.station_payload;
  }
  if (record.stationPayload && typeof record.stationPayload === "object") {
    return record.stationPayload;
  }
  const payloads = record.station_payloads || record.stationPayloads;
  if (!payloads || typeof payloads !== "object") return null;
  const payload = payloads[stageId];
  return payload && typeof payload === "object" ? payload : null;
}

export function interpretabilityView(payload) {
  if (!payload || typeof payload !== "object") return null;
  const raw = payload.interpretability;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const headline = raw.headline && typeof raw.headline === "object"
    ? raw.headline
    : {};
  return {
    raw,
    schemaVersion: nonEmptyString(raw.schema_version, "unreported"),
    headline: {
      title: nonEmptyString(headline.title, "Module interpretation"),
      result: nonEmptyString(headline.result, "UNREPORTED"),
      plainLanguage: nonEmptyString(headline.plain_language, "No plain-language conclusion supplied."),
      status: nonEmptyString(headline.status, "UNREPORTED"),
      basis: stringList(headline.basis),
    },
    metrics: Array.isArray(raw.metrics) ? raw.metrics : [],
    limitations: Array.isArray(raw.limitations) ? raw.limitations : [],
    counterfactuals: Array.isArray(raw.counterfactuals) ? raw.counterfactuals : [],
    evidenceCount: Array.isArray(raw.evidence) ? raw.evidence.length : 0,
    assumptionCount: Array.isArray(raw.assumptions) ? raw.assumptions.length : 0,
    stepCount: Array.isArray(raw.steps) ? raw.steps.length : 0,
  };
}

const SCIENTIFIC_STAGE_BY_MODULE = Object.freeze({
  evidence_mapper: "biomarker",
  hypothesis_generator: "hypothesis",
  roi_calculator: "roi",
  clinical_simulation: "recruitability",
  simulation: "simulation",
});

const SCIENTIFIC_MODULE_BY_STAGE = Object.freeze(
  Object.fromEntries(
    Object.entries(SCIENTIFIC_STAGE_BY_MODULE).map(([moduleId, stageId]) => [
      stageId,
      moduleId,
    ]),
  ),
);

export function isScientificSnapshot(snapshot) {
  return Boolean(
    snapshot &&
      typeof snapshot === "object" &&
      snapshot.schema_version === "labrador.scientific-snapshot.v1",
  );
}

export function scientificStageId(moduleId) {
  return SCIENTIFIC_STAGE_BY_MODULE[moduleId] || moduleId || null;
}

export function scientificModuleId(stageId) {
  return SCIENTIFIC_MODULE_BY_STAGE[stageId] || stageId || null;
}

export function scientificNodeForStage(branch, stageId) {
  if (!branch || typeof branch !== "object") return null;
  const nodes = branch.nodes;
  if (!nodes || typeof nodes !== "object" || Array.isArray(nodes)) return null;
  const node = nodes[scientificModuleId(stageId)];
  return node && typeof node === "object" && !Array.isArray(node) ? node : null;
}

export function scientificCandidateId(branch) {
  const node = scientificNodeForStage(branch, "hypothesis");
  const artifact = node && node.artifact;
  if (artifact && typeof artifact === "object") {
    const document = artifact.hypothesis;
    const hypothesis =
      document && typeof document === "object" && document.hypothesis &&
      typeof document.hypothesis === "object"
        ? document.hypothesis
        : null;
    if (hypothesis && typeof hypothesis.id === "string" && hypothesis.id.trim()) {
      return hypothesis.id;
    }
    const cards = artifact.cards;
    if (cards && Array.isArray(cards.hypotheses)) {
      const card = cards.hypotheses.find(
        (item) => item && typeof item.id === "string" && item.id.trim(),
      );
      if (card) return card.id;
    }
  }
  return branch && typeof branch.branch_id === "string" ? branch.branch_id : null;
}

export function scientificHighlanderCandidate(result, candidateId) {
  if (!result || typeof result !== "object" || !candidateId) return null;
  if (!Array.isArray(result.candidates)) return null;
  return (
    result.candidates.find(
      (candidate) =>
        candidate &&
        typeof candidate === "object" &&
        candidate.candidateId === candidateId,
    ) || null
  );
}

export function scientificComparisonStatus(result, candidateId) {
  const candidate = scientificHighlanderCandidate(result, candidateId);
  if (candidate && typeof candidate.comparisonStatus === "string") {
    return candidate.comparisonStatus;
  }
  if (!result || typeof result !== "object" || !candidateId) return null;
  if (Array.isArray(result.frontier) && result.frontier.includes(candidateId)) {
    return "FRONTIER";
  }
  if (Array.isArray(result.dominated) && result.dominated.includes(candidateId)) {
    return "DOMINATED";
  }
  if (
    Array.isArray(result.incomparable) &&
    result.incomparable.some(
      (item) => item && typeof item === "object" && item.candidateId === candidateId,
    )
  ) {
    return "INCOMPARABLE";
  }
  return null;
}
