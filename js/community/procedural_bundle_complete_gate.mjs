export function runFeature(payload) {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return { decision: "deny", reason: "bad-payload", complete: null };
  }
  const fields = new Map();
  for (const entry of Object.entries(payload)) {
    const k = entry[0];
    const v = entry[1];
    if (k !== "bundle") {
      return { decision: "deny", reason: "unknown-field", complete: null };
    }
    fields.set(k, v);
  }
  const bundle = fields.get("bundle");
  if (Array.isArray(bundle) === false) {
    return { decision: "deny", reason: "bad-bundle", complete: null };
  }
  const bundleLen = bundle.length;
  if (bundleLen < 1 || bundleLen > 2) {
    return { decision: "deny", reason: "bad-bundle", complete: null };
  }
  const allowed = new Map();
  allowed.set("canvas-procedural", true);
  allowed.set("sound-generated", true);
  const seen = new Map();
  for (const item of bundle) {
    if (typeof item !== "string") {
      return { decision: "deny", reason: "bad-bundle", complete: null };
    }
    if (item.includes("://") || item.includes("\\") || item.includes("..")) {
      return { decision: "deny", reason: "bad-value", complete: null };
    }
    if (allowed.get(item) !== true) {
      return { decision: "deny", reason: "unknown-render", complete: null };
    }
    if (seen.get(item) === true) {
      return { decision: "deny", reason: "duplicate-render", complete: null };
    }
    seen.set(item, true);
  }
  if (seen.get("canvas-procedural") !== true || seen.get("sound-generated") !== true) {
    return { decision: "deny", reason: "incomplete-bundle", complete: null };
  }
  const out = [];
  for (const item of bundle) {
    out.push(item);
  }
  return { decision: "allow", reason: "ok-complete", complete: { bundle: out } };
}
