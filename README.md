# Site Unimaia · Clínica Médica e Odontológica (Lajedo-PE)

Site estático, rápido e sem servidor: as páginas são geradas no build e publicadas no **Cloudflare Workers (Static Assets)**, o caminho recomendado pelo Cloudflare para sites novos.
O agendamento acontece pelo WhatsApp da clínica (o site não guarda dados de pacientes).

**No ar:** https://unimaia-site.flowboticsapp.workers.dev/ (endereço provisório do Cloudflare, até ligar o domínio da clínica).

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

Abra http://127.0.0.1:4173. O preview imita o Cloudflare: URLs sem `.html`, página 404 e cabeçalhos do `_headers`.

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
| `src/partials/` | Partes repetidas: cabeçalho, rodapé, logo, modal de agendamento, chamada final. |
| `src/js/main.js` | Menu do celular, modal e mensagem do WhatsApp. Sem bibliotecas. |
| `src/css/input.css` | Fontes e estilos extras. O resto é Tailwind (`tailwind.config.js`, com as cores da logo). |
| `src/icons/` | Ícones SVG (Lucide, licença ISC). Para usar um novo, copie o `.svg` para cá e use `<i data-lucide="nome" class="w-5 h-5"></i>`. |
| `src/fonts/` | Fontes Plus Jakarta Sans e Outfit (licença OFL), hospedadas no próprio site. |
| `src/static/` | Copiado como está para o site: `_headers`, `robots.txt`, ícones do navegador e `assets/brand/` (logos). |
| `brand/` | Logo oficial original, fonte das variações (não vai para o site). |
| `scripts/` | Build, servidor de preview e `brand_assets.py` (gera as variações da logo). |
| `tests/` | Testes do build e da montagem da mensagem do WhatsApp. |

O build gera `dist/` (não vai para o Git).

## Deploy no Cloudflare (Workers com Static Assets)

A configuração está em `wrangler.jsonc`: publica a pasta `dist/`, serve `/medicina` a partir de `medicina.html` e usa `404.html` para endereços inexistentes. Não há código de servidor.

**Primeira vez (no painel do Cloudflare; os nomes dos botões podem mudar):**
1. **Workers & Pages → Create → Workers → Import a repository** e escolha este repositório do GitHub.
2. Configuração do build:
   - **Production branch:** `main`
   - **Build command:** `npm run build`
   - **Deploy command:** `npx wrangler deploy` (padrão)
   - **Branches que não são a `main`** rodam `npx wrangler preview` e geram uma prévia com endereço próprio, sem mexer no site no ar. Esse comando exige o bloco `"previews"` no `wrangler.jsonc` (já incluso).
   - O Node vem do arquivo `.node-version` (22). As dependências são instaladas automaticamente a partir do `package-lock.json`.
3. Depois disso, cada push na `main` publica o site sozinho. Antes de ter domínio próprio, o site fica em **https://unimaia-site.flowboticsapp.workers.dev/**.
4. **Domínio próprio:** em **Settings → Domains & Routes**. No Workers, o domínio precisa estar gerenciado pelo Cloudflare (DNS apontado para ele, plano grátis). Se o domínio for do Registro.br, troque os servidores DNS para os do Cloudflare.
5. **Velocidade dos usuários reais:** em **Analytics & Logs → Web Analytics**, adicione o site. Ele mede os Core Web Vitals sem cookies. O `_headers` já libera o script do Cloudflare.

**Plano gratuito:** requisições de arquivos estáticos não são cobradas. O build tem 3.000 minutos por mês (o deste site leva poucos segundos), 1 build por vez e no máximo 20 min cada.

O Cloudflare entrega tudo por CDN, com HTTPS e compressão Brotli. O `_headers` (em `src/static/`, copiado para `dist/`) define:
- cache de 1 ano para `/assets/*` (CSS/JS têm hash no nome, então nunca ficam velhos);
- cabeçalhos de segurança: CSP, nosniff, Referrer-Policy e Permissions-Policy.

> Se adicionar um serviço externo (Google Analytics, Meta Pixel, fotos de outro domínio), inclua o domínio no `Content-Security-Policy` do `src/static/_headers`, senão o navegador bloqueia.

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

Ao colocar fotos reais (equipe, fachada, recepção):
- salve em `src/static/img/` em **WebP** ou **AVIF**, já no tamanho de exibição (ex.: 400x400 para foto de perfil);
- use `<img src="/img/arquivo.webp" alt="descrição" width="400" height="400" loading="lazy" decoding="async">`;
- não use `loading="lazy"` na imagem principal do topo da página.

## Checklist para ir para produção (domínio próprio)

> **Hoje o Google está BLOQUEADO de indexar o site** (`"indexable": false` no `site.config.json`).
> Assim o endereço provisório `workers.dev` e as prévias de PR não aparecem nas buscas.
> Todo build mostra um aviso no log enquanto isso estiver ligado.

Quando o domínio da clínica estiver pronto, faça nesta ordem:

- [ ] Ligar o domínio no Cloudflare (Settings → Domains & Routes) e conferir o site nele.
- [ ] **Liberar a indexação:** trocar para `"indexable": true` no `site.config.json`.
- [ ] Adicionar canonical apontando para o domínio, sitemap.xml e imagem de compartilhamento (og:image).
- [ ] Desativar o endereço `workers.dev` do Worker, para não ter conteúdo duplicado no Google.
- [ ] Cadastrar o domínio no Google Search Console e enviar o sitemap.
- [x] Desligar o GitHub Pages do repositório (Settings → Pages).
- [ ] Confirmar com a clínica os itens abaixo.

### Dados a confirmar com a clínica

**Política de Privacidade (`/privacidade`):**
- [ ] Canal para pedidos dos titulares (`privacyContact` no `site.config.json`), de preferência um e-mail.
- [ ] Nome do Encarregado pelo tratamento de dados (`dpoName`).
- [ ] Revisão do texto pelo jurídico ou pela assessoria de LGPD da clínica.
- [ ] Se ativar o Web Analytics do Cloudflare ou outra ferramenta (GA4, Meta Pixel), atualizar as seções 2, 3 e 5 da política e a data em `privacyUpdatedAt`.

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
- [ ] Pedir à clínica o arquivo vetorial da logo (SVG, AI ou PDF), se existir, para gerar as variações com nitidez máxima.
- [ ] Aprovar com a clínica a versão horizontal (símbolo ao lado do nome) e a versão para fundo escuro ("V" branco), que foram montadas a partir da logo original.
