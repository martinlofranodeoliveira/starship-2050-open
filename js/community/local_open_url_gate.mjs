export function runFeature(payload) {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return { decision: "deny", reason: "bad-payload", open: null };
  }
  for (const entry of Object.entries(payload)) {
    const key = entry[0];
    if (key !== "scheme" && key !== "hostport") {
      return { decision: "deny", reason: "unknown-field", open: null };
    }
  }
  for (const entry of Object.entries(payload)) {
    const value = entry[1];
    if (typeof value === "string") {
      if (value.includes("://") || value.includes("\\") || value.includes("..")) {
        return { decision: "deny", reason: "bad-value", open: null };
      }
    }
  }
  const collected = new Map();
  const seen = [];
  for (const entry of Object.entries(payload)) {
    const key = entry[0];
    const value = entry[1];
    collected.set(key, value);
    seen.push(key);
  }
  const scheme = collected.get("scheme");
  if (scheme === undefined || typeof scheme !== "string") {
    return { decision: "deny", reason: "bad-scheme", open: null };
  }
  if (scheme !== "http") {
    return { decision: "deny", reason: "unknown-scheme", open: null };
  }
  const hostport = collected.get("hostport");
  if (hostport === undefined || typeof hostport !== "string") {
    return { decision: "deny", reason: "bad-hostport", open: null };
  }
  if (hostport !== "127.0.0.1:8080") {
    return { decision: "deny", reason: "unknown-hostport", open: null };
  }
  return { decision: "allow", reason: "ok-open", open: { scheme: "http", hostport: "127.0.0.1:8080" } };
}
