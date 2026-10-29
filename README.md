# UVC — Universo Virtual de Caio

Aplicação de ficção de Caio Henrique com vitrine pública e um Studio de autoria conectado ao PostgreSQL.

## Hoje

- **Vitrine:** Red Right Hand: A Ascensão publicado, com capa e link Amazon. **Marginal é o único projeto em desenvolvimento.** Os demais títulos permanecem no acervo do universo.
- **Personagens:** 31 fichas públicas com origem no cânone e no legado. O Studio permite editar fichas, criar outras, manter notas privadas e controlar sua publicação.
- **Conhecimento:** conceitos, lugares, objetos e facções são fichas próprias. “Planetas cegos” inicia como conceito privado a definir pelo autor, sem regras inventadas.
- **Mapa:** conexões direcionadas com rótulos, seleção de fichas, navegação por vizinhança, pan/zoom e layout salvo no banco.
- **Manuscritos:** edição de texto, contagem de palavras, leitura e histórico. Importação PDF/TXT/Markdown, com texto editável e original preservado para download privado. Não há exportação Kindle implementada.
- **Cronologia e tarefas:** eventos com ordem/referência temporal; tarefas com prioridade, prazo e estado; ambos se ligam às outras fichas.
- **Galeria:** referências visuais e suas descrições, conectadas às fichas. A seleção publicada é independente das ideias e manuscritos privados.
- **Persistência:** fichas, ligações, layout, versões, documentos originais e sessões ficam no PostgreSQL. O editor não depende de localStorage para salvar.

## Login e banco

O usuário inicial é **admin**, senha **admin**, conforme solicitado para esta etapa. A senha fica como hash scrypt com salt; sessões usam cookies HttpOnly/SameSite e tokens aleatórios, com expiração e revogação no DB. Esse par conhecido é temporário e deve ser trocado antes de tratar o Studio como uma área exclusiva do autor em um deploy público.

**A única conexão obrigatória é `DATABASE_URL` (ou `POSTGRES_URL`).** Não é necessário cadastrar uma OAuth App. Sem banco configurado, o Studio informa a pendência e não finge salvar; a vitrine pode exibir o snapshot público do repositório. O PostgreSQL local não é automaticamente o banco da Vercel.

Node.js 24 e npm:

```bash
npm ci
# Configure DATABASE_URL em .env.local, usando o modelo .env.example.
npm run db:init
npm run dev
```

O setup local desta revisão usa o contêiner `uvc-studio-postgres`, porta `127.0.0.1:55439`, com volume persistente e segredo apenas em `.env.local`, ignorado pelo Git. Para produção, configure a conexão hospedada nas variáveis da Vercel e faça novo deploy. Não copie o endereço local para a Vercel.

As migrações ficam em `db/migrations`; a inicialização é transacional e serializada. O seed consome os datasets canônicos uma vez e não sobrescreve edições do banco a cada inicialização.

## Marginal

O PDF fornecido pelo autor foi importado no banco local, com texto e arquivo original privados. O manuscrito não foi adicionado ao Git público. Também foram criadas fichas privadas iniciais de seus personagens para revisão.

Para importar no banco selecionado em `.env.local`:

```bash
npm run db:import:marginal -- "/caminho/Marginal PTP 2025-2.pdf"
```

O app oferece o botão **Importar manuscrito** para PDF, TXT e Markdown (até 4 MB; PDFs até 500 páginas). Extração de texto não preserva a diagramação: o original permanece disponível. PDF digitalizado sem texto precisa de OCR, que não é simulado pelo aplicativo.

## Verificar

```bash
npm run validate:content
npm run lint
npm run typecheck
npm test
npm run build
npm run db:test
npm run test:e2e
```

Os testes de navegador usam um PostgreSQL **isolado** (`uvc_test`, porta local 55440) e o login real do aplicativo. O preparo dos testes recusa bancos com outro nome/host. O CI provisiona um PostgreSQL próprio. Os testes não apagam o banco de trabalho.

## Conteúdo e manutenção

`data/characters.json`, `data/factions.json` e `data/series_and_solos.json` alimentam o acervo inicial. As fichas públicas do banco controlam as atualizações publicadas pelo Studio. Notas privadas não são serializadas para a wiki. Manuscritos e fichas novas iniciam privados.

Os arquivos e o histórico deste repositório continuam públicos. Não adicione manuscritos confidenciais, backups ou segredos ao Git. Os originais em `assets/` e os textos legados foram preservados. Atualize o índice das imagens com `npm run assets:index` quando necessário.

- [Studio com PostgreSQL](docs/architecture/studio-database.md)
- [Login e fronteira pública/privada](docs/architecture/studio-access.md)
- [Fluxo editorial](docs/architecture/editorial-workflow.md)
- [Contratos de API](docs/architecture/api-schemas.md)
- [Problemas e estado das entregas](problems.md)
- [Diretrizes do cânone](AGENTS.md)
