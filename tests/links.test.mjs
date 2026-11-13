import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

// Confere, no site gerado (dist/), se todo link interno, âncora (#) e arquivo referenciado existe.
// Roda depois do build (npm run check / CI). Sem dist/, o teste é pulado.
const dist = 'dist';

function resolveFile(urlPath) {
  if (urlPath === '/' || urlPath === '') return path.join(dist, 'index.html');
  const file = path.join(dist, urlPath);
  if (existsSync(file)) return file;
  if (existsSync(`${file}.html`)) return `${file}.html`;
  return null;
}

const idsCache = new Map();
function idsOf(file) {
  if (!idsCache.has(file)) {
    const html = readFileSync(file, 'utf8');
    idsCache.set(file, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  }
  return idsCache.get(file);
}

test('links, âncoras e arquivos internos do site gerado existem', { skip: !existsSync(dist) && 'rode npm run build antes' }, () => {
  const missing = [];
  for (const page of readdirSync(dist).filter((f) => f.endsWith('.html'))) {
    const pageFile = path.join(dist, page);
    const html = readFileSync(pageFile, 'utf8');
    const refs = [...html.matchAll(/(?:href|src)="([/#][^"]*)"/g)].map((m) => m[1]);
    for (const m of html.matchAll(/srcset="([^"]+)"/g)) {
      refs.push(...m[1].split(',').map((part) => part.trim().split(/\s+/)[0]));
    }
    for (const ref of refs.filter((r) => !r.startsWith('//'))) {
      const [rawPath, fragment] = ref.split('#');
      const urlPath = rawPath.split('?')[0];
      const file = urlPath === '' ? pageFile : resolveFile(urlPath);
      if (!file) {
        missing.push(`${page} -> ${ref} (arquivo)`);
      } else if (fragment && file.endsWith('.html') && !idsOf(file).has(fragment)) {
        missing.push(`${page} -> ${ref} (âncora)`);
      }
    }
  }
  assert.deepEqual(missing, []);
});

// Prévia do WhatsApp/Facebook: a imagem precisa de URL absoluta no domínio do site e tem de existir.
test('toda página tem og:image e og:url absolutos, e a imagem existe no build', { skip: !existsSync(dist) && 'rode npm run build antes' }, () => {
  const { siteUrl } = JSON.parse(readFileSync('site.config.json', 'utf8'));
  const problems = [];
  for (const page of readdirSync(dist).filter((f) => f.endsWith('.html'))) {
    const html = readFileSync(path.join(dist, page), 'utf8');
    const image = html.match(/<meta property="og:image" content="([^"]+)">/)?.[1];
    const url = html.match(/<meta property="og:url" content="([^"]+)">/)?.[1];
    const expectedUrl = page === 'index.html' ? `${siteUrl}/` : `${siteUrl}/${page.replace('.html', '')}`;
    if (!image?.startsWith(`${siteUrl}/`)) problems.push(`${page}: og:image ausente ou relativa (${image})`);
    else if (!existsSync(path.join(dist, image.slice(siteUrl.length)))) problems.push(`${page}: ${image} não existe em dist/`);
    if (url !== expectedUrl) problems.push(`${page}: og:url ${url} (esperado ${expectedUrl})`);
  }
  assert.deepEqual(problems, []);
});

// Páginas com "draft": true no cabeçalho não podem ir para o site (nem ser linkadas: o teste acima pega).
test('páginas em rascunho não são publicadas', { skip: !existsSync(dist) && 'rode npm run build antes' }, () => {
  const published = [];
  for (const file of readdirSync('src/pages').filter((f) => f.endsWith('.html'))) {
    const header = readFileSync(path.join('src/pages', file), 'utf8').match(/<!--\s*page:\s*(\{[\s\S]*?\})\s*-->/)[1];
    if (JSON.parse(header).draft === true && existsSync(path.join(dist, file))) published.push(file);
  }
  assert.deepEqual(published, []);
});
