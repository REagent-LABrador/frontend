import assert from "node:assert/strict";
import test from "node:test";

import { createHttpBackend } from "../app/js/backend-http.js";

test("scientific Highlander launch posts acknowledgement to the run-scoped endpoint", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      async json() {
        return { scientific: { schema_version: "labrador.scientific-snapshot.v1" } };
      },
    };
  };
  try {
    const backend = createHttpBackend("http://127.0.0.1:8787/");
    const response = await backend.launchHighlander("LR test/1", true);
    assert.equal(response.scientific.schema_version, "labrador.scientific-snapshot.v1");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "http://127.0.0.1:8787/api/runs/LR%20test%2F1/highlander");
    assert.equal(calls[0].options.method, "POST");
    assert.deepEqual(JSON.parse(calls[0].options.body), { acknowledgeGaps: true });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
