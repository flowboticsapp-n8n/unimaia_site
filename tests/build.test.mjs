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
  robotsContent,
  pageUrl,
  clinicJsonLd,
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
  googleBusinessUrl: 'https://share.google/abc',
  indexable: false,
  siteUrl: 'https://unimaia.com.br',
  opticsStreet: 'Rua Y, 2',
  opticsNeighborhood: 'Centro',
  opticsInstagram: 'oticamaia10',
  openingHours: [
    { days: ['Monday', 'Friday'], opens: '07:00', closes: '19:00' },
    { days: ['Saturday'], opens: '07:00', closes: '13:00' },
  ],
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

test('buildSiteData exige link https para a página do Google', () => {
  assert.throws(() => buildSiteData({ ...baseConfig, googleBusinessUrl: 'http://share.google/abc' }), /googleBusinessUrl/);
  assert.throws(() => buildSiteData({ ...baseConfig, googleBusinessUrl: 'javascript:alert(1)' }), /googleBusinessUrl/);
});

test('buildSiteData exige "indexable" booleano (evita liberar o Google por engano)', () => {
  assert.throws(() => buildSiteData({ ...baseConfig, indexable: undefined }), /indexable/);
  assert.throws(() => buildSiteData({ ...baseConfig, indexable: 'false' }), /indexable/);
});

test('robotsContent: bloqueia tudo fora de produção e a 404 sempre', () => {
  assert.equal(robotsContent({ indexable: false }, {}), 'noindex, nofollow');
  assert.equal(robotsContent({ indexable: false }, { noindex: true }), 'noindex, nofollow');
  assert.equal(robotsContent({ indexable: true }, {}), 'index, follow');
  assert.equal(robotsContent({ indexable: true }, { noindex: true }), 'noindex, nofollow');
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

test('buildSiteData exige siteUrl https sem barra no fim (a prévia do WhatsApp precisa de URL absoluta)', () => {
  for (const siteUrl of [undefined, 'http://unimaia.com.br', 'https://unimaia.com.br/', 'unimaia.com.br', 'https://unimaia.com.br/x']) {
    assert.throws(() => buildSiteData({ ...baseConfig, siteUrl }), /siteUrl/, String(siteUrl));
  }
});

test('buildSiteData valida os horários (dia em inglês, HH:MM, abre antes de fechar)', () => {
  const bad = [
    undefined,
    [],
    { days: ['Monday'], opens: '07:00', closes: '19:00' }, // objeto solto, não lista
    [{ days: ['Segunda'], opens: '07:00', closes: '19:00' }],
    [{ days: ['Monday'], opens: '7:00', closes: '19:00' }],
    [{ days: ['Monday'], opens: '19:00', closes: '07:00' }],
    [{ days: [], opens: '07:00', closes: '19:00' }],
  ];
  for (const openingHours of bad) {
    assert.throws(() => buildSiteData({ ...baseConfig, openingHours }), /openingHours/, JSON.stringify(openingHours));
  }
});

test('buildSiteData monta os links da ótica e valida o Instagram dela', () => {
  assert.throws(() => buildSiteData({ ...baseConfig, opticsInstagram: '@oticamaia10' }), /opticsInstagram/);
  const site = buildSiteData(baseConfig);
  assert.equal(site.opticsInstagramUrl, 'https://www.instagram.com/oticamaia10/');
  assert.match(site.opticsMapsLink, /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=Rua%20Y%2C%202/);
});

test('pageUrl: raiz para a inicial e caminho sem .html para as outras', () => {
  const site = buildSiteData(baseConfig);
  assert.equal(pageUrl(site, 'index'), 'https://unimaia.com.br/');
  assert.equal(pageUrl(site, 'medicina'), 'https://unimaia.com.br/medicina');
});

test('clinicJsonLd publica cada faixa de horário e o endereço do site', () => {
  const ld = clinicJsonLd({ ...buildSiteData(baseConfig), legalName: 'U', tagline: 't' });
  assert.equal(ld.url, 'https://unimaia.com.br/');
  assert.deepEqual(
    ld.openingHoursSpecification.map((h) => [h.dayOfWeek, h.opens, h.closes]),
    [[['Monday', 'Friday'], '07:00', '19:00'], [['Saturday'], '07:00', '13:00']],
  );
});
