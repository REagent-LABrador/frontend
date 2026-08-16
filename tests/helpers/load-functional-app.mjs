import fs from "node:fs";
import vm from "node:vm";

import {
  interpretabilityView,
  normalizeStageTruth,
  resolveBackendBase,
  stationPayloadFor,
} from "../../app/js/snapshot-contract.js";

export class FakeElement {
  constructor() {
    this.attributes = new Map();
    this.children = [];
    this.checked = false;
    this.clientWidth = 1200;
    this.dataset = {};
    this.disabled = false;
    this.innerHTML = "";
    this.max = "";
    this.min = "";
    this.open = false;
    this.style = {};
    this.textContent = "";
    this.value = "";
    this.classList = {
      add() {},
      remove() {},
      toggle() {},
    };
  }

  addEventListener() {}

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  close() {
    this.open = false;
  }

  focus() {}

  querySelector() {
    return new FakeElement();
  }

  querySelectorAll() {
    return [];
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  showModal() {
    this.open = true;
  }
}

export function loadFunctionalApp({ search = "?backend=http" } = {}) {
  const elements = new Map();
  const getElement = (id) => {
    if (!elements.has(id)) elements.set(id, new FakeElement());
    return elements.get(id);
  };
  const document = {
    createElement: () => new FakeElement(),
    createElementNS: () => new FakeElement(),
    getElementById: getElement,
    querySelector: () => new FakeElement(),
    querySelectorAll: () => [],
  };
  const window = {
    clearTimeout() {},
    location: { search, origin: "http://127.0.0.1:8787" },
    requestAnimationFrame(callback) {
      callback();
    },
    scrollTo() {},
    setTimeout() {
      return 1;
    },
  };
  const context = {
    URLSearchParams,
    clearTimeout,
    console,
    createHttpBackend() {
      return {};
    },
    document,
    interpretabilityView,
    normalizeStageTruth,
    resolveBackendBase,
    stationPayloadFor,
    setTimeout,
    window,
  };
  context.globalThis = context;

  let source = fs.readFileSync(new URL("../../app/js/app.js", import.meta.url), "utf8");
  source = source.replace(/^\s*import\s+\{[\s\S]*?\}\s+from\s+["']\.\/snapshot-contract\.js["'];\s*/m, "");
  source = source.replace(/^\s*import[^\n]+\n/m, "");
  const hookInjection = `
    globalThis.__LABRADOR_TEST_HOOKS__ = {
      state,
      elements,
      applyStationDerivations,
      buildScaffold,
      bindStage,
      centerGraphOnActiveLineage,
      findNode,
      ingestSnapshot,
      metricCell,
      renderInspector,
      translateWire,
      validateSetup,
      renderInterpretability:
        typeof renderInterpretability === "function" ? renderInterpretability : null
    };
  }());`;
  const initializePattern = /\s*initialize\(\);\s*\n\s*\}\(\)\);\s*$/;
  if (!initializePattern.test(source)) {
    throw new Error("Unable to instrument app/js/app.js: initialize marker changed");
  }
  source = source.replace(initializePattern, `\n${hookInjection}`);
  vm.runInNewContext(source, context, { filename: "app/js/app.js" });

  return {
    context,
    document,
    elements,
    hooks: context.__LABRADOR_TEST_HOOKS__,
  };
}

export function prepareRun(harness) {
  const { hooks } = harness;
  hooks.state.snapshot = {
    indication: "Rheumatoid arthritis",
    biomarkers: 1,
    papers: 40,
    hypotheses: 1,
    biomarkerRange: [1, 10],
    hypothesisRange: [1, 10],
  };
  hooks.state.runData = {
    biomarkers: [],
    programs: [],
    requestedLanes: 1,
    biomarkerShortfall: 0,
    hypothesisShortfall: 0,
  };
  hooks.buildScaffold();
}
