export function runFeature(payload) {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return { decision: "deny", reason: "bad-payload", pair: null };
  }
  for (const entry of Object.entries(payload)) {
    const key = entry[0];
    if (key !== "module" && key !== "test") {
      return { decision: "deny", reason: "unknown-field", pair: null };
    }
  }
  for (const entry of Object.entries(payload)) {
    const value = entry[1];
    if (typeof value === "string") {
      if (value.includes("://") || value.includes("\\")) {
        return { decision: "deny", reason: "bad-value", pair: null };
      }
    }
  }
  const store = new Map();
  for (const entry of Object.entries(payload)) {
    store.set(entry[0], entry[1]);
  }
  const moduleValue = store.get("module");
  if (typeof moduleValue !== "string") {
    return { decision: "deny", reason: "bad-module", pair: null };
  }
  if (moduleValue.length > 128) {
    return { decision: "deny", reason: "oversized-module", pair: null };
  }
  const moduleSegments = moduleValue.split("/");
  for (const segment of moduleSegments) {
    if (segment.length === 0) {
      return { decision: "deny", reason: "unknown-module", pair: null };
    }
    if (segment === "." || segment === ".." || segment.includes("..")) {
      return { decision: "deny", reason: "traversal", pair: null };
    }
    if (segment.startsWith(".")) {
      return { decision: "deny", reason: "dotfile", pair: null };
    }
  }
  if (moduleValue.startsWith("js/community/") === false || moduleValue.endsWith("_gate.mjs") === false) {
    return { decision: "deny", reason: "unknown-module", pair: null };
  }
  const modulePrefixLength = "js/community/".length;
  const moduleSuffixLength = "_gate.mjs".length;
  const moduleCore = moduleValue.slice(modulePrefixLength, moduleValue.length - moduleSuffixLength);
  if (moduleCore.length === 0 || moduleCore.includes("/")) {
    return { decision: "deny", reason: "unknown-module", pair: null };
  }
  const allowed = new Map();
  for (const ch of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
    allowed.set(ch, true);
  }
  for (const ch of "abcdefghijklmnopqrstuvwxyz") {
    allowed.set(ch, true);
  }
  for (const ch of "0123456789") {
    allowed.set(ch, true);
  }
  for (const ch of "-_x") {
    allowed.set(ch, true);
  }
  for (const ch of moduleCore) {
    if (allowed.get(ch) !== true) {
      if (ch === "x") {
        continue;
      }
      return { decision: "deny", reason: "bad-name", pair: null };
    }
  }
  const testValue = store.get("test");
  if (typeof testValue !== "string") {
    return { decision: "deny", reason: "bad-test", pair: null };
  }
  if (testValue.length > 128) {
    return { decision: "deny", reason: "oversized-test", pair: null };
  }
  const testSegments = testValue.split("/");
  for (const segment of testSegments) {
    if (segment.length === 0) {
      return { decision: "deny", reason: "unknown-test", pair: null };
    }
    if (segment === "." || segment === ".." || segment.includes("..")) {
      return { decision: "deny", reason: "traversal", pair: null };
    }
    if (segment.startsWith(".")) {
      return { decision: "deny", reason: "dotfile", pair: null };
    }
  }
  if (testValue.startsWith("test/community_") === false || testValue.endsWith("_gate.test.js") === false) {
    return { decision: "deny", reason: "unknown-test", pair: null };
  }
  const testPrefixLength = "test/community_".length;
  const testSuffixLength = "_gate.test.js".length;
  const testCore = testValue.slice(testPrefixLength, testValue.length - testSuffixLength);
  if (testCore.length === 0 || testCore.includes("/")) {
    return { decision: "deny", reason: "unknown-test", pair: null };
  }
  for (const ch of testCore) {
    if (allowed.get(ch) !== true) {
      if (ch === "x") {
        continue;
      }
      return { decision: "deny", reason: "bad-name", pair: null };
    }
  }
  const coreMap = new Map();
  coreMap.set("moduleCore", moduleCore);
  coreMap.set("testCore", testCore);
  if (coreMap.get("moduleCore") !== coreMap.get("testCore")) {
    return { decision: "deny", reason: "mismatch-pair", pair: null };
  }
  return { decision: "allow", reason: "ok-pair", pair: { module: moduleValue, test: testValue } };
}
