export function runFeature(payload) {
  if (typeof payload !== "object") {
    return { decision: "deny", reason: "bad-payload", order: null };
  }
  if (payload === null) {
    return { decision: "deny", reason: "bad-payload", order: null };
  }
  if (Array.isArray(payload) === true) {
    return { decision: "deny", reason: "bad-payload", order: null };
  }
  for (const entry of Object.entries(payload)) {
    const k = entry[0];
    if (k !== "steps") {
      return { decision: "deny", reason: "unknown-field", order: null };
    }
  }
  const collected = new Map();
  for (const entry of Object.entries(payload)) {
    collected.set(entry[0], entry[1]);
  }
  const steps = collected.get("steps");
  if (Array.isArray(steps) === false) {
    return { decision: "deny", reason: "bad-steps", order: null };
  }
  if (steps.length < 1) {
    return { decision: "deny", reason: "bad-steps", order: null };
  }
  if (steps.length > 3) {
    return { decision: "deny", reason: "bad-steps", order: null };
  }
  const rankOf = new Map();
  rankOf.set("check", 0);
  rankOf.set("test", 1);
  rankOf.set("start", 2);
  const seen = new Map();
  let prevRank = 0;
  let isFirst = true;
  for (const item of steps) {
    if (typeof item !== "string") {
      return { decision: "deny", reason: "bad-steps", order: null };
    }
    let prevDot = false;
    let state = 0;
    for (const ch of item) {
      if (ch === "\\") {
        return { decision: "deny", reason: "bad-value", order: null };
      }
      if (ch === ".") {
        if (prevDot === true) {
          return { decision: "deny", reason: "bad-value", order: null };
        }
        prevDot = true;
      } else {
        prevDot = false;
      }
      if (state === 0) {
        if (ch === ":") {
          state = 1;
        }
      } else {
        if (state === 1) {
          if (ch === "/") {
            state = 2;
          } else {
            if (ch === ":") {
              state = 1;
            } else {
              state = 0;
            }
          }
        } else {
          if (ch === "/") {
            return { decision: "deny", reason: "bad-value", order: null };
          } else {
            if (ch === ":") {
              state = 1;
            } else {
              state = 0;
            }
          }
        }
      }
    }
    const cur = rankOf.get(item);
    if (cur === undefined) {
      return { decision: "deny", reason: "unknown-step", order: null };
    }
    if (seen.get(item) === true) {
      return { decision: "deny", reason: "duplicate-step", order: null };
    }
    seen.set(item, true);
    if (isFirst === true) {
      if (cur !== 0) {
        return { decision: "deny", reason: "out-of-order", order: null };
      }
      prevRank = cur;
      isFirst = false;
    } else {
      if (cur === prevRank + 1) {
        prevRank = cur;
      } else {
        if (cur <= prevRank) {
          return { decision: "deny", reason: "out-of-order", order: null };
        } else {
          return { decision: "deny", reason: "gap-step", order: null };
        }
      }
    }
  }
  const out = [];
  for (const s of steps) {
    out.push(s);
  }
  return { decision: "allow", reason: "ok-order", order: { steps: out } };
}
