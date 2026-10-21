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


<!-- community-core:browser-save-gate -->
### Deterministic browser-local save gate for open edition play

Mirrors the open edition rule that gameplay and scores stay in this browser with local saves and no cloud leaderboard, SDK download or production deployment. It gives syntax checks, unit tests and docs a pure deterministic gate to accept small bounded store-plus-record descriptors and deny cloud or out-of-scope variants without filesystem, network, bind or clock state, keeping save validation separate from route, script and procedural gates.

Reusable deterministic JSON core: `js/community/browser_save_gate.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Exposes runFeature(payload) as a deterministic pure JSON function with no I/O, env, clock, randomness, callbacks, dependencies or filesystem access. Payload must be a non-null non-array object with keys subset of store and record. Returns an object literal with decision allow or deny, reason code string, saved object or null. Steps using for-of plus Object.entries and Map get/set without mutation and without variable-index access: if payload is not a non-null object or is an array return deny bad-payload with null saved; iterate Object.entries of payload and if any key is not store or record return deny unknown-field with null saved; if any string value contains colon-slash-slash or backslash or dotdot return deny bad-value with null saved; collect entries into a Map; store must be a string exactly browser-local via Map lookup else if missing or non-string return deny bad-store with null saved else return deny unknown-store with null saved; record must be a string exactly gameplay or score via Map lookup else if missing or non-string return deny bad-record with null saved else return deny unknown-record with null saved; on success return allow ok-local with saved object literal holding store and record. It preserves input, uses only object literals, arrays with push, and Maps, never reads regular-file state, bind address, storage, network, or clock; callers must still enforce browser-local saves, procedural canvas fallback with browser-generated sound, local serving on 127.0.0.1, and exclusion of cloud leaderboard, SDK download and production deployment.

Examples (JSON input and expected output):

```json
{
  "input": {
    "record": "gameplay",
    "store": "browser-local"
  },
  "output": {
    "decision": "allow",
    "reason": "ok-local",
    "saved": {
      "record": "gameplay",
      "store": "browser-local"
    }
  }
}
```

```json
{
  "input": {
    "record": "score",
    "store": "browser-local"
  },
  "output": {
    "decision": "allow",
    "reason": "ok-local",
    "saved": {
      "record": "score",
      "store": "browser-local"
    }
  }
}
```

```json
{
  "input": {
    "record": "score",
    "store": "cloud"
  },
  "output": {
    "decision": "deny",
    "reason": "unknown-store",
    "saved": null
  }
}
```

Public regression tests: `test/community_browser_save_gate.test.js`.


<!-- community-core:local-phase-gate -->
### Deterministic local phase gate for open edition checks

Mirrors the open edition rule that validation covers JavaScript syntax and local HTTP serving with a manual browser smoke check and no cloud. It gives syntax checks, unit tests and docs a pure deterministic gate to accept small bounded phase-plus-scope descriptors and deny out-of-scope variants without filesystem, network, bind or clock state, keeping check validation separate from route, save and procedural gates.

Reusable deterministic JSON core: `js/community/local_phase_gate.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Exposes runFeature(payload) as a deterministic pure JSON function with no I/O, env, clock, randomness, callbacks, dependencies or filesystem access. Payload must be a non-null non-array object with keys subset of phase and scope. Returns an object literal with decision allow or deny, reason code string, plan object or null. Steps using for-of plus Object.entries and Map get/set without mutation and without variable-index access: if payload is not a non-null object or is an array return deny bad-payload with null plan; iterate Object.entries of payload and if any key is not phase or scope return deny unknown-field with null plan; if any string value contains colon-slash-slash or backslash or dotdot return deny bad-value with null plan; collect entries into a Map; phase must be a string exactly check or test or start via Map lookup else if missing or non-string return deny bad-phase with null plan else return deny unknown-phase with null plan; scope must be a string exactly syntax or serve or smoke via Map lookup else if missing or non-string return deny bad-scope with null plan else return deny unknown-scope with null plan; enforce allowed pairing where check and test require syntax or serve and start requires smoke else return deny mismatch-scope with null plan; on success return allow ok-check with plan object literal holding phase and scope. It preserves input, uses only object literals, arrays with push, and Maps, never reads regular-file state, bind address, storage, network, clock, or Date; callers must still enforce JavaScript syntax validation, local HTTP serving on 127.0.0.1 with per-request lstat plus realpath containment, procedural canvas fallback with browser-generated sound, browser-local saves, and exclusion of cloud leaderboard, SDK download and production deployment.

Examples (JSON input and expected output):

```json
{
  "input": {
    "phase": "check",
    "scope": "syntax"
  },
  "output": {
    "decision": "allow",
    "plan": {
      "phase": "check",
      "scope": "syntax"
    },
    "reason": "ok-check"
  }
}
```

```json
{
  "input": {
    "phase": "start",
    "scope": "smoke"
  },
  "output": {
    "decision": "allow",
    "plan": {
      "phase": "start",
      "scope": "smoke"
    },
    "reason": "ok-check"
  }
}
```

```json
{
  "input": {
    "phase": "start",
    "scope": "syntax"
  },
  "output": {
    "decision": "deny",
    "plan": null,
    "reason": "mismatch-scope"
  }
}
```

Public regression tests: `test/community_local_phase_gate.test.js`.


<!-- community-core:procedural-asset-gate -->
### Deterministic procedural asset gate for open edition rendering

Mirrors the open edition rule that rendering uses the procedural canvas fallback and browser-generated sound while original images, 3D files, recorded voices and marketing material are excluded. It gives syntax checks, unit tests and docs a pure deterministic gate to accept small bounded asset-plus-source descriptors and deny excluded or out-of-scope variants without filesystem, network, bind or clock state, keeping asset validation separate from route, save and phase gates.

Reusable deterministic JSON core: `js/community/procedural_asset_gate.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Exposes runFeature(payload) as a deterministic pure JSON function with no I/O, env, clock, randomness, callbacks, dependencies or filesystem access. Payload must be a non-null non-array object with keys subset of asset and source. Returns an object literal with decision allow or deny, reason code string, render object or null. Steps using for-of plus Object.entries and Map get/set without mutation and without variable-index access: if payload is not a non-null object or is an array return deny bad-payload with null render; iterate Object.entries of payload and if any key is not asset or source return deny unknown-field with null render; if any string value contains colon-slash-slash or backslash or dotdot return deny bad-value with null render; collect entries into a Map; asset must be a string exactly canvas or sound via Map lookup else if missing or non-string return deny bad-asset with null render else return deny unknown-asset with null render; source must be a string exactly procedural or generated via Map lookup else if missing or non-string return deny bad-source with null render else return deny unknown-source with null render; enforce allowed pairing where canvas requires procedural and sound requires generated else return deny mismatch-source with null render; on success return allow ok-procedural with render object literal holding asset and source. It preserves input, uses only object literals, arrays with push, and Maps, never reads regular-file state, bind address, storage, network, or clock; callers must still enforce procedural canvas fallback with browser-generated sound, local serving on 127.0.0.1, browser-local saves, and exclusion of original images, 3D files, recorded voices, marketing material, cloud leaderboard, SDK download and production deployment.

Examples (JSON input and expected output):

```json
{
  "input": {
    "asset": "canvas",
    "source": "procedural"
  },
  "output": {
    "decision": "allow",
    "reason": "ok-procedural",
    "render": {
      "asset": "canvas",
      "source": "procedural"
    }
  }
}
```

```json
{
  "input": {
    "asset": "sound",
    "source": "generated"
  },
  "output": {
    "decision": "allow",
    "reason": "ok-procedural",
    "render": {
      "asset": "sound",
      "source": "generated"
    }
  }
}
```

```json
{
  "input": {
    "asset": "image",
    "source": "procedural"
  },
  "output": {
    "decision": "deny",
    "reason": "unknown-asset",
    "render": null
  }
}
```

Public regression tests: `test/community_procedural_asset_gate.test.js`.


<!-- community-core:loopback-bind-gate -->
### Deterministic loopback bind gate for open edition serving

Mirrors the open edition rule that the local server binds only to 127.0.0.1 and is opened at http://127.0.0.1:8080 with static serving only. It gives syntax checks, unit tests and docs a pure deterministic gate to accept small bounded host-plus-port descriptors and deny non-loopback or out-of-scope variants without filesystem, network, bind or clock state, keeping bind validation separate from route, save, phase and procedural gates.

Reusable deterministic JSON core: `js/community/loopback_bind_gate.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Exposes runFeature(payload) as a deterministic pure JSON function with no I/O, env, clock, randomness, callbacks, dependencies or filesystem access. Payload must be a non-null non-array object with keys subset of host and port. Returns an object literal with decision allow or deny, reason code string, binding object or null. Steps using for-of plus Object.entries and Map get/set without mutation and without variable-index access: if payload is not a non-null object or is an array return deny bad-payload with null binding; iterate Object.entries of payload and if any key is not host or port return deny unknown-field with null binding; if any string value contains colon-slash-slash or backslash or dotdot return deny bad-value with null binding; collect entries into a Map; host must be a string exactly 127.0.0.1 via Map lookup else if missing or non-string return deny bad-host with null binding else return deny unknown-host with null binding; port must be a number exactly 8080 via Map lookup else if missing or non-number return deny bad-port with null binding else return deny unknown-port with null binding; on success return allow ok-loopback with binding object literal holding host and port. It preserves input, uses only object literals, arrays with push, and Maps, never reads bind address, regular-file state, storage, network, or clock; callers must still enforce serving on 127.0.0.1 port 8080 with per-request lstat plus realpath containment, 404 without bytes for symlink traversal dotfile and private targets, 405 for non-GET/HEAD, procedural canvas fallback with browser-generated sound, browser-local saves, and exclusion of cloud leaderboard, SDK download and production deployment.

Examples (JSON input and expected output):

```json
{
  "input": {
    "host": "127.0.0.1",
    "port": 8080
  },
  "output": {
    "binding": {
      "host": "127.0.0.1",
      "port": 8080
    },
    "decision": "allow",
    "reason": "ok-loopback"
  }
}
```

```json
{
  "input": {
    "host": "0.0.0.0",
    "port": 8080
  },
  "output": {
    "binding": null,
    "decision": "deny",
    "reason": "unknown-host"
  }
}
```

```json
{
  "input": {
    "host": "127.0.0.1",
    "port": 3000
  },
  "output": {
    "binding": null,
    "decision": "deny",
    "reason": "unknown-port"
  }
}
```

Public regression tests: `test/community_loopback_bind_gate.test.js`.


<!-- community-core:static-containment-gate -->
### Deterministic static containment gate for open edition serving

Mirrors the open edition rule that static serving only serves regular files inside the repository root and returns 404 without bytes when any path component is a symlink or the resolved target escapes the root. It gives syntax checks, unit tests and docs a pure deterministic gate to accept small bounded entry-plus-zone descriptors and deny symlink or outside-root variants without filesystem, network, bind or clock state, keeping containment validation separate from route, save, phase and procedural gates.

Reusable deterministic JSON core: `js/community/static_containment_gate.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Exposes runFeature(payload) as a deterministic pure JSON function with no I/O, env, clock, randomness, callbacks, dependencies or filesystem access. Payload must be a non-null non-array object with keys subset of entry and zone. Returns an object literal with decision allow or deny, reason code string, containment object or null. Steps using for-of plus Object.entries and Map get/set without mutation and without variable-index access: if payload is not a non-null object or is an array return deny bad-payload with null containment; iterate Object.entries of payload and if any key is not entry or zone return deny unknown-field with null containment; if any string value contains colon-slash-slash or backslash or dotdot return deny bad-value with null containment; collect entries into a Map; entry must be a string exactly regular-file or symlink or escaping via Map lookup else if missing or non-string return deny bad-entry with null containment else return deny unknown-entry with null containment; zone must be a string exactly inside-root or outside-root via Map lookup else if missing or non-string return deny bad-zone with null containment else return deny unknown-zone with null containment; enforce allowed pairing where only regular-file with inside-root is allowed else return deny not-contained with null containment; on success return allow ok-contained with containment object literal holding entry and zone. It preserves input, uses only object literals, arrays with push, and Maps, never reads regular-file state, bind address, storage, network, or clock; callers must still enforce per-request lstat plus realpath containment with 404 without bytes for symlink traversal dotfile and private targets, 405 for non-GET/HEAD, bind 127.0.0.1, procedural canvas fallback with browser-generated sound, browser-local saves, and exclusion of cloud leaderboard, SDK download and production deployment.

Examples (JSON input and expected output):

```json
{
  "input": {
    "entry": "regular-file",
    "zone": "inside-root"
  },
  "output": {
    "containment": {
      "entry": "regular-file",
      "zone": "inside-root"
    },
    "decision": "allow",
    "reason": "ok-contained"
  }
}
```

```json
{
  "input": {
    "entry": "symlink",
    "zone": "inside-root"
  },
  "output": {
    "containment": null,
    "decision": "deny",
    "reason": "not-contained"
  }
}
```

```json
{
  "input": {
    "entry": "regular-file",
    "zone": "outside-root"
  },
  "output": {
    "containment": null,
    "decision": "deny",
    "reason": "not-contained"
  }
}
```

Public regression tests: `test/community_static_containment_gate.test.js`.


<!-- community-core:zero-install-gate -->
### Deterministic zero-install gate for open edition runs

Mirrors the open edition rule that no package installation or credentials are needed and runs use local Node.js with npm run check, test and start. It gives syntax checks, unit tests and docs a pure deterministic gate to accept small bounded dependency-plus-credential descriptors and deny install or secret variants without filesystem, network, bind or clock state, keeping setup validation separate from route, save, phase, procedural, bind and containment gates.

Reusable deterministic JSON core: `js/community/zero_install_gate.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Exposes runFeature(payload) as a deterministic pure JSON function with no I/O, env, clock, randomness, callbacks, dependencies or filesystem access. Payload must be a non-null non-array object with keys subset of dependency and credential. Returns an object literal with decision allow or deny, reason code string, setup object or null. Steps using for-of plus Object.entries and Map get/set without mutation and without variable-index access: if payload is not a non-null object or is an array return deny bad-payload with null setup; iterate Object.entries of payload and if any key is not dependency or credential return deny unknown-field with null setup; if any string value contains colon-slash-slash or backslash or dotdot return deny bad-value with null setup; collect entries into a Map; dependency must be a string exactly none via Map lookup else if missing or non-string return deny bad-dependency with null setup else return deny unknown-dependency with null setup; credential must be a string exactly none via Map lookup else if missing or non-string return deny bad-credential with null setup else return deny unknown-credential with null setup; on success return allow ok-zero with setup object literal holding dependency and credential. It preserves input, uses only object literals, arrays with push, and Maps, never reads regular-file state, bind address, storage, network, or clock; callers must still enforce Node.js 22 or later with no package installation or credentials, local serving on 127.0.0.1 port 8080 with per-request lstat plus realpath containment, procedural canvas fallback with browser-generated sound, browser-local saves, and exclusion of cloud leaderboard, SDK download and production deployment.

Examples (JSON input and expected output):

```json
{
  "input": {
    "credential": "none",
    "dependency": "none"
  },
  "output": {
    "decision": "allow",
    "reason": "ok-zero",
    "setup": {
      "credential": "none",
      "dependency": "none"
    }
  }
}
```

```json
{
  "input": {
    "credential": "none",
    "dependency": "install"
  },
  "output": {
    "decision": "deny",
    "reason": "unknown-dependency",
    "setup": null
  }
}
```

```json
{
  "input": {
    "credential": "token",
    "dependency": "none"
  },
  "output": {
    "decision": "deny",
    "reason": "unknown-credential",
    "setup": null
  }
}
```

Public regression tests: `test/community_zero_install_gate.test.js`.


<!-- community-core:private-origin-gate -->
### Deterministic private origin gate for open edition provenance

Mirrors the open edition rule that the private original and its history are preserved separately with code-only open sources and local saves. It gives syntax checks, unit tests and docs a pure deterministic gate to accept small bounded origin-plus-history descriptors and deny non-private or out-of-scope variants without filesystem, network, bind or clock state, keeping provenance validation separate from route, save, phase, procedural, bind, containment and zero-install gates.

Reusable deterministic JSON core: `js/community/private_origin_gate.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Exposes runFeature(payload) as a deterministic pure JSON function with no I/O, env, clock, randomness, callbacks, dependencies or filesystem access. Payload must be a non-null non-array object with keys subset of origin and history. Returns an object literal with decision allow or deny, reason code string, preserved object or null. Steps using for-of plus Object.entries and Map get/set without mutation and without variable-index access: if payload is not a non-null object or is an array return deny bad-payload with null preserved; iterate Object.entries of payload and if any key is not origin or history return deny unknown-field with null preserved; if any string value contains colon-slash-slash or backslash or dotdot return deny bad-value with null preserved; collect entries into a Map; origin must be a string exactly private via Map lookup else if missing or non-string return deny bad-origin with null preserved else return deny unknown-origin with null preserved; history must be a string exactly separate via Map lookup else if missing or non-string return deny bad-history with null preserved else return deny unknown-history with null preserved; on success return allow ok-preserved with preserved object literal holding origin and history. It preserves input, uses only object literals, arrays with push, and Maps, never reads regular-file state, bind address, storage, network, or clock; callers must still enforce private original preserved separately with code-only open edition, procedural canvas fallback with browser-generated sound, browser-local saves, local serving on 127.0.0.1 port 8080 with per-request lstat plus realpath containment, and exclusion of images, 3D files, recorded voices, marketing material, cloud leaderboard, SDK download and production deployment.

Examples (JSON input and expected output):

```json
{
  "input": {
    "history": "separate",
    "origin": "private"
  },
  "output": {
    "decision": "allow",
    "preserved": {
      "history": "separate",
      "origin": "private"
    },
    "reason": "ok-preserved"
  }
}
```

```json
{
  "input": {
    "history": "separate",
    "origin": "public"
  },
  "output": {
    "decision": "deny",
    "preserved": null,
    "reason": "unknown-origin"
  }
}
```

```json
{
  "input": {
    "history": "shared",
    "origin": "private"
  },
  "output": {
    "decision": "deny",
    "preserved": null,
    "reason": "unknown-history"
  }
}
```

Public regression tests: `test/community_private_origin_gate.test.js`.


<!-- community-core:node-engine-gate -->
### Deterministic Node engine gate for open edition runtime

Mirrors the open edition rule that execution requires Node.js 22 or later with no package installation. It gives syntax checks, unit tests and docs a pure deterministic gate to accept small bounded engine-plus-major descriptors and deny too-old, future or out-of-scope variants without filesystem, network, bind or clock state, keeping runtime validation separate from route, save, phase, procedural, bind, containment, zero-install and provenance gates.

Reusable deterministic JSON core: `js/community/node_engine_gate.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Exposes runFeature(payload) as a deterministic pure JSON function with no I/O, env, clock, randomness, callbacks, dependencies or filesystem access. Payload must be a non-null non-array object with keys subset of engine and major. Returns an object literal with decision allow or deny, reason code string, runtime object or null. Steps using for-of plus Object.entries and Map get/set without mutation and without variable-index access: if payload is not a non-null object or is an array return deny bad-payload with null runtime; iterate Object.entries of payload and if any key is not engine or major return deny unknown-field with null runtime; if any string value contains colon-slash-slash or backslash return deny bad-value with null runtime; collect entries into a Map; engine must be a string exactly node via Map lookup else if missing or non-string return deny bad-engine with null runtime else return deny unknown-engine with null runtime; major must be a number finite safe integer else if missing or non-number or non-integer or outside safe range return deny bad-major with null runtime; if major is less than 22 return deny too-old with null runtime; if major is greater than 48 return deny future-version with null runtime; on success return allow ok-engine with runtime object literal holding engine and major. It preserves input, uses only object literals, arrays with push, and Maps, never reads file state, bind address, storage, network, or clock; callers must still enforce Node.js 22 or later execution, zero package installation, browser-local saves, procedural canvas fallback with browser-generated sound, local serving on 127.0.0.1, and exclusion of cloud leaderboard, SDK download and production deployment.

Examples (JSON input and expected output):

```json
{
  "input": {
    "engine": "node",
    "major": 22
  },
  "output": {
    "decision": "allow",
    "reason": "ok-engine",
    "runtime": {
      "engine": "node",
      "major": 22
    }
  }
}
```

```json
{
  "input": {
    "engine": "node",
    "major": 24
  },
  "output": {
    "decision": "allow",
    "reason": "ok-engine",
    "runtime": {
      "engine": "node",
      "major": 24
    }
  }
}
```

```json
{
  "input": {
    "engine": "node",
    "major": 20
  },
  "output": {
    "decision": "deny",
    "reason": "too-old",
    "runtime": null
  }
}
```

Public regression tests: `test/community_node_engine_gate.test.js`.


<!-- community-core:local-status-code-gate -->
### Deterministic local HTTP status gate for open edition responses

Mirrors the open edition rule that local serving on 127.0.0.1 maps / to index.html plus js/ and css/ only, returns 404 without bytes for dotfile, traversal, symlink, escape, private and unknown targets and 405 for non-GET/HEAD. It gives syntax checks, unit tests and docs a pure deterministic gate to accept small bounded outcome-plus-detail descriptors and map them to 200, 404 or 405 without filesystem, network, bind or clock state, keeping status mapping separate from route, save, phase, procedural, bind, containment, zero-install and provenance gates.

Reusable deterministic JSON core: `js/community/local_status_code_gate.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Exposes runFeature(payload) as a deterministic pure JSON function with no I/O, env, clock, randomness, callbacks, dependencies or filesystem access. Payload must be a non-null non-array object with keys subset of outcome and detail. Returns an object literal with decision allow or deny, reason code string, status number or null. Steps using for-of plus Object.entries and Map get/set without mutation and without variable-index access: if payload is not a non-null object or is an array return deny bad-payload with null status; iterate Object.entries of payload and if any key is not outcome or detail return deny unknown-field with null status; if any string value contains colon-slash-slash or backslash or dotdot return deny bad-value with null status; collect entries into a Map; outcome must be a string exactly served or missing or rejected via Map lookup else if missing or non-string return deny bad-outcome with null status else return deny unknown-outcome with null status; detail must be a string exactly static or dotfile or traversal or symlink or escape or private or unknown or method via Map lookup else if missing or non-string return deny bad-detail with null status else return deny unknown-detail with null status; enforce pairing where served requires static and missing requires dotfile or traversal or symlink or escape or private or unknown and rejected requires method else return deny mismatch-detail with null status; on success if outcome is served return allow ok-serve with status 200, if outcome is missing return allow ok-missing with status 404, if outcome is rejected return allow ok-rejected with status 405. It preserves input, uses only object literals, arrays with push, and Maps, never reads regular-file state, bind address, storage, network, or clock; callers must still enforce per-request lstat plus realpath containment with 404 without bytes, 405 for non-GET/HEAD, 404 for symlink traversal dotfile and private targets, bind 127.0.0.1, procedural canvas fallback and browser-local saves, and exclusion of cloud leaderboard, SDK download and production deployment.

Examples (JSON input and expected output):

```json
{
  "input": {
    "detail": "static",
    "outcome": "served"
  },
  "output": {
    "decision": "allow",
    "reason": "ok-serve",
    "status": 200
  }
}
```

```json
{
  "input": {
    "detail": "traversal",
    "outcome": "missing"
  },
  "output": {
    "decision": "allow",
    "reason": "ok-missing",
    "status": 404
  }
}
```

```json
{
  "input": {
    "detail": "method",
    "outcome": "rejected"
  },
  "output": {
    "decision": "allow",
    "reason": "ok-rejected",
    "status": 405
  }
}
```

Public regression tests: `test/community_local_status_code_gate.test.js`.


<!-- community-core:local-body-policy-gate -->
### Deterministic local body policy gate for open edition responses

Mirrors the open edition rule that static serving returns 404 without sending target bytes for symlink, escape, dotfile, traversal, private and unknown targets and 405 for non-GET/HEAD while 200 serves bytes. It gives syntax checks, unit tests and docs a pure deterministic gate to accept small bounded status-plus-body descriptors and deny mismatched or out-of-scope variants without filesystem, network, bind or clock state, keeping body validation separate from route, save, phase, procedural, bind, containment, zero-install and provenance gates.

Reusable deterministic JSON core: `js/community/local_body_policy_gate.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Exposes runFeature(payload) as a deterministic pure JSON function with no I/O, env, clock, randomness, callbacks, dependencies or filesystem access. Payload must be a non-null non-array object with keys subset of status and body. Returns an object literal with decision allow or deny, reason code string, policy object or null. Steps using for-of plus Object.entries and Map get/set without mutation and without variable-index access: if payload is not a non-null object or is an array return deny bad-payload with null policy; iterate Object.entries of payload and if any key is not status or body return deny unknown-field with null policy; if any string value contains colon-slash-slash or backslash or dotdot return deny bad-value with null policy; collect entries into a Map; status must be a number finite safe integer exactly 200 or 404 or 405 via Map lookup else if missing or non-number or non-integer or outside safe range return deny bad-status with null policy else return deny unknown-status with null policy; body must be a string exactly empty or bytes via Map lookup else if missing or non-string return deny bad-body with null policy else return deny unknown-body with null policy; enforce pairing where 200 requires bytes and 404 requires empty and 405 requires empty else return deny mismatch-body with null policy; on success return allow ok-body with policy object literal holding status and body. It preserves input, uses only object literals, arrays with push, and Maps, never reads regular-file state, bind address, storage, network, or clock; callers must still enforce per-request lstat plus realpath containment with 404 without bytes, 405 for non-GET/HEAD, 404 for symlink traversal dotfile and private targets, bind 127.0.0.1, procedural canvas fallback and browser-local saves, and exclusion of cloud leaderboard, SDK download and production deployment.

Examples (JSON input and expected output):

```json
{
  "input": {
    "body": "bytes",
    "status": 200
  },
  "output": {
    "decision": "allow",
    "policy": {
      "body": "bytes",
      "status": 200
    },
    "reason": "ok-body"
  }
}
```

```json
{
  "input": {
    "body": "empty",
    "status": 404
  },
  "output": {
    "decision": "allow",
    "policy": {
      "body": "empty",
      "status": 404
    },
    "reason": "ok-body"
  }
}
```

```json
{
  "input": {
    "body": "bytes",
    "status": 404
  },
  "output": {
    "decision": "deny",
    "policy": null,
    "reason": "mismatch-body"
  }
}
```

Public regression tests: `test/community_local_body_policy_gate.test.js`.


<!-- community-core:containment-limit-gate -->
### Deterministic containment limit gate for open edition static checks

Mirrors the open edition limit that static containment is per-request lstat plus realpath containment and is not a sandbox or TOCTOU-proof guard, does not follow or audit link targets, denies symlinked assets even when the target is inside the root, and does not replace filesystem permissions. It gives syntax checks, unit tests and docs a pure deterministic gate to accept small bounded guard-plus-limit descriptors and deny overclaimed or out-of-scope variants without filesystem, network, bind or clock state, keeping limit acknowledgement separate from route, save, phase, procedural, bind, containment, zero-install and provenance gates.

Reusable deterministic JSON core: `js/community/containment_limit_gate.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Exposes runFeature(payload) as a deterministic pure JSON function with no I/O, env, clock, randomness, callbacks, dependencies or filesystem access. Payload must be a non-null non-array object with keys subset of guard and limit. Returns an object literal with decision allow or deny, reason code string, bounds object or null. Steps using for-of plus Object.entries and Map get/set without mutation and without variable-index access: if payload is not a non-null object or is an array return deny bad-payload with null bounds; iterate Object.entries of payload and if any key is not guard or limit return deny unknown-field with null bounds; if any string value contains colon-slash-slash or backslash or dotdot return deny bad-value with null bounds; collect entries into a Map; guard must be a string exactly lstat-realpath via Map lookup else if missing or non-string return deny bad-guard with null bounds else return deny unknown-guard with null bounds; limit must be a string via Map lookup among no-sandbox, no-toctou, no-follow, no-inside-symlink and no-permissions else if missing or non-string return deny bad-limit with null bounds else if limit is sandbox or toctou-proof or follow-targets or allow-inside-symlink or replace-permissions via Map lookup return deny overclaim-limit with null bounds else return deny unknown-limit with null bounds; on success return allow ok-limit with bounds object literal holding guard and limit. It preserves input, uses only object literals, arrays with push, and Maps, never reads regular-file state, bind address, storage, network, or clock; callers must still enforce per-request lstat plus realpath containment with 404 without bytes, 405 for non-GET/HEAD, 404 for symlink traversal dotfile and private targets, bind 127.0.0.1, procedural canvas fallback and browser-local saves, and exclusion of cloud leaderboard, SDK download and production deployment.

Examples (JSON input and expected output):

```json
{
  "input": {
    "guard": "lstat-realpath",
    "limit": "no-sandbox"
  },
  "output": {
    "bounds": {
      "guard": "lstat-realpath",
      "limit": "no-sandbox"
    },
    "decision": "allow",
    "reason": "ok-limit"
  }
}
```

```json
{
  "input": {
    "guard": "lstat-realpath",
    "limit": "no-follow"
  },
  "output": {
    "bounds": {
      "guard": "lstat-realpath",
      "limit": "no-follow"
    },
    "decision": "allow",
    "reason": "ok-limit"
  }
}
```

```json
{
  "input": {
    "guard": "lstat-realpath",
    "limit": "sandbox"
  },
  "output": {
    "bounds": null,
    "decision": "deny",
    "reason": "overclaim-limit"
  }
}
```

Public regression tests: `test/community_containment_limit_gate.test.js`.
