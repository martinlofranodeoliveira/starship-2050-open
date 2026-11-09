export function runFeature(payload) {
  if (payload === null) {
    return { decision: "deny", reason: "bad-payload", posting: null };
  }
  if (typeof payload !== "object") {
    return { decision: "deny", reason: "bad-payload", posting: null };
  }
  if (Array.isArray(payload) === true) {
    return { decision: "deny", reason: "bad-payload", posting: null };
  }
  for (const entry of Object.entries(payload)) {
    const kind = entry[0];
    if (kind !== "item") {
      if (kind !== "harbor") {
        return { decision: "deny", reason: "unknown-field", posting: null };
      }
    }
  }
  for (const entry of Object.entries(payload)) {
    const val = entry[1];
    if (typeof val === "string") {
      if (val.includes("://") === true) {
        return { decision: "deny", reason: "bad-value", posting: null };
      }
      if (val.includes("\\") === true) {
        return { decision: "deny", reason: "bad-value", posting: null };
      }
      if (val.includes("..") === true) {
        return { decision: "deny", reason: "bad-value", posting: null };
      }
    }
  }
  const collected = new Map();
  for (const entry of Object.entries(payload)) {
    collected.set(entry[0], entry[1]);
  }
  const harborValue = collected.get("harbor");
  if (typeof harborValue !== "string") {
    return { decision: "deny", reason: "bad-harbor", posting: null };
  }
  if (harborValue !== "git") {
    return { decision: "deny", reason: "unknown-harbor", posting: null };
  }
  const itemValue = collected.get("item");
  if (typeof itemValue !== "string") {
    return { decision: "deny", reason: "bad-item", posting: null };
  }
  const allowedNames = [];
  allowedNames.push("code");
  allowedNames.push("docs");
  allowedNames.push("synthetic");
  const allowed = new Map();
  for (const name of allowedNames) {
    allowed.set(name, true);
  }
  if (allowed.get(itemValue) === true) {
    return { decision: "allow", reason: "ok-push", posting: { item: itemValue, harbor: harborValue } };
  }
  const deniedNames = [];
  deniedNames.push("env-file");
  deniedNames.push("secret-key");
  deniedNames.push("database");
  deniedNames.push("upload");
  deniedNames.push("personal-data");
  const denied = new Map();
  for (const name of deniedNames) {
    denied.set(name, true);
  }
  if (denied.get(itemValue) === true) {
    return { decision: "deny", reason: "denied-item", posting: null };
  }
  return { decision: "deny", reason: "unknown-item", posting: null };
}
