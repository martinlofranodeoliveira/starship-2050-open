export function runFeature(payload) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return { decision: "deny", reason: "bad-payload", media: null };
  }
  for (const [k, v] of Object.entries(payload)) {
    if (k !== "folder" && k !== "file") {
      return { decision: "deny", reason: "unknown-field", media: null };
    }
  }
  for (const [k, v] of Object.entries(payload)) {
    if (typeof v === "string") {
      if (v.includes("://") || v.includes("\\") || v.includes("..")) {
        return { decision: "deny", reason: "bad-value", media: null };
      }
    }
  }
  const listed = [];
  for (const [k, v] of Object.entries(payload)) {
    listed.push([k, v]);
  }
  const data = new Map();
  for (const [k, v] of listed) {
    data.set(k, v);
  }
  const knownFolders = new Map();
  knownFolders.set("root", "root");
  knownFolders.set("js", "js");
  knownFolders.set("css", "css");
  const folder = data.get("folder");
  if (typeof folder !== "string") {
    return { decision: "deny", reason: "bad-folder", media: null };
  }
  if (knownFolders.get(folder) === undefined) {
    return { decision: "deny", reason: "unknown-folder", media: null };
  }
  const file = data.get("file");
  if (typeof file !== "string") {
    return { decision: "deny", reason: "bad-file", media: null };
  }
  if (file === "") {
    return { decision: "deny", reason: "bad-file", media: null };
  }
  if (file.includes("/") || file.includes(":")) {
    return { decision: "deny", reason: "bad-file", media: null };
  }
  const allowed = new Map();
  for (const c of "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.-_") {
    allowed.set(c, true);
  }
  for (const ch of file) {
    if (allowed.get(ch) === undefined) {
      return { decision: "deny", reason: "bad-name", media: null };
    }
  }
  const rootNames = new Map();
  rootNames.set("index.html", "index.html");
  if (folder === "root") {
    if (rootNames.get(file) === undefined) {
      return { decision: "deny", reason: "mismatch-type", media: null };
    }
  }
  if (folder === "js") {
    if (file.endsWith(".js") === false) {
      return { decision: "deny", reason: "mismatch-type", media: null };
    }
    if (file === ".js") {
      return { decision: "deny", reason: "mismatch-type", media: null };
    }
  }
  if (folder === "css") {
    if (file.endsWith(".css") === false) {
      return { decision: "deny", reason: "mismatch-type", media: null };
    }
    if (file === ".css") {
      return { decision: "deny", reason: "mismatch-type", media: null };
    }
  }
  const types = new Map();
  types.set("root", "text/html");
  types.set("js", "text/javascript");
  types.set("css", "text/css");
  const contentType = types.get(folder);
  return { decision: "allow", reason: "ok-media", media: { folder: folder, file: file, contentType: contentType } };
}
