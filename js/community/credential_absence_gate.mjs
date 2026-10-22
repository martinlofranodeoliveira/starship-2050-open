export function runFeature(payload) {
  if (payload === null) {
    return { decision: "deny", reason: "bad-payload", absence: null };
  }
  if (typeof payload !== "object") {
    return { decision: "deny", reason: "bad-payload", absence: null };
  }
  if (Array.isArray(payload)) {
    return { decision: "deny", reason: "bad-payload", absence: null };
  }
  for (const [key, value] of Object.entries(payload)) {
    if (key !== "credential" && key !== "handling") {
      return { decision: "deny", reason: "unknown-field", absence: null };
    }
  }
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === "string") {
      if (value.includes("://")) {
        return { decision: "deny", reason: "bad-value", absence: null };
      }
      if (value.includes("\\")) {
        return { decision: "deny", reason: "bad-value", absence: null };
      }
      if (value.includes("..")) {
        return { decision: "deny", reason: "bad-value", absence: null };
      }
    }
  }
  const store = new Map();
  for (const [key, value] of Object.entries(payload)) {
    store.set(key, value);
  }
  const credential = store.get("credential");
  if (typeof credential !== "string") {
    return { decision: "deny", reason: "bad-credential", absence: null };
  }
  if (credential !== "none") {
    return { decision: "deny", reason: "unknown-credential", absence: null };
  }
  const handling = store.get("handling");
  if (typeof handling !== "string") {
    return { decision: "deny", reason: "bad-handling", absence: null };
  }
  if (handling !== "absent") {
    return { decision: "deny", reason: "unknown-handling", absence: null };
  }
  return {
    decision: "allow",
    reason: "ok-absent",
    absence: { credential: credential, handling: handling }
  };
}
