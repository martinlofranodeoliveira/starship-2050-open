export function runFeature(payload) {
  if (payload === null) {
    return { decision: "deny", reason: "bad-payload", boundary: null };
  }
  if (typeof payload !== "object") {
    return { decision: "deny", reason: "bad-payload", boundary: null };
  }
  if (Array.isArray(payload)) {
    return { decision: "deny", reason: "bad-payload", boundary: null };
  }
  for (const entry of Object.entries(payload)) {
    const key = entry[0];
    if (key !== "content" && key !== "basis") {
      return { decision: "deny", reason: "unknown-field", boundary: null };
    }
  }
  for (const entry of Object.entries(payload)) {
    const value = entry[1];
    if (typeof value === "string") {
      if (value.includes("://")) {
        return { decision: "deny", reason: "bad-value", boundary: null };
      }
      if (value.includes("\\")) {
        return { decision: "deny", reason: "bad-value", boundary: null };
      }
      if (value.includes("..")) {
        return { decision: "deny", reason: "bad-value", boundary: null };
      }
    }
  }
  const data = new Map();
  for (const entry of Object.entries(payload)) {
    data.set(entry[0], entry[1]);
  }
  const seen = [];
  for (const entry of Object.entries(payload)) {
    seen.push(entry[0]);
  }
  const allowed = new Map();
  allowed.set("gameplay-source", true);
  allowed.set("procedural-fallback", true);
  allowed.set("local-save", true);
  const excluded = new Map();
  excluded.set("image", true);
  excluded.set("model-3d", true);
  excluded.set("recorded-voice", true);
  excluded.set("marketing-material", true);
  const basisOk = new Map();
  basisOk.set("code-only", true);
  const content = data.get("content");
  if (typeof content !== "string") {
    return { decision: "deny", reason: "bad-content", boundary: null };
  }
  if (allowed.get(content) !== true) {
    if (excluded.get(content) === true) {
      return { decision: "deny", reason: "excluded-material", boundary: null };
    }
    return { decision: "deny", reason: "unknown-content", boundary: null };
  }
  const basis = data.get("basis");
  if (typeof basis !== "string") {
    return { decision: "deny", reason: "bad-basis", boundary: null };
  }
  if (basisOk.get(basis) !== true) {
    return { decision: "deny", reason: "unknown-basis", boundary: null };
  }
  return { decision: "allow", reason: "ok-code-only", boundary: { content: content, basis: basis } };
}
