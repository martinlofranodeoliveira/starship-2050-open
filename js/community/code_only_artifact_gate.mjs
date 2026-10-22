export function runFeature(payload) {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return { decision: "deny", reason: "bad-payload", code: null };
  }
  for (const entry of Object.entries(payload)) {
    const key = entry[0];
    if (key !== "edition" && key !== "artifact") {
      return { decision: "deny", reason: "unknown-field", code: null };
    }
  }
  for (const entry of Object.entries(payload)) {
    const value = entry[1];
    if (typeof value === "string") {
      if (value.includes("://") || value.includes("\\") || value.includes("..")) {
        return { decision: "deny", reason: "bad-value", code: null };
      }
    }
  }
  const store = new Map();
  for (const entry of Object.entries(payload)) {
    const k = entry[0];
    const v = entry[1];
    store.set(k, v);
  }
  const edition = store.get("edition");
  if (typeof edition !== "string") {
    return { decision: "deny", reason: "bad-edition", code: null };
  }
  const editionOk = new Map();
  editionOk.set("open", true);
  editionOk.set("code-only", true);
  if (editionOk.get(edition) !== true) {
    return { decision: "deny", reason: "unknown-edition", code: null };
  }
  const artifact = store.get("artifact");
  if (typeof artifact !== "string") {
    return { decision: "deny", reason: "bad-artifact", code: null };
  }
  const artifactOk = new Map();
  artifactOk.set("gameplay", true);
  artifactOk.set("source", true);
  if (artifactOk.get(artifact) !== true) {
    return { decision: "deny", reason: "unknown-artifact", code: null };
  }
  return { decision: "allow", reason: "ok-code", code: { edition: edition, artifact: artifact } };
}
