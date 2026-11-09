export function runFeature(payload) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return { decision: "deny", preference: null, reason: "bad-payload" };
  }
  const seen = [];
  const stored = new Map();
  for (const entry of Object.entries(payload)) {
    const field = entry[0];
    const value = entry[1];
    if (field !== "change" && field !== "motive") {
      return { decision: "deny", preference: null, reason: "unknown-field" };
    }
    if (typeof value === "string") {
      if (value.includes("://") || value.includes("\\") || value.includes("..")) {
        return { decision: "deny", preference: null, reason: "bad-value" };
      }
    }
    seen.push(field);
    stored.set(field, value);
  }
  const changeValue = stored.get("change");
  if (typeof changeValue !== "string") {
    return { decision: "deny", preference: null, reason: "bad-change" };
  }
  const changeAllow = new Map();
  changeAllow.set("useful", "useful");
  changeAllow.set("complete", "complete");
  if (changeAllow.get(changeValue) !== changeValue) {
    return { decision: "deny", preference: null, reason: "unknown-change" };
  }
  const motiveValue = stored.get("motive");
  if (typeof motiveValue !== "string") {
    return { decision: "deny", preference: null, reason: "bad-motive" };
  }
  const motiveAllow = new Map();
  motiveAllow.set("contribution", "contribution");
  if (motiveAllow.get(motiveValue) === motiveValue) {
    return { decision: "allow", preference: { change: changeValue, motive: motiveValue }, reason: "ok-preferred" };
  }
  const motiveDeny = new Map();
  motiveDeny.set("activity", "activity");
  if (motiveDeny.get(motiveValue) === motiveValue) {
    return { decision: "deny", preference: null, reason: "denied-activity" };
  }
  return { decision: "deny", preference: null, reason: "unknown-motive" };
}
