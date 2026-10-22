// Deterministic symlink component policy gate.
export function runFeature(payload) {
  if (payload === null) {
    return { decision: "deny", reason: "bad-payload", policy: null };
  }
  if (typeof payload !== "object") {
    return { decision: "deny", reason: "bad-payload", policy: null };
  }
  if (Array.isArray(payload)) {
    return { decision: "deny", reason: "bad-payload", policy: null };
  }
  const allowed = [];
  allowed.push("component");
  allowed.push("placement");
  for (const entry of Object.entries(payload)) {
    const k = entry[0];
    if (k !== allowed[0] && k !== allowed[1]) {
      return { decision: "deny", reason: "unknown-field", policy: null };
    }
  }
  for (const entry of Object.entries(payload)) {
    const v = entry[1];
    if (typeof v === "string") {
      if (v.includes("://")) {
        return { decision: "deny", reason: "bad-value", policy: null };
      }
      if (v.includes("\\")) {
        return { decision: "deny", reason: "bad-value", policy: null };
      }
      if (v.includes("..")) {
        return { decision: "deny", reason: "bad-value", policy: null };
      }
    }
  }
  const store = new Map();
  for (const entry of Object.entries(payload)) {
    const k = entry[0];
    const v = entry[1];
    store.set(k, v);
  }
  const comp = store.get("component");
  if (typeof comp !== "string") {
    return { decision: "deny", reason: "bad-component", policy: null };
  }
  if (comp !== "regular" && comp !== "symlink") {
    return { decision: "deny", reason: "unknown-component", policy: null };
  }
  const place = store.get("placement");
  if (typeof place !== "string") {
    return { decision: "deny", reason: "bad-placement", policy: null };
  }
  if (place !== "inside" && place !== "outside") {
    return { decision: "deny", reason: "unknown-placement", policy: null };
  }
  if (place === "outside") {
    return { decision: "deny", reason: "outside-root", policy: null };
  }
  if (comp === "symlink") {
    return { decision: "deny", reason: "symlink-denied", policy: null };
  }
  return { decision: "allow", reason: "ok-regular", policy: { component: comp, placement: place } };
}
