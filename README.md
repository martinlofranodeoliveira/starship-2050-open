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
