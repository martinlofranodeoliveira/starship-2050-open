export function runFeature(payload) {
  if (payload === null) {
    return { decision: "deny", reason: "bad-payload", preserved: null };
  }
  if (typeof payload !== "object") {
    return { decision: "deny", reason: "bad-payload", preserved: null };
  }
  if (Array.isArray(payload)) {
    return { decision: "deny", reason: "bad-payload", preserved: null };
  }
  for (const entry of Object.entries(payload)) {
    const key = entry[0];
    if (key !== "origin") {
      if (key !== "history") {
        return { decision: "deny", reason: "unknown-field", preserved: null };
      }
    }
  }
  for (const entry of Object.entries(payload)) {
    const value = entry[1];
    if (typeof value === "string") {
      if (value.includes("://")) {
        return { decision: "deny", reason: "bad-value", preserved: null };
      }
      if (value.includes("\\")) {
        return { decision: "deny", reason: "bad-value", preserved: null };
      }
      if (value.includes("..")) {
        return { decision: "deny", reason: "bad-value", preserved: null };
      }
    }
  }
  const store = new Map();
  const seen = [];
  for (const entry of Object.entries(payload)) {
    const key = entry[0];
    const value = entry[1];
    store.set(key, value);
    seen.push(key);
  }
  const origin = store.get("origin");
  if (typeof origin !== "string") {
    return { decision: "deny", reason: "bad-origin", preserved: null };
  }
  if (origin !== "private") {
    return { decision: "deny", reason: "unknown-origin", preserved: null };
  }
  const history = store.get("history");
  if (typeof history !== "string") {
    return { decision: "deny", reason: "bad-history", preserved: null };
  }
  if (history !== "separate") {
    return { decision: "deny", reason: "unknown-history", preserved: null };
  }
  return { decision: "allow", reason: "ok-preserved", preserved: { origin: origin, history: history } };
}
