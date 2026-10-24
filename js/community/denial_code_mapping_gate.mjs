export function runFeature(payload) {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return { decision: "deny", reason: "bad-payload", mapping: null };
  }
  for (const entry of Object.entries(payload)) {
    const fieldName = entry[0];
    if (fieldName !== "denial" && fieldName !== "code") {
      return { decision: "deny", reason: "unknown-field", mapping: null };
    }
  }
  for (const entry of Object.entries(payload)) {
    const fieldValue = entry[1];
    if (typeof fieldValue === "string") {
      if (fieldValue.includes("://") || fieldValue.includes("\\") || fieldValue.includes("..")) {
        return { decision: "deny", reason: "bad-value", mapping: null };
      }
    }
  }
  const store = new Map();
  for (const entry of Object.entries(payload)) {
    const k = entry[0];
    const v = entry[1];
    store.set(k, v);
  }
  const denial = store.get("denial");
  if (typeof denial !== "string") {
    return { decision: "deny", reason: "bad-denial", mapping: null };
  }
  if (denial !== "symlink" && denial !== "outside-root" && denial !== "dotfile" && denial !== "traversal" && denial !== "private" && denial !== "bad-method") {
    return { decision: "deny", reason: "unknown-denial", mapping: null };
  }
  const code = store.get("code");
  if (typeof code !== "number") {
    return { decision: "deny", reason: "bad-code", mapping: null };
  }
  if (code !== 404 && code !== 405) {
    return { decision: "deny", reason: "unknown-code", mapping: null };
  }
  if (denial === "bad-method") {
    if (code !== 405) {
      return { decision: "deny", reason: "mismatch-code", mapping: null };
    }
  } else {
    if (code !== 404) {
      return { decision: "deny", reason: "mismatch-code", mapping: null };
    }
  }
  return { decision: "allow", reason: "ok-mapping", mapping: { denial: denial, code: code } };
}
