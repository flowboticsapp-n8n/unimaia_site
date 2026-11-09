// Build do site estático: src/ -> dist/
// - Compila o Tailwind (só as classes usadas, minificado).
// - Monta cada página com os partials (cabeçalho, rodapé, modal).
// - Coloca os ícones como SVG dentro do HTML (sem biblioteca de ícones no navegador).
// - Gera CSS/JS com hash no nome, para cache longo no navegador sem risco de versão velha.
import { readFile, writeFile, mkdir, rm, cp, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parsePage,
  buildSiteData,
  applyIncludes,
  applyPlaceholders,
  normalizeSvg,
  inlineIcons,
  markActiveNav,
  jsonForScript,
  clinicJsonLd,
} from './lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src');
const dist = path.join(root, 'dist');
const assetsOut = path.join(dist, 'assets');

const hashOf = (content) => createHash('sha256').update(content).digest('hex').slice(0, 10);

async function readDir(dir, ext) {
  const files = (await readdir(dir)).filter((f) => f.endsWith(ext)).sort();
  const entries = await Promise.all(
    files.map(async (f) => [path.basename(f, ext), await readFile(path.join(dir, f), 'utf8')]),
  );
  return Object.fromEntries(entries);
}

async function writeHashed(name, ext, content) {
  const file = `${name}.${hashOf(content)}${ext}`;
  await writeFile(path.join(assetsOut, file), content);
  return `/assets/${file}`;
}

function buildCss() {
  const tmp = path.join(dist, '.tmp-app.css');
  const cli = path.join(root, 'node_modules', 'tailwindcss', 'lib', 'cli.js');
  execFileSync(
    process.execPath,
    [cli, '-c', path.join(root, 'tailwind.config.js'), '-i', path.join(src, 'css', 'input.css'), '-o', tmp, '--minify'],
    { cwd: root, stdio: ['ignore', 'ignore', 'inherit'] },
  );
  return tmp;
}

async function main() {
  const started = Date.now();
  await rm(dist, { recursive: true, force: true });
  await mkdir(path.join(assetsOut, 'fonts'), { recursive: true });

  const site = buildSiteData(JSON.parse(await readFile(path.join(root, 'site.config.json'), 'utf8')));
  const partials = await readDir(path.join(src, 'partials'), '.html');
  const pages = await readDir(path.join(src, 'pages'), '.html');
  const icons = Object.fromEntries(
    Object.entries(await readDir(path.join(src, 'icons'), '.svg')).map(([k, v]) => [k, normalizeSvg(v)]),
  );

  // CSS e JS com hash no nome.
  const cssTmp = buildCss();
  const cssPath = await writeHashed('app', '.css', await readFile(cssTmp));
  await rm(cssTmp);
  const jsPath = await writeHashed('main', '.js', await readFile(path.join(src, 'js', 'main.js')));

  // Fontes e arquivos estáticos (favicon, _headers, robots.txt).
  for (const f of (await readdir(path.join(src, 'fonts'))).filter((n) => n.endsWith('.woff2'))) {
    await cp(path.join(src, 'fonts', f), path.join(assetsOut, 'fonts', f));
  }
  await cp(path.join(src, 'static'), dist, { recursive: true });

  const layout = partials.layout;
  if (!layout) throw new Error('src/partials/layout.html não encontrado');

  for (const [name, source] of Object.entries(pages)) {
    const { meta, body } = parsePage(source, `${name}.html`);
    const head = meta.jsonld
      ? `<script type="application/ld+json">${jsonForScript(clinicJsonLd(site))}</script>`
      : '';

    let html = layout.replace('<!-- page:content -->', body);
    html = applyIncludes(html, partials);
    html = applyPlaceholders(
      html,
      {
        site,
        page: { title: meta.title, description: meta.description, head, robots: meta.noindex ? 'noindex' : 'index, follow' },
        asset: { css: cssPath, js: jsPath },
      },
      new Set(['page.head']),
    );
    html = inlineIcons(html, icons);
    html = markActiveNav(html, meta.nav);
    await writeFile(path.join(dist, `${name}.html`), html);
  }

  console.log(`Build ok em ${Date.now() - started} ms: ${Object.keys(pages).length} páginas, ${cssPath}, ${jsPath}`);
}

main().catch((err) => {
  console.error(`Erro no build: ${err.message}`);
  process.exit(1);
});
