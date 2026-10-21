import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../js/community/static_route_gate.mjs";

describe("static route gate", () => {
  it("GET / returns allow ok-static with echo route", () => {
    assert.deepEqual(runFeature({ method: "GET", target: "/" }), { decision: "allow", reason: "ok-static", route: { method: "GET", target: "/" } });
  });
  it("HEAD /index.html returns allow ok-static with echo route", () => {
    assert.deepEqual(runFeature({ method: "HEAD", target: "/index.html" }), { decision: "allow", reason: "ok-static", route: { method: "HEAD", target: "/index.html" } });
  });
  it("GET /js/game.js returns allow ok-static with echo route", () => {
    assert.deepEqual(runFeature({ method: "GET", target: "/js/game.js" }), { decision: "allow", reason: "ok-static", route: { method: "GET", target: "/js/game.js" } });
  });
  it("GET /css/style.css returns allow ok-static with echo route", () => {
    assert.deepEqual(runFeature({ method: "GET", target: "/css/style.css" }), { decision: "allow", reason: "ok-static", route: { method: "GET", target: "/css/style.css" } });
  });
  it("POST / returns deny unknown-method with null route", () => {
    assert.deepEqual(runFeature({ method: "POST", target: "/" }), { decision: "deny", reason: "unknown-method", route: null });
  });
  it("GET /../server.js returns deny traversal with null route", () => {
    assert.deepEqual(runFeature({ method: "GET", target: "/../server.js" }), { decision: "deny", reason: "traversal", route: null });
  });
  it("GET /.hidden returns deny dotfile with null route", () => {
    assert.deepEqual(runFeature({ method: "GET", target: "/.hidden" }), { decision: "deny", reason: "dotfile", route: null });
  });
  it("GET /server.js returns deny unknown-target with null route", () => {
    assert.deepEqual(runFeature({ method: "GET", target: "/server.js" }), { decision: "deny", reason: "unknown-target", route: null });
  });
  it("extra field returns deny unknown-field with null route", () => {
    assert.deepEqual(runFeature({ method: "GET", target: "/", extra: 1 }), { decision: "deny", reason: "unknown-field", route: null });
  });
  it("non-object payload returns deny bad-payload with null route", () => {
    assert.deepEqual(runFeature(null), { decision: "deny", reason: "bad-payload", route: null });
    assert.deepEqual(runFeature([1]), { decision: "deny", reason: "bad-payload", route: null });
    assert.deepEqual(runFeature("x"), { decision: "deny", reason: "bad-payload", route: null });
  });
  it("preserves input and stays deterministic", () => {
    const input = { method: "GET", target: "/js/game.js" };
    const first = runFeature(input);
    const second = runFeature({ method: "GET", target: "/js/game.js" });
    assert.deepEqual(input, { method: "GET", target: "/js/game.js" });
    assert.deepEqual(first, second);
  });
  it("rejects bad names and bad values", () => {
    assert.deepEqual(runFeature({ method: "GET", target: "/js/a!.js" }), { decision: "deny", reason: "bad-name", route: null });
    assert.deepEqual(runFeature({ method: "GET", target: "https://x/" }), { decision: "deny", reason: "bad-value", route: null });
  });
});
