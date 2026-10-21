export function runFeature(payload) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return { decision: "deny", reason: "bad-payload", route: null };
  }
  for (const entry of Object.entries(payload)) {
    const k = entry[0];
    if (k !== "method" && k !== "target") {
      return { decision: "deny", reason: "unknown-field", route: null };
    }
  }
  for (const entry of Object.entries(payload)) {
    const v = entry[1];
    if (typeof v === "string") {
      if (v.includes("://") || v.includes("\\")) {
        return { decision: "deny", reason: "bad-value", route: null };
      }
    }
  }
  const fields = new Map();
  for (const entry of Object.entries(payload)) {
    const k = entry[0];
    const v = entry[1];
    fields.set(k, v);
  }
  const methodValue = fields.get("method");
  if (typeof methodValue !== "string") {
    return { decision: "deny", reason: "bad-method", route: null };
  }
  const methodAllow = new Map();
  methodAllow.set("GET", "GET");
  methodAllow.set("HEAD", "HEAD");
  const methodHit = methodAllow.get(methodValue);
  if (methodHit === undefined) {
    return { decision: "deny", reason: "unknown-method", route: null };
  }
  const targetValue = fields.get("target");
  if (typeof targetValue !== "string") {
    return { decision: "deny", reason: "bad-target", route: null };
  }
  if (targetValue.length === 0) {
    return { decision: "deny", reason: "bad-target", route: null };
  }
  if (targetValue.startsWith("/") === false) {
    return { decision: "deny", reason: "bad-target", route: null };
  }
  if (targetValue.includes("//")) {
    return { decision: "deny", reason: "bad-target", route: null };
  }
  if (targetValue.length > 1 && targetValue.endsWith("/")) {
    return { decision: "deny", reason: "bad-target", route: null };
  }
  const segments = targetValue.split("/");
  const pieceList = [];
  for (const seg of segments) {
    pieceList.push(seg);
  }
  for (const seg of pieceList) {
    if (seg === "." || seg === ".." || seg.includes("..")) {
      return { decision: "deny", reason: "traversal", route: null };
    }
    if (seg.startsWith(".")) {
      return { decision: "deny", reason: "dotfile", route: null };
    }
  }
  if (targetValue === "/" || targetValue === "/index.html") {
    return { decision: "allow", reason: "ok-static", route: { method: methodValue, target: targetValue } };
  }
  if (targetValue.startsWith("/js/") === false && targetValue.startsWith("/css/") === false) {
    return { decision: "deny", reason: "unknown-target", route: null };
  }
  if (segments.length !== 3) {
    return { decision: "deny", reason: "unknown-target", route: null };
  }
  const dirPart = segments[1];
  const filePart = segments[2];
  const dirAllow = new Map();
  dirAllow.set("js", "js");
  dirAllow.set("css", "css");
  const dirHit = dirAllow.get(dirPart);
  if (dirHit === undefined) {
    return { decision: "deny", reason: "unknown-target", route: null };
  }
  if (filePart.length === 0) {
    return { decision: "deny", reason: "bad-name", route: null };
  }
  const allowedChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.-_";
  const charAllow = new Map();
  for (const ch of allowedChars) {
    charAllow.set(ch, ch);
  }
  for (const ch of filePart) {
    const hit = charAllow.get(ch);
    if (hit === undefined) {
      return { decision: "deny", reason: "bad-name", route: null };
    }
  }
  if (dirPart === "js") {
    if (filePart.endsWith(".js") === false) {
      return { decision: "deny", reason: "bad-name", route: null };
    }
    if (filePart.length <= 3) {
      return { decision: "deny", reason: "bad-name", route: null };
    }
  }
  if (dirPart === "css") {
    if (filePart.endsWith(".css") === false) {
      return { decision: "deny", reason: "bad-name", route: null };
    }
    if (filePart.length <= 4) {
      return { decision: "deny", reason: "bad-name", route: null };
    }
  }
  return { decision: "allow", reason: "ok-static", route: { method: methodValue, target: targetValue } };
}
