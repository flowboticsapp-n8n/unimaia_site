import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeHtml,
  parsePage,
  buildSiteData,
  applyIncludes,
  applyPlaceholders,
  inlineIcons,
  markActiveNav,
  jsonForScript,
  normalizeSvg,
} from '../scripts/lib.mjs';

const baseConfig = {
  name: 'Unimaia',
  street: 'Rua X, 1',
  neighborhood: 'Centro',
  city: 'Lajedo',
  state: 'PE',
  cep: '55385-000',
  whatsapp: '5587999999999',
  instagram: 'unimaia_',
};

test('escapeHtml neutraliza HTML', () => {
  assert.equal(escapeHtml('<script>"x" & \'y\'</script>'), '&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/script&gt;');
});

test('parsePage lê o cabeçalho e devolve o corpo', () => {
  const { meta, body } = parsePage('<!-- page: {"title":"T","description":"D","nav":"x"} -->\n<p>oi</p>');
  assert.deepEqual(meta, { title: 'T', description: 'D', nav: 'x' });
  assert.equal(body, '<p>oi</p>');
});

test('parsePage recusa página sem título', () => {
  assert.throws(() => parsePage('<!-- page: {"description":"D"} -->'), /title/);
  assert.throws(() => parsePage('<p>sem cabeçalho</p>'), /cabeçalho/);
});

test('buildSiteData valida WhatsApp e Instagram', () => {
  assert.throws(() => buildSiteData({ ...baseConfig, whatsapp: '(87) 9999-9999' }), /whatsapp/);
  assert.throws(() => buildSiteData({ ...baseConfig, instagram: '@unimaia_' }), /instagram/);
  const site = buildSiteData(baseConfig);
  assert.equal(site.whatsappLink, 'https://wa.me/5587999999999');
  assert.match(site.mapsEmbed, /^https:\/\/www\.google\.com\/maps\?q=Rua%20X%2C%201/);
});

test('applyIncludes resolve partial dentro de partial e acusa partial inexistente', () => {
  const out = applyIncludes('<!-- include:a -->', { a: '[<!-- include:b -->]', b: 'B' });
  assert.equal(out, '[B]');
  assert.throws(() => applyIncludes('<!-- include:nada -->', {}), /nada/);
  assert.throws(() => applyIncludes('<!-- include:a -->', { a: '<!-- include:a -->' }), /aninhados/);
});

test('applyPlaceholders escapa valores e falha em chave desconhecida', () => {
  const data = { site: { name: 'A & B' }, page: { head: '<script></script>' } };
  assert.equal(applyPlaceholders('{{site.name}}', data), 'A &amp; B');
  assert.equal(applyPlaceholders('{{page.head}}', data, new Set(['page.head'])), '<script></script>');
  assert.throws(() => applyPlaceholders('{{site.nada}}', data), /site\.nada/);
  assert.throws(() => applyPlaceholders('{{ quebrado }}', data), /mal formado/);
});

test('inlineIcons troca <i data-lucide> por SVG acessível', () => {
  const icons = { x: normalizeSvg('<!-- licença -->\n<svg class="lucide" width="24" height="24" viewBox="0 0 24 24">\n  <path d="M1 1"/>\n</svg>') };
  const out = inlineIcons('<i data-lucide="x" class="w-4 h-4"></i>', icons);
  assert.equal(out, '<svg class="w-4 h-4" aria-hidden="true" focusable="false" viewBox="0 0 24 24"><path d="M1 1"/></svg>');
  assert.throws(() => inlineIcons('<i data-lucide="nao-existe"></i>', icons), /nao-existe/);
});

test('normalizeSvg mantém width/height dos elementos internos (ex.: <rect>)', () => {
  const out = normalizeSvg('<svg width="24" height="24" class="lucide"><rect width="18" height="18" x="3" y="4"/></svg>');
  assert.equal(out, '<svg><rect width="18" height="18" x="3" y="4"/></svg>');
});

test('markActiveNav marca só o link da página atual', () => {
  const html = '<a data-nav="inicio">I</a><a data-nav="contato">C</a>';
  assert.equal(markActiveNav(html, 'contato'), '<a data-nav="inicio">I</a><a data-nav="contato" aria-current="page">C</a>');
  assert.equal(markActiveNav(html, undefined), html);
});

test('jsonForScript não permite fechar a tag <script>', () => {
  assert.equal(jsonForScript({ a: '</script><script>alert(1)</script>' }).includes('</script>'), false);
});
