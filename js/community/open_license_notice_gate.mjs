export function runFeature(payload) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return { decision: "deny", reason: "bad-payload", docs: null };
  }
  for (const [key, value] of Object.entries(payload)) {
    if (key !== "license" && key !== "notice") {
      return { decision: "deny", reason: "unknown-field", docs: null };
    }
  }
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === "string") {
      if (value.includes("://") || value.includes("\\") || value.includes("..")) {
        return { decision: "deny", reason: "bad-value", docs: null };
      }
    }
  }
  const store = new Map();
  for (const [key, value] of Object.entries(payload)) {
    store.set(key, value);
  }
  const licenseValue = store.get("license");
  if (typeof licenseValue !== "string") {
    return { decision: "deny", reason: "bad-license", docs: null };
  }
  if (licenseValue !== "LICENSE") {
    return { decision: "deny", reason: "unknown-license", docs: null };
  }
  const noticeValue = store.get("notice");
  if (typeof noticeValue !== "string") {
    return { decision: "deny", reason: "bad-notice", docs: null };
  }
  if (noticeValue !== "NOTICE.md") {
    return { decision: "deny", reason: "unknown-notice", docs: null };
  }
  return { decision: "allow", reason: "ok-docs", docs: { license: licenseValue, notice: noticeValue } };
}
