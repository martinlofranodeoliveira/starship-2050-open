export function runFeature(payload) {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return { decision: "deny", reason: "bad-payload", reference: null };
  }
  for (const [key, value] of Object.entries(payload)) {
    if (key !== "reference" && key !== "section") {
      return { decision: "deny", reason: "unknown-field", reference: null };
    }
  }
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === "string") {
      if (value.includes("://") || value.includes("\\") || value.includes("..")) {
        return { decision: "deny", reason: "bad-value", reference: null };
      }
    }
  }
  const collected = new Map();
  for (const [key, value] of Object.entries(payload)) {
    collected.set(key, value);
  }
  const referenceValue = collected.get("reference");
  if (typeof referenceValue !== "string") {
    return { decision: "deny", reason: "bad-reference", reference: null };
  }
  if (referenceValue !== "original") {
    return { decision: "deny", reason: "unknown-reference", reference: null };
  }
  const sectionValue = collected.get("section");
  if (typeof sectionValue !== "string") {
    return { decision: "deny", reason: "bad-section", reference: null };
  }
  if (sectionValue !== "apis" && sectionValue !== "examples" && sectionValue !== "limits" && sectionValue !== "history") {
    return { decision: "deny", reason: "unknown-section", reference: null };
  }
  return { decision: "allow", reason: "ok-preserved", reference: { reference: referenceValue, section: sectionValue } };
}
