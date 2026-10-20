import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { after, before, test } from 'node:test';

let child;
let base;

before(async () => {
  child = spawn(process.execPath, ['server.js'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, PORT: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  let errorOutput = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { errorOutput += chunk; });
  for (let attempt = 0; attempt < 100; attempt++) {
    const match = output.match(/Local game: (http:\/\/127\.0\.0\.1:\d+)/);
    if (match) { base = match[1]; return; }
    assert.equal(child.exitCode, null, errorOutput || 'Server exited before startup');
    await delay(20);
  }
  throw new Error('Local server startup timed out');
});

after(async () => {
  if (child && child.exitCode === null && child.signalCode === null) {
    const stopped = once(child, 'exit');
    child.kill('SIGTERM');
    await stopped;
  }
});

test('serves the game canvas and local scripts/styles', async () => {
  const response = await fetch(base);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/html/);
  const html = await response.text();
  assert.match(html, /<canvas id="game"/);
  const paths = [...html.matchAll(/(?:src|href)="((?:js|css)\/[^\"]+)"/g)]
    .map(match => match[1]);
  assert.ok(paths.length >= 2);
  for (const path of paths) {
    const asset = await fetch(`${base}/${path}`);
    assert.equal(asset.status, 200, path);
    assert.ok((await asset.text()).length > 0, path);
  }
  assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:)?\/\//);
});

test('HEAD returns headers without a body', async () => {
  const response = await fetch(`${base}/js/game.js`, { method: 'HEAD' });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /javascript/);
  assert.equal(await response.text(), '');
});

test('does not expose private, server or traversal paths', async () => {
  for (const path of ['/.env', '/.git/config', '/README.md', '/package.json',
    '/server.js', '/js/.hidden', '/%2e%2e/%2e%2e/etc/passwd',
    '/js/%2e%2e/server.js', '/js/%00bad.js', '/%ZZ']) {
    const response = await fetch(base + path);
    assert.equal(response.status, 404, path);
    await response.arrayBuffer();
  }
});

test('rejects writes and has no remote leaderboard endpoint', async () => {
  for (const path of ['/', '/api/leaderboard']) {
    const response = await fetch(base + path, { method: 'POST', body: '{}' });
    assert.equal(response.status, 405);
    await response.arrayBuffer();
  }
});
