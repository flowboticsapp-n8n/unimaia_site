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
| `src/static/` | Copiado como está para o site: `_headers`, `favicon.svg`, `robots.txt`. |
| `scripts/` | Build e servidor de preview. |
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
- [ ] Desligar o GitHub Pages do repositório (Settings → Pages).
- [ ] Confirmar com a clínica os itens abaixo.

### Dados a confirmar com a clínica

Vieram de fontes públicas (Facebook, Instagram, cadastro do CNPJ e diretórios) e **precisam ser validados** antes de publicar:

- [ ] Endereço: o Facebook diz **nº 75**; o cadastro do CNPJ diz **nº 157**.
- [ ] WhatsApp: o Facebook diz **(87) 99995-2824**; diretórios citam **(87) 99941-7850**.
- [ ] Horário (seg. a sex., 9h às 18h): veio de um único diretório. Sábado?
- [ ] Nome e CRM do responsável técnico, obrigatório na publicidade médica (rodapé).
- [ ] Formas de pagamento (Pix, cartão, parcelamento), se a clínica quiser mostrar no site. A clínica **não aceita convênios**.
- [ ] Tratamentos odontológicos oferecidos (`src/pages/odontologia.html`).
- [ ] Tipos de ultrassom disponíveis (`src/pages/exames.html`).
- [ ] Profissionais da equipe, com registro e foto real (`src/pages/corpo-clinico.html`).
- [ ] Logo oficial em SVG para substituir a versão aproximada (`src/partials/logo.html` e `src/static/favicon.svg`).
