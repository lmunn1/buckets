// Local-only SPA preview for an already exported web app. No external tooling.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../dist-frontend-all');
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.ico':'image/x-icon', '.ttf':'font/ttf', '.svg':'image/svg+xml' };
http.createServer((request,response) => {
  let target;
  try { target = path.resolve(root, '.' + decodeURIComponent(new URL(request.url, 'http://localhost').pathname)); }
  catch { response.writeHead(400); response.end(); return; }
  if (target !== root && !target.startsWith(root + path.sep)) { response.writeHead(403); response.end(); return; }
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) target = path.join(root, 'index.html');
  if (!fs.existsSync(target)) { response.writeHead(503); response.end('Export the app first.'); return; }
  response.writeHead(200, { 'Content-Type':mime[path.extname(target)] || 'application/octet-stream', 'Cache-Control':'no-store' });
  fs.createReadStream(target).pipe(response);
}).listen(8085, '127.0.0.1', () => console.log('Hoop production preview: http://127.0.0.1:8085'));
