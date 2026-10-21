export function runFeature(payload) {
  if (payload === null) {
    return { decision: "deny", reason: "bad-payload", render: null };
  }
  if (typeof payload !== "object") {
    return { decision: "deny", reason: "bad-payload", render: null };
  }
  if (Array.isArray(payload)) {
    return { decision: "deny", reason: "bad-payload", render: null };
  }
  for (const entry of Object.entries(payload)) {
    if (entry[0] !== "asset" && entry[0] !== "source") {
      return { decision: "deny", reason: "unknown-field", render: null };
    }
  }
  for (const entry of Object.entries(payload)) {
    if (typeof entry[1] === "string") {
      if (entry[1].includes("://")) {
        return { decision: "deny", reason: "bad-value", render: null };
      }
      if (entry[1].includes("\\")) {
        return { decision: "deny", reason: "bad-value", render: null };
      }
      if (entry[1].includes("..")) {
        return { decision: "deny", reason: "bad-value", render: null };
      }
    }
  }
  const store = new Map();
  for (const entry of Object.entries(payload)) {
    store.set(entry[0], entry[1]);
  }
  const asset = store.get("asset");
  if (typeof asset !== "string") {
    return { decision: "deny", reason: "bad-asset", render: null };
  }
  if (asset !== "canvas" && asset !== "sound") {
    return { decision: "deny", reason: "unknown-asset", render: null };
  }
  const source = store.get("source");
  if (typeof source !== "string") {
    return { decision: "deny", reason: "bad-source", render: null };
  }
  if (source !== "procedural" && source !== "generated") {
    return { decision: "deny", reason: "unknown-source", render: null };
  }
  if (asset === "canvas") {
    if (source !== "procedural") {
      return { decision: "deny", reason: "mismatch-source", render: null };
    }
  }
  if (asset === "sound") {
    if (source !== "generated") {
      return { decision: "deny", reason: "mismatch-source", render: null };
    }
  }
  return { decision: "allow", reason: "ok-procedural", render: { asset: asset, source: source } };
}
