# Correções técnicas e pendências do UVC

Atualizado em 26/10/2026. Diagnóstico original: `03a85bb`; redesenho: `a1e7c78`. Esta revisão implementa as correções de sistema descritas abaixo. O documento distingue problemas corrigidos de decisões editoriais e serviços ainda inexistentes. Resultados locais não comprovam o estado do deploy remoto.

## Decisão de arquitetura

O produto publicado usa **Git → validação → build → deploy**. O Studio é um espaço **público de leitura/revisão**, não um editor persistente. Nenhum endpoint aceita alterações de manuscritos ou cronologia. A desativação removeu uma capacidade insegura que não era usada pelo Studio; não há login, banco ou cache de manuscritos fingidos.

Conteúdo e histórico persistem no Git. Uma alteração só chega ao site depois de novo build/deploy. Um futuro editor remoto exigirá outro fluxo de autenticação, armazenamento e concorrência, descrito no [fluxo editorial](docs/architecture/editorial-workflow.md).

## Situação por problema

| ID | Situação atual | Resultado |
| --- | --- | --- |
| UVC-001 | Corrigido para o modelo atual | Escrita HTTP desabilitada em todas as rotas antigas |
| UVC-002 | Corrigido para o modelo atual | Removidos filesystem gravável e fallback em memória como persistência |
| UVC-003 | Corrigido | Não há sucesso/cached fictício; escrita retorna 405 |
| UVC-004 | Corrigido | Schemas, referências e consulta exata de capítulos validados |
| UVC-005 | Corrigido na aplicação; operação contínua | Sem CORS universal, sem parsing/escrita de payload; limites de tráfego dependem da hospedagem |
| UVC-006 | Corrigido na revisão | Next 15.5.28, transitivas corrigidas e auditoria sem avisos conhecidos |
| UVC-007 | Corrigido no contrato público | Política explícita de leitura, spoilers e Studio público; não oferece sigilo |
| UVC-008 | Corrigido | Páginas e APIs usam o snapshot do mesmo commit/build |
| UVC-009 | Contrato corrigido; revisão editorial pendente | IDs estáveis, schemas e normalização; 18 personagens continuam sem classificação editorial explícita |
| UVC-010 | Manifesto implementado; créditos pendentes | Fonte/dimensões/finalidade registradas; aprovação de direitos permanece humana |
| UVC-011 | Corrigido no repositório | Lint não interativo, testes permanentes e workflow de CI |
| UVC-012 | Corrigido | Cronologia migrada; overrides CSS antigos removidos |
| UVC-013 | Melhorado e testado; medição contínua | Axe, reflow, fonte ampliada, renderer no servidor e imagens responsivas; avaliação humana/produção ainda necessária |
| UVC-014 | Evolução futura delimitada | Edição, EPUB/PDF/KDP e IA automática não são anunciadas como implementadas |
| UVC-015 | Documentação/SEO implementados; domínio pendente | Guias atuais, links corrigidos, sitemap/robots/OG; configurar origem real para canonical/sitemap |

## UVC-001 a UVC-005 — Integridade e APIs

### Falhas anteriores

As rotas POST aceitavam escrita sem autenticação/validação, usavam `writeFileSync` no servidor e podiam responder `{success:true}` sem gravar. A timeline fazia merge de qualquer JSON e usava memória temporária como fallback. Capítulos eram escolhidos por prefixo. CORS liberava escrita para qualquer origem.

### Correção implementada

- `lib/read-only-api.ts` centraliza resposta **405 / READ_ONLY** e `Allow: GET, HEAD, OPTIONS` para POST, PUT, PATCH e DELETE, sem ler corpo nem chamar armazenamento.
- As duas APIs não têm mais escrita, armazenamento mutável ou fallback. Não existe opção de reativar POST apenas por definir uma variável/token.
- OPTIONS informa métodos de leitura sem `Access-Control-Allow-Origin: *` nem preflight de escrita.
- Capítulos são buscados pelo número exato no manifesto e pela allowlist de publicação. Queries desconhecidas, duplicadas, negativas, decimais, vazias ou com caminhos são rejeitadas com **400**; capítulo ausente/não compartilhado retorna **404**; falha real de arquivo retorna **500** sem stack/caminhos no JSON.
- `lib/chapters.ts` usa leitura assíncrona, valida contenção no diretório e calcula estatísticas reais. `lib/schemas.ts` confere correspondência de número/arquivo.
- `lib/content.ts` oferece os mesmos dados às páginas/APIs. A publicação tem semântica explícita de snapshot Git, sem alegar atualização em tempo real.
- Respostas incluem `nosniff`; a aplicação também define política de referência, bloqueio de iframe e permissões não utilizadas.

### Evidência de teste

A suite HTTP envia métodos de escrita com JSON e corpo inválido, compara hashes dos seis manuscritos e da timeline antes/depois e confirma que os GET permanecem iguais. Testa também HEAD, OPTIONS, ausência de wildcard CORS, respostas 400/404 e leitura exata de todos os capítulos. Testes unitários rejeitam caminhos e referências inválidos.

### Limites restantes

As APIs GET são públicas deliberadamente. CORS/robots não são autenticação. Limitação distribuída de tráfego e alertas precisam ser configurados na hospedagem; não foi introduzido rate limiter em memória que ofereceria uma garantia falsa em serverless. Um editor remoto exige autenticação e autorização de servidor, validação de escrita, armazenamento durável, controle de versão/conflitos e respostas reais de falha antes de reintroduzir escrita.

## UVC-006 — Dependências

**Implementado:** Next.js atualizado de 15.3.9 para **15.5.28**, dentro da stack permitida pelo projeto. PostCSS direto e transitivo resolvem para **8.5.31** por override compatível dentro do major 8. Sharp direto e transitivo resolvem para **0.35.5**. Lockfile atualizado e verificado pelo build.

`npm audit --audit-level=moderate` reportou **zero vulnerabilidades conhecidas em todas as dependências**, incluindo desenvolvimento, nesta revisão. O CI repete a auditoria; isso não garante ausência de vulnerabilidades ainda não publicadas. Manter atualizações e revisão de avisos como rotina. Não foi feita migração major arbitrária do Next.

## UVC-007 — Disponibilidade, spoilers e privacidade

**Implementado:** `data/publication.json` declara `git-static`, revisão pública e os seis capítulos já compartilhados. A mesma lista governa as páginas geradas, leitor, Studio, links de capítulos, sitemap e API. Se todos forem removidos da lista, o Studio apresenta estado vazio; o catálogo não oferece leitura inexistente.

O Studio informa que é público e não salva alterações. O acervo completo do Codex avisa sobre spoilers. Ausência de `statusVisibilidade` é normalizada como `NAO_CLASSIFICADO`, sem alegar publicação/privacidade. A classificação pública existente não foi expandida por suposição. O build bloqueia registros explicitamente marcados como `RESERVADO`, em vez de enviá-los silenciosamente no snapshot público; essa barreira não remove informação já colocada no Git público.

**Limite editorial:** este repositório e seu histórico são públicos. Tirar um capítulo da UI não o apaga do Git. Não há área privada e não devem ser enviados manuscritos confidenciais a ela. Migrar material realmente reservado para fonte privada e arquitetura autenticada exige decisão do autor; não é possível obter sigilo retroativo com um filtro cliente.

## UVC-008 e UVC-009 — Fonte de verdade e contratos

**Implementado:** `lib/content.ts`, schemas estritos e `scripts/validate-content.ts`. A validação roda em `predev`, `prebuild` e CI e rejeita:

- IDs duplicados, registros incompletos, campos desconhecidos e estados não suportados;
- capítulos/arquivos duplicados, caminhos inadequados ou números que não correspondem ao arquivo;
- referências a eras/séries/livros/capítulos inexistentes;
- arquivos de capítulo vazios e imagens ausentes/dimensões incorretas;
- arte sem registro ou vinculada a personagem inexistente;
- publicação de número que não existe no manifesto.

Foram adicionados **apenas IDs estáveis** às oito histórias, sem mudar títulos, sinopses ou arcos. `lib/catalog.ts` usa IDs, não posição/título. A escala híbrida original de Hades e o campo `livroIds` foram preservados no contrato. O filtro Terra agora também inclui o personagem híbrido.

**Pendência humana:** 18 personagens não possuem classificação editorial explícita. O build informa essa situação em vez de inventar status. Há texto descritivo da mesma saga em documentos e cronologia: são contextos diferentes e nenhuma reescrita automática foi feita para forçar equivalência. Revisão literária/canônica continua responsabilidade do autor.

## UVC-010 — Arquivo visual

**Implementado:** `data/media.json` registra as 20 imagens selecionadas com ID, arquivo original, dimensões, finalidade, descrição e campos de crédito/licença. O script de geração consome esse único manifesto. A validação confere fontes, dimensões reais, derivados e associações. O estado `verified` exige crédito e licença preenchidos. Os originais de `assets/` e `legacy/` permanecem intactos.

**Pendência humana:** créditos/licenças não demonstrados ficam `null` e `review-needed`. O registro não os aprova nem inventa autoria. Capas de baixa resolução precisam de novos arquivos fornecidos/aprovados pelo autor; o software não recupera detalhe inexistente. Símbolos continuam descritos como símbolos, não retratos oficiais.

## UVC-011 — Qualidade reprodutível

**Implementado:** ESLint flat config (Next/TypeScript), sem assistente interativo, e Prettier como verificação explícita. Foram adicionados **9 testes unitários** e **17 testes de integração/navegador** cobrindo contratos, integridade de arquivos, APIs, filtros, navegação, clipboard com falha, leitor, rotas, cabeçalhos, SEO e acessibilidade.

Workflow `.github/workflows/ci.yml`: instalação pelo lockfile, validação, formatação, lint, tipos, unitários, auditoria, build e navegador. Usa Node 22, permissão de repositório somente leitura, timeout e artefatos de falha. Não exige segredos nem manda conteúdo para ferramentas externas.

**Limite:** adicionar o workflow não configura branch protection nem garante sua execução no GitHub antes de o commit ser publicado. Alterar regras administrativas da `main` não foi feito; a preferência atual do autor é commit direto na branch.

## UVC-012 — Componentes e cronologia

**Implementado:** cronologia reescrita usando tokens semânticos e controles compartilhados (`PageIntro`, `SegmentedControl`, `StatusBadge`). Removidos todos os seletores/overrides `.timeline-page` e os valores antigos de paleta da página. Eras têm contexto expandível; cenas mantêm identidade ao filtrar, estado vazio, notas recolhidas e contexto de personagem/local. Copiar prompt trata sucesso/erro real de clipboard. Séries com catálogo têm links reais.

A cronologia é uma lista explorável, não um canvas ou grafo arrastável. Essa nova interação não foi inventada para satisfazer um rótulo antigo.

## UVC-013 — Acessibilidade e desempenho

**Implementado e medido localmente:**

- Axe/WCAG 2A, 2AA e 2.1AA nas seis páginas principais, sem violações detectadas nos estados iniciais testados.
- Testes de reflow em 320, 390, 768 e 1440 px, e aumento do tamanho-base de fonte. Sem overflow horizontal nesses cenários.
- Menu e estados de filtro têm nomes/estados acessíveis; leitor tem fonte/noturno e sumário recolhido no celular; feedback usa região de status; há foco visível, skip-link e respeito a movimento reduzido.
- Markdown agora é renderizado no servidor (`lib/render-chapters.tsx`), sem parser Markdown no bundle do leitor e sem HTML arbitrário habilitado. JavaScript inicial de `/ler` caiu de aproximadamente **157 KB para 119 KB** no relatório do build.
- Otimizador local de imagens do Next habilitado, formatos/tamanhos definidos e `sizes` nos cards/galeria/retratos. Não há domínios remotos de imagem liberados. As fontes seguem locais do sistema.

**Pendências contínuas:** leitores de tela em dispositivos reais, zoom completo de navegador e Core Web Vitals com tráfego real não foram certificados. Teste de fonte-base não equivale a auditoria manual integral de zoom. Axe não determina contraste de texto incorporado em imagens nem comprova conformidade WCAG total. Métricas de produção/alertas dependem da hospedagem e tráfego.

## UVC-014 — Edição, exportação e publicação

A falha de comunicação foi corrigida: documentação diferencia o que existe de planejamento. Não há botão de salvar, exportação/ISBN/ASIN inventado, serviço de Lore Guard “ativo” ou compra sem destino.

**Evoluções futuras:** editor remoto privado, EPUB/PDF validado, auditoria de IA e integração KDP exigem implementação e decisões editoriais próprias. O [fluxo editorial](docs/architecture/editorial-workflow.md) explica pré-condições. Não foram construídos um banco, login ou serviço de publicação fictícios apenas para marcar essa linha como concluída.

## UVC-015 — Documentação e descoberta

**Implementado:** README e contratos atualizados; guia editorial novo; blueprints antigos identificados como planejamento; links locais `file://` substituídos. Há `robots.txt`, sitemap e metadados Open Graph específicos de história, além dos títulos/descrições próprios.

**Configuração restante:** definir **`UVC_SITE_URL` com o domínio HTTPS real antes do build**. Sem isso o site funciona, mas não inventa domínio e não publica URLs no sitemap; a decisão não usa automaticamente o endereço antigo de referência. A origem é validada, rejeitando caminho, credenciais, parâmetros e protocolos inadequados. Testes cobrem sitemap com e sem origem.

`robots.txt` pede para não indexar Studio/API, mas não bloqueia acesso público. Não declara datas de atualização ou publicações que não foram verificadas.

## Verificação desta revisão

Executados localmente, com a aplicação de produção:

```bash
npm run validate:content
npm run format:check
npm run lint
npm run typecheck
npm test
npm audit --audit-level=moderate
npm run build
npm run test:e2e
```

Conteúdo: 21 personagens, 5 facções, 8 histórias, 6 capítulos e 20 imagens. Testes de escrita fazem POST deliberadamente **às rotas locais já somente leitura**, confirmam 405 e hashes inalterados. Nenhuma requisição de escrita foi enviada ao deploy remoto. Textos canônicos, artes originais e arquivo legado não foram reescritos; no dataset de histórias foram adicionados IDs técnicos.

## Próximos passos externos/editoriais

1. Configurar domínio real no deploy e confirmar build/CI remoto.
2. Revisar classificações de personagens e créditos/licenças das imagens com o autor.
3. Medir tráfego/acessibilidade real e configurar limites/alertas de hospedagem.
4. Se for desejado um editor privado, escolher identidade e armazenamento, implementar autorização/conflitos/backup e só então introduzir escrita HTTP.
5. Quando a obra estiver pronta editorialmente, implementar/validar o pipeline EPUB/KDP com metadados reais.
