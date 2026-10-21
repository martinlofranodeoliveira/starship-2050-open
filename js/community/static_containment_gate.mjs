export function runFeature(payload) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return { decision: "deny", reason: "bad-payload", containment: null };
  }
  const fields = new Map();
  for (const [key, value] of Object.entries(payload)) {
    if (key !== "entry" && key !== "zone") {
      return { decision: "deny", reason: "unknown-field", containment: null };
    }
    fields.set(key, value);
  }
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === "string") {
      if (value.includes("://") || value.includes("\\") || value.includes("..")) {
        return { decision: "deny", reason: "bad-value", containment: null };
      }
    }
  }
  const knownEntries = new Map();
  knownEntries.set("regular-file", true);
  knownEntries.set("symlink", true);
  knownEntries.set("escaping", true);
  const knownZones = new Map();
  knownZones.set("inside-root", true);
  knownZones.set("outside-root", true);
  const entryValue = fields.get("entry");
  if (typeof entryValue !== "string") {
    return { decision: "deny", reason: "bad-entry", containment: null };
  }
  if (knownEntries.get(entryValue) !== true) {
    return { decision: "deny", reason: "unknown-entry", containment: null };
  }
  const zoneValue = fields.get("zone");
  if (typeof zoneValue !== "string") {
    return { decision: "deny", reason: "bad-zone", containment: null };
  }
  if (knownZones.get(zoneValue) !== true) {
    return { decision: "deny", reason: "unknown-zone", containment: null };
  }
  if (entryValue !== "regular-file" || zoneValue !== "inside-root") {
    return { decision: "deny", reason: "not-contained", containment: null };
  }
  return { decision: "allow", reason: "ok-contained", containment: { entry: entryValue, zone: zoneValue } };
}
