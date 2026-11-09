export function runFeature(payload) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return { decision: "deny", reason: "bad-payload", standing: null };
  }
  for (const entry of Object.entries(payload)) {
    const key = entry[0];
    if (key !== "auxiliary" && key !== "coupling") {
      return { decision: "deny", reason: "unknown-field", standing: null };
    }
  }
  for (const entry of Object.entries(payload)) {
    const value = entry[1];
    if (typeof value === "string") {
      if (value.includes("://") || value.includes("\\") || value.includes("..")) {
        return { decision: "deny", reason: "bad-value", standing: null };
      }
    }
  }
  const collected = new Map();
  for (const entry of Object.entries(payload)) {
    const k = entry[0];
    const v = entry[1];
    collected.set(k, v);
  }
  const auxiliaryValue = collected.get("auxiliary");
  if (typeof auxiliaryValue !== "string") {
    return { decision: "deny", reason: "bad-auxiliary", standing: null };
  }
  if (auxiliaryValue !== "community") {
    return { decision: "deny", reason: "unknown-auxiliary", standing: null };
  }
  const couplingValue = collected.get("coupling");
  if (typeof couplingValue !== "string") {
    return { decision: "deny", reason: "bad-coupling", standing: null };
  }
  if (couplingValue !== "standalone") {
    return { decision: "deny", reason: "unknown-coupling", standing: null };
  }
  return { decision: "allow", reason: "ok-independent", standing: { auxiliary: "community", coupling: "standalone" } };
}
