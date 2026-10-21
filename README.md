# starship-2050-open

Code-only open edition of the browser game, with complete gameplay source and local saves. Rendering uses the existing procedural canvas fallback and browser-generated sound. Original images, 3D files, recorded voices and marketing material are excluded because redistribution rights were not established.

Requires Node.js 22 or later. No package installation or credentials are needed.

```sh
npm run check
npm test
npm start
```

Open http://127.0.0.1:8080. Gameplay and scores stay in this browser; no cloud leaderboard, SDK download or production deployment is included. The private original and its history are preserved separately. See NOTICE.md.

Validation covers JavaScript syntax and local HTTP serving, including denied private paths and unsupported writes. The game was also opened and started manually in a browser with the procedural renderer. This is a smoke check, not exhaustive gameplay coverage.

Static serving (`/` to `index.html`, plus `js/` and `css/`) only serves regular files inside the repository root. If any path component is a symbolic link, or the resolved target escapes the root, `GET` and `HEAD` return `404` without sending target bytes. Dotfile segments, path traversal outside the root, and non-`GET`/`HEAD` methods (`405`) remain denied, and the server binds only to `127.0.0.1`.

Limits: the check is per-request `lstat` plus `realpath` containment, not a sandbox or TOCTOU-proof guard; it does not follow or audit link targets, does not allow symlinked assets even when the target is inside the root, and does not replace filesystem permissions. See `test/static_symlinks.test.js` for synthetic loopback fixtures.


<!-- community-core:static-route-gate -->
### Deterministic static route gate for open edition local serving

Mirrors the open edition rule that static serving maps / to index.html plus js/ and css/ only, binds 127.0.0.1, and denies dotfiles, traversal, symlinks, private paths and non-GET/HEAD. It gives syntax checks, unit tests and docs a pure deterministic gate to accept small bounded method-plus-target descriptors and deny oversized or out-of-scope variants without filesystem, network, bind or clock state, keeping route validation separate from save, script and procedural gates.

Reusable deterministic JSON core: `js/community/static_route_gate.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Exposes runFeature(payload) as a deterministic pure JSON function with no I/O, env, clock, randomness, callbacks, dependencies or filesystem access. Payload must be a non-null non-array object with keys subset of method and target. Returns an object literal with decision allow or deny, reason code string, route object or null. Steps using for-of plus Object.entries and Map get/set without mutation and without variable-index access: if payload is not a non-null object or is an array return deny bad-payload with null route; iterate Object.entries of payload and if any key is not method or target return deny unknown-field with null route; if any string value contains colon-slash-slash or backslash return deny bad-value with null route; collect entries into a Map; method must be a string exactly GET or HEAD via Map lookup else if missing or non-string return deny bad-method with null route else return deny unknown-method with null route; target must be a string starting with / else if missing or non-string or empty or not starting with / return deny bad-target with null route; if target contains // or target length exceeds 1 and ends with / return deny bad-target with null route; split target by / and iterate segments with for-of: if any segment equals dot or dotdot or includes dotdot return deny traversal with null route, if any segment starts with dot return deny dotfile with null route; if target is / or /index.html return allow ok-static with route object literal holding method and target; else target must start with /js/ or /css/ with exactly one filename segment else return deny unknown-target with null route; directory part must be js or css via Map lookup else deny unknown-target; filename must be non-empty and iterate characters with for-of allowing only A-Z a-z 0-9 dot hyphen underscore via Map lookup else deny bad-name with null route; js files must end with .js and css files must end with .css with non-empty basename else deny bad-name with null route; on success return allow ok-static with route object literal holding method and target. It preserves input, uses only object literals, arrays with push, and Maps, never reads regular-file state, bind address, storage, network, or clock; callers must still enforce per-request lstat plus realpath containment with 404 without bytes, 405 for non-GET/HEAD, 404 for symlink traversal dotfile and private targets, bind 127.0.0.1, procedural canvas fallback and browser-local saves, and exclusion of cloud leaderboard, SDK download and production deployment.

Examples (JSON input and expected output):

```json
{
  "input": {
    "method": "GET",
    "target": "/"
  },
  "output": {
    "decision": "allow",
    "reason": "ok-static",
    "route": {
      "method": "GET",
      "target": "/"
    }
  }
}
```

```json
{
  "input": {
    "method": "GET",
    "target": "/js/game.js"
  },
  "output": {
    "decision": "allow",
    "reason": "ok-static",
    "route": {
      "method": "GET",
      "target": "/js/game.js"
    }
  }
}
```

```json
{
  "input": {
    "method": "POST",
    "target": "/"
  },
  "output": {
    "decision": "deny",
    "reason": "unknown-method",
    "route": null
  }
}
```

Public regression tests: `test/community_static_route_gate.test.js`.
