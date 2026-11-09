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
