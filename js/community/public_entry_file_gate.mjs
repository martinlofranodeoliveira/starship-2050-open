export function runFeature(payload) {
  if (payload === null) {
    return { decision: "deny", reason: "bad-payload", entry: null };
  }
  if (typeof payload !== "object") {
    return { decision: "deny", reason: "bad-payload", entry: null };
  }
  if (Array.isArray(payload)) {
    return { decision: "deny", reason: "bad-payload", entry: null };
  }
  const collected = new Map();
  for (const pair of Object.entries(payload)) {
    const k = pair[0];
    const v = pair[1];
    if (k !== "file" && k !== "kind") {
      return { decision: "deny", reason: "unknown-field", entry: null };
    }
    if (typeof v === "string") {
      if (v.includes("://")) {
        return { decision: "deny", reason: "bad-value", entry: null };
      }
      if (v.includes("\\")) {
        return { decision: "deny", reason: "bad-value", entry: null };
      }
      if (v.includes("..")) {
        return { decision: "deny", reason: "bad-value", entry: null };
      }
    }
    collected.set(k, v);
  }
  const fileValue = collected.get("file");
  if (typeof fileValue !== "string") {
    return { decision: "deny", reason: "bad-file", entry: null };
  }
  if (fileValue !== "index.html" && fileValue !== "js/game.js" && fileValue !== "css/style.css") {
    return { decision: "deny", reason: "unknown-file", entry: null };
  }
  const kindValue = collected.get("kind");
  if (typeof kindValue !== "string") {
    return { decision: "deny", reason: "bad-kind", entry: null };
  }
  if (kindValue !== "html" && kindValue !== "js" && kindValue !== "css") {
    return { decision: "deny", reason: "unknown-kind", entry: null };
  }
  if (fileValue === "index.html") {
    if (kindValue !== "html") {
      return { decision: "deny", reason: "mismatch-kind", entry: null };
    }
  }
  if (fileValue === "js/game.js") {
    if (kindValue !== "js") {
      return { decision: "deny", reason: "mismatch-kind", entry: null };
    }
  }
  if (fileValue === "css/style.css") {
    if (kindValue !== "css") {
      return { decision: "deny", reason: "mismatch-kind", entry: null };
    }
  }
  return { decision: "allow", reason: "ok-entry", entry: { file: fileValue, kind: kindValue } };
}
