export function runFeature(payload) {
  if (typeof payload !== "object") {
    return { decision: "deny", reason: "bad-payload", docs: null };
  }
  if (payload === null) {
    return { decision: "deny", reason: "bad-payload", docs: null };
  }
  if (Array.isArray(payload) === true) {
    return { decision: "deny", reason: "bad-payload", docs: null };
  }
  for (const [key, value] of Object.entries(payload)) {
    if (key !== "block" && key !== "version") {
      return { decision: "deny", reason: "unknown-field", docs: null };
    }
  }
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === "string") {
      if (value.includes("://") === true) {
        return { decision: "deny", reason: "bad-value", docs: null };
      }
      if (value.includes("\\") === true) {
        return { decision: "deny", reason: "bad-value", docs: null };
      }
      if (value.includes("..") === true) {
        return { decision: "deny", reason: "bad-value", docs: null };
      }
    }
  }
  const store = new Map();
  for (const [key, value] of Object.entries(payload)) {
    store.set(key, value);
  }
  const blockValue = store.get("block");
  if (typeof blockValue !== "string") {
    return { decision: "deny", reason: "bad-block", docs: null };
  }
  if (blockValue !== "public-docs-pt") {
    return { decision: "deny", reason: "unknown-block", docs: null };
  }
  const versionValue = store.get("version");
  if (typeof versionValue !== "string") {
    return { decision: "deny", reason: "bad-version", docs: null };
  }
  if (versionValue !== "v1") {
    return { decision: "deny", reason: "unknown-version", docs: null };
  }
  return { decision: "allow", reason: "ok-docs", docs: { block: blockValue, version: versionValue } };
}
