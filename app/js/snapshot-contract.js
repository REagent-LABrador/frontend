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
