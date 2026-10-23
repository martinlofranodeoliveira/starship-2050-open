export function runFeature(payload) {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return { decision: "deny", reason: "bad-payload", verdict: null };
  }
  for (const entry of Object.entries(payload)) {
    if (entry[0] !== "operation" && entry[0] !== "method") {
      return { decision: "deny", reason: "unknown-field", verdict: null };
    }
  }
  for (const entry of Object.entries(payload)) {
    if (typeof entry[1] === "string") {
      if (entry[1].includes("://") || entry[1].includes("\\") || entry[1].includes("..")) {
        return { decision: "deny", reason: "bad-value", verdict: null };
      }
    }
  }
  const store = new Map();
  for (const entry of Object.entries(payload)) {
    store.set(entry[0], entry[1]);
  }
  if (store.has("operation") === false) {
    return { decision: "deny", reason: "bad-operation", verdict: null };
  }
  const op = store.get("operation");
  if (typeof op !== "string") {
    return { decision: "deny", reason: "bad-operation", verdict: null };
  }
  if (op !== "read" && op !== "write") {
    return { decision: "deny", reason: "unknown-operation", verdict: null };
  }
  if (store.has("method") === false) {
    return { decision: "deny", reason: "bad-method", verdict: null };
  }
  const me = store.get("method");
  if (typeof me !== "string") {
    return { decision: "deny", reason: "bad-method", verdict: null };
  }
  if (me !== "GET" && me !== "HEAD" && me !== "POST" && me !== "PUT" && me !== "DELETE" && me !== "PATCH") {
    return { decision: "deny", reason: "unknown-method", verdict: null };
  }
  if (op === "read") {
    if (me !== "GET" && me !== "HEAD") {
      return { decision: "deny", reason: "mismatch-operation", verdict: null };
    }
  }
  if (op === "write") {
    if (me !== "POST" && me !== "PUT" && me !== "DELETE" && me !== "PATCH") {
      return { decision: "deny", reason: "mismatch-operation", verdict: null };
    }
  }
  if (op === "read") {
    return { decision: "allow", reason: "ok-read", verdict: { operation: op, method: me } };
  }
  return { decision: "deny", reason: "denied-write", verdict: null };
}
