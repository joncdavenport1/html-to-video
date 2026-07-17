import http from 'node:http';
import fs   from 'node:fs';
import path from 'node:path';

const MIME = {
  '.html':  'text/html; charset=utf-8',
  '.js':    'application/javascript',
  '.css':   'text/css',
  '.svg':   'image/svg+xml',
  '.png':   'image/png',
  '.jpg':   'image/jpeg',
  '.json':  'application/json',
  '.woff2': 'font/woff2',
  '.woff':  'font/woff',
  '.ttf':   'font/ttf',
};

export async function startServer(root) {
  const server = http.createServer((req, res) => {
    let urlPath;
    try { urlPath = decodeURIComponent(req.url.split('?')[0]); }
    catch (_) { urlPath = req.url.split('?')[0]; }

    const filePath = path.resolve(root, '.' + urlPath);

    // Directory traversal guard
    if (!filePath.startsWith(path.resolve(root))) {
      res.writeHead(403); res.end('Forbidden'); return;
    }

    fs.stat(filePath, (err, stat) => {
      if (err || !stat.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found: ' + urlPath);
        return;
      }
      res.writeHead(200, {
        'Content-Type':                MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
        'Cache-Control':               'no-cache',
        'Access-Control-Allow-Origin': '*',
      });
      fs.createReadStream(filePath).pipe(res);
    });
  });

  await new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', resolve);
    server.once('error', reject);
  });

  const { port } = server.address();
  return {
    port,
    url:   `http://127.0.0.1:${port}`,
    close: () => new Promise(r => server.close(r)),
  };
}
