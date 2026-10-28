export function runFeature(payload) {
  if (typeof payload !== "object" || payload === null) {
    return { decision: "deny", reason: "bad-payload", scope: null };
  }
  if (Array.isArray(payload)) {
    return { decision: "deny", reason: "bad-payload", scope: null };
  }
  const stored = new Map();
  for (const [key, value] of Object.entries(payload)) {
    if (key !== "files") {
      return { decision: "deny", reason: "unknown-field", scope: null };
    }
    stored.set(key, value);
  }
  const files = stored.get("files");
  if (Array.isArray(files) === false) {
    return { decision: "deny", reason: "bad-files", scope: null };
  }
  if (files.length < 1 || files.length > 8) {
    return { decision: "deny", reason: "bad-files", scope: null };
  }
  const rootAllow = new Map();
  rootAllow.set("LICENSE", true);
  rootAllow.set("NOTICE.md", true);
  rootAllow.set("README.md", true);
  rootAllow.set("index.html", true);
  rootAllow.set("package.json", true);
  rootAllow.set("server.js", true);
  const exactAllow = new Map();
  exactAllow.set("css/style.css", true);
  exactAllow.set("js/game.js", true);
  const charAllow = new Map();
  for (const ch of "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.-_") {
    charAllow.set(ch, true);
  }
  for (const item of files) {
    if (typeof item !== "string") {
      return { decision: "deny", reason: "bad-files", scope: null };
    }
    if (item.length < 1 || item.length > 128) {
      return { decision: "deny", reason: "bad-files", scope: null };
    }
    if (item.includes("://") || item.includes("\\") || item.includes("..")) {
      return { decision: "deny", reason: "bad-value", scope: null };
    }
    if (item.startsWith("/") || item.includes("//") || item.endsWith("/")) {
      return { decision: "deny", reason: "bad-files", scope: null };
    }
    for (const part of item.split("/")) {
      if (part === "" || part === "." || part === ".." || part.includes("..")) {
        return { decision: "deny", reason: "bad-value", scope: null };
      }
      if (part.startsWith(".")) {
        return { decision: "deny", reason: "unknown-file", scope: null };
      }
    }
    if (item.includes("/") === false) {
      if (rootAllow.get(item) !== true) {
        return { decision: "deny", reason: "unknown-file", scope: null };
      }
    } else {
      if (exactAllow.get(item) !== true) {
        if (item.startsWith("js/community/")) {
          const tail = item.slice(13);
          if (tail.length < 1 || tail.includes("/")) {
            return { decision: "deny", reason: "unknown-file", scope: null };
          }
          for (const c of tail) {
            if (charAllow.get(c) !== true) {
              return { decision: "deny", reason: "bad-name", scope: null };
            }
          }
          if (tail.endsWith("_gate.mjs") === false || tail.length < 10) {
            return { decision: "deny", reason: "bad-name", scope: null };
          }
        } else if (item.startsWith("test/")) {
          const tail = item.slice(5);
          if (tail.length < 1 || tail.includes("/")) {
            return { decision: "deny", reason: "unknown-file", scope: null };
          }
          for (const c of tail) {
            if (charAllow.get(c) !== true) {
              return { decision: "deny", reason: "bad-name", scope: null };
            }
          }
          if (tail.endsWith(".test.js") === false || tail.length < 9) {
            return { decision: "deny", reason: "bad-name", scope: null };
          }
        } else {
          return { decision: "deny", reason: "unknown-file", scope: null };
        }
      }
    }
  }
  const out = [];
  for (const v of files) {
    out.push(v);
  }
  return { decision: "allow", reason: "ok-scope", scope: { files: out } };
}
