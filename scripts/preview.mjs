// Servidor local para testar o dist/ parecido com o nginx de produção (deploy/nginx):
// URLs sem ".html" (/medicina -> medicina.html), 404.html e os mesmos cabeçalhos de segurança.
// Só para desenvolvimento: escuta apenas em 127.0.0.1. Para testar o container de verdade, use o Docker.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseNginxHeaders } from './lib.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.join(projectRoot, 'dist');
const port = Number(process.env.PORT) || 4173;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
};

// Mesmos cabeçalhos de segurança do nginx (CSP etc.), lidos do arquivo usado na imagem Docker.
async function loadSecurityHeaders() {
  const text = await readFile(path.join(projectRoot, 'deploy', 'nginx', 'security-headers.conf'), 'utf8');
  return parseNginxHeaders(text);
}

async function resolveFile(urlPath) {
  const clean = urlPath === '/' ? '/index.html' : urlPath;
  const candidates = path.extname(clean) ? [clean] : [`${clean}.html`, `${clean}/index.html`];
  for (const candidate of candidates) {
    const file = path.resolve(root, `.${candidate}`);
    if (!file.startsWith(root + path.sep)) return null; // bloqueia ../
    try {
      if ((await stat(file)).isFile()) return file;
    } catch {
      // tenta o próximo
    }
  }
  return null;
}

const securityHeaders = await loadSecurityHeaders();

createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let file = await resolveFile(urlPath);
    let status = 200;
    if (!file) {
      file = path.join(root, '404.html');
      status = 404;
    }
    for (const [k, v] of securityHeaders) res.setHeader(k, v);
    res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
    res.writeHead(status);
    res.end(await readFile(file));
  } catch (err) {
    console.error(err);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Erro interno');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Preview em http://127.0.0.1:${port}`);
});
