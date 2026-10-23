export function runFeature(payload) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return { decision: "deny", link: null, reason: "bad-payload" };
  }
  for (const entry of Object.entries(payload)) {
    const k = entry[0];
    if (k !== "page" && k !== "ref") {
      return { decision: "deny", link: null, reason: "unknown-field" };
    }
  }
  for (const entry of Object.entries(payload)) {
    const v = entry[1];
    if (typeof v === "string") {
      if (v.includes("://") || v.includes("\\") || v.includes("..")) {
        return { decision: "deny", link: null, reason: "bad-value" };
      }
    }
  }
  const store = new Map();
  for (const entry of Object.entries(payload)) {
    const k = entry[0];
    const v = entry[1];
    store.set(k, v);
  }
  const page = store.get("page");
  if (typeof page !== "string") {
    return { decision: "deny", link: null, reason: "bad-page" };
  }
  const pageOk = new Map();
  pageOk.set("index.html", true);
  if (pageOk.get(page) !== true) {
    return { decision: "deny", link: null, reason: "unknown-page" };
  }
  const ref = store.get("ref");
  if (typeof ref !== "string") {
    return { decision: "deny", link: null, reason: "bad-ref" };
  }
  if (ref === "") {
    return { decision: "deny", link: null, reason: "bad-ref" };
  }
  if (ref.includes("//") || ref.includes(":") || ref.includes("?") || ref.includes("#") || ref.includes("%")) {
    return { decision: "deny", link: null, reason: "bad-ref" };
  }
  if (ref.startsWith("/")) {
    return { decision: "deny", link: null, reason: "bad-ref" };
  }
  const allowed = new Map();
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/.-_";
  for (const ch of chars) {
    allowed.set(ch, true);
  }
  for (const ch of ref) {
    if (allowed.get(ch) !== true) {
      return { decision: "deny", link: null, reason: "bad-name" };
    }
  }
  const refs = new Map();
  refs.set("js/game.js", true);
  refs.set("css/style.css", true);
  if (refs.get(ref) !== true) {
    return { decision: "deny", link: null, reason: "unknown-ref" };
  }
  return { decision: "allow", link: { page: page, ref: ref }, reason: "ok-link" };
}
