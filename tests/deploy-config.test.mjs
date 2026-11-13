import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseNginxHeaders } from '../scripts/lib.mjs';

// Confere a configuração do container (Dockerfile + nginx) sem precisar do Docker.
// O teste completo, com o container rodando, fica no CI (job "docker" + scripts/smoke-test.sh).
const nginxConf = readFileSync('deploy/nginx/default.conf', 'utf8');
const headersConf = readFileSync('deploy/nginx/security-headers.conf', 'utf8');
const dockerfile = readFileSync('Dockerfile', 'utf8');
const dockerignore = readFileSync('.dockerignore', 'utf8');

/** Blocos `location ... { ... }` do nginx (conteúdo entre as chaves). */
function locationBlocks(conf) {
  const blocks = [];
  const re = /location\s+[^{]+\{/g;
  let m;
  while ((m = re.exec(conf))) {
    let depth = 1;
    let i = re.lastIndex;
    while (depth && i < conf.length) {
      if (conf[i] === '{') depth++;
      if (conf[i] === '}') depth--;
      i++;
    }
    blocks.push({ head: m[0], body: conf.slice(re.lastIndex, i - 1) });
  }
  return blocks;
}

test('parseNginxHeaders lê add_header e ignora valores com variáveis do nginx', () => {
  const out = parseNginxHeaders('add_header A "1" always;\n# add_header B "2";\nadd_header C $request_id always;\n  add_header D "x y";');
  assert.deepEqual(out, [['A', '1'], ['D', 'x y']]);
});

test('cabeçalhos de segurança: CSP restritiva, nosniff e Referrer-Policy', () => {
  const headers = Object.fromEntries(parseNginxHeaders(headersConf));
  const csp = headers['Content-Security-Policy'];
  for (const rule of ["default-src 'self'", "script-src 'self'", "frame-ancestors 'none'", "object-src 'none'", "base-uri 'self'"]) {
    assert.ok(csp.includes(rule), `CSP sem: ${rule}`);
  }
  assert.ok(!csp.includes('cloudflare'), 'CSP ainda libera script do Cloudflare');
  assert.ok(!csp.includes('unsafe-inline') && !csp.includes('unsafe-eval'), 'CSP não deve liberar inline/eval');
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(headers['Referrer-Policy'], 'strict-origin-when-cross-origin');
});

test('todo location com add_header inclui os cabeçalhos de segurança (pegadinha do nginx)', () => {
  const faltando = locationBlocks(nginxConf)
    .filter((b) => /\badd_header\b/.test(b.body) && !b.body.includes('security-headers.conf'))
    .map((b) => b.head.trim());
  assert.deepEqual(faltando, []);
});

test('nginx: URLs sem .html, 404 própria, health check, cache e porta sem root', () => {
  assert.match(nginxConf, /listen 8080/);
  assert.match(nginxConf, /try_files \$uri \$uri\.html \$uri\/ =404;/);
  assert.match(nginxConf, /error_page 404 \/404\.html;/);
  assert.match(nginxConf, /location = \/healthz/);
  assert.match(nginxConf, /location \/assets\/[\s\S]*?max-age=31536000, immutable/);
  assert.match(nginxConf, /server_tokens off;/);
  assert.match(nginxConf, /return 405;/);
  assert.ok(!/\$request_uri/.test(nginxConf), 'log não deve registrar query string (pode ter dado pessoal)');
});

test('Dockerfile: build em etapas, imagem final sem root e caminhos iguais aos do nginx', () => {
  assert.match(dockerfile, /FROM node:\S+ AS build/);
  assert.match(dockerfile, /RUN npm run lint && npm run build && npm test/);
  const finalFrom = [...dockerfile.matchAll(/^FROM\s+(\S+)/gm)].at(-1)[1];
  assert.match(finalFrom, /^nginx\/nginx-unprivileged:/, 'imagem final deve ser a versão sem root');
  assert.match(dockerfile, /EXPOSE 8080/);
  assert.match(dockerfile, /HEALTHCHECK[\s\S]*\/healthz/);

  const root = nginxConf.match(/^\s*root\s+(\S+);/m)[1];
  assert.match(dockerfile, new RegExp(`COPY --from=build /app/dist ${root}\\b`), 'pasta do site diferente do "root" do nginx');
  const include = nginxConf.match(/include\s+(\S+security-headers\.conf);/)[1];
  assert.ok(dockerfile.includes(`COPY deploy/nginx/security-headers.conf ${include}`), 'caminho do include diferente do COPY');
  assert.ok(dockerfile.includes('COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf'));
});

test('.dockerignore deixa de fora segredos, dependências e originais pesados', () => {
  for (const entry of ['.env', 'node_modules', '.git', 'media', 'brand']) {
    assert.ok(dockerignore.split('\n').includes(entry), `.dockerignore sem: ${entry}`);
  }
});
