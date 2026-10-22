export function runFeature(payload) {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return { decision: "deny", reason: "bad-payload", subject: null };
  }
  for (const entry of Object.entries(payload)) {
    if (entry[0] !== "path" && entry[0] !== "check") {
      return { decision: "deny", reason: "unknown-field", subject: null };
    }
  }
  for (const value of Object.values(payload)) {
    if (typeof value === "string") {
      if (value.includes("://") || value.includes("\\") || value.includes("..")) {
        return { decision: "deny", reason: "bad-value", subject: null };
      }
    }
  }
  const fields = new Map();
  for (const entry of Object.entries(payload)) {
    fields.set(entry[0], entry[1]);
  }
  const pathValue = fields.get("path");
  if (typeof pathValue !== "string") {
    return { decision: "deny", reason: "bad-path", subject: null };
  }
  if (pathValue !== "js/game.js" && pathValue !== "server.js") {
    return { decision: "deny", reason: "unknown-path", subject: null };
  }
  const checkValue = fields.get("check");
  if (typeof checkValue !== "string") {
    return { decision: "deny", reason: "bad-check", subject: null };
  }
  if (checkValue !== "syntax") {
    return { decision: "deny", reason: "unknown-check", subject: null };
  }
  return { decision: "allow", reason: "ok-syntax", subject: { path: pathValue, check: checkValue } };
}
