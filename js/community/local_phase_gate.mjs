export function runFeature(payload) {
  if (payload === null) {
    return { decision: "deny", reason: "bad-payload", plan: null };
  }
  if (typeof payload !== "object") {
    return { decision: "deny", reason: "bad-payload", plan: null };
  }
  if (Array.isArray(payload)) {
    return { decision: "deny", reason: "bad-payload", plan: null };
  }
  for (const entry of Object.entries(payload)) {
    const key = entry[0];
    if (key !== "phase" && key !== "scope") {
      return { decision: "deny", reason: "unknown-field", plan: null };
    }
  }
  for (const entry of Object.entries(payload)) {
    const value = entry[1];
    if (typeof value === "string") {
      if (value.includes("://")) {
        return { decision: "deny", reason: "bad-value", plan: null };
      }
      if (value.includes("\\")) {
        return { decision: "deny", reason: "bad-value", plan: null };
      }
      if (value.includes("..")) {
        return { decision: "deny", reason: "bad-value", plan: null };
      }
    }
  }
  const fields = new Map();
  for (const entry of Object.entries(payload)) {
    const key = entry[0];
    const value = entry[1];
    fields.set(key, value);
  }
  const phase = fields.get("phase");
  if (typeof phase !== "string") {
    return { decision: "deny", reason: "bad-phase", plan: null };
  }
  if (phase !== "check" && phase !== "test" && phase !== "start") {
    return { decision: "deny", reason: "unknown-phase", plan: null };
  }
  const scope = fields.get("scope");
  if (typeof scope !== "string") {
    return { decision: "deny", reason: "bad-scope", plan: null };
  }
  if (scope !== "syntax" && scope !== "serve" && scope !== "smoke") {
    return { decision: "deny", reason: "unknown-scope", plan: null };
  }
  if (phase === "check") {
    if (scope !== "syntax" && scope !== "serve") {
      return { decision: "deny", reason: "mismatch-scope", plan: null };
    }
  }
  if (phase === "test") {
    if (scope !== "syntax" && scope !== "serve") {
      return { decision: "deny", reason: "mismatch-scope", plan: null };
    }
  }
  if (phase === "start") {
    if (scope !== "smoke") {
      return { decision: "deny", reason: "mismatch-scope", plan: null };
    }
  }
  const plan = { phase: phase, scope: scope };
  return { decision: "allow", reason: "ok-check", plan: plan };
}
