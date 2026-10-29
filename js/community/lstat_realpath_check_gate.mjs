export function runFeature(payload) {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return { decision: "deny", reason: "bad-payload", check: null };
  }
  for (const [fieldKey] of Object.entries(payload)) {
    if (fieldKey !== "stat" && fieldKey !== "resolve" && fieldKey !== "mode") {
      return { decision: "deny", reason: "unknown-field", check: null };
    }
  }
  for (const [, valueValue] of Object.entries(payload)) {
    if (typeof valueValue === "string" && (valueValue.includes("://") || valueValue.includes("\\") || valueValue.includes(".."))) {
      return { decision: "deny", reason: "bad-value", check: null };
    }
  }
  const seenKeys = [];
  const store = new Map();
  for (const [entryKey, entryValue] of Object.entries(payload)) {
    seenKeys.push(entryKey);
    store.set(entryKey, entryValue);
  }
  const statValue = store.get("stat");
  if (typeof statValue !== "string") {
    return { decision: "deny", reason: "bad-stat", check: null };
  }
  if (statValue !== "lstat") {
    return { decision: "deny", reason: "unknown-stat", check: null };
  }
  const resolveValue = store.get("resolve");
  if (typeof resolveValue !== "string") {
    return { decision: "deny", reason: "bad-resolve", check: null };
  }
  if (resolveValue !== "realpath") {
    return { decision: "deny", reason: "unknown-resolve", check: null };
  }
  const modeValue = store.get("mode");
  if (typeof modeValue !== "string") {
    return { decision: "deny", reason: "bad-mode", check: null };
  }
  if (modeValue !== "per-request") {
    return { decision: "deny", reason: "unknown-mode", check: null };
  }
  return { decision: "allow", reason: "ok-check-method", check: { stat: statValue, resolve: resolveValue, mode: modeValue } };
}
