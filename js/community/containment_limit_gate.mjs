export function runFeature(payload) {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return { decision: "deny", reason: "bad-payload", bounds: null };
  }
  const store = new Map();
  for (const entry of Object.entries(payload)) {
    const key = entry[0];
    if (key !== "guard" && key !== "limit") {
      return { decision: "deny", reason: "unknown-field", bounds: null };
    }
    const value = entry[1];
    store.set(key, value);
  }
  for (const entry of Object.entries(payload)) {
    const value = entry[1];
    if (typeof value === "string") {
      if (value.includes("://")) {
        return { decision: "deny", reason: "bad-value", bounds: null };
      }
      if (value.includes("\\")) {
        return { decision: "deny", reason: "bad-value", bounds: null };
      }
      if (value.includes("..")) {
        return { decision: "deny", reason: "bad-value", bounds: null };
      }
    }
  }
  const guard = store.get("guard");
  if (typeof guard !== "string") {
    return { decision: "deny", reason: "bad-guard", bounds: null };
  }
  if (guard !== "lstat-realpath") {
    return { decision: "deny", reason: "unknown-guard", bounds: null };
  }
  const limit = store.get("limit");
  if (typeof limit !== "string") {
    return { decision: "deny", reason: "bad-limit", bounds: null };
  }
  const allowed = new Map();
  allowed.set("no-sandbox", true);
  allowed.set("no-toctou", true);
  allowed.set("no-follow", true);
  allowed.set("no-inside-symlink", true);
  allowed.set("no-permissions", true);
  if (allowed.get(limit) === true) {
    return { decision: "allow", reason: "ok-limit", bounds: { guard: guard, limit: limit } };
  }
  const overclaimed = new Map();
  overclaimed.set("sandbox", true);
  overclaimed.set("toctou-proof", true);
  overclaimed.set("follow-targets", true);
  overclaimed.set("allow-inside-symlink", true);
  overclaimed.set("replace-permissions", true);
  if (overclaimed.get(limit) === true) {
    return { decision: "deny", reason: "overclaim-limit", bounds: null };
  }
  return { decision: "deny", reason: "unknown-limit", bounds: null };
}
