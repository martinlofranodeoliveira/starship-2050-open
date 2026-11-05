export function runFeature(payload) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return { decision: "deny", reason: "bad-payload", hygiene: null };
  }
  for (const fieldKey of Object.keys(payload)) {
    if (fieldKey !== "environment" && fieldKey !== "material") {
      return { decision: "deny", reason: "unknown-field", hygiene: null };
    }
  }
  for (const fieldValue of Object.values(payload)) {
    if (typeof fieldValue === "string") {
      if (fieldValue.includes("://") || fieldValue.includes("\\") || fieldValue.includes("..")) {
        return { decision: "deny", reason: "bad-value", hygiene: null };
      }
    }
  }
  const store = new Map();
  for (const entry of Object.entries(payload)) {
    store.set(entry.at(0), entry.at(1));
  }
  const environment = store.get("environment");
  if (typeof environment !== "string") {
    return { decision: "deny", reason: "bad-environment", hygiene: null };
  }
  if (environment !== "separate") {
    return { decision: "deny", reason: "unknown-environment", hygiene: null };
  }
  const material = store.get("material");
  if (typeof material !== "string") {
    return { decision: "deny", reason: "bad-material", hygiene: null };
  }
  if (material === "fictitious") {
    return { decision: "allow", reason: "ok-demo", hygiene: { environment, material } };
  }
  if (material === "env-file" || material === "keys" || material === "database" || material === "upload" || material === "personal") {
    return { decision: "deny", reason: "excluded-material", hygiene: null };
  }
  return { decision: "deny", reason: "unknown-material", hygiene: null };
}
