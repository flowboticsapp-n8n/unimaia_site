# CLAUDE.md — Regras gerais (valem para qualquer projeto)

## Contexto sobre mim
- Sou técnico, mas estou aprendendo segurança, escala e arquitetura. Não presuma que eu já sei os riscos.
- Prefiro explicações diretas e curtas. Se algo que eu pedi for ruim ou ingênuo, diga sem rodeios e explique por quê.
- Não concorde por educação. Discorde com argumento.

## Como trabalhar comigo
1. **Planeje antes de codar** em tarefas que mexem em mais de 2 arquivos, banco de dados, autenticação ou dinheiro. Mostre o plano e espere meu OK.
2. **Se o pedido for ambíguo, pergunte** (no máximo 3 perguntas). Não adivinhe em decisões que são caras de desfazer.
3. **Mudanças pequenas e revisáveis.** Um assunto por vez. Evite refatorar coisas que não pedi.
4. **Explique decisões não óbvias** em 1-3 linhas: o que escolheu, qual a alternativa e o trade-off.
5. **Sinalize riscos proativamente.** Se você notar algo frágil (mesmo fora do escopo), avise no final em uma seção "Riscos que notei".
6. **Não invente.** Se não tem certeza de uma API, versão ou comportamento, diga que não tem e verifique na documentação ou no código.
7. **Simplicidade primeiro.** Não adicione microsserviços, filas, cache ou abstrações "para o futuro" sem um motivo concreto e medido. Mas deixe o caminho de evolução aberto (ver Escala).

## Ações que exigem minha confirmação explícita
- Apagar dados, arquivos ou branches; `rm -rf`; `DROP`/`TRUNCATE`; `git push --force`; `git reset --hard`.
- Migrations que alteram ou removem colunas/tabelas existentes.
- Instalar dependência nova (diga o nome, o motivo e se é mantida/popular).
- Mexer em autenticação, permissões, pagamentos ou variáveis de ambiente de produção.
- Qualquer comando que afete algo fora do diretório do projeto.

## Segurança (checklist obrigatório)
- **Toda entrada é hostil.** Valide e sanitize no servidor (tipo, tamanho, formato). Validação só no front não conta.
- **Autorização em todo endpoint, no servidor.** Sempre verifique se o usuário logado pode acessar *aquele recurso específico* (cuidado com IDOR: `/pedido/123`).
- **Segredos nunca no código nem no Git.** Use variáveis de ambiente, mantenha `.env` no `.gitignore` e mantenha um `.env.example` sem valores reais.
- **Queries parametrizadas / ORM.** Nunca concatenar input em SQL.
- **Senhas:** nunca implementar hash na mão. Use argon2/bcrypt via biblioteca, ou melhor, um provedor de auth consolidado.
- **Saída segura:** escape de HTML (XSS), sem `eval`, sem `innerHTML` com dados de usuário.
- **Uploads:** valide tipo real, tamanho, e nunca sirva arquivos enviados no mesmo domínio da aplicação sem cuidado.
- **Headers e cookies:** HTTPS, cookies `HttpOnly` + `Secure` + `SameSite`, CORS restrito (nunca `*` com credenciais), CSRF tratado quando usar cookies.
- **Rate limiting** em login, cadastro, reset de senha e endpoints caros.
- **Erros:** nunca vazar stack trace, SQL ou detalhes internos para o usuário. Logue no servidor, devolva mensagem genérica.
- **Logs:** nunca registrar senha, token, cartão ou dado pessoal sensível.
- **Dados pessoais:** colete o mínimo necessário. Pense em LGPD (consentimento, exclusão, acesso).
- **Dependências:** prefira poucas e mantidas. Rode `audit` (npm/pip/etc.) e avise sobre vulnerabilidades.

## Dados e banco
- Toda listagem é **paginada** e tem limite máximo. Nunca "retorna tudo".
- Crie **índices** para colunas usadas em `WHERE`, `JOIN` e `ORDER BY` frequentes. Em queries novas e relevantes, avise como checar com `EXPLAIN`.
- Evite **N+1**: carregue relações em lote (join / eager loading).
- Use **transações** quando mais de uma escrita precisa ser tudo-ou-nada.
- Operações que podem ser repetidas (webhook, pagamento, envio de e-mail) devem ser **idempotentes**.
- **Migrations versionadas e reversíveis.** Mudanças destrutivas em etapas (adiciona → migra dados → remove depois). Nunca editar migration já aplicada.
- Dinheiro: inteiro em centavos ou decimal, **nunca float**. Datas: armazenar em UTC.
- Lembre-me de **backup e teste de restauração** em qualquer projeto com dados que importam.

## Escala e confiabilidade
- **Servidor stateless:** nada de estado crítico em memória ou disco local (sessão, cache, upload). Isso permite rodar várias instâncias depois.
- **Tarefas pesadas ou lentas** (e-mail, relatório, IA, processamento) fora da requisição, em background/fila, quando passarem de alguns segundos.
- **Timeouts e retries com backoff** em toda chamada externa. Nenhuma chamada de rede sem timeout.
- **Falhe de forma segura:** se uma dependência externa cair, o sistema degrada sem corromper dados.
- **Concorrência:** pense no caso de dois usuários agindo no mesmo recurso ao mesmo tempo (race conditions, double submit, estoque negativo).
- **Cache só depois de medir** um gargalo real. Diga o que invalida o cache.
- Ao propor uma feature, responda brevemente: "o que quebra primeiro com 100x mais uso?"

## Qualidade e testes
- Toda lógica de negócio nova tem teste. **Fluxos críticos** (auth, permissões, pagamento) têm teste obrigatório, incluindo o caso negativo: "usuário A NÃO acessa dado do usuário B".
- Rode testes, linter e type-check antes de dizer que terminou. Se não puder rodar, diga isso.
- Não "corrija" teste que falha alterando o teste para passar, a menos que o teste esteja de fato errado (e explique).
- Prefira código simples e legível a código "esperto". Nomes claros, funções pequenas, comentários só para o "porquê".
- Configuração por ambiente (dev / staging / prod), nunca valores fixos no código.

## Operação
- Logs estruturados e úteis (com request id), sem dados sensíveis.
- Tratamento de erro explícito; nunca engolir exceção em silêncio.
- Endpoint de health check simples.
- Sugira monitoramento de erros (ex.: Sentry) em projetos que forem para produção.
- Deploy reproduzível (Docker ou script versionado) e CI mínimo (testes + lint + audit).
- Documente no README: como rodar, variáveis de ambiente necessárias e como fazer deploy.

## Ao finalizar uma tarefa, responda neste formato
1. **O que mudou** (2-4 linhas).
2. **Como testar** (comandos ou passos).
3. **Riscos que notei** (segurança, escala, dívida técnica). Escreva "nenhum" só se realmente não houver.
4. **Decisões que tomei sozinho** e que talvez eu queira revisar.

## Modo aprendizado (ativo por padrão)
Quando você aplicar um conceito importante de segurança, banco ou arquitetura, inclua **uma linha** explicando o conceito e por que importa ("Usei X porque Y; sem isso, Z poderia acontecer"). Quero aprender enquanto construo, sem virar aula longa.

---

## Específico deste projeto (preencher em cada projeto)
- **Stack:** site estático. HTML + Tailwind 3.4 (compilado no build) + JS puro. Build em Node (`scripts/build.mjs`), deploy no Cloudflare Workers com Static Assets (`wrangler.jsonc`, saída `dist/`).
- **Como rodar / testar:** `npm install`, `npm run build`, `npm run preview` (http://127.0.0.1:4173), `npm test`. `npm run check` faz build e testes.
- **Estrutura de pastas relevante:** `site.config.json` (dados da clínica), `src/pages/` (conteúdo), `src/partials/` (cabeçalho, rodapé, modal), `src/js/main.js`, `src/icons/` (SVG Lucide), `src/static/_headers` (cache e CSP).
- **Convenções próprias:** dados da clínica só no `site.config.json` (usar `{{site.chave}}`); ícones com `<i data-lucide="nome">` (viram SVG no build); links internos sem `.html` (`/medicina`); sem scripts de CDN externo.
- **Indexação:** bloqueada (`"indexable": false` no `site.config.json`) até o domínio próprio. Quando o assunto for domínio, produção ou SEO, lembrar o usuário do "Checklist para ir para produção" no README.
- **Git (autorizado pelo usuário):** depois que um PR da branch `claude/festive-mccarthy-9pf0vx` for mergeado (squash), pode recriá-la a partir da `main` e enviar com `git push --force-with-lease` sem perguntar. Qualquer outro force push continua exigindo confirmação. Merge de PR: só com autorização do usuário em cada pedido.
- **O que NUNCA mexer:** não inventar dados da clínica (profissionais, CRM, convênios, avaliações, números). O que não foi confirmado fica como "consulte pelo WhatsApp" ou TODO.
- **Escala esperada (usuários, volume de dados):** clínica local; poucas centenas de visitas por dia. Sem banco de dados; agendamento vai pelo WhatsApp.
