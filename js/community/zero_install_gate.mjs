export function runFeature(payload) {
  if (payload === null) {
    return { decision: "deny", reason: "bad-payload", setup: null };
  }
  if (typeof payload !== "object") {
    return { decision: "deny", reason: "bad-payload", setup: null };
  }
  if (Array.isArray(payload)) {
    return { decision: "deny", reason: "bad-payload", setup: null };
  }
  for (const entry of Object.entries(payload)) {
    const field = entry[0];
    if (field !== "dependency" && field !== "credential") {
      return { decision: "deny", reason: "unknown-field", setup: null };
    }
  }
  for (const entry of Object.entries(payload)) {
    const val = entry[1];
    if (typeof val === "string") {
      if (val.includes("://")) {
        return { decision: "deny", reason: "bad-value", setup: null };
      }
      if (val.includes("\\")) {
        return { decision: "deny", reason: "bad-value", setup: null };
      }
      if (val.includes("..")) {
        return { decision: "deny", reason: "bad-value", setup: null };
      }
    }
  }
  const store = new Map();
  for (const entry of Object.entries(payload)) {
    const k = entry[0];
    const v = entry[1];
    store.set(k, v);
  }
  const dep = store.get("dependency");
  if (typeof dep !== "string") {
    return { decision: "deny", reason: "bad-dependency", setup: null };
  }
  if (dep !== "none") {
    return { decision: "deny", reason: "unknown-dependency", setup: null };
  }
  const cred = store.get("credential");
  if (typeof cred !== "string") {
    return { decision: "deny", reason: "bad-credential", setup: null };
  }
  if (cred !== "none") {
    return { decision: "deny", reason: "unknown-credential", setup: null };
  }
  return { decision: "allow", reason: "ok-zero", setup: { dependency: dep, credential: cred } };
}
