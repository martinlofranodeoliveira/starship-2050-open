export function runFeature(payload) {
  if (typeof payload !== "object") {
    return { decision: "deny", reason: "bad-payload", exclusion: null };
  }
  if (payload === null) {
    return { decision: "deny", reason: "bad-payload", exclusion: null };
  }
  if (Array.isArray(payload) === true) {
    return { decision: "deny", reason: "bad-payload", exclusion: null };
  }
  for (const checkEntry of Object.entries(payload)) {
    const checkKey = checkEntry[0];
    if (checkKey !== "offering") {
      if (checkKey !== "availability") {
        return { decision: "deny", reason: "unknown-field", exclusion: null };
      }
    }
  }
  for (const scanEntry of Object.entries(payload)) {
    const scanValue = scanEntry[1];
    if (typeof scanValue === "string") {
      if (scanValue.includes("://") === true) {
        return { decision: "deny", reason: "bad-value", exclusion: null };
      }
      if (scanValue.includes("\\") === true) {
        return { decision: "deny", reason: "bad-value", exclusion: null };
      }
      if (scanValue.includes("..") === true) {
        return { decision: "deny", reason: "bad-value", exclusion: null };
      }
    }
  }
  const fields = new Map();
  for (const collectEntry of Object.entries(payload)) {
    const collectKey = collectEntry[0];
    const collectValue = collectEntry[1];
    fields.set(collectKey, collectValue);
  }
  const allowedOfferings = new Map();
  allowedOfferings.set("leaderboard", true);
  allowedOfferings.set("sdk", true);
  allowedOfferings.set("production", true);
  const offering = fields.get("offering");
  if (typeof offering !== "string") {
    return { decision: "deny", reason: "bad-offering", exclusion: null };
  }
  if (allowedOfferings.get(offering) !== true) {
    return { decision: "deny", reason: "unknown-offering", exclusion: null };
  }
  const availability = fields.get("availability");
  if (typeof availability !== "string") {
    return { decision: "deny", reason: "bad-availability", exclusion: null };
  }
  if (availability !== "excluded") {
    const overclaimed = new Map();
    overclaimed.set("included", true);
    overclaimed.set("cloud", true);
    overclaimed.set("live", true);
    overclaimed.set("deployed", true);
    if (overclaimed.get(availability) === true) {
      return { decision: "deny", reason: "overclaim-availability", exclusion: null };
    }
    return { decision: "deny", reason: "unknown-availability", exclusion: null };
  }
  return { decision: "allow", reason: "ok-excluded", exclusion: { offering: offering, availability: availability } };
}
