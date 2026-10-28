import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../js/community/open_file_scope_gate.mjs";

describe("open file scope gate", () => {
  it("allows single root index.html", () => {
    assert.deepEqual(runFeature({ files: ["index.html"] }), {
      decision: "allow",
      reason: "ok-scope",
      scope: { files: ["index.html"] }
    });
  });
  it("allows community module plus matching test", () => {
    assert.deepEqual(runFeature({ files: ["js/community/static_route_gate.mjs", "test/community_static_route_gate.test.js"] }), {
      decision: "allow",
      reason: "ok-scope",
      scope: { files: ["js/community/static_route_gate.mjs", "test/community_static_route_gate.test.js"] }
    });
  });
  it("allows exact css and js files", () => {
    assert.deepEqual(runFeature({ files: ["css/style.css"] }), {
      decision: "allow",
      reason: "ok-scope",
      scope: { files: ["css/style.css"] }
    });
    assert.deepEqual(runFeature({ files: ["js/game.js"] }), {
      decision: "allow",
      reason: "ok-scope",
      scope: { files: ["js/game.js"] }
    });
  });
  it("denies unknown-field for extra keys", () => {
    assert.deepEqual(runFeature({ files: ["index.html"], extra: 1 }), {
      decision: "deny",
      reason: "unknown-field",
      scope: null
    });
    assert.deepEqual(runFeature({ files: ["index.html"], other: [] }), {
      decision: "deny",
      reason: "unknown-field",
      scope: null
    });
  });
  it("denies bad-payload for non-object payloads", () => {
    assert.deepEqual(runFeature(null), { decision: "deny", reason: "bad-payload", scope: null });
    assert.deepEqual(runFeature([]), { decision: "deny", reason: "bad-payload", scope: null });
    assert.deepEqual(runFeature("x"), { decision: "deny", reason: "bad-payload", scope: null });
  });
  it("denies bad-value for scheme backslash and dotdot", () => {
    assert.deepEqual(runFeature({ files: ["https://example.com/x"] }), {
      decision: "deny",
      reason: "bad-value",
      scope: null
    });
    assert.deepEqual(runFeature({ files: ["js\\game.js"] }), {
      decision: "deny",
      reason: "bad-value",
      scope: null
    });
    assert.deepEqual(runFeature({ files: ["a..b"] }), {
      decision: "deny",
      reason: "bad-value",
      scope: null
    });
  });
  it("denies unknown-file for private excluded dotfile and out-of-scope", () => {
    assert.deepEqual(runFeature({ files: ["index.html", "private/history.md"] }), {
      decision: "deny",
      reason: "unknown-file",
      scope: null
    });
    assert.deepEqual(runFeature({ files: [".env"] }), {
      decision: "deny",
      reason: "unknown-file",
      scope: null
    });
    assert.deepEqual(runFeature({ files: ["images/logo.png"] }), {
      decision: "deny",
      reason: "unknown-file",
      scope: null
    });
    assert.deepEqual(runFeature({ files: ["js/other.js"] }), {
      decision: "deny",
      reason: "unknown-file",
      scope: null
    });
    assert.deepEqual(runFeature({ files: ["test/.hidden.test.js"] }), {
      decision: "deny",
      reason: "unknown-file",
      scope: null
    });
  });
  it("denies bad-name for bad chars and wrong extensions", () => {
    assert.deepEqual(runFeature({ files: ["js/community/bad name_gate.mjs"] }), {
      decision: "deny",
      reason: "bad-name",
      scope: null
    });
    assert.deepEqual(runFeature({ files: ["js/community/plain.mjs"] }), {
      decision: "deny",
      reason: "bad-name",
      scope: null
    });
    assert.deepEqual(runFeature({ files: ["test/plain.js"] }), {
      decision: "deny",
      reason: "bad-name",
      scope: null
    });
  });
  it("denies bad-files for missing non-array empty oversized overlong", () => {
    assert.deepEqual(runFeature({}), { decision: "deny", reason: "bad-files", scope: null });
    assert.deepEqual(runFeature({ files: "index.html" }), { decision: "deny", reason: "bad-files", scope: null });
    assert.deepEqual(runFeature({ files: [] }), { decision: "deny", reason: "bad-files", scope: null });
    assert.deepEqual(runFeature({ files: ["index.html", "README.md", "LICENSE", "NOTICE.md", "package.json", "server.js", "css/style.css", "js/game.js", "test/a.test.js"] }), {
      decision: "deny",
      reason: "bad-files",
      scope: null
    });
    assert.deepEqual(runFeature({ files: [""] }), { decision: "deny", reason: "bad-files", scope: null });
    assert.deepEqual(runFeature({ files: [123] }), { decision: "deny", reason: "bad-files", scope: null });
    assert.deepEqual(runFeature({ files: ["/index.html"] }), { decision: "deny", reason: "bad-files", scope: null });
    assert.deepEqual(runFeature({ files: ["test//a.test.js"] }), { decision: "deny", reason: "bad-files", scope: null });
  });
  it("preserves input and echoes fresh scope", () => {
    const input = { files: ["index.html"] };
    const before = JSON.stringify(input);
    const out = runFeature(input);
    assert.equal(out.decision, "allow");
    assert.deepEqual(input, JSON.parse(before));
    assert.notEqual(out.scope.files, input.files);
    assert.deepEqual(runFeature(input), runFeature({ files: ["index.html"] }));
  });
});
