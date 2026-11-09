export function runFeature(payload) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return { decision: "deny", reason: "bad-payload", permit: null };
  }
  for (const [key, value] of Object.entries(payload)) {
    if (key !== "channel" && key !== "content") {
      return { decision: "deny", reason: "unknown-field", permit: null };
    }
    if (typeof value === "string") {
      if (value.includes("://") || value.includes("\\") || value.includes("..")) {
        return { decision: "deny", reason: "bad-value", permit: null };
      }
    }
  }
  const store = new Map();
  for (const [key, value] of Object.entries(payload)) {
    store.set(key, value);
  }
  const channel = store.get("channel");
  const content = store.get("content");
  const allowedChannels = new Map();
  allowedChannels.set("issue", true);
  allowedChannels.set("example", true);
  allowedChannels.set("capture", true);
  allowedChannels.set("pull", true);
  if (typeof channel !== "string") {
    return { decision: "deny", reason: "bad-channel", permit: null };
  }
  if (allowedChannels.get(channel) !== true) {
    return { decision: "deny", reason: "unknown-channel", permit: null };
  }
  if (typeof content !== "string") {
    return { decision: "deny", reason: "bad-content", permit: null };
  }
  const allowedContents = new Map();
  allowedContents.set("synthetic", true);
  allowedContents.set("technical", true);
  if (allowedContents.get(content) === true) {
    return { decision: "allow", reason: "ok-disclosure", permit: { channel: channel, content: content } };
  }
  const deniedContents = new Map();
  deniedContents.set("secret", "denied-secret");
  deniedContents.set("third-party", "denied-third-party");
  const deniedReason = deniedContents.get(content);
  if (deniedReason === "denied-secret") {
    return { decision: "deny", reason: "denied-secret", permit: null };
  }
  if (deniedReason === "denied-third-party") {
    return { decision: "deny", reason: "denied-third-party", permit: null };
  }
  return { decision: "deny", reason: "unknown-content", permit: null };
}
