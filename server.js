// Dependency-free static development server; binds to loopback only.
import { createServer } from 'node:http';
import { lstat, readFile, realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, extname, join, resolve, sep } from 'node:path';
const root = dirname(fileURLToPath(import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8' };
const server = createServer(async (request, response) => {
  try {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405); response.end(); return;
    }
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    const relative = file.slice(root.length + 1);
    if (!file.startsWith(root + sep) || relative.split(sep).some(part => part.startsWith('.')) ||
        !(relative === 'index.html' || relative.startsWith('js' + sep) || relative.startsWith('css' + sep))) {
      response.writeHead(404); response.end(); return;
    }
    const parts = relative.split(sep);
    for (let i = 1; i <= parts.length; i++) {
      const candidate = join(root, ...parts.slice(0, i));
      const stats = await lstat(candidate).catch(() => null);
      if (!stats) break;
      if (stats.isSymbolicLink()) {
        response.writeHead(404); response.end(); return;
      }
      if (!stats.isDirectory() && i < parts.length) break;
    }
    const resolved = await realpath(file).catch(() => null);
    if (resolved && resolved !== root && !resolved.startsWith(root + sep)) {
      response.writeHead(404); response.end(); return;
    }
    const data = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(request.method === 'HEAD' ? undefined : data);
  } catch {
    response.writeHead(404); response.end();
  }
});
server.listen(Number(process.env.PORT || 8080), '127.0.0.1', () => {
  console.log('Local game: http://127.0.0.1:' + server.address().port);
});
