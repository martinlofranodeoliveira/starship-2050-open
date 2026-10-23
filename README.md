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


<!-- community-core:local-port-gate -->
### Deterministic local port gate for open edition serving

Mirrors the open edition rule that the local game opens on loopback port 8080 with browser-local play and no cloud leaderboard. It gives syntax checks, unit tests and docs a pure deterministic gate to accept small bounded service-plus-port descriptors and deny cloud or out-of-scope variants without filesystem, network, bind or clock state, keeping port validation separate from route, save, phase, procedural, bind, containment, zero-install and provenance gates.

Reusable deterministic JSON core: `js/community/local_port_gate.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Exposes runFeature(payload) as a deterministic pure JSON function with no I/O, env, clock, randomness, callbacks, dependencies or filesystem access. Payload must be a non-null non-array object with keys subset of service and port. Returns an object literal with decision allow or deny, reason code string, endpoint object or null. Steps using for-of plus Object.entries and Map get/set without mutation and without variable-index access: if payload is not a non-null object or is an array return deny bad-payload with null endpoint; iterate Object.entries of payload and if any key is not service or port return deny unknown-field with null endpoint; if any string value contains colon-slash-slash or backslash or dotdot return deny bad-value with null endpoint; collect entries into a Map; service must be a string exactly serve via Map lookup else if missing or non-string return deny bad-service with null endpoint else return deny unknown-service with null endpoint; port must be a number finite safe integer exactly 8080 via Map lookup else if missing or non-number or non-integer or outside safe range return deny bad-port with null endpoint else return deny unknown-port with null endpoint; on success return allow ok-open with endpoint object literal holding service and port. It preserves input, uses only object literals, arrays with push, and Maps, never reads filesystem, network, bind, storage, or clock; callers must still enforce loopback local serving, procedural canvas fallback with browser-generated sound, browser-local saves, and exclusion of cloud leaderboard, SDK download and production deployment.

Examples (JSON input and expected output):

```json
{
  "input": {
    "port": 8080,
    "service": "serve"
  },
  "output": {
    "decision": "allow",
    "endpoint": {
      "port": 8080,
      "service": "serve"
    },
    "reason": "ok-open"
  }
}
```

```json
{
  "input": {
    "port": 3000,
    "service": "serve"
  },
  "output": {
    "decision": "deny",
    "endpoint": null,
    "reason": "unknown-port"
  }
}
```

```json
{
  "input": {
    "port": 8080,
    "service": "cloud"
  },
  "output": {
    "decision": "deny",
    "endpoint": null,
    "reason": "unknown-service"
  }
}
```

Public regression tests: `test/community_local_port_gate.test.js`.


<!-- community-core:excluded-offering-gate -->
### Deterministic excluded offering gate for open edition scope

Mirrors the open edition rule that gameplay stays local with no cloud leaderboard, SDK download or production deployment. It gives syntax checks, unit tests and docs a pure deterministic gate to accept small bounded offering-plus-availability descriptors that acknowledge exclusion and deny inclusion or cloud claims without filesystem, network, bind or clock state, keeping exclusion acknowledgement separate from route, save, phase, procedural, bind, containment, zero-install and provenance gates.

Reusable deterministic JSON core: `js/community/excluded_offering_gate.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Exposes runFeature(payload) as a deterministic pure JSON function with no I/O, env, clock, randomness, callbacks, dependencies or filesystem access. Payload must be a non-null non-array object with keys subset of offering and availability. Returns an object literal with decision allow or deny, reason code string, exclusion object or null. Steps using for-of plus Object.entries and Map get/set without mutation and without variable-index access: if payload is not a non-null object or is an array return deny bad-payload with null exclusion; iterate Object.entries of payload and if any key is not offering or availability return deny unknown-field with null exclusion; if any string value contains colon-slash-slash or backslash or dotdot return deny bad-value with null exclusion; collect entries into a Map; offering must be a string exactly leaderboard or sdk or production via Map lookup else if missing or non-string return deny bad-offering with null exclusion else return deny unknown-offering with null exclusion; availability must be a string exactly excluded via Map lookup else if missing or non-string return deny bad-availability with null exclusion else if availability is included or cloud or live or deployed via Map lookup return deny overclaim-availability with null exclusion else return deny unknown-availability with null exclusion; on success return allow ok-excluded with exclusion object literal holding offering and availability. It preserves input, uses only object literals, arrays with push, and Maps, never reads regular-file state, bind address, storage, network, or clock; callers must still enforce browser-local gameplay and scores, procedural canvas fallback with browser-generated sound, local serving on 127.0.0.1 port 8080 with per-request lstat plus realpath containment, and exclusion of cloud leaderboard, SDK download and production deployment.

Examples (JSON input and expected output):

```json
{
  "input": {
    "availability": "excluded",
    "offering": "leaderboard"
  },
  "output": {
    "decision": "allow",
    "exclusion": {
      "availability": "excluded",
      "offering": "leaderboard"
    },
    "reason": "ok-excluded"
  }
}
```

```json
{
  "input": {
    "availability": "excluded",
    "offering": "sdk"
  },
  "output": {
    "decision": "allow",
    "exclusion": {
      "availability": "excluded",
      "offering": "sdk"
    },
    "reason": "ok-excluded"
  }
}
```

```json
{
  "input": {
    "availability": "included",
    "offering": "production"
  },
  "output": {
    "decision": "deny",
    "exclusion": null,
    "reason": "overclaim-availability"
  }
}
```

Public regression tests: `test/community_excluded_offering_gate.test.js`.


<!-- community-core:serve-denial-case-gate -->
### Deterministic serve denial case gate for open edition validation

Mirrors the open edition validation rule that local HTTP serving coverage includes denied private paths and unsupported writes plus dotfile, traversal, symlink and outside-root denials with smoke-checked procedural serving. It gives syntax checks, unit tests and docs a pure deterministic gate to accept small bounded validation-plus-case descriptors and deny out-of-scope variants without filesystem, network, bind or clock state, keeping denial-case acknowledgement separate from route, save, phase, procedural, bind, containment, zero-install and provenance gates.

Reusable deterministic JSON core: `js/community/serve_denial_case_gate.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Exposes runFeature(payload) as a deterministic pure JSON function with no I/O, env, clock, randomness, callbacks, dependencies or filesystem access. Payload must be a non-null non-array object with keys subset of validation and case. Returns an object literal with decision allow or deny, reason code string, coverage object or null. Steps using for-of plus Object.entries and Map get/set without mutation and without variable-index access: if payload is not a non-null object or is an array return deny bad-payload with null coverage; iterate Object.entries of payload and if any key is not validation or case return deny unknown-field with null coverage; if any string value contains colon-slash-slash or backslash or dotdot return deny bad-value with null coverage; collect entries into a Map; validation must be a string exactly serve via Map lookup else if missing or non-string return deny bad-validation with null coverage else return deny unknown-validation with null coverage; case must be a string via Map lookup among private-path, write-method, dotfile, traversal, symlink and outside-root else if missing or non-string return deny bad-case with null coverage else return deny unknown-case with null coverage; on success return allow ok-serve with coverage object literal holding validation and case. It preserves input, uses only object literals, arrays with push, and Maps, never reads regular-file state, bind address, storage, network, or clock; callers must still enforce per-request lstat plus realpath containment with 404 without bytes, 405 for non-GET/HEAD, 404 for symlink traversal dotfile and private targets, bind 127.0.0.1, procedural canvas fallback and browser-local saves, and exclusion of cloud leaderboard, SDK download and production deployment.

Examples (JSON input and expected output):

```json
{
  "input": {
    "case": "private-path",
    "validation": "serve"
  },
  "output": {
    "coverage": {
      "case": "private-path",
      "validation": "serve"
    },
    "decision": "allow",
    "reason": "ok-serve"
  }
}
```

```json
{
  "input": {
    "case": "write-method",
    "validation": "serve"
  },
  "output": {
    "coverage": {
      "case": "write-method",
      "validation": "serve"
    },
    "decision": "allow",
    "reason": "ok-serve"
  }
}
```

```json
{
  "input": {
    "case": "private-path",
    "validation": "syntax"
  },
  "output": {
    "coverage": null,
    "decision": "deny",
    "reason": "unknown-validation"
  }
}
```

Public regression tests: `test/community_serve_denial_case_gate.test.js`.


<!-- community-core:smoke-coverage-limit-gate -->
### Deterministic smoke coverage limit gate for open edition validation

Mirrors the open edition rule that validation is a manual browser smoke check with the procedural renderer, not exhaustive gameplay coverage. It gives syntax checks, unit tests and docs a pure deterministic gate to accept small bounded assurance-plus-extent descriptors and deny exhaustive or out-of-scope claims without filesystem, network, bind or clock state, keeping coverage-limit validation separate from route, save, phase, procedural, port, exclusion and denial-case gates.

Reusable deterministic JSON core: `js/community/smoke_coverage_limit_gate.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Exposes runFeature(payload) as a deterministic pure JSON function with no I/O, env, clock, randomness, callbacks, dependencies or filesystem access. Payload must be a non-null non-array object with keys subset of assurance and extent. Returns an object literal with decision allow or deny, reason code string, bound object or null. Steps using for-of plus Object.entries and Map get/set without mutation and without variable-index access: if payload is not a non-null object or is an array return deny bad-payload with null bound; iterate Object.entries of payload and if any key is not assurance or extent return deny unknown-field with null bound; if any string value contains colon-slash-slash or backslash or dotdot return deny bad-value with null bound; collect entries into a Map; assurance must be a string exactly smoke via Map lookup else if missing or non-string return deny bad-assurance with null bound else return deny unknown-assurance with null bound; extent must be a string exactly limited via Map lookup else if missing or non-string return deny bad-extent with null bound else if extent is exhaustive or full or complete via Map lookup return deny overclaim-extent with null bound else return deny unknown-extent with null bound; on success return allow ok-smoke with bound object literal holding assurance and extent. It preserves input, uses only object literals, arrays with push, and Maps, never reads filesystem, network, bind, storage, or clock and never uses Date; callers must still enforce JavaScript syntax validation, local HTTP serving with denied private paths and unsupported writes, manual browser opening with procedural canvas fallback and browser-generated sound, browser-local gameplay and scores, and exclusion of cloud leaderboard, SDK download and production deployment while treating validation as smoke-only not exhaustive.

Examples (JSON input and expected output):

```json
{
  "input": {
    "assurance": "smoke",
    "extent": "limited"
  },
  "output": {
    "bound": {
      "assurance": "smoke",
      "extent": "limited"
    },
    "decision": "allow",
    "reason": "ok-smoke"
  }
}
```

```json
{
  "input": {
    "assurance": "smoke",
    "extent": "exhaustive"
  },
  "output": {
    "bound": null,
    "decision": "deny",
    "reason": "overclaim-extent"
  }
}
```

```json
{
  "input": {
    "assurance": "manual",
    "extent": "limited"
  },
  "output": {
    "bound": null,
    "decision": "deny",
    "reason": "unknown-assurance"
  }
}
```

Public regression tests: `test/community_smoke_coverage_limit_gate.test.js`.


<!-- community-core:local-command-gate -->
### Deterministic local command gate for open edition checks

Mirrors the open edition rule that local validation uses npm run check, npm test and npm start with Node 22 and no package installation or credentials. It gives syntax checks, unit tests and docs a pure deterministic gate to accept small bounded runner-plus-script descriptors and deny installer or out-of-scope variants without processes, filesystem, network, bind or clock state, keeping command validation separate from route, save, phase, procedural, containment, status and exclusion gates.

Reusable deterministic JSON core: `js/community/local_command_gate.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Exposes runFeature(payload) as a deterministic pure JSON function with no I/O, env, clock, randomness, callbacks, dependencies or filesystem access. Payload must be a non-null non-array object with keys subset of runner and script. Returns an object literal with decision allow or deny, reason code string, command object or null. Steps using for-of plus Object.entries and Map get/set without mutation and without variable-index access: if payload is not a non-null object or is an array return deny bad-payload with null command; iterate Object.entries of payload and if any key is not runner or script return deny unknown-field with null command; if any string value contains colon-slash-slash or backslash or dotdot return deny bad-value with null command; collect entries into a Map; runner must be a string exactly npm via Map lookup else if missing or non-string return deny bad-runner with null command else return deny unknown-runner with null command; script must be a string exactly check or test or start via Map lookup else if missing or non-string return deny bad-script with null command else return deny unknown-script with null command; on success return allow ok-command with command object literal holding runner and script. It preserves input, uses only object literals, arrays with push, and Maps, never reads filesystem, processes, network, bind, storage, or clock and never uses Date; callers must still enforce Node 22 execution, no package installation or credentials, local serving on 127.0.0.1 with procedural canvas fallback and browser-local saves, and exclusion of cloud leaderboard, SDK download and production deployment; application and UI integration is outside this change.

Examples (JSON input and expected output):

```json
{
  "input": {
    "runner": "npm",
    "script": "check"
  },
  "output": {
    "command": {
      "runner": "npm",
      "script": "check"
    },
    "decision": "allow",
    "reason": "ok-command"
  }
}
```

```json
{
  "input": {
    "runner": "npm",
    "script": "start"
  },
  "output": {
    "command": {
      "runner": "npm",
      "script": "start"
    },
    "decision": "allow",
    "reason": "ok-command"
  }
}
```

```json
{
  "input": {
    "runner": "npm",
    "script": "deploy"
  },
  "output": {
    "command": null,
    "decision": "deny",
    "reason": "unknown-script"
  }
}
```

Public regression tests: `test/community_local_command_gate.test.js`.


<!-- community-core:open-content-boundary-gate -->
### Deterministic code-only content boundary gate for open edition scope

Mirrors the open edition code-only rule that gameplay source, procedural fallback and browser-local saves are included while original images, 3D files, recorded voices and marketing material are excluded for unestablished redistribution rights. It gives syntax checks, unit tests and docs a pure deterministic gate to accept small bounded content-plus-basis descriptors and deny excluded or out-of-scope variants without filesystem, network, bind or clock state, keeping content-boundary validation separate from route, save, phase, procedural, containment, status, bind and exclusion gates.

Reusable deterministic JSON core: `js/community/open_content_boundary_gate.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Exposes runFeature(payload) as a deterministic pure JSON function with no I/O, env, clock, randomness, callbacks, dependencies or filesystem access. Payload must be a non-null non-array object with keys subset of content and basis. Returns an object literal with decision allow or deny, reason code string, boundary object or null. Steps using for-of plus Object.entries and Map get/set without mutation and without variable-index access: if payload is not a non-null object or is an array return deny bad-payload with null boundary; iterate Object.entries of payload and if any key is not content or basis return deny unknown-field with null boundary; if any string value contains colon-slash-slash or backslash or dotdot return deny bad-value with null boundary; collect entries into a Map; content must be a string via Map lookup among gameplay-source, procedural-fallback and local-save else if missing or non-string return deny bad-content with null boundary; if content is not in the allowed set but is in the excluded set of image, model-3d, recorded-voice and marketing-material via Map lookup return deny excluded-material with null boundary; if content is neither allowed nor excluded return deny unknown-content with null boundary; basis must be a string exactly code-only via Map lookup else if missing or non-string return deny bad-basis with null boundary else return deny unknown-basis with null boundary; on success return allow ok-code-only with boundary object literal holding content and basis. It preserves input, uses only object literals, arrays with push, and Maps, never reads regular-file state, bind address, storage, network, or clock and never uses Date; callers must still enforce code-only inclusion with procedural canvas fallback and browser-generated sound, browser-local saves, local serving on 127.0.0.1, per-request lstat plus realpath containment, and exclusion of original images, 3D files, recorded voices, marketing material, cloud leaderboard, SDK download and production deployment.

Examples (JSON input and expected output):

```json
{
  "input": {
    "basis": "code-only",
    "content": "gameplay-source"
  },
  "output": {
    "boundary": {
      "basis": "code-only",
      "content": "gameplay-source"
    },
    "decision": "allow",
    "reason": "ok-code-only"
  }
}
```

```json
{
  "input": {
    "basis": "code-only",
    "content": "image"
  },
  "output": {
    "boundary": null,
    "decision": "deny",
    "reason": "excluded-material"
  }
}
```

```json
{
  "input": {
    "basis": "cloud",
    "content": "gameplay-source"
  },
  "output": {
    "boundary": null,
    "decision": "deny",
    "reason": "unknown-basis"
  }
}
```

Public regression tests: `test/community_open_content_boundary_gate.test.js`.


<!-- community-core:synthetic-fixture-gate -->
### Deterministic synthetic fixture gate for loopback symlink tests

Mirrors the open edition limit that symlink and traversal checks use per-request lstat plus realpath containment with synthetic loopback fixtures and no sandbox or TOCTOU guarantees. It gives syntax checks, unit tests and docs a pure deterministic gate to accept small bounded fixture-plus-network descriptors and deny out-of-scope variants without filesystem, network, bind or clock state, keeping fixture validation separate from route, save, phase, procedural, containment, status, bind and exclusion gates.

Reusable deterministic JSON core: `js/community/synthetic_fixture_gate.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Exposes runFeature(payload) as a deterministic pure JSON function with no I/O, env, clock, randomness, callbacks, dependencies or filesystem access. Payload must be a non-null non-array object with keys subset of fixture and network. Returns an object literal with decision allow or deny, reason code string, setup object or null. Steps using for-of plus Object.entries and Map get/set without mutation and without variable-index access: if payload is not a non-null object or is an array return deny bad-payload with null setup; iterate Object.entries of payload and if any key is not fixture or network return deny unknown-field with null setup; if any string value contains colon-slash-slash or backslash or dotdot return deny bad-value with null setup; collect entries into a Map; fixture must be a string exactly symlink-loop or traversal-probe or dotfile-probe via Map lookup else if missing or non-string return deny bad-fixture with null setup else return deny unknown-fixture with null setup; network must be a string exactly loopback via Map lookup else if missing or non-string return deny bad-network with null setup else return deny unknown-network with null setup; on success return allow ok-synthetic with setup object literal holding fixture and network. It preserves input, uses only object literals, arrays with push, and Maps, never reads regular-file state, bind address, storage, network, or clock and never uses Date; callers must still enforce per-request lstat plus realpath containment with 404 without bytes, 405 for non-GET/HEAD, bind 127.0.0.1, procedural canvas fallback with browser-generated sound, browser-local saves, and exclusion of cloud leaderboard, SDK download and production deployment; application and UI integration is outside this change.

Examples (JSON input and expected output):

```json
{
  "input": {
    "fixture": "symlink-loop",
    "network": "loopback"
  },
  "output": {
    "decision": "allow",
    "reason": "ok-synthetic",
    "setup": {
      "fixture": "symlink-loop",
      "network": "loopback"
    }
  }
}
```

```json
{
  "input": {
    "fixture": "traversal-probe",
    "network": "loopback"
  },
  "output": {
    "decision": "allow",
    "reason": "ok-synthetic",
    "setup": {
      "fixture": "traversal-probe",
      "network": "loopback"
    }
  }
}
```

```json
{
  "input": {
    "fixture": "symlink-loop",
    "network": "cloud"
  },
  "output": {
    "decision": "deny",
    "reason": "unknown-network",
    "setup": null
  }
}
```

Public regression tests: `test/community_synthetic_fixture_gate.test.js`.


<!-- community-core:excluded-media-rights-gate -->
### Deterministic excluded-media rights gate for open edition assets

Mirrors the open edition rule that original images, 3D files, recorded voices and marketing material are excluded because redistribution rights were not established while rendering uses procedural canvas fallback and browser-generated sound. It gives syntax checks, unit tests and docs a pure deterministic gate to accept small bounded media-plus-rights descriptors and deny out-of-scope variants without filesystem, network, bind or clock state, keeping media-rights validation separate from route, save, phase, procedural, containment, status, bind, offering and fixture gates.

Reusable deterministic JSON core: `js/community/excluded_media_rights_gate.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Exposes runFeature(payload) as a deterministic pure JSON function with no I/O, env, clock, randomness, callbacks, dependencies or filesystem access. Payload must be a non-null non-array object with keys subset of media and rights. Returns an object literal with decision allow or deny, reason code string, ruling object or null. Steps using for-of plus Object.entries and Map get/set without mutation and without variable-index access: if payload is not a non-null object or is an array return deny bad-payload with null ruling; iterate Object.entries of payload and if any key is not media or rights return deny unknown-field with null ruling; if any string value contains colon-slash-slash or backslash or dotdot return deny bad-value with null ruling; collect entries into a Map; media must be a string exactly image or model-3d or voice or marketing via Map lookup else if missing or non-string return deny bad-media with null ruling else return deny unknown-media with null ruling; rights must be a string exactly unestablished via Map lookup else if missing or non-string return deny bad-rights with null ruling else return deny unknown-rights with null ruling; on success return allow ok-excluded with ruling object literal holding media and rights. It preserves input, uses only object literals, arrays with push, and Maps, never reads regular-file state, bind address, storage, network, or clock and never uses Date; callers must still enforce exclusion of original images, 3D files, recorded voices and marketing material with procedural canvas fallback and browser-generated sound, browser-local saves, local serving on 127.0.0.1, per-request lstat plus realpath containment, and exclusion of cloud leaderboard, SDK download and production deployment; application and UI integration is outside this change.

Examples (JSON input and expected output):

```json
{
  "input": {
    "media": "image",
    "rights": "unestablished"
  },
  "output": {
    "decision": "allow",
    "reason": "ok-excluded",
    "ruling": {
      "media": "image",
      "rights": "unestablished"
    }
  }
}
```

```json
{
  "input": {
    "media": "marketing",
    "rights": "unestablished"
  },
  "output": {
    "decision": "allow",
    "reason": "ok-excluded",
    "ruling": {
      "media": "marketing",
      "rights": "unestablished"
    }
  }
}
```

```json
{
  "input": {
    "media": "voice",
    "rights": "granted"
  },
  "output": {
    "decision": "deny",
    "reason": "unknown-rights",
    "ruling": null
  }
}
```

Public regression tests: `test/community_excluded_media_rights_gate.test.js`.


<!-- community-core:regular-file-site-gate -->
### Deterministic regular-file site gate for open edition serving

Mirrors the open edition rule that static serving only serves regular files inside the repository root and denies symlinked or outside targets. It gives syntax checks, unit tests and docs a pure deterministic gate to accept small bounded kind-plus-site descriptors and deny non-regular or outside variants without filesystem, network, bind or clock state, keeping file-kind validation separate from route, save, phase, procedural, containment, status, bind, port, offering and fixture gates.

Reusable deterministic JSON core: `js/community/regular_file_site_gate.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Exposes runFeature(payload) as a deterministic pure JSON function with no I/O, env, clock, randomness, callbacks, dependencies or filesystem access. Payload must be a non-null non-array object with keys subset of kind and site. Returns an object literal with decision allow or deny, reason code string, entry object or null. Steps using for-of plus Object.entries and Map get/set without mutation and without variable-index access: if payload is not a non-null object or is an array return deny bad-payload with null entry; iterate Object.entries of payload and if any key is not kind or site return deny unknown-field with null entry; if any string value contains colon-slash-slash or backslash or dotdot return deny bad-value with null entry; collect entries into a Map; kind must be a string exactly regular or directory or symlink via Map lookup else if missing or non-string return deny bad-kind with null entry else return deny unknown-kind with null entry; site must be a string exactly inside or outside via Map lookup else if missing or non-string return deny bad-site with null entry else return deny unknown-site with null entry; enforce allowed pairing where only kind regular with site inside is allowed else return deny mismatch-file with null entry; on success return allow ok-file with entry object literal holding kind and site. It preserves input, uses only object literals, arrays with push, and Maps, never reads regular-file state, bind address, storage, network, or clock and never uses Date; callers must still enforce per-request lstat plus realpath containment with 404 without bytes for symlinks and outside-root targets, 405 for non-GET/HEAD, 404 for traversal dotfile and private targets, bind 127.0.0.1, procedural canvas fallback with browser-generated sound, browser-local saves, and exclusion of cloud leaderboard, SDK download and production deployment; application and UI integration is outside this change.

Examples (JSON input and expected output):

```json
{
  "input": {
    "kind": "regular",
    "site": "inside"
  },
  "output": {
    "decision": "allow",
    "entry": {
      "kind": "regular",
      "site": "inside"
    },
    "reason": "ok-file"
  }
}
```

```json
{
  "input": {
    "kind": "symlink",
    "site": "inside"
  },
  "output": {
    "decision": "deny",
    "entry": null,
    "reason": "mismatch-file"
  }
}
```

```json
{
  "input": {
    "kind": "regular",
    "site": "outside"
  },
  "output": {
    "decision": "deny",
    "entry": null,
    "reason": "mismatch-file"
  }
}
```

Public regression tests: `test/community_regular_file_site_gate.test.js`.


<!-- community-core:manual-smoke-step-gate -->
### Deterministic manual smoke step gate for open edition browser check

Mirrors the open edition rule that the game was opened and started manually in a browser with the procedural renderer as a smoke check, not exhaustive gameplay coverage. It gives syntax checks, unit tests and docs a pure deterministic gate to accept small bounded manual actor-plus-step descriptors and deny automated or out-of-scope variants without filesystem, network, bind or clock state, keeping manual-smoke validation separate from route, save, phase, procedural, containment, status, bind, offering and fixture gates.

Reusable deterministic JSON core: `js/community/manual_smoke_step_gate.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Exposes runFeature(payload) as a deterministic pure JSON function with no I/O, env, clock, randomness, callbacks, dependencies or filesystem access. Payload must be a non-null non-array object with keys subset of actor and step. Returns an object literal with decision allow or deny, reason code string, smoke object or null. Steps using for-of plus Object.entries and Map get/set without mutation and without variable-index access: if payload is not a non-null object or is an array return deny bad-payload with null smoke; iterate Object.entries of payload and if any key is not actor or step return deny unknown-field with null smoke; if any string value contains colon-slash-slash or backslash or dotdot return deny bad-value with null smoke; collect entries into a Map; actor must be a string exactly manual via Map lookup else if missing or non-string return deny bad-actor with null smoke else return deny unknown-actor with null smoke; step must be a string exactly open or start via Map lookup else if missing or non-string return deny bad-step with null smoke else return deny unknown-step with null smoke; on success return allow ok-manual with smoke object literal holding actor and step. It preserves input, uses only object literals, arrays with push, and Maps, never reads regular-file state, bind address, storage, network, or clock and never uses Date; callers must still enforce manual browser open and start with procedural canvas fallback and browser-generated sound, smoke check not exhaustive gameplay coverage, local HTTP serving on 127.0.0.1 with per-request lstat plus realpath containment and 404 without bytes, 405 for non-GET/HEAD, browser-local saves, and exclusion of cloud leaderboard, SDK download and production deployment; application and UI integration is outside this change.

Examples (JSON input and expected output):

```json
{
  "input": {
    "actor": "manual",
    "step": "open"
  },
  "output": {
    "decision": "allow",
    "reason": "ok-manual",
    "smoke": {
      "actor": "manual",
      "step": "open"
    }
  }
}
```

```json
{
  "input": {
    "actor": "manual",
    "step": "start"
  },
  "output": {
    "decision": "allow",
    "reason": "ok-manual",
    "smoke": {
      "actor": "manual",
      "step": "start"
    }
  }
}
```

```json
{
  "input": {
    "actor": "manual",
    "step": "serve"
  },
  "output": {
    "decision": "deny",
    "reason": "unknown-step",
    "smoke": null
  }
}
```

Public regression tests: `test/community_manual_smoke_step_gate.test.js`.


<!-- community-core:symlink-component-policy-gate -->
### Deterministic symlink component policy gate for open edition serving

Mirrors the open edition rule that static serving only serves regular files inside the repository root, denies any symlink path component even when the resolved target stays inside the root, and returns 404 without target bytes when the target escapes the root. It gives syntax checks, unit tests and docs a pure deterministic gate to accept small bounded component-plus-placement descriptors and deny symlink or outside variants without filesystem, network, bind or clock state, keeping component validation separate from route, save, phase, procedural, containment, status, bind, port, offering and fixture gates.

Reusable deterministic JSON core: `js/community/symlink_component_policy_gate.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Exposes runFeature(payload) as a deterministic pure JSON function with no I/O, env, clock, randomness, callbacks, dependencies or filesystem access and never uses Date. Payload must be a non-null non-array object with keys subset of component and placement. Returns an object literal with decision allow or deny, reason code string, policy object or null. Steps using for-of plus Object.entries and Map get/set without mutation and without variable-index access: if payload is not a non-null object or is an array return deny bad-payload with null policy; iterate Object.entries of payload and if any key is not component or placement return deny unknown-field with null policy; if any string value contains colon-slash-slash or backslash or dotdot return deny bad-value with null policy; collect entries into a Map; component must be a string exactly regular or symlink via Map lookup else if missing or non-string return deny bad-component with null policy else return deny unknown-component with null policy; placement must be a string exactly inside or outside via Map lookup else if missing or non-string return deny bad-placement with null policy else return deny unknown-placement with null policy; if placement is outside return deny outside-root with null policy; if component is symlink return deny symlink-denied with null policy; on success return allow ok-regular with policy object literal holding component and placement. It preserves input, uses only object literals, arrays with push, and Maps, never reads regular-file state, bind address, storage, network, or clock; callers must still enforce per-request lstat plus realpath containment with 404 without bytes, 405 for non-GET/HEAD, 404 for traversal dotfile symlink and private targets, bind 127.0.0.1, procedural canvas fallback with browser-generated sound, browser-local saves, and exclusion of cloud leaderboard, SDK download and production deployment; application and UI integration is outside this change.

Examples (JSON input and expected output):

```json
{
  "input": {
    "component": "regular",
    "placement": "inside"
  },
  "output": {
    "decision": "allow",
    "policy": {
      "component": "regular",
      "placement": "inside"
    },
    "reason": "ok-regular"
  }
}
```

```json
{
  "input": {
    "component": "symlink",
    "placement": "inside"
  },
  "output": {
    "decision": "deny",
    "policy": null,
    "reason": "symlink-denied"
  }
}
```

```json
{
  "input": {
    "component": "regular",
    "placement": "outside"
  },
  "output": {
    "decision": "deny",
    "policy": null,
    "reason": "outside-root"
  }
}
```

Public regression tests: `test/community_symlink_component_policy_gate.test.js`.


<!-- community-core:credential-absence-gate -->
### Deterministic credential-absence gate for open edition local use

Mirrors the open edition rule that no package installation or credentials are needed for Node 22 local serving. It gives syntax checks, unit tests and docs a pure deterministic gate to accept credential-free descriptors and deny credentialed variants without env, network or secrets, keeping credential validation separate from install, engine, route, save, phase, procedural, containment, status, bind, offering and fixture gates.

Reusable deterministic JSON core: `js/community/credential_absence_gate.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Exposes runFeature(payload) as a deterministic pure JSON function with no I/O, env, clock, randomness, callbacks, dependencies or filesystem access and never uses Date. Payload must be a non-null non-array object with keys subset of credential and handling. Returns an object literal with decision allow or deny, reason code string, absence object or null. Steps using for-of plus Object.entries and Map get/set without mutation and without variable-index access: if payload is not a non-null object or is an array return deny bad-payload with null absence; iterate Object.entries of payload and if any key is not credential or handling return deny unknown-field with null absence; if any string value contains colon-slash-slash or backslash or dotdot return deny bad-value with null absence; collect entries into a Map; credential must be a string exactly none via Map lookup else if missing or non-string return deny bad-credential with null absence else return deny unknown-credential with null absence; handling must be a string exactly absent via Map lookup else if missing or non-string return deny bad-handling with null absence else return deny unknown-handling with null absence; on success return allow ok-absent with absence object literal holding credential and handling. It preserves input, uses only object literals, arrays with push, and Maps, never reads regular-file state, bind address, storage, network, or clock; callers must still enforce zero package installation with no credentials in env or files, Node 22 or later, per-request lstat plus realpath containment with 404 without bytes, 405 for non-GET/HEAD, 404 for traversal dotfile symlink and private targets, bind 127.0.0.1:8080, procedural canvas fallback with browser-generated sound, browser-local saves, and exclusion of cloud leaderboard, SDK download and production deployment; application and UI integration is outside this change.

Examples (JSON input and expected output):

```json
{
  "input": {
    "credential": "none",
    "handling": "absent"
  },
  "output": {
    "absence": {
      "credential": "none",
      "handling": "absent"
    },
    "decision": "allow",
    "reason": "ok-absent"
  }
}
```

```json
{
  "input": {
    "credential": "token",
    "handling": "absent"
  },
  "output": {
    "absence": null,
    "decision": "deny",
    "reason": "unknown-credential"
  }
}
```

```json
{
  "input": {
    "credential": "none",
    "handling": "required"
  },
  "output": {
    "absence": null,
    "decision": "deny",
    "reason": "unknown-handling"
  }
}
```

Public regression tests: `test/community_credential_absence_gate.test.js`.


<!-- community-core:code-only-artifact-gate -->
### Deterministic code-only artifact gate for open edition scope

Mirrors the open edition rule that the code-only release includes complete gameplay source with local saves while excluding images, 3D files, recorded voices and marketing material. It gives syntax checks, unit tests and docs a pure deterministic gate to accept small bounded edition-plus-artifact descriptors and deny excluded or out-of-scope variants without filesystem, network, bind or clock state, keeping code-artifact validation separate from route, save, phase, procedural, containment, status, bind, port, offering and fixture gates.

Reusable deterministic JSON core: `js/community/code_only_artifact_gate.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Exposes runFeature(payload) as a deterministic pure JSON function with no I/O, env, clock, randomness, callbacks, dependencies or filesystem access and never uses Date. Payload must be a non-null non-array object with keys subset of edition and artifact. Returns an object literal with decision allow or deny, reason code string, code object or null. Steps using for-of plus Object.entries and Map get/set without mutation and without variable-index access: if payload is not a non-null object or is an array return deny bad-payload with null code; iterate Object.entries of payload and if any key is not edition or artifact return deny unknown-field with null code; if any string value contains colon-slash-slash or backslash or dotdot return deny bad-value with null code; collect entries into a Map; edition must be a string exactly open or code-only via Map lookup else if missing or non-string return deny bad-edition with null code else return deny unknown-edition with null code; artifact must be a string exactly gameplay or source via Map lookup else if missing or non-string return deny bad-artifact with null code else return deny unknown-artifact with null code; on success return allow ok-code with code object literal holding edition and artifact. It preserves input, uses only object literals, arrays with push, and Maps, never reads regular-file state, bind address, storage, network, or clock; callers must still enforce code-only scope with complete gameplay source, procedural canvas fallback with browser-generated sound, browser-local saves, local serving on 127.0.0.1 with per-request lstat plus realpath containment, and exclusion of images, 3D files, recorded voices, marketing material, cloud leaderboard, SDK download and production deployment; application and UI integration is outside this change.

Examples (JSON input and expected output):

```json
{
  "input": {
    "artifact": "gameplay",
    "edition": "open"
  },
  "output": {
    "code": {
      "artifact": "gameplay",
      "edition": "open"
    },
    "decision": "allow",
    "reason": "ok-code"
  }
}
```

```json
{
  "input": {
    "artifact": "source",
    "edition": "code-only"
  },
  "output": {
    "code": {
      "artifact": "source",
      "edition": "code-only"
    },
    "decision": "allow",
    "reason": "ok-code"
  }
}
```

```json
{
  "input": {
    "artifact": "image",
    "edition": "open"
  },
  "output": {
    "code": null,
    "decision": "deny",
    "reason": "unknown-artifact"
  }
}
```

Public regression tests: `test/community_code_only_artifact_gate.test.js`.


<!-- community-core:notice-reference-gate -->
### Deterministic NOTICE reference gate for private history preservation

Mirrors the open edition rule that the private original and its history are preserved separately with a NOTICE.md pointer while the open release stays code-only with procedural rendering and browser-local saves. It gives syntax checks, unit tests and docs a pure deterministic gate to accept small bounded notice-plus-topic descriptors and deny out-of-scope variants without filesystem, network, bind or clock state, keeping notice validation separate from route, save, phase, procedural, containment, status, bind, port, offering and fixture gates.

Reusable deterministic JSON core: `js/community/notice_reference_gate.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Exposes runFeature(payload) as a deterministic pure JSON function with no I/O, env, clock, randomness, callbacks, dependencies or filesystem access and never uses Date. Payload must be a non-null non-array object with keys subset of notice and topic. Returns an object literal with decision allow or deny, reason code string, reference object or null. Steps using for-of plus Object.entries and Map get/set without mutation and without variable-index access: if payload is not a non-null object or is an array return deny bad-payload with null reference; iterate Object.entries of payload and if any key is not notice or topic return deny unknown-field with null reference; if any string value contains colon-slash-slash or backslash or dotdot return deny bad-value with null reference; collect entries into a Map; notice must be a string exactly NOTICE.md via Map lookup else if missing or non-string return deny bad-notice with null reference else return deny unknown-notice with null reference; topic must be a string exactly private-history via Map lookup else if missing or non-string return deny bad-topic with null reference else return deny unknown-topic with null reference; on success return allow ok-notice with reference object literal holding notice and topic. It preserves input, uses only object literals, arrays with push, and Maps, never reads regular-file state, bind address, storage, network, or clock; callers must still enforce private original and history preserved separately with NOTICE pointer, code-only scope with procedural canvas fallback and browser-generated sound, browser-local saves, local serving on 127.0.0.1 with per-request lstat plus realpath containment, and exclusion of images, 3D files, recorded voices, marketing material, cloud leaderboard, SDK download and production deployment; application and UI integration is outside this change.

Examples (JSON input and expected output):

```json
{
  "input": {
    "notice": "NOTICE.md",
    "topic": "private-history"
  },
  "output": {
    "decision": "allow",
    "reason": "ok-notice",
    "reference": {
      "notice": "NOTICE.md",
      "topic": "private-history"
    }
  }
}
```

```json
{
  "input": {
    "notice": "README.md",
    "topic": "private-history"
  },
  "output": {
    "decision": "deny",
    "reason": "unknown-notice",
    "reference": null
  }
}
```

```json
{
  "input": {
    "notice": "NOTICE.md",
    "topic": "gameplay"
  },
  "output": {
    "decision": "deny",
    "reason": "unknown-topic",
    "reference": null
  }
}
```

Public regression tests: `test/community_notice_reference_gate.test.js`.


<!-- community-core:local-open-url-gate -->
### Deterministic local open URL gate for open edition browsing

Mirrors the open edition rule that the game is opened at http://127.0.0.1:8080 with local serving bound to loopback. It gives syntax checks, unit tests and docs a pure deterministic gate to accept small bounded scheme-plus-hostport descriptors and deny cloud, file, or out-of-scope variants without filesystem, network, bind or clock state, keeping open-URL validation separate from route, save, phase, procedural, containment, status, bind, port, offering and fixture gates.

Reusable deterministic JSON core: `js/community/local_open_url_gate.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Exposes runFeature(payload) as a deterministic pure JSON function with no I/O, env, clock, randomness, callbacks, dependencies or filesystem access and never uses Date. Payload must be a non-null non-array object with keys subset of scheme and hostport. Returns an object literal with decision allow or deny, reason code string, open object or null. Steps using for-of plus Object.entries and Map get/set without mutation and without variable-index access: if payload is not a non-null object or is an array return deny bad-payload with null open; iterate Object.entries of payload and if any key is not scheme or hostport return deny unknown-field with null open; if any string value contains colon-slash-slash or backslash or dotdot return deny bad-value with null open; collect entries into a Map; scheme must be a string exactly http via Map lookup else if missing or non-string return deny bad-scheme with null open else return deny unknown-scheme with null open; hostport must be a string exactly 127.0.0.1:8080 via Map lookup else if missing or non-string return deny bad-hostport with null open else return deny unknown-hostport with null open; on success return allow ok-open with open object literal holding scheme and hostport. It preserves input, uses only object literals, arrays with push, and Maps, never reads regular-file state, bind address, storage, network, or clock; callers must still enforce local HTTP serving on 127.0.0.1:8080 with per-request lstat plus realpath containment, procedural canvas fallback with browser-generated sound, browser-local saves, and exclusion of cloud leaderboard, SDK download and production deployment; application and UI integration is outside this change.

Examples (JSON input and expected output):

```json
{
  "input": {
    "hostport": "127.0.0.1:8080",
    "scheme": "http"
  },
  "output": {
    "decision": "allow",
    "open": {
      "hostport": "127.0.0.1:8080",
      "scheme": "http"
    },
    "reason": "ok-open"
  }
}
```

```json
{
  "input": {
    "hostport": "127.0.0.1:8080",
    "scheme": "https"
  },
  "output": {
    "decision": "deny",
    "open": null,
    "reason": "unknown-scheme"
  }
}
```

```json
{
  "input": {
    "hostport": "0.0.0.0:8080",
    "scheme": "http"
  },
  "output": {
    "decision": "deny",
    "open": null,
    "reason": "unknown-hostport"
  }
}
```

Public regression tests: `test/community_local_open_url_gate.test.js`.


<!-- community-core:static-content-type-gate -->
### Deterministic static content-type gate for open edition serving

Mirrors the open edition rule that static serving maps / to index.html plus js/ and css/ only with procedural canvas fallback and browser-local saves. It gives syntax checks, unit tests and docs a pure deterministic gate to accept small bounded folder-plus-file descriptors and map them to text/html, text/javascript or text/css while denying out-of-scope variants without filesystem, network, bind or clock state, keeping content-type validation separate from route, save, phase, procedural, containment, status, bind, port, offering and fixture gates.

Reusable deterministic JSON core: `js/community/static_content_type_gate.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Exposes runFeature(payload) as a deterministic pure JSON function with no I/O, env, clock, randomness, callbacks, dependencies or filesystem access and never uses Date. Payload must be a non-null non-array object with keys subset of folder and file. Returns an object literal with decision allow or deny, reason code string, media object or null. Steps using for-of plus Object.entries and Map get/set without mutation and without variable-index access: if payload is not a non-null object or is an array return deny bad-payload with null media; iterate Object.entries of payload and if any key is not folder or file return deny unknown-field with null media; if any string value contains colon-slash-slash or backslash or dotdot return deny bad-value with null media; collect entries into a Map; folder must be a string exactly root or js or css via Map lookup else if missing or non-string return deny bad-folder with null media else return deny unknown-folder with null media; file must be a non-empty string else if missing or non-string or empty return deny bad-file with null media; if file contains slash or colon return deny bad-file with null media; iterate characters of file with for-of allowing only A-Z a-z 0-9 dot hyphen underscore via Map lookup else return deny bad-name with null media; enforce pairing where root requires file exactly index.html via Map lookup else return deny mismatch-type with null media, js requires file ending with .js with non-empty basename else return deny mismatch-type with null media, css requires file ending with .css with non-empty basename else return deny mismatch-type with null media; on success select contentType via Map lookup where root maps to text/html and js maps to text/javascript and css maps to text/css and return allow ok-media with media object literal holding folder and file and contentType. It preserves input, uses only object literals, arrays with push, and Maps, never reads regular-file state, bind address, storage, network, or clock; callers must still enforce static serving of / to index.html plus js/ and css/ only with per-request lstat plus realpath containment, 404 without bytes for symlink traversal dotfile and private targets, 405 for non-GET/HEAD, bind 127.0.0.1, procedural canvas fallback with browser-generated sound, browser-local saves, and exclusion of images, 3D files, recorded voices, marketing material, cloud leaderboard, SDK download and production deployment; application and UI integration is outside this change.

Examples (JSON input and expected output):

```json
{
  "input": {
    "file": "index.html",
    "folder": "root"
  },
  "output": {
    "decision": "allow",
    "media": {
      "contentType": "text/html",
      "file": "index.html",
      "folder": "root"
    },
    "reason": "ok-media"
  }
}
```

```json
{
  "input": {
    "file": "game.js",
    "folder": "js"
  },
  "output": {
    "decision": "allow",
    "media": {
      "contentType": "text/javascript",
      "file": "game.js",
      "folder": "js"
    },
    "reason": "ok-media"
  }
}
```

```json
{
  "input": {
    "file": "game.js",
    "folder": "css"
  },
  "output": {
    "decision": "deny",
    "media": null,
    "reason": "mismatch-type"
  }
}
```

Public regression tests: `test/community_static_content_type_gate.test.js`.


<!-- community-core:syntax-target-gate -->
### Deterministic syntax target gate for open edition JavaScript

Mirrors the open edition rule that validation covers JavaScript syntax for complete gameplay source with local serving and manual smoke check and no cloud. It gives syntax checks, unit tests and docs a pure deterministic gate to accept small bounded path-plus-check descriptors for js/game.js and server.js and deny out-of-scope variants without filesystem, network, bind or clock state, keeping syntax-target validation separate from route, save, phase, procedural, containment, status, bind, port, offering and fixture gates.

Reusable deterministic JSON core: `js/community/syntax_target_gate.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Exposes runFeature(payload) as a deterministic pure JSON function with no I/O, env, clock, randomness, callbacks, dependencies or filesystem access and never uses Date. Payload must be a non-null non-array object with keys subset of path and check. Returns an object literal with decision allow or deny, reason code string, subject object or null. Steps using for-of plus Object.entries and Map get/set without mutation and without variable-index access: if payload is not a non-null object or is an array return deny bad-payload with null subject; iterate Object.entries of payload and if any key is not path or check return deny unknown-field with null subject; if any string value contains colon-slash-slash or backslash or dotdot return deny bad-value with null subject; collect entries into a Map; path must be a string exactly js/game.js or server.js via Map lookup else if missing or non-string return deny bad-path with null subject else return deny unknown-path with null subject; check must be a string exactly syntax via Map lookup else if missing or non-string return deny bad-check with null subject else return deny unknown-check with null subject; on success return allow ok-syntax with subject object literal holding path and check. It preserves input, uses only object literals, arrays with push, and Maps, never reads regular-file state, bind address, storage, network, or clock; callers must still enforce JavaScript syntax validation via npm run check for js/game.js and server.js, local HTTP serving on 127.0.0.1:8080 with per-request lstat plus realpath containment, procedural canvas fallback with browser-generated sound, browser-local saves, and exclusion of images, 3D files, recorded voices, marketing material, cloud leaderboard, SDK download and production deployment; application and UI integration is outside this change.

Examples (JSON input and expected output):

```json
{
  "input": {
    "check": "syntax",
    "path": "js/game.js"
  },
  "output": {
    "decision": "allow",
    "reason": "ok-syntax",
    "subject": {
      "check": "syntax",
      "path": "js/game.js"
    }
  }
}
```

```json
{
  "input": {
    "check": "syntax",
    "path": "server.js"
  },
  "output": {
    "decision": "allow",
    "reason": "ok-syntax",
    "subject": {
      "check": "syntax",
      "path": "server.js"
    }
  }
}
```

```json
{
  "input": {
    "check": "serve",
    "path": "js/game.js"
  },
  "output": {
    "decision": "deny",
    "reason": "unknown-check",
    "subject": null
  }
}
```

Public regression tests: `test/community_syntax_target_gate.test.js`.


<!-- community-core:local-write-denial-gate -->
### Deterministic local write denial gate for open edition serving

Mirrors the open edition rule that validation includes unsupported writes and non-GET/HEAD remain denied with 405 while GET and HEAD serve static files. It gives syntax checks, unit tests and docs a pure deterministic gate to accept small bounded operation-plus-method descriptors and deny out-of-scope variants without filesystem, network, bind or clock state, keeping write-denial validation separate from route, save, phase, procedural, containment, status, bind, port, offering and fixture gates.

Reusable deterministic JSON core: `js/community/local_write_denial_gate.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Exposes runFeature(payload) as a deterministic pure JSON function with no I/O, env, clock, randomness, callbacks, dependencies or filesystem access and never uses Date. Payload must be a non-null non-array object with keys subset of operation and method. Returns an object literal with decision allow or deny, reason code string, verdict object or null. Steps using for-of plus Object.entries and Map get/set without mutation and without variable-index access: if payload is not a non-null object or is an array return deny bad-payload with null verdict; iterate Object.entries of payload and if any key is not operation or method return deny unknown-field with null verdict; if any string value contains colon-slash-slash or backslash or dotdot return deny bad-value with null verdict; collect entries into a Map; operation must be a string exactly read or write via Map lookup else if missing or non-string return deny bad-operation with null verdict else return deny unknown-operation with null verdict; method must be a string exactly GET or HEAD or POST or PUT or DELETE or PATCH via Map lookup else if missing or non-string return deny bad-method with null verdict else return deny unknown-method with null verdict; enforce pairing where read requires GET or HEAD and write requires POST or PUT or DELETE or PATCH else return deny mismatch-operation with null verdict; if operation is read return allow ok-read with verdict object literal holding operation and method; if operation is write return deny denied-write with null verdict. It preserves input, uses only object literals, arrays with push, and Maps, never reads regular-file state, bind address, storage, network, or clock; callers must still enforce static serving of / to index.html plus js/ and css/ only with per-request lstat plus realpath containment, 404 without bytes for symlink traversal dotfile and private targets, 405 for non-GET/HEAD, bind 127.0.0.1:8080, procedural canvas fallback with browser-generated sound, browser-local saves, and exclusion of images, 3D files, recorded voices, marketing material, cloud leaderboard, SDK download and production deployment; application and UI integration is outside this change.

Examples (JSON input and expected output):

```json
{
  "input": {
    "method": "GET",
    "operation": "read"
  },
  "output": {
    "decision": "allow",
    "reason": "ok-read",
    "verdict": {
      "method": "GET",
      "operation": "read"
    }
  }
}
```

```json
{
  "input": {
    "method": "POST",
    "operation": "write"
  },
  "output": {
    "decision": "deny",
    "reason": "denied-write",
    "verdict": null
  }
}
```

```json
{
  "input": {
    "method": "POST",
    "operation": "read"
  },
  "output": {
    "decision": "deny",
    "reason": "mismatch-operation",
    "verdict": null
  }
}
```

Public regression tests: `test/community_local_write_denial_gate.test.js`.
