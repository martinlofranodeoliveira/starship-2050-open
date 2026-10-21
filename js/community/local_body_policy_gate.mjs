export function runFeature(payload) {
  if (payload === null) {
    return { decision: "deny", reason: "bad-payload", policy: null };
  }
  if (typeof payload !== "object") {
    return { decision: "deny", reason: "bad-payload", policy: null };
  }
  if (Array.isArray(payload)) {
    return { decision: "deny", reason: "bad-payload", policy: null };
  }
  for (const entry of Object.entries(payload)) {
    const key = entry[0];
    if (key !== "status" && key !== "body") {
      return { decision: "deny", reason: "unknown-field", policy: null };
    }
  }
  for (const entry of Object.entries(payload)) {
    const val = entry[1];
    if (typeof val === "string") {
      if (val.includes("://")) {
        return { decision: "deny", reason: "bad-value", policy: null };
      }
      if (val.includes("\\")) {
        return { decision: "deny", reason: "bad-value", policy: null };
      }
      if (val.includes("..")) {
        return { decision: "deny", reason: "bad-value", policy: null };
      }
    }
  }
  const store = new Map();
  for (const entry of Object.entries(payload)) {
    const k = entry[0];
    const v = entry[1];
    store.set(k, v);
  }
  const statusValue = store.get("status");
  const bodyValue = store.get("body");
  if (typeof statusValue !== "number") {
    return { decision: "deny", reason: "bad-status", policy: null };
  }
  if (Number.isFinite(statusValue) === false) {
    return { decision: "deny", reason: "bad-status", policy: null };
  }
  if (Number.isSafeInteger(statusValue) === false) {
    return { decision: "deny", reason: "bad-status", policy: null };
  }
  if (statusValue !== 200 && statusValue !== 404 && statusValue !== 405) {
    return { decision: "deny", reason: "unknown-status", policy: null };
  }
  if (typeof bodyValue !== "string") {
    return { decision: "deny", reason: "bad-body", policy: null };
  }
  if (bodyValue !== "empty" && bodyValue !== "bytes") {
    return { decision: "deny", reason: "unknown-body", policy: null };
  }
  if (statusValue === 200) {
    if (bodyValue !== "bytes") {
      return { decision: "deny", reason: "mismatch-body", policy: null };
    }
  }
  if (statusValue === 404) {
    if (bodyValue !== "empty") {
      return { decision: "deny", reason: "mismatch-body", policy: null };
    }
  }
  if (statusValue === 405) {
    if (bodyValue !== "empty") {
      return { decision: "deny", reason: "mismatch-body", policy: null };
    }
  }
  return { decision: "allow", reason: "ok-body", policy: { status: statusValue, body: bodyValue } };
}
