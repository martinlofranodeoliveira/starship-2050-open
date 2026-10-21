export function runFeature(payload) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return { decision: "deny", reason: "bad-payload", setup: null };
  }
  for (const [key, value] of Object.entries(payload)) {
    if (key !== "fixture" && key !== "network") {
      return { decision: "deny", reason: "unknown-field", setup: null };
    }
  }
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === "string") {
      if (value.includes("://") || value.includes("\\") || value.includes("..")) {
        return { decision: "deny", reason: "bad-value", setup: null };
      }
    }
  }
  const store = new Map();
  for (const [key, value] of Object.entries(payload)) {
    store.set(key, value);
  }
  const fixture = store.get("fixture");
  if (typeof fixture !== "string") {
    return { decision: "deny", reason: "bad-fixture", setup: null };
  }
  if (fixture !== "symlink-loop" && fixture !== "traversal-probe" && fixture !== "dotfile-probe") {
    return { decision: "deny", reason: "unknown-fixture", setup: null };
  }
  const network = store.get("network");
  if (typeof network !== "string") {
    return { decision: "deny", reason: "bad-network", setup: null };
  }
  if (network !== "loopback") {
    return { decision: "deny", reason: "unknown-network", setup: null };
  }
  return { decision: "allow", reason: "ok-synthetic", setup: { fixture: fixture, network: network } };
}
