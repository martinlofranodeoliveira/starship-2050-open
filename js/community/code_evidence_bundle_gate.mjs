export function runFeature(payload) {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return { decision: "deny", reason: "bad-payload", evidence: null };
  }
  for (const entry of Object.entries(payload)) {
    const key = entry[0];
    if (key !== "kind" && key !== "tests" && key !== "repro" && key !== "docs") {
      return { decision: "deny", reason: "unknown-field", evidence: null };
    }
  }
  for (const entry of Object.entries(payload)) {
    const value = entry[1];
    if (typeof value === "string") {
      if (value.includes("://") || value.includes("\\") || value.includes("..")) {
        return { decision: "deny", reason: "bad-value", evidence: null };
      }
    }
  }
  const store = new Map();
  for (const entry of Object.entries(payload)) {
    const k = entry[0];
    const v = entry[1];
    store.set(k, v);
  }
  const kind = store.get("kind");
  if (typeof kind !== "string") {
    return { decision: "deny", reason: "bad-kind", evidence: null };
  }
  if (kind !== "code") {
    return { decision: "deny", reason: "unknown-kind", evidence: null };
  }
  const tests = store.get("tests");
  if (typeof tests !== "string") {
    return { decision: "deny", reason: "bad-tests", evidence: null };
  }
  if (tests !== "relevant") {
    return { decision: "deny", reason: "unknown-tests", evidence: null };
  }
  const repro = store.get("repro");
  if (typeof repro !== "string") {
    return { decision: "deny", reason: "bad-repro", evidence: null };
  }
  if (repro !== "steps") {
    return { decision: "deny", reason: "unknown-repro", evidence: null };
  }
  const docs = store.get("docs");
  if (typeof docs !== "string") {
    return { decision: "deny", reason: "bad-docs", evidence: null };
  }
  if (docs !== "updated") {
    return { decision: "deny", reason: "unknown-docs", evidence: null };
  }
  return { decision: "allow", reason: "ok-code-bundle", evidence: { kind: "code", tests: "relevant", repro: "steps", docs: "updated" } };
}
