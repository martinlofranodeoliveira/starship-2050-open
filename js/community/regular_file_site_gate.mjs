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
  for (const entry of Object.entries(payload)) {
    const key = entry[0];
    if (key !== "kind") {
      if (key !== "site") {
        return { decision: "deny", reason: "unknown-field", entry: null };
      }
    }
  }
  for (const entry of Object.entries(payload)) {
    const value = entry[1];
    if (typeof value === "string") {
      if (value.includes("://")) {
        return { decision: "deny", reason: "bad-value", entry: null };
      }
      if (value.includes("\\")) {
        return { decision: "deny", reason: "bad-value", entry: null };
      }
      if (value.includes("..")) {
        return { decision: "deny", reason: "bad-value", entry: null };
      }
    }
  }
  const collected = new Map();
  for (const entry of Object.entries(payload)) {
    collected.set(entry[0], entry[1]);
  }
  const kind = collected.get("kind");
  if (typeof kind !== "string") {
    return { decision: "deny", reason: "bad-kind", entry: null };
  }
  const knownKinds = new Map();
  knownKinds.set("regular", true);
  knownKinds.set("directory", true);
  knownKinds.set("symlink", true);
  if (knownKinds.get(kind) !== true) {
    return { decision: "deny", reason: "unknown-kind", entry: null };
  }
  const site = collected.get("site");
  if (typeof site !== "string") {
    return { decision: "deny", reason: "bad-site", entry: null };
  }
  const knownSites = new Map();
  knownSites.set("inside", true);
  knownSites.set("outside", true);
  if (knownSites.get(site) !== true) {
    return { decision: "deny", reason: "unknown-site", entry: null };
  }
  if (kind !== "regular") {
    return { decision: "deny", reason: "mismatch-file", entry: null };
  }
  if (site !== "inside") {
    return { decision: "deny", reason: "mismatch-file", entry: null };
  }
  return { decision: "allow", reason: "ok-file", entry: { kind: kind, site: site } };
}
