# UVC — Universo Virtual de Caio

Portal de ficção independente criado por Caio Henrique: histórias da Terra/Glen e conflitos cósmicos de Severum, Ormuz, Hades e suas facções. O repositório preserva o cânone, textos e acervo histórico, e contém o site Next.js 15.

## O que funciona hoje

- Vitrine pública mínima com a edição publicada **Red Right Hand: Ascensão**, link de compra na Amazon e página do livro. Obras em desenvolvimento não aparecem no catálogo público.
- Galeria separada em `/assets`, preservando as artes e estudos históricos. Essas imagens não são usadas como capas oficiais na vitrine.
- Codex público com busca e apenas os personagens classificados como públicos, sem expor as fichas completas do Studio.
- Studio privado: leitor dos seis capítulos de trabalho, cronologia e consulta canônica, com login GitHub exclusivo do autor e autorização no servidor. Fechado enquanto faltar configuração.
- Oficina em `/studio/personagens`: fichas por seções, referência canônica, prévia e arquivos JSON para baixar/reabrir. Rascunhos ficam na memória da página; ainda não há salvamento automático no servidor.
- APIs somente leitura: capítulos seguem a liberação explícita; cronologia exige sessão do autor. Nenhuma grava manuscritos.

A publicação segue o modelo **Git → validação → build → deploy**. Alterações em arquivos não aparecem num deploy antigo: é necessário reconstruir a aplicação. A política explícita de capítulos compartilhados está em [`data/publication.json`](data/publication.json). Todos os arquivos deste repositório público devem ser tratados como públicos; filtro de spoilers não é sigilo.

## Executar

Node.js 22 ou superior e npm. Instalar do lockfile:

```bash
npm ci
npm run dev
```

Desenvolvimento e build executam a validação de conteúdo automaticamente. Para servir a compilação de produção:

```bash
npm run build
npm start
```

Copie `.env.example` para `.env.local` se quiser configurar `UVC_SITE_URL` com a origem HTTPS real do deploy, **antes de compilar**. Sem essa variável o site funciona, mas não inventa domínio canônico e o sitemap fica sem URLs. Não use o endereço do site antigo apenas por ter sido referência visual.

## Acesso ao Studio

A vitrine segue `data/publication.json`. A lista de capítulos públicos está vazia: `/ler/*` e a API de capítulos não disponibilizam os manuscritos. `/studio` exige autenticação e autorização no servidor antes de carregar conteúdo; o link no portal não concede acesso. Sem configuração OAuth completa, a entrada informa indisponibilidade e não carrega manuscritos.

Configure a OAuth App do GitHub e as variáveis de servidor conforme o [guia de acesso ao Studio](docs/architecture/studio-access.md). Nenhum segredo deve usar prefixo `NEXT_PUBLIC_` ou entrar no Git. O login protege o workspace; os arquivos deste repositório e o acervo compartilhado continuam públicos.

## Verificações

```bash
npm run validate:content
npm run lint
npm run typecheck
npm test
npm audit --audit-level=moderate
npm run build
npx playwright install chromium
npm run test:e2e
```

O CI em [`.github/workflows/ci.yml`](.github/workflows/ci.yml) repete as verificações e instala as dependências do navegador. Os testes de integração usam a aplicação compilada em `127.0.0.1:3100` e `:3101` (configuração fictícia de autenticação), sem modificar conteúdo. Artefatos de falha ficam em `test-results/` e não entram no Git.

## Estrutura

| Diretório/arquivo | Responsabilidade |
| --- | --- |
| `app/` | Páginas, leitura, APIs e metadados |
| `components/` | Interface compartilhada, leitor e navegação |
| `lib/content.ts`, `lib/schemas.ts` | Fonte de dados da aplicação e contratos verificados no build |
| `data/` | Personagens, facções, histórias, cronologia e política de publicação |
| `books/red-right-hand/` | Manifesto e textos canônicos em Markdown |
| `assets/`, `legacy/` | Arquivo histórico preservado |
| `data/media.json`, `public/media/` | Manifesto das imagens selecionadas e derivados WebP |
| `tests/` | Contratos, APIs, interface, reflow e acessibilidade automatizada |
| `docs/` | Cânone, arquitetura, decisões e fluxo editorial |

Para regenerar os derivados das imagens: `npm run media:prepare`. O manifesto registra fonte, dimensões, finalidade e revisão de créditos/licenças; arquivos desconhecidos não recebem autoria inventada.

## Documentação

- [Oficina de personagens e limites de salvamento](docs/architecture/studio-character-workshop.md)
- [Fluxo editorial e publicação](docs/architecture/editorial-workflow.md)
- [Contratos das APIs e schemas](docs/architecture/api-schemas.md)
- [Design system](docs/architecture/design-system.md)
- [Problemas resolvidos e pendências](problems.md)
- [Diretrizes do cânone](AGENTS.md)
- [Cosmologia](docs/lore/cosmology.md) e [personagens](docs/characters/)

Exportação EPUB/PDF/KPF, edição com salvamento e auditoria automática são **evoluções futuras**, não capacidades existentes. A publicação KDP precisa de validação editorial e metadados reais. Diagramas antigos de produto devem ser lidos como planejamento.

O universo, os textos e personagens são apresentados como criação de Caio Henrique. A proveniência de cada arquivo visual histórico é registrada separadamente, sem presumir licença apenas por estar no acervo.
