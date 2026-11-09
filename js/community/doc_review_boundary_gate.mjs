export function runFeature(payload) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return { decision: "deny", reason: "bad-payload", review: null };
  }
  for (const entry of Object.entries(payload)) {
    const key = entry[0];
    if (key !== "area" && key !== "status") {
      return { decision: "deny", reason: "unknown-field", review: null };
    }
  }
  const store = new Map();
  const observed = [];
  for (const entry of Object.entries(payload)) {
    const value = entry[1];
    observed.push(entry[0]);
    if (typeof value === "string") {
      if (value.includes("://") || value.includes("\\") || value.includes("..")) {
        return { decision: "deny", reason: "bad-value", review: null };
      }
    }
    store.set(entry[0], entry[1]);
  }
  const area = store.get("area");
  if (typeof area !== "string") {
    return { decision: "deny", reason: "bad-area", review: null };
  }
  const allowedAreas = new Map();
  allowedAreas.set("manifests", true);
  allowedAreas.set("guide", true);
  allowedAreas.set("integrations", true);
  allowedAreas.set("platforms", true);
  allowedAreas.set("real-services", true);
  if (allowedAreas.get(area) !== true) {
    return { decision: "deny", reason: "unknown-area", review: null };
  }
  const status = store.get("status");
  if (typeof status !== "string") {
    return { decision: "deny", reason: "bad-status", review: null };
  }
  const allowedStatuses = new Map();
  allowedStatuses.set("checked", true);
  allowedStatuses.set("not-exercised", true);
  if (allowedStatuses.get(status) !== true) {
    return { decision: "deny", reason: "unknown-status", review: null };
  }
  const expected = new Map();
  expected.set("manifests", "checked");
  expected.set("guide", "checked");
  expected.set("integrations", "not-exercised");
  expected.set("platforms", "not-exercised");
  expected.set("real-services", "not-exercised");
  if (expected.get(area) !== status) {
    return { decision: "deny", reason: "mismatch-status", review: null };
  }
  return { decision: "allow", reason: "ok-review-boundary", review: { area: area, status: status } };
}
