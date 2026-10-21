export function runFeature(payload) {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return { decision: "deny", reason: "bad-payload", saved: null };
  }
  for (const entry of Object.entries(payload)) {
    const k = entry[0];
    if (k !== "store" && k !== "record") {
      return { decision: "deny", reason: "unknown-field", saved: null };
    }
  }
  for (const entry of Object.entries(payload)) {
    const v = entry[1];
    if (typeof v === "string") {
      if (v.includes("://") || v.includes("\\") || v.includes("..")) {
        return { decision: "deny", reason: "bad-value", saved: null };
      }
    }
  }
  const fields = new Map();
  for (const entry of Object.entries(payload)) {
    fields.set(entry[0], entry[1]);
  }
  const store = fields.get("store");
  if (typeof store !== "string") {
    return { decision: "deny", reason: "bad-store", saved: null };
  }
  if (store !== "browser-local") {
    return { decision: "deny", reason: "unknown-store", saved: null };
  }
  const record = fields.get("record");
  if (typeof record !== "string") {
    return { decision: "deny", reason: "bad-record", saved: null };
  }
  if (record !== "gameplay" && record !== "score") {
    return { decision: "deny", reason: "unknown-record", saved: null };
  }
  return { decision: "allow", reason: "ok-local", saved: { store: store, record: record } };
}
