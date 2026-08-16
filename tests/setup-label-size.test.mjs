import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sources = [
  ["functional app", readFileSync(new URL("../app/styles.css", import.meta.url), "utf8")],
  ["standalone mockup", readFileSync(new URL("../index.html", import.meta.url), "utf8")],
];

test("landing-page setup labels retain their doubled type scale", () => {
  for (const [name, source] of sources) {
    assert.match(
      source,
      /\.control-label, \.setup-control legend\s*\{[^}]*font-size:\s*24px;/s,
      `${name} should render setup labels at 24px`,
    );
    assert.match(
      source,
      /\.control-index\s*\{[^}]*font-size:\s*20px;/s,
      `${name} should render setup indexes at 20px`,
    );
  }
});

test("landing-page journey copy uses the requested presentation scale", () => {
  for (const [name, source] of sources) {
    assert.match(
      source,
      /\.journey-preview li\s*\{[^}]*font-size:\s*39px;/s,
      `${name} should render journey copy at 39px`,
    );
    assert.match(
      source,
      /\.journey-detail\s*\{[^}]*font-size:\s*19\.5px;/s,
      `${name} should render journey details at half the lead-copy size`,
    );
  }
});
