export function runFeature(payload) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return { decision: "deny", reason: "bad-payload", reference: null };
  }
  for (const [key, value] of Object.entries(payload)) {
    if (key !== "notice" && key !== "topic") {
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
  const store = new Map();
  for (const [key, value] of Object.entries(payload)) {
    store.set(key, value);
  }
  const noticeValue = store.get("notice");
  if (typeof noticeValue !== "string") {
    return { decision: "deny", reason: "bad-notice", reference: null };
  }
  if (noticeValue !== "NOTICE.md") {
    return { decision: "deny", reason: "unknown-notice", reference: null };
  }
  const topicValue = store.get("topic");
  if (typeof topicValue !== "string") {
    return { decision: "deny", reason: "bad-topic", reference: null };
  }
  if (topicValue !== "private-history") {
    return { decision: "deny", reason: "unknown-topic", reference: null };
  }
  return { decision: "allow", reason: "ok-notice", reference: { notice: noticeValue, topic: topicValue } };
}
