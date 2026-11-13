# syntax=docker/dockerfile:1
# Site da Unimaia: imagem final com nginx servindo só os arquivos estáticos gerados no build.
# Uso: docker build -t unimaia-site . && docker run -p 8080:8080 unimaia-site

# Etapa 1: gera o site (Tailwind, ícones, páginas) e roda checagem de sintaxe e testes.
# Se algum teste falhar, a imagem não é criada.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run lint && npm run build && npm test

# Etapa 2: só nginx + o site pronto. Sem Node, sem código-fonte, sem dependências de build.
# Imagem oficial "unprivileged": o nginx roda como usuário comum (não root) na porta 8080.
# 1.30 = ramo estável do nginx; reconstruir a imagem traz as correções de segurança desse ramo.
FROM nginx/nginx-unprivileged:1.30-alpine
COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY deploy/nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/unimaia
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
