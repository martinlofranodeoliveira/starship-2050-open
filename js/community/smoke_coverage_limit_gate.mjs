export function runFeature(payload) {
  if (payload === null) {
    return { decision: "deny", reason: "bad-payload", bound: null };
  }
  if (typeof payload !== "object") {
    return { decision: "deny", reason: "bad-payload", bound: null };
  }
  if (Array.isArray(payload)) {
    return { decision: "deny", reason: "bad-payload", bound: null };
  }
  for (const [field, fieldValue] of Object.entries(payload)) {
    if (field !== "assurance" && field !== "extent") {
      return { decision: "deny", reason: "unknown-field", bound: null };
    }
  }
  for (const [field, fieldValue] of Object.entries(payload)) {
    if (typeof fieldValue === "string") {
      if (fieldValue.includes("://")) {
        return { decision: "deny", reason: "bad-value", bound: null };
      }
      if (fieldValue.includes("\\")) {
        return { decision: "deny", reason: "bad-value", bound: null };
      }
      if (fieldValue.includes("..")) {
        return { decision: "deny", reason: "bad-value", bound: null };
      }
    }
  }
  const store = new Map();
  const seen = [];
  for (const [field, fieldValue] of Object.entries(payload)) {
    store.set(field, fieldValue);
    seen.push(field);
  }
  const assurance = store.get("assurance");
  if (typeof assurance !== "string") {
    return { decision: "deny", reason: "bad-assurance", bound: null };
  }
  if (assurance !== "smoke") {
    return { decision: "deny", reason: "unknown-assurance", bound: null };
  }
  const extent = store.get("extent");
  if (typeof extent !== "string") {
    return { decision: "deny", reason: "bad-extent", bound: null };
  }
  const overclaimed = new Map();
  overclaimed.set("exhaustive", true);
  overclaimed.set("full", true);
  overclaimed.set("complete", true);
  if (overclaimed.get(extent) === true) {
    return { decision: "deny", reason: "overclaim-extent", bound: null };
  }
  if (extent !== "limited") {
    return { decision: "deny", reason: "unknown-extent", bound: null };
  }
  return { decision: "allow", reason: "ok-smoke", bound: { assurance: "smoke", extent: "limited" } };
}
