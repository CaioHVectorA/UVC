# UVC — Universo Virtual de Caio

Portal de ficção independente criado por Caio Henrique: histórias da Terra/Glen e conflitos cósmicos de Severum, Ormuz, Hades e suas facções. O repositório preserva o cânone, textos e acervo histórico, e contém o site Next.js 15.

## O que funciona hoje

- Catálogo de oito histórias, com sinopses, capas/símbolos e disponibilidade de leitura explícita.
- Leitor de seis capítulos de Red Right Hand, renderizados dos Markdown canônicos, com tema e tamanho de texto.
- Codex com busca, filtros, seleção editorial e acervo público com aviso de spoilers.
- Galeria visual, facções e cronologia de eras, cenas e séries.
- Studio **público** de consulta/revisão. Não é editor persistente nem área autenticada.
- APIs **somente leitura**. Não gravam manuscritos, não mantêm cache em memória como armazenamento e não prometem salvar.

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

O CI em [`.github/workflows/ci.yml`](.github/workflows/ci.yml) repete as verificações e instala as dependências do navegador. Os testes de integração usam a aplicação compilada em `127.0.0.1:3100`, sem modificar conteúdo. Artefatos de falha ficam em `test-results/` e não entram no Git.

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

- [Fluxo editorial e publicação](docs/architecture/editorial-workflow.md)
- [Contratos das APIs e schemas](docs/architecture/api-schemas.md)
- [Design system](docs/architecture/design-system.md)
- [Problemas resolvidos e pendências](problems.md)
- [Diretrizes do cânone](AGENTS.md)
- [Cosmologia](docs/lore/cosmology.md) e [personagens](docs/characters/)

Exportação EPUB/PDF, edição com salvamento, login, auditoria automática e links de compra são **evoluções futuras**, não capacidades existentes. A publicação KDP precisa de validação editorial e metadados reais. Diagramas antigos de produto devem ser lidos como planejamento.

O universo, os textos e personagens são apresentados como criação de Caio Henrique. A proveniência de cada arquivo visual histórico é registrada separadamente, sem presumir licença apenas por estar no acervo.
