// Funções puras do build (testadas em tests/build.test.mjs).

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

/**
 * Lê o cabeçalho da página: <!-- page: {"title": "...", "description": "...", "nav": "..."} -->
 * Devolve { meta, body }.
 */
export function parsePage(source, fileName = 'página') {
  const match = source.match(/^\s*<!--\s*page:\s*(\{[\s\S]*?\})\s*-->\s*/);
  if (!match) throw new Error(`${fileName}: falta o cabeçalho <!-- page: {...} -->`);
  let meta;
  try {
    meta = JSON.parse(match[1]);
  } catch (err) {
    throw new Error(`${fileName}: JSON inválido no cabeçalho (${err.message})`);
  }
  for (const key of ['title', 'description']) {
    if (typeof meta[key] !== 'string' || !meta[key].trim()) {
      throw new Error(`${fileName}: campo "${key}" obrigatório no cabeçalho`);
    }
  }
  return { meta, body: source.slice(match[0].length) };
}

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Horários: lista de { days: ["Monday", ...], opens: "07:00", closes: "19:00" } (vira o JSON-LD do Google). */
function validateOpeningHours(list) {
  const ok =
    Array.isArray(list) &&
    list.length > 0 &&
    list.every(
      (h) =>
        Array.isArray(h.days) &&
        h.days.length > 0 &&
        h.days.every((d) => WEEK_DAYS.includes(d)) &&
        HH_MM.test(h.opens) &&
        HH_MM.test(h.closes) &&
        h.opens < h.closes,
    );
  if (!ok) {
    throw new Error('site.config.json: "openingHours" deve ser uma lista de { days: ["Monday", ...], opens: "07:00", closes: "19:00" }');
  }
}

/** Valida e completa os dados da clínica (site.config.json). */
export function buildSiteData(config) {
  if (!/^\d{12,13}$/.test(config.whatsapp || '')) {
    throw new Error('site.config.json: "whatsapp" deve ter só dígitos com DDI e DDD (ex.: 5587999999999)');
  }
  if (!/^[A-Za-z0-9._]{1,30}$/.test(config.instagram || '')) {
    throw new Error('site.config.json: "instagram" deve ser só o @, sem a arroba');
  }
  if (!/^https:\/\/[^\s"<>]+$/.test(config.googleBusinessUrl || '')) {
    throw new Error('site.config.json: "googleBusinessUrl" deve ser um link https da página da clínica no Google');
  }
  if (typeof config.indexable !== 'boolean') {
    throw new Error('site.config.json: "indexable" deve ser true ou false (false bloqueia o Google)');
  }
  // Endereço público do site, sem barra no fim. A prévia do WhatsApp só aceita imagem com URL absoluta.
  if (!/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}$/.test(config.siteUrl || '')) {
    throw new Error('site.config.json: "siteUrl" deve ser o endereço https do site, sem barra no fim (ex.: https://unimaia.com.br)');
  }
  if (!/^[A-Za-z0-9._]{1,30}$/.test(config.opticsInstagram || '')) {
    throw new Error('site.config.json: "opticsInstagram" deve ser só o @ da ótica, sem a arroba');
  }
  validateOpeningHours(config.openingHours);
  const fullAddress = `${config.street} - ${config.neighborhood}, ${config.city} - ${config.state}, ${config.cep}`;
  const mapsQuery = encodeURIComponent(fullAddress);
  const opticsQuery = encodeURIComponent(`${config.opticsStreet} - ${config.opticsNeighborhood}, ${config.city} - ${config.state}`);
  return {
    ...config,
    fullAddress,
    whatsappLink: `https://wa.me/${config.whatsapp}`,
    instagramUrl: `https://www.instagram.com/${config.instagram}/`,
    mapsEmbed: `https://www.google.com/maps?q=${mapsQuery}&output=embed`,
    mapsLink: `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`,
    opticsInstagramUrl: `https://www.instagram.com/${config.opticsInstagram}/`,
    opticsMapsLink: `https://www.google.com/maps/search/?api=1&query=${opticsQuery}`,
    year: String(new Date().getFullYear()),
  };
}

/** URL absoluta da página (og:url). A inicial é a raiz; as outras ficam sem .html, como no nginx. */
export function pageUrl(site, name) {
  return name === 'index' ? `${site.siteUrl}/` : `${site.siteUrl}/${name}`;
}

/**
 * Valor da <meta name="robots">. Enquanto o site não estiver no domínio próprio
 * (indexable=false), nenhuma página entra no Google; a 404 nunca entra.
 */
export function robotsContent(site, meta = {}) {
  return site.indexable && !meta.noindex ? 'index, follow' : 'noindex, nofollow';
}

/** Troca <!-- include:nome --> pelo conteúdo do partial (aceita partial dentro de partial). */
const INCLUDE_RE = /<!--\s*include:([a-z0-9-]+)\s*-->/g;

export function applyIncludes(html, partials, depth = 0) {
  if (!html.match(INCLUDE_RE)) return html;
  if (depth > 5) throw new Error('Includes aninhados demais (loop entre partials?)');
  const out = html.replace(INCLUDE_RE, (_, name) => {
    if (!(name in partials)) throw new Error(`Partial não encontrado: ${name}`);
    return partials[name];
  });
  return applyIncludes(out, partials, depth + 1);
}

/**
 * Troca {{grupo.chave}} pelos valores. Valores são escapados para HTML,
 * exceto os listados em `raw` (conteúdo que já é HTML confiável, gerado no build).
 */
export function applyPlaceholders(html, data, raw = new Set()) {
  const out = html.replace(/\{\{\s*([a-z]+)\.([A-Za-z0-9]+)\s*\}\}/g, (token, group, key) => {
    const value = data[group]?.[key];
    if (value === undefined) throw new Error(`Valor não definido para ${token}`);
    return raw.has(`${group}.${key}`) ? String(value) : escapeHtml(value);
  });
  const leftover = out.match(/\{\{[^}]*\}\}/);
  if (leftover) throw new Error(`Placeholder mal formado: ${leftover[0]}`);
  return out;
}

/** Limpa o SVG do Lucide para ser colado direto no HTML. */
export function normalizeSvg(svg) {
  return svg
    .replace(/<!--[\s\S]*?-->/g, '')
    // Só na tag <svg>: <rect width/height> dentro do ícone precisa ser mantido.
    .replace(/<svg\b[^>]*>/, (tag) => tag.replace(/\s(class|width|height)="[^"]*"/g, ''))
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();
}

/**
 * Troca <i data-lucide="nome" class="..."></i> pelo SVG inline.
 * Ícones decorativos recebem aria-hidden para leitores de tela.
 */
export function inlineIcons(html, icons) {
  return html.replace(/<i\s+data-lucide="([a-z0-9-]+)"([^>]*)>\s*<\/i>/g, (_, name, attrs) => {
    const svg = icons[name];
    if (!svg) throw new Error(`Ícone não encontrado em src/icons: ${name}.svg`);
    const cls = attrs.match(/class="([^"]*)"/)?.[1] ?? '';
    return svg.replace('<svg', `<svg class="${escapeHtml(cls)}" aria-hidden="true" focusable="false"`);
  });
}

/** Marca o link do menu da página atual (feito no build, não depende da URL). */
export function markActiveNav(html, nav) {
  if (!nav) return html;
  return html.replace(/data-nav="([a-z0-9-]+)"/g, (attr, name) =>
    name === nav ? `${attr} aria-current="page"` : attr,
  );
}

/** JSON seguro para <script type="application/ld+json"> (impede fechar a tag). */
export function jsonForScript(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

/** Dados estruturados para o Google (aparece em buscas locais e no Maps). */
export function clinicJsonLd(site) {
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalClinic',
    name: site.legalName,
    alternateName: site.name,
    description: site.tagline,
    url: `${site.siteUrl}/`,
    telephone: `+${site.whatsapp}`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.street,
      addressLocality: site.city,
      addressRegion: site.state,
      postalCode: site.cep,
      addressCountry: 'BR',
    },
    openingHoursSpecification: site.openingHours.map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: h.days,
      opens: h.opens,
      closes: h.closes,
    })),
    sameAs: [site.instagramUrl],
  };
}

/**
 * Lê as linhas `add_header Nome "valor" always;` de um arquivo de configuração do nginx.
 * Ignora valores com variáveis do nginx ($request_id), que só existem no servidor.
 */
export function parseNginxHeaders(text) {
  const headers = [];
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*add_header\s+([A-Za-z0-9-]+)\s+"([^"]*)"/);
    if (m && !m[2].includes('$')) headers.push([m[1], m[2]]);
  }
  return headers;
}
