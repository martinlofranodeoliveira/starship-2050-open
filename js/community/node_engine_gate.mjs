export function runFeature(payload) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return { decision: "deny", reason: "bad-payload", runtime: null };
  }
  const store = new Map();
  for (const entry of Object.entries(payload)) {
    const fieldKey = entry[0];
    const fieldValue = entry[1];
    if (fieldKey !== "engine" && fieldKey !== "major") {
      return { decision: "deny", reason: "unknown-field", runtime: null };
    }
    if (typeof fieldValue === "string") {
      if (fieldValue.includes("://") || fieldValue.includes("\\")) {
        return { decision: "deny", reason: "bad-value", runtime: null };
      }
    }
    store.set(fieldKey, fieldValue);
  }
  const engine = store.get("engine");
  if (typeof engine !== "string") {
    return { decision: "deny", reason: "bad-engine", runtime: null };
  }
  if (engine !== "node") {
    return { decision: "deny", reason: "unknown-engine", runtime: null };
  }
  const major = store.get("major");
  if (typeof major !== "number") {
    return { decision: "deny", reason: "bad-major", runtime: null };
  }
  if (Number.isFinite(major) === false) {
    return { decision: "deny", reason: "bad-major", runtime: null };
  }
  if (Number.isInteger(major) === false) {
    return { decision: "deny", reason: "bad-major", runtime: null };
  }
  if (Number.isSafeInteger(major) === false) {
    return { decision: "deny", reason: "bad-major", runtime: null };
  }
  if (major < 22) {
    return { decision: "deny", reason: "too-old", runtime: null };
  }
  if (major > 48) {
    return { decision: "deny", reason: "future-version", runtime: null };
  }
  return { decision: "allow", reason: "ok-engine", runtime: { engine: engine, major: major } };
}
