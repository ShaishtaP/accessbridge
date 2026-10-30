import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Zero-dependency static server for the demo site, so audits run against local pages only.
const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PORT = Number(process.env.DEMO_PORT) || 4000;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
};

const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  const relative = pathname === '/' ? 'index.html' : decodeURIComponent(pathname.slice(1));
  const filePath = normalize(join(ROOT, relative));

  // Block path traversal (e.g. /../server/.env) and only serve known file types.
  if (!filePath.startsWith(ROOT) || filePath.includes(`${sep}.`) || !TYPES[extname(filePath)]) {
    res.writeHead(404).end('Not found');
    return;
  }

  try {
    const body = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': TYPES[extname(filePath)] }).end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Demo site running at http://localhost:${PORT}`);
});
