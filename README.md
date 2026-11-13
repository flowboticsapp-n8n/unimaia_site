# Site Unimaia · Clínica Médica e Odontológica (Lajedo-PE)

Site estático e rápido: as páginas são geradas no build e servidas por **nginx num container Docker** na VPS, atrás do proxy com HTTPS.
O agendamento acontece pelo WhatsApp da clínica (o site não guarda dados de pacientes).

**Hospedagem:** VPS própria (veja [Deploy na VPS](#deploy-na-vps-docker--nginx)).

## Como rodar

Requisito: Node.js 20 ou mais novo.

```bash
npm install
```

```bash
npm run build
```

```bash
npm run preview
```

Abra http://127.0.0.1:4173. O preview imita o nginx de produção: URLs sem `.html`, página 404 e os cabeçalhos de `deploy/nginx/security-headers.conf`. Para testar o container de verdade, veja [Deploy na VPS](#deploy-na-vps-docker--nginx).

```bash
npm test
```

`npm run check` roda a checagem de sintaxe, o build e os testes.

**CI (GitHub Actions):** `.github/workflows/ci.yml` roda em todo pull request e push na `main`: `npm ci`, `npm audit`, checagem de sintaxe, build e testes.

## Estrutura

| Caminho | O que é |
| :--- | :--- |
| `site.config.json` | **Dados da clínica** (endereço, WhatsApp, horário, Instagram). Mude aqui e todas as páginas atualizam. |
| `src/pages/` | Conteúdo de cada página. A primeira linha tem título e descrição para o Google. |
| `src/partials/` | Partes repetidas: cabeçalho, rodapé, logo, modal de agendamento, chamada final e `mobile-nav.html` (barra fixa do celular). |
| `src/js/main.js` | Menu do celular, modal e mensagem do WhatsApp. Sem bibliotecas. |
| `src/css/input.css` | Fontes e estilos extras. O resto é Tailwind (`tailwind.config.js`, com as cores da logo). |
| `src/icons/` | Ícones SVG (Lucide, licença ISC). Para usar um novo, copie o `.svg` para cá e use `<i data-lucide="nome" class="w-5 h-5"></i>`. |
| `src/fonts/` | Fontes Plus Jakarta Sans e Outfit (licença OFL), hospedadas no próprio site. |
| `src/static/` | Copiado como está para o site: `robots.txt`, ícones do navegador, `assets/brand/` (logos) e `assets/img/` (fotos). |
| `Dockerfile`, `deploy/nginx/`, `docker-compose.yml` | Imagem de produção (nginx) e a configuração dele: rotas, cache, cabeçalhos de segurança e logs. |
| `brand/` | Logo oficial original, fonte das variações (não vai para o site). |
| `media/` | Fotos originais, fonte das versões otimizadas (não vão para o site). |
| `scripts/` | Build, servidor de preview, `brand_assets.py` (variações da logo) e `optimize_images.py` (fotos em AVIF/WebP/JPEG). |
| `tests/` | Testes do build e da montagem da mensagem do WhatsApp. |

O build gera `dist/` (não vai para o Git).

## Deploy na VPS (Docker + nginx)

O `Dockerfile` da raiz gera a imagem de produção em duas etapas:

1. **Build** (`node:22-alpine`): instala as dependências (`npm ci`), roda a checagem de sintaxe, o build e os testes. Se algum teste falhar, a imagem não é criada.
2. **Final** (`nginx/nginx-unprivileged:1.30-alpine`): só o nginx e o site pronto (`dist/`). Sem Node e sem código-fonte. O nginx roda como usuário comum (não root) na porta **8080**.

O nginx (`deploy/nginx/default.conf`) faz:
- URLs sem `.html` (`/medicina` serve `medicina.html`) e a página `404.html` para endereços inexistentes;
- cabeçalhos de segurança (`deploy/nginx/security-headers.conf`): CSP, nosniff, Referrer-Policy, Permissions-Policy e `X-Request-ID`;
- cache de 1 ano para `/assets/*` (nomes com hash/versão) e `no-cache` no HTML, para publicação nova aparecer na hora;
- compressão gzip de HTML, CSS, JS e SVG;
- `GET /healthz` para o health check;
- log de acesso em JSON no stdout, com `request_id` e sem query string;
- só aceita GET/HEAD (POST e outros: 405) e nunca serve arquivos ocultos (`/.git`, `/.env`).

**O container não faz HTTPS.** O proxy da VPS (Traefik, Caddy, Nginx Proxy Manager, Easypanel, Coolify...) recebe o domínio com o certificado e encaminha para a porta 8080. Configure o HSTS no proxy, que é quem tem o HTTPS.

### Subir com Docker Compose

Na VPS:

```bash
git clone https://github.com/flowboticsapp-n8n/unimaia_site.git
```

```bash
cd unimaia_site && docker compose up -d --build
```

Depois aponte o proxy para `http://127.0.0.1:8080`. Se o proxy roda em outra rede Docker, troque o `ports` do `docker-compose.yml` pela rede do proxy e use `http://site:8080`.

Conferir se está tudo certo:

```bash
bash scripts/smoke-test.sh http://127.0.0.1:8080
```

Ver os logs (JSON, um por linha):

```bash
docker compose logs -f site
```

**Atualizar depois de um merge na `main`:**

```bash
git pull && docker compose up -d --build
```

**Voltar para a versão anterior** se algo der errado: `git checkout <commit-anterior>` e rode `docker compose up -d --build` de novo.

### Painéis (Easypanel, Coolify, Dokploy)

Crie um app a partir do repositório do GitHub com:
- tipo de build: **Dockerfile** (na raiz);
- porta interna: **8080**;
- health check: **`/healthz`**.

O painel cuida do domínio e do HTTPS.

### Segurança do container

O `docker-compose.yml` sobe o container com sistema de arquivos só leitura (`read_only` + `tmpfs /tmp`), sem capacidades extras do Linux (`cap_drop: ALL`), com `no-new-privileges` e logs rotativos (3 arquivos de 10 MB). A porta fica presa ao `127.0.0.1`, então só o proxy da própria VPS acessa.

**CI:** o job `docker` do GitHub Actions constrói a imagem, valida o nginx (`nginx -t`), sobe o container com essas mesmas restrições e roda o `scripts/smoke-test.sh` a cada PR.

> Se adicionar um serviço externo (Google Analytics, Meta Pixel, fotos de outro domínio), inclua o domínio no `Content-Security-Policy` de `deploy/nginx/security-headers.conf`, senão o navegador bloqueia. Atualize também a Política de Privacidade.

## Navegação no celular

- **Barra fixa embaixo** (`src/partials/mobile-nav.html`, só abaixo de 1024 px): Início, Especialidades, Agendar em destaque, WhatsApp e Contato. No celular ela substitui o botão flutuante do WhatsApp e a faixa azul de horário, que vai para o menu.
- **Menu lateral** com ícones; horário, endereço, Agendar e WhatsApp ficam no fim dele.
- **Formulário de agendamento** abre como uma folha que sobe de baixo. Os campos têm 16 px no celular, porque abaixo disso o iPhone dá zoom sozinho ao tocar no campo.
- **Especialidades:** cada card tem uma âncora (ex.: `/medicina#cardiologia`). A página inicial e os atalhos do topo de `/medicina` levam direto ao card. O teste `tests/links.test.mjs` falha se uma âncora usada em algum link deixar de existir.
- **Regra:** tudo que se toca precisa ter pelo menos 44x44 px.

## Logo e ícones

A logo oficial fica em `brand/unimaia-logo-original.webp`. As variações são geradas uma vez e versionadas no Git:

```bash
python3 scripts/brand_assets.py
```

O script precisa de Python com Pillow (com suporte a AVIF) e numpy. Ele não roda no build. Gera, em `src/static/assets/brand/`:

| Arquivo | Uso |
| :--- | :--- |
| `logo-horizontal-v1-{40,80}` | Cabeçalho e menu do celular (1x e 2x). |
| `logo-horizontal-dark-v1-{40,80}` | Rodapé, fundo escuro: o "V" vira branco. |
| `logo-vertical-v1-{320,640}` e `-dark` | Composição original, para usos maiores (redes sociais, materiais). |
| `simbolo-v1-256` | Só o símbolo "M". |
| `flowbotics-dark-v1-{24,48}` | Crédito "Desenvolvido por" no rodapé (logo da Flowbotics, com "Flow" em branco). |

Cada variação sai em **AVIF**, **WebP** e **PNG**. O `<picture>` do site entrega AVIF (cerca de 6 KB) para quem suporta e cai para WebP e PNG nos navegadores antigos. Também gera `favicon.ico`, `favicon-32.png`, `apple-touch-icon.png` e `icon-512.png` em `src/static/`.

Se a logo mudar, troque o arquivo original, suba a `VERSION` no script (v1 → v2) e atualize os nomes em `src/partials/logo*.html`. O nome novo evita que o navegador use a logo antiga guardada em cache.

## Imagens

**Foto do topo da página inicial:** é um esboço para a apresentação: médica conversando com paciente na mesa do consultório, foto de Vitaly Gariev no [Unsplash](https://unsplash.com/photos/doctor-consulting-with-a-patient-in-an-office-MJmsLpeHPfg) (licença gratuita, sem atribuição obrigatória). O original fica em `media/hero-consulta-original.jpg`. O `scripts/optimize_images.py` redimensiona a foto (640, 1024 e 1600 px) e gera AVIF, WebP e JPEG em `src/static/assets/img/`:

```bash
python3 scripts/optimize_images.py
```

Para trocar pela foto real da clínica: coloque o original em `media/`, ajuste a lista `IMAGES` do script (suba a versão v1 → v2), rode o script e atualize os nomes no `<picture>` do topo de `src/pages/index.html`.


Ao colocar fotos reais (equipe, fachada, recepção):
- salve em `src/static/img/` em **WebP** ou **AVIF**, já no tamanho de exibição (ex.: 400x400 para foto de perfil);
- use `<img src="/img/arquivo.webp" alt="descrição" width="400" height="400" loading="lazy" decoding="async">`;
- não use `loading="lazy"` na imagem principal do topo da página.

## Checklist para ir para produção (domínio próprio)

> **Hoje o Google está BLOQUEADO de indexar o site** (`"indexable": false` no `site.config.json`).
> Assim o site não aparece nas buscas antes de estar no endereço definitivo.
> Todo build mostra um aviso no log enquanto isso estiver ligado.

Quando o domínio da clínica estiver pronto, faça nesta ordem:

- [ ] Apontar o DNS do domínio para a VPS, configurar o domínio com HTTPS no proxy e conferir o site nele.
- [ ] **Liberar a indexação:** trocar para `"indexable": true` no `site.config.json`.
- [ ] Adicionar canonical apontando para o domínio, sitemap.xml e imagem de compartilhamento (og:image).
- [ ] Apagar o projeto antigo no Cloudflare (Workers & Pages → unimaia-site), para não sobrar uma cópia do site no ar.
- [ ] Cadastrar o domínio no Google Search Console e enviar o sitemap.
- [x] Desligar o GitHub Pages do repositório (Settings → Pages).
- [ ] Confirmar com a clínica os itens abaixo.

### Dados a confirmar com a clínica

**Política de Privacidade (`/privacidade`):**
- [ ] Canal para pedidos dos titulares (`privacyContact` no `site.config.json`), de preferência um e-mail.
- [ ] Nome do Encarregado pelo tratamento de dados (`dpoName`).
- [ ] Revisão do texto pelo jurídico ou pela assessoria de LGPD da clínica.
- [ ] Se ativar alguma ferramenta de métricas (GA4, Meta Pixel, Plausible...), atualizar as seções 2, 3 e 5 da política, a CSP do nginx e a data em `privacyUpdatedAt`.

**Avaliações na página inicial:**
- [ ] Confirmar com a clínica o uso das avaliações do Google no site, conferindo as regras de publicidade do CFM e do CFO sobre depoimentos. As escolhidas falam de atendimento e estrutura, não de resultado de tratamento.
- [ ] Conferir se o link `googleBusinessUrl` (`site.config.json`) abre a página da clínica no Google.

**Demais dados:**

Vieram de fontes públicas (Facebook, Instagram, cadastro do CNPJ e diretórios) e **precisam ser validados** antes de publicar:

- [ ] Endereço: o Facebook diz **nº 75**; o cadastro do CNPJ diz **nº 157**.
- [ ] WhatsApp: o Facebook diz **(87) 99995-2824**; diretórios citam **(87) 99941-7850**.
- [ ] Horário (seg. a sex., 9h às 18h): veio de um único diretório. Sábado?
- [ ] Nome e CRM do responsável técnico, obrigatório na publicidade médica (rodapé).
- [ ] Formas de pagamento (Pix, cartão, parcelamento), se a clínica quiser mostrar no site. A clínica **não aceita convênios**.
- [ ] Tratamentos odontológicos oferecidos (`src/pages/odontologia.html`).
- [ ] Tipos de ultrassom disponíveis (`src/pages/exames.html`).
- [ ] Profissionais da equipe, com registro e foto real (`src/pages/corpo-clinico.html`).
- [x] Logo oficial aplicada (variações em `src/static/assets/brand/`).
- [ ] Trocar a foto de esboço do topo da página inicial (Unsplash) por uma foto real da recepção ou da fachada da Unimaia.
- [ ] Pedir à clínica o arquivo vetorial da logo (SVG, AI ou PDF), se existir, para gerar as variações com nitidez máxima.
- [ ] Aprovar com a clínica a versão horizontal (símbolo ao lado do nome) e a versão para fundo escuro ("V" branco), que foram montadas a partir da logo original.
