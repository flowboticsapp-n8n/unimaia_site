import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

// Confere, no site gerado (dist/), se todo link interno e toda imagem/arquivo referenciado existe.
// Roda depois do build (npm run check / CI). Sem dist/, o teste é pulado.
const dist = 'dist';

function targetExists(url) {
  const clean = url.split(/[?#]/)[0];
  if (clean === '/') return existsSync(path.join(dist, 'index.html'));
  const file = path.join(dist, clean);
  return existsSync(file) || existsSync(`${file}.html`);
}

test('links e arquivos internos do site gerado existem', { skip: !existsSync(dist) && 'rode npm run build antes' }, () => {
  const missing = [];
  for (const page of readdirSync(dist).filter((f) => f.endsWith('.html'))) {
    const html = readFileSync(path.join(dist, page), 'utf8');
    const refs = [...html.matchAll(/(?:href|src)="(\/[^"]*)"/g)].map((m) => m[1]);
    for (const m of html.matchAll(/srcset="([^"]+)"/g)) {
      refs.push(...m[1].split(',').map((part) => part.trim().split(/\s+/)[0]));
    }
    for (const ref of refs.filter((r) => r.startsWith('/') && !r.startsWith('//'))) {
      if (!targetExists(ref)) missing.push(`${page} -> ${ref}`);
    }
  }
  assert.deepEqual(missing, []);
});
