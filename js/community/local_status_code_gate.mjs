export function runFeature(payload) {
  if (typeof payload !== "object" || payload === null) {
    return { decision: "deny", reason: "bad-payload", status: null };
  }
  if (Array.isArray(payload)) {
    return { decision: "deny", reason: "bad-payload", status: null };
  }
  const store = new Map();
  const fields = [];
  for (const entry of Object.entries(payload)) {
    store.set(entry[0], entry[1]);
    fields.push(entry[0]);
  }
  for (const field of fields) {
    if (field !== "outcome" && field !== "detail") {
      return { decision: "deny", reason: "unknown-field", status: null };
    }
  }
  for (const entry of Object.entries(payload)) {
    const val = entry[1];
    if (typeof val === "string") {
      if (val.includes("://")) {
        return { decision: "deny", reason: "bad-value", status: null };
      }
      if (val.includes("\\")) {
        return { decision: "deny", reason: "bad-value", status: null };
      }
      if (val.includes("..")) {
        return { decision: "deny", reason: "bad-value", status: null };
      }
    }
  }
  const outcome = store.get("outcome");
  const detail = store.get("detail");
  if (typeof outcome !== "string") {
    return { decision: "deny", reason: "bad-outcome", status: null };
  }
  const outcomeKinds = new Map();
  outcomeKinds.set("served", true);
  outcomeKinds.set("missing", true);
  outcomeKinds.set("rejected", true);
  if (outcomeKinds.get(outcome) !== true) {
    return { decision: "deny", reason: "unknown-outcome", status: null };
  }
  if (typeof detail !== "string") {
    return { decision: "deny", reason: "bad-detail", status: null };
  }
  const detailKinds = new Map();
  detailKinds.set("static", true);
  detailKinds.set("dotfile", true);
  detailKinds.set("traversal", true);
  detailKinds.set("symlink", true);
  detailKinds.set("escape", true);
  detailKinds.set("private", true);
  detailKinds.set("unknown", true);
  detailKinds.set("method", true);
  if (detailKinds.get(detail) !== true) {
    return { decision: "deny", reason: "unknown-detail", status: null };
  }
  if (outcome === "served") {
    if (detail !== "static") {
      return { decision: "deny", reason: "mismatch-detail", status: null };
    }
    return { decision: "allow", reason: "ok-serve", status: 200 };
  }
  if (outcome === "missing") {
    if (detail !== "dotfile" && detail !== "traversal" && detail !== "symlink" && detail !== "escape" && detail !== "private" && detail !== "unknown") {
      return { decision: "deny", reason: "mismatch-detail", status: null };
    }
    return { decision: "allow", reason: "ok-missing", status: 404 };
  }
  if (outcome === "rejected") {
    if (detail !== "method") {
      return { decision: "deny", reason: "mismatch-detail", status: null };
    }
    return { decision: "allow", reason: "ok-rejected", status: 405 };
  }
  return { decision: "deny", reason: "unknown-outcome", status: null };
}
