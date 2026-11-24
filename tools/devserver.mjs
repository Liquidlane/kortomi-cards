// Lokaler Dev-Server: liefert die App aus und nimmt PNG-Uploads für die Icon-Erzeugung an.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || process.argv[2] || 5173);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8' };
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'PUT' && url.pathname.startsWith('/__save/')) {
    const name = path.basename(url.pathname);
    if (!/^[\w-]+\.png$/.test(name)) { res.writeHead(403).end(); return; }
    const chunks = []; req.on('data', c => chunks.push(c));
    req.on('end', () => { fs.writeFileSync(path.join(ROOT, 'assets', name), Buffer.concat(chunks)); res.writeHead(204).end(); });
    return;
  }
  let p = path.join(ROOT, decodeURIComponent(url.pathname));
  if (!p.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404).end('not found'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : data);
  });
}).listen(PORT, '127.0.0.1', () => console.log(`Kortomi Cards: http://localhost:${PORT}`));
