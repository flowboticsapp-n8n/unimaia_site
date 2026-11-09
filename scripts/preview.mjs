// Servidor local para testar o dist/ como no Cloudflare (wrangler.jsonc):
// URLs sem ".html" (/medicina -> medicina.html), 404.html e cabeçalhos do _headers.
// Só para desenvolvimento: escuta apenas em 127.0.0.1.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
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

// Leitura simples do formato _headers do Cloudflare (padrões com * no fim).
async function loadHeaderRules() {
  let text = '';
  try {
    text = await readFile(path.join(root, '_headers'), 'utf8');
  } catch {
    return [];
  }
  const rules = [];
  for (const line of text.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      rules.push({ pattern: line.trim(), headers: [] });
    } else if (rules.length) {
      const i = line.indexOf(':');
      rules.at(-1).headers.push([line.slice(0, i).trim(), line.slice(i + 1).trim()]);
    }
  }
  return rules;
}

function matches(pattern, urlPath) {
  return pattern.endsWith('*') ? urlPath.startsWith(pattern.slice(0, -1)) : urlPath === pattern;
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

const rules = await loadHeaderRules();

createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let file = await resolveFile(urlPath);
    let status = 200;
    if (!file) {
      file = path.join(root, '404.html');
      status = 404;
    }
    for (const rule of rules) {
      if (matches(rule.pattern, urlPath)) for (const [k, v] of rule.headers) res.setHeader(k, v);
    }
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
