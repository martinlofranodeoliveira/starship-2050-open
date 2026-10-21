export function runFeature(payload) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return { decision: "deny", reason: "bad-payload", ruling: null };
  }
  for (const entry of Object.entries(payload)) {
    const field = entry[0];
    if (field !== "media" && field !== "rights") {
      return { decision: "deny", reason: "unknown-field", ruling: null };
    }
  }
  for (const entry of Object.entries(payload)) {
    const value = entry[1];
    if (typeof value === "string") {
      if (value.includes("://") || value.includes("\\") || value.includes("..")) {
        return { decision: "deny", reason: "bad-value", ruling: null };
      }
    }
  }
  const known = new Map();
  for (const entry of Object.entries(payload)) {
    const field = entry[0];
    const value = entry[1];
    known.set(field, value);
  }
  const media = known.get("media");
  if (typeof media !== "string") {
    return { decision: "deny", reason: "bad-media", ruling: null };
  }
  if (media !== "image" && media !== "model-3d" && media !== "voice" && media !== "marketing") {
    return { decision: "deny", reason: "unknown-media", ruling: null };
  }
  const rights = known.get("rights");
  if (typeof rights !== "string") {
    return { decision: "deny", reason: "bad-rights", ruling: null };
  }
  if (rights !== "unestablished") {
    return { decision: "deny", reason: "unknown-rights", ruling: null };
  }
  return { decision: "allow", reason: "ok-excluded", ruling: { media: media, rights: rights } };
}
