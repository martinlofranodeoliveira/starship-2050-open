export function runFeature(payload) {
  if (payload === null) {
    return { decision: "deny", reason: "bad-payload", binding: null };
  }
  if (typeof payload !== "object") {
    return { decision: "deny", reason: "bad-payload", binding: null };
  }
  if (Array.isArray(payload)) {
    return { decision: "deny", reason: "bad-payload", binding: null };
  }
  for (const entry of Object.entries(payload)) {
    const field = entry[0];
    if (field !== "host" && field !== "port") {
      return { decision: "deny", reason: "unknown-field", binding: null };
    }
  }
  for (const entry of Object.entries(payload)) {
    const value = entry[1];
    if (typeof value === "string") {
      if (value.includes("://")) {
        return { decision: "deny", reason: "bad-value", binding: null };
      }
      if (value.includes("\\")) {
        return { decision: "deny", reason: "bad-value", binding: null };
      }
      if (value.includes("..")) {
        return { decision: "deny", reason: "bad-value", binding: null };
      }
    }
  }
  const store = new Map();
  for (const entry of Object.entries(payload)) {
    store.set(entry[0], entry[1]);
  }
  const host = store.get("host");
  if (host !== "127.0.0.1") {
    if (host === undefined) {
      return { decision: "deny", reason: "bad-host", binding: null };
    }
    if (typeof host !== "string") {
      return { decision: "deny", reason: "bad-host", binding: null };
    }
    return { decision: "deny", reason: "unknown-host", binding: null };
  }
  const port = store.get("port");
  if (port !== 8080) {
    if (port === undefined) {
      return { decision: "deny", reason: "bad-port", binding: null };
    }
    if (typeof port !== "number") {
      return { decision: "deny", reason: "bad-port", binding: null };
    }
    return { decision: "deny", reason: "unknown-port", binding: null };
  }
  return { decision: "allow", reason: "ok-loopback", binding: { host: "127.0.0.1", port: 8080 } };
}
