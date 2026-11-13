#!/usr/bin/env bash
# Teste de fumaça do container: confere que o nginx serve o site como esperado.
# Uso: bash scripts/smoke-test.sh http://127.0.0.1:8080
set -euo pipefail

BASE="${1:-http://127.0.0.1:8080}"
FAIL=0

ok()   { echo "OK   $1"; }
fail() { echo "FALHA $1"; FAIL=1; }

# Espera o container responder (até 30 s).
for _ in $(seq 1 30); do
  curl -fsS -o /dev/null --max-time 2 "$BASE/healthz" && break
  sleep 1
done

status() { curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$@"; }
header() { curl -s -D - -o /dev/null --max-time 5 "${@:2}" | tr -d '\r' | grep -i "^$1:" | head -1 | cut -d' ' -f2-; }

# Health check
[ "$(curl -s --max-time 5 "$BASE/healthz")" = "ok" ] && ok "/healthz responde ok" || fail "/healthz"

# Páginas (URLs sem .html)
for p in / /medicina /odontologia /exames /corpo-clinico /contato /privacidade; do
  [ "$(status "$BASE$p")" = "200" ] && ok "$p 200" || fail "$p deveria ser 200"
done

# 404 com a página própria do site
[ "$(status "$BASE/nao-existe")" = "404" ] && ok "/nao-existe 404" || fail "/nao-existe deveria ser 404"
curl -s --max-time 5 "$BASE/nao-existe" | grep -q "Não encontramos esta página" && ok "404 usa a página do site" || fail "404 sem a página do site"
[ "$(status "$BASE/convenios")" = "404" ] && ok "/convenios 404" || fail "/convenios deveria ser 404"

# Arquivos ocultos nunca são servidos
[ "$(status "$BASE/.git/config")" = "404" ] && ok "/.git/config bloqueado" || fail "/.git/config deveria ser 404"

# Site só de leitura
[ "$(status -X POST "$BASE/")" = "405" ] && ok "POST bloqueado (405)" || fail "POST deveria ser 405"

# Cabeçalhos de segurança (na página e na 404)
for p in / /nao-existe; do
  csp="$(header content-security-policy "$BASE$p")"
  [[ "$csp" == *"default-src 'self'"* && "$csp" == *"frame-ancestors 'none'"* ]] && ok "CSP em $p" || fail "CSP ausente em $p"
  [ "$(header x-content-type-options "$BASE$p")" = "nosniff" ] && ok "nosniff em $p" || fail "nosniff ausente em $p"
done
[ -n "$(header x-request-id "$BASE/")" ] && ok "X-Request-ID presente" || fail "X-Request-ID ausente"
[[ "$(header server "$BASE/")" != *"/"* ]] && ok "versão do nginx escondida" || fail "header Server mostra a versão"

# Cache: HTML revalida sempre; assets com hash ficam 1 ano
[ "$(header cache-control "$BASE/")" = "no-cache" ] && ok "HTML com no-cache" || fail "HTML sem no-cache"
css="$(curl -s --max-time 5 "$BASE/" | grep -o '/assets/app\.[a-f0-9]*\.css' | head -1)"
[ -n "$css" ] && ok "CSS encontrado: $css" || fail "CSS não encontrado no HTML"
[[ "$(header cache-control "$BASE$css")" == *"immutable"* ]] && ok "assets com cache de 1 ano" || fail "assets sem cache immutable"
[ "$(header content-encoding "$BASE$css" -H 'Accept-Encoding: gzip')" = "gzip" ] && ok "CSS comprimido com gzip" || fail "CSS sem gzip"
[[ "$(header content-type "$BASE/assets/img/hero-consulta-v1-1600.avif")" == "image/avif"* ]] && ok "AVIF com content-type certo" || fail "AVIF com content-type errado"

if [ "$FAIL" -ne 0 ]; then
  echo "Teste de fumaça FALHOU"
  exit 1
fi
echo "Teste de fumaça passou"
