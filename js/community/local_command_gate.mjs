export function runFeature(payload) {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return { decision: "deny", reason: "bad-payload", command: null };
  }
  for (const [key, value] of Object.entries(payload)) {
    if (key !== "runner" && key !== "script") {
      return { decision: "deny", reason: "unknown-field", command: null };
    }
  }
  const store = new Map();
  const seen = [];
  for (const [key, value] of Object.entries(payload)) {
    store.set(key, value);
    seen.push(key);
  }
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === "string") {
      if (value.includes("://") || value.includes("\\") || value.includes("..")) {
        return { decision: "deny", reason: "bad-value", command: null };
      }
    }
  }
  const runner = store.get("runner");
  if (typeof runner !== "string") {
    return { decision: "deny", reason: "bad-runner", command: null };
  }
  if (runner !== "npm") {
    return { decision: "deny", reason: "unknown-runner", command: null };
  }
  const script = store.get("script");
  if (typeof script !== "string") {
    return { decision: "deny", reason: "bad-script", command: null };
  }
  const allowed = new Map();
  allowed.set("check", true);
  allowed.set("test", true);
  allowed.set("start", true);
  if (allowed.get(script) !== true) {
    return { decision: "deny", reason: "unknown-script", command: null };
  }
  return { decision: "allow", reason: "ok-command", command: { runner: runner, script: script } };
}
