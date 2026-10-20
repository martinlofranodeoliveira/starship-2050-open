import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, symlink, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';

const here = dirname(fileURLToPath(import.meta.url));
const repoServer = join(here, '..', 'server.js');
const SECRET = 'synthetic-secret-8f3a1c-not-in-repo';

let base;
let gameRoot;
let outsideDir;
let child;
let port;
let startupLog = '';

function request(method, path) {
  return new Promise((resolveReq, rejectReq) => {
    const req = http.request({ host: '127.0.0.1', port, path, method }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolveReq({ status: res.statusCode, body: Buffer.concat(chunks) }));
    });
    req.on('error', rejectReq);
    req.end();
  });
}

function waitForPort(proc) {
  return new Promise((resolveP, rejectP) => {
    const timer = setTimeout(() => rejectP(new Error('server startup timeout')), 8000);
    let buf = '';
    proc.stdout.on('data', (d) => {
      buf += String(d);
      startupLog = buf;
      const m = buf.match(/http:\/\/127\.0\.0\.1:(\d+)/);
      if (m) {
        clearTimeout(timer);
        resolveP(Number(m[1]));
      }
    });
    proc.stderr.on('data', (d) => { buf += String(d); });
    proc.on('exit', (code) => {
      clearTimeout(timer);
      rejectP(new Error('server exited early code=' + code + ' log=' + buf));
    });
  });
}

before(async () => {
  base = await mkdtemp(join(tmpdir(), 'starship-symlink-'));
  gameRoot = join(base, 'game');
  outsideDir = join(base, 'outside');
  await mkdir(join(gameRoot, 'js'), { recursive: true });
  await mkdir(join(gameRoot, 'css'), { recursive: true });
  await mkdir(outsideDir, { recursive: true });
  await writeFile(join(gameRoot, 'index.html'), '<!doctype html><title>synthetic</title>\n');
  await writeFile(join(gameRoot, 'js', 'ok.js'), "console.log('synthetic-ok');\n");
  await writeFile(join(gameRoot, 'css', 'ok.css'), '/* synthetic-ok */\n');
  await writeFile(join(outsideDir, 'secret.js'), SECRET + '\n');
  await writeFile(join(outsideDir, 'secret.css'), SECRET + '\n');
  await copyFile(repoServer, join(gameRoot, 'server.js'));
  await symlink(join(outsideDir, 'secret.js'), join(gameRoot, 'js', 'filelink.js'));
  await symlink(join(outsideDir, 'secret.css'), join(gameRoot, 'css', 'filelink.css'));
  await symlink(outsideDir, join(gameRoot, 'js', 'dirlink'));
  await symlink(outsideDir, join(gameRoot, 'css', 'dirlink'));
  child = spawn(process.execPath, [join(gameRoot, 'server.js')], {
    env: { PORT: '0' },
    cwd: gameRoot,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  port = await waitForPort(child);
});

after(async () => {
  if (child && !child.killed) child.kill();
  if (base) await rm(base, { recursive: true, force: true });
});

test('regular synthetic files still serve 200 for GET and HEAD', async () => {
  const js = await request('GET', '/js/ok.js');
  assert.equal(js.status, 200);
  assert.match(js.body.toString('utf8'), /synthetic-ok/);
  const css = await request('GET', '/css/ok.css');
  assert.equal(css.status, 200);
  assert.match(css.body.toString('utf8'), /synthetic-ok/);
  const head = await request('HEAD', '/js/ok.js');
  assert.equal(head.status, 200);
  assert.equal(head.body.length, 0);
});

test('file symlink in js/css GET returns 404 without target bytes', async () => {
  for (const p of ['/js/filelink.js', '/css/filelink.css']) {
    const res = await request('GET', p);
    assert.equal(res.status, 404, p);
    assert.equal(res.body.includes(SECRET), false, p);
    assert.equal(res.body.length, 0, p);
  }
});

test('file symlink in js/css HEAD returns 404 without target bytes', async () => {
  for (const p of ['/js/filelink.js', '/css/filelink.css']) {
    const res = await request('HEAD', p);
    assert.equal(res.status, 404, p);
    assert.equal(res.body.length, 0, p);
    assert.equal(res.body.includes(SECRET), false, p);
  }
});

test('directory symlink in js/css GET returns 404 without target bytes', async () => {
  for (const p of ['/js/dirlink/secret.js', '/css/dirlink/secret.css', '/js/dirlink/secret.css', '/css/dirlink/secret.js']) {
    const res = await request('GET', p);
    assert.equal(res.status, 404, p);
    assert.equal(res.body.includes(SECRET), false, p);
  }
});

test('directory symlink in js/css HEAD returns 404 without target bytes', async () => {
  for (const p of ['/js/dirlink/secret.js', '/css/dirlink/secret.css']) {
    const res = await request('HEAD', p);
    assert.equal(res.status, 404, p);
    assert.equal(res.body.length, 0, p);
    assert.equal(res.body.includes(SECRET), false, p);
  }
});

test('loopback, port 0, dotfiles/traversal/write denials still hold', async () => {
  assert.ok(port > 0 && port < 65536);
  assert.match(startupLog, /127\.0\.0\.1/);
  const dot = await request('GET', '/js/.hidden.js');
  assert.equal(dot.status, 404);
  const traversal = await request('GET', '/js/%2e%2e/server.js');
  assert.equal(traversal.status, 404);
  const rootEscape = await request('GET', '/%2e%2e/outside/secret.js');
  assert.equal(rootEscape.status, 404);
  assert.equal(rootEscape.body.includes(SECRET), false);
  const denied = await request('POST', '/js/ok.js');
  assert.equal(denied.status, 405);
});
