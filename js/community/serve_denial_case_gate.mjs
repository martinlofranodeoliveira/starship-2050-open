export function runFeature(payload) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return { decision: "deny", reason: "bad-payload", coverage: null };
  }
  for (const [key, value] of Object.entries(payload)) {
    if (key !== "validation" && key !== "case") {
      return { decision: "deny", reason: "unknown-field", coverage: null };
    }
  }
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === "string") {
      if (value.includes("://") || value.includes("\\") || value.includes("..")) {
        return { decision: "deny", reason: "bad-value", coverage: null };
      }
    }
  }
  const store = new Map();
  for (const [key, value] of Object.entries(payload)) {
    store.set(key, value);
  }
  const hasValidation = store.has("validation");
  const validationValue = store.get("validation");
  if (hasValidation === false || typeof validationValue !== "string") {
    return { decision: "deny", reason: "bad-validation", coverage: null };
  }
  const allowedValidations = new Map();
  allowedValidations.set("serve", true);
  if (allowedValidations.has(validationValue) === false) {
    return { decision: "deny", reason: "unknown-validation", coverage: null };
  }
  const hasCase = store.has("case");
  const caseValue = store.get("case");
  if (hasCase === false || typeof caseValue !== "string") {
    return { decision: "deny", reason: "bad-case", coverage: null };
  }
  const allowedCases = new Map();
  allowedCases.set("private-path", true);
  allowedCases.set("write-method", true);
  allowedCases.set("dotfile", true);
  allowedCases.set("traversal", true);
  allowedCases.set("symlink", true);
  allowedCases.set("outside-root", true);
  if (allowedCases.has(caseValue) === false) {
    return { decision: "deny", reason: "unknown-case", coverage: null };
  }
  return { decision: "allow", reason: "ok-serve", coverage: { validation: validationValue, case: caseValue } };
}
