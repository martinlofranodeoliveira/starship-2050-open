export function runFeature(payload) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return { decision: "deny", reason: "bad-payload", endpoint: null };
  }
  const entries = Object.entries(payload);
  for (const pair of entries) {
    const field = pair[0];
    if (field !== "service" && field !== "port") {
      return { decision: "deny", reason: "unknown-field", endpoint: null };
    }
  }
  for (const pair of entries) {
    const value = pair[1];
    if (typeof value === "string") {
      if (value.includes("://") || value.includes("\\") || value.includes("..")) {
        return { decision: "deny", reason: "bad-value", endpoint: null };
      }
    }
  }
  const stored = new Map();
  for (const pair of entries) {
    const k = pair[0];
    const v = pair[1];
    stored.set(k, v);
  }
  const service = stored.get("service");
  if (typeof service !== "string") {
    return { decision: "deny", reason: "bad-service", endpoint: null };
  }
  if (service !== "serve") {
    return { decision: "deny", reason: "unknown-service", endpoint: null };
  }
  const port = stored.get("port");
  if (typeof port !== "number") {
    return { decision: "deny", reason: "bad-port", endpoint: null };
  }
  if (Number.isSafeInteger(port) === false) {
    return { decision: "deny", reason: "bad-port", endpoint: null };
  }
  if (port !== 8080) {
    return { decision: "deny", reason: "unknown-port", endpoint: null };
  }
  return { decision: "allow", reason: "ok-open", endpoint: { service: service, port: port } };
}
