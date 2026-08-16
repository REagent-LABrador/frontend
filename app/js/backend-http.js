// HTTP backend client for the LABrador functional frontend.
// Implements the wire contract in ../API-CONTRACT.md. No dependencies.
//
// The frontend runs in two modes:
//   mock (default)      — the in-page deterministic demo, no network at all
//   ?backend=http&base=… — this client: createRun + 5s snapshot polling
//
// Freshness states surfaced to the UI: LIVE, POLLING, STALE, REFRESH_ERROR.

const POLL_MS = 5000;
const BACKOFF_MS = [5000, 10000, 20000, 60000];

async function requestJson(url, options) {
  const response = await fetch(url, {
    headers: { "content-type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    let excerpt = "";
    try {
      excerpt = (await response.text()).slice(0, 200);
    } catch {
      excerpt = "(unreadable body)";
    }
    const error = new Error(`HTTP ${response.status} from ${url}: ${excerpt}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

export function createHttpBackend(baseUrl) {
  const base = baseUrl.replace(/\/+$/, "");

  return {
    kind: "http",
    base,

    // GET /api/meta — optional; null when the backend does not implement it.
    async fetchMeta() {
      try {
        return await requestJson(`${base}/api/meta`, { method: "GET" });
      } catch {
        return null;
      }
    },

    // POST /api/runs — body is the immutable setup snapshot; returns { run: { run_id } }.
    async createRun(setup) {
      return requestJson(`${base}/api/runs`, {
        method: "POST",
        body: JSON.stringify(setup),
      });
    },

    // GET /api/runs/:id/snapshot — one RunSnapshot.
    async fetchSnapshot(runId) {
      return requestJson(
        `${base}/api/runs/${encodeURIComponent(runId)}/snapshot`,
        { method: "GET" }
      );
    },

    // Poll the snapshot every 5s until every stage is terminal.
    // onSnapshot(snapshot) on every successful fetch;
    // onFreshness({state, failures}) on transport-state changes.
    // Returns { stop, refreshNow }.
    startPolling(runId, { onSnapshot, onFreshness }) {
      let stopped = false; // set only by stop(); permanent — always wins over refreshNow
      let loopEnded = false; // run went terminal; loop stays parked, one-shot refresh allowed
      let inFlight = false; // a tick() is currently awaiting fetchSnapshot
      let failures = 0;
      let timer = null;
      let highestEventId = null; // highest numeric last_event_id seen this polling session

      const isTerminal = (snapshot) =>
        Array.isArray(snapshot.stages) &&
        snapshot.stages.length > 0 &&
        snapshot.stages.every((stage) =>
          ["COMPLETE", "COMPLETE_WITH_WARNINGS", "FAILED"].includes(
            stage.execution_status
          )
        );

      // Numeric last_event_id, or null when absent/non-numeric (those always
      // pass through the monotonicity gate).
      const numericEventId = (snapshot) => {
        const raw = snapshot ? snapshot.last_event_id : undefined;
        if (raw === null || raw === undefined || raw === "") return null;
        if (typeof raw !== "number" && typeof raw !== "string") return null;
        const value = Number(raw);
        return Number.isFinite(value) ? value : null;
      };

      const schedule = (delay) => {
        if (stopped || loopEnded) return;
        timer = window.setTimeout(tick, delay);
      };

      const tick = async () => {
        if (stopped) return;
        inFlight = true;
        let delay = null;
        try {
          onFreshness({ state: "POLLING", failures });
          const snapshot = await this.fetchSnapshot(runId);
          failures = 0;
          // A successful poll is fresh even if the snapshot is skipped below.
          onFreshness({ state: "LIVE", failures });
          const eventId = numericEventId(snapshot);
          const rollback =
            eventId !== null &&
            highestEventId !== null &&
            eventId < highestEventId;
          if (eventId !== null && (highestEventId === null || eventId > highestEventId)) {
            highestEventId = eventId;
          }
          if (!rollback) {
            onSnapshot(snapshot);
            if (isTerminal(snapshot)) {
              loopEnded = true;
              return;
            }
            loopEnded = false;
          }
          delay = POLL_MS;
        } catch (error) {
          failures += 1;
          onFreshness({
            state: failures >= 4 ? "REFRESH_ERROR" : failures >= 2 ? "STALE" : "POLLING",
            failures,
            error: String(error && error.message),
          });
          delay = BACKOFF_MS[Math.min(failures - 1, BACKOFF_MS.length - 1)];
        } finally {
          inFlight = false;
        }
        if (delay !== null) schedule(delay);
      };

      tick();
      return {
        stop() {
          stopped = true;
          if (timer) {
            window.clearTimeout(timer);
            timer = null;
          }
        },
        refreshNow() {
          if (stopped) return; // stop() is permanent
          if (timer) {
            window.clearTimeout(timer);
            timer = null;
          }
          if (inFlight) return; // a poll is already happening; don't spawn a second loop
          tick(); // after terminal (loopEnded) this is a one-shot fetch: a still-terminal
          //         snapshot keeps loopEnded set, so schedule() refuses to resume the loop
        },
      };
    },

    // POST /api/runs/:id/chat — optional endpoint; abstains honestly on 404/failure.
    async askChat(runId, question) {
      try {
        return await requestJson(
          `${base}/api/runs/${encodeURIComponent(runId)}/chat`,
          { method: "POST", body: JSON.stringify({ question }) }
        );
      } catch (error) {
        return {
          answer:
            "Backend abstention: the run API did not return a grounded answer (" +
            String(error && error.message) +
            "). No claim is fabricated in its place.",
          citations: [],
          abstention: true,
          labels: ["abstention", "backend unavailable"],
        };
      }
    },
  };
}
