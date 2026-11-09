import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

// wrangler.jsonc aceita comentários de linha inteira (//); removemos antes do JSON.parse.
const readJsonc = (file) =>
  JSON.parse(readFileSync(file, 'utf8').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n'));

test('wrangler.jsonc publica a pasta gerada pelo build, sem código de Worker', () => {
  const config = readJsonc('wrangler.jsonc');
  assert.equal(config.assets.directory, './dist');
  assert.equal(config.main, undefined, 'site estático não deve ter "main"');
  assert.match(config.compatibility_date, /^\d{4}-\d{2}-\d{2}$/);
});

test('tem bloco "previews" (exigido pelo `wrangler preview` dos builds de branch)', () => {
  const config = readJsonc('wrangler.jsonc');
  assert.equal(typeof config.previews, 'object', 'sem "previews", o build de prévia do Cloudflare falha');
});

test('404 e roteamento sem .html combinam com os arquivos do site', () => {
  const { assets } = readJsonc('wrangler.jsonc');
  assert.equal(assets.not_found_handling, '404-page');
  assert.ok(existsSync('src/pages/404.html'), 'precisa existir src/pages/404.html');
  assert.equal(assets.html_handling, 'auto-trailing-slash');
});

test('_headers vai para a raiz do dist (onde o Cloudflare procura)', () => {
  assert.ok(existsSync('src/static/_headers'));
});
