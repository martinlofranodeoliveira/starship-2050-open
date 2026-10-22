export function runFeature(payload) {
  if (payload === null) {
    return { decision: "deny", reason: "bad-payload", smoke: null };
  }
  if (typeof payload !== "object") {
    return { decision: "deny", reason: "bad-payload", smoke: null };
  }
  if (Array.isArray(payload)) {
    return { decision: "deny", reason: "bad-payload", smoke: null };
  }
  for (const entry of Object.entries(payload)) {
    const field = entry[0];
    if (field !== "actor" && field !== "step") {
      return { decision: "deny", reason: "unknown-field", smoke: null };
    }
  }
  for (const entry of Object.entries(payload)) {
    const value = entry[1];
    if (typeof value === "string") {
      if (value.includes("://")) {
        return { decision: "deny", reason: "bad-value", smoke: null };
      }
      if (value.includes("\\")) {
        return { decision: "deny", reason: "bad-value", smoke: null };
      }
      if (value.includes("..")) {
        return { decision: "deny", reason: "bad-value", smoke: null };
      }
    }
  }
  const store = new Map();
  const seen = [];
  for (const entry of Object.entries(payload)) {
    const k = entry[0];
    const v = entry[1];
    store.set(k, v);
    seen.push(k);
  }
  const actor = store.get("actor");
  if (typeof actor !== "string") {
    return { decision: "deny", reason: "bad-actor", smoke: null };
  }
  if (actor !== "manual") {
    return { decision: "deny", reason: "unknown-actor", smoke: null };
  }
  const step = store.get("step");
  if (typeof step !== "string") {
    return { decision: "deny", reason: "bad-step", smoke: null };
  }
  if (step !== "open" && step !== "start") {
    return { decision: "deny", reason: "unknown-step", smoke: null };
  }
  return { decision: "allow", reason: "ok-manual", smoke: { actor: actor, step: step } };
}
