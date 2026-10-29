# Correções técnicas e pendências do UVC

Atualizado em 28/10/2026. Diagnóstico original: `03a85bb`; redesenho: `a1e7c78`. Esta revisão implementa as correções de sistema descritas abaixo. O documento distingue problemas corrigidos de decisões editoriais e serviços ainda inexistentes. Resultados locais não comprovam o estado do deploy remoto.

## Decisão de arquitetura

O produto publicado usa **Git → validação → build → deploy**. O Studio é um espaço **privado de leitura/revisão**, protegido por autenticação GitHub e autorização do ID do autor; não é um editor persistente. Nenhum endpoint aceita alterações de manuscritos ou cronologia. A desativação removeu uma capacidade insegura que não era usada pelo Studio; há login do autor, sem banco ou cache de manuscritos fingidos.

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
| UVC-007 | Corrigido no contrato público | Leitor público separado de Studio autenticado; Git público continua sem sigilo |
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

O Studio agora exige login GitHub do autor antes de carregar conteúdo e informa que não salva alterações. O acervo completo do Codex avisa sobre spoilers. Ausência de `statusVisibilidade` é normalizada como `NAO_CLASSIFICADO`, sem alegar publicação/privacidade. A classificação pública existente não foi expandida por suposição. O build bloqueia registros explicitamente marcados como `RESERVADO`, em vez de enviá-los silenciosamente no snapshot público; essa barreira não remove informação já colocada no Git público.

**Limite editorial:** este repositório e seu histórico são públicos. Tirar um capítulo da UI não o apaga do Git. A autenticação do Studio não transforma o Git público em armazenamento privado. Não devem ser enviados manuscritos confidenciais ao repositório. Migrar material realmente reservado para fonte privada e arquitetura autenticada exige decisão do autor; não é possível obter sigilo retroativo com um filtro cliente.

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

**Implementado:** ESLint flat config (Next/TypeScript), sem assistente interativo, e Prettier como verificação explícita. Foram adicionados **14 testes unitários** e **28 testes de integração/navegador** cobrindo contratos, integridade de arquivos, APIs, filtros, navegação, clipboard com falha, leitor, rotas, cabeçalhos, SEO e acessibilidade.

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

**Evoluções futuras:** edição remota persistente, EPUB/PDF validado, auditoria de IA e integração KDP exigem implementação e decisões editoriais próprias. O [fluxo editorial](docs/architecture/editorial-workflow.md) explica pré-condições. Não foram construídos um banco, login ou serviço de publicação fictícios apenas para marcar essa linha como concluída.

## UVC-015 — Documentação e descoberta

**Implementado:** README e contratos atualizados; guia editorial novo; blueprints antigos identificados como planejamento; links locais `file://` substituídos. Há `robots.txt`, sitemap e metadados Open Graph específicos de história, além dos títulos/descrições próprios.

**Configuração restante:** definir **`UVC_SITE_URL` com o domínio HTTPS real antes do build**. Sem isso o site funciona, mas não inventa domínio e não publica URLs no sitemap; a decisão não usa automaticamente o endereço antigo de referência. A origem é validada, rejeitando caminho, credenciais, parâmetros e protocolos inadequados. Testes cobrem sitemap com e sem origem.

`robots.txt` e `noindex` evitam descoberta do Studio; a autorização do servidor é a barreira de acesso. As APIs de capítulos/cronologia continuam públicas e somente leitura. Não declara datas de atualização ou publicações que não foram verificadas.

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
4. Se for desejado um editor privado, configurar identidade do autor e armazenamento privado, implementar autorização de escrita/conflitos/backup e só então introduzir escrita HTTP.
5. Quando a obra estiver pronta editorialmente, implementar/validar o pipeline EPUB/KDP com metadados reais.


## Separação Studio / portal — 28/10/2026

Layouts independentes via grupo `(public)` e `/studio`. O workspace permanece fechado sem OAuth completo. A autorização usa ID numérico imutável do GitHub, sessão criptografada de até 8 horas e nova checagem da conta permitida a cada acesso aos dados. Cookies/CSRF/state/PKCE são gerenciados pelo NextAuth. O leitor público não recebe o dataset do inspetor por meio do componente Reader.

Veja [configuração, limites e validação de acesso](docs/architecture/studio-access.md). A autenticação real com GitHub exige configurar a OAuth App e validar o retorno no domínio de produção; tokens assinados de teste verificam o controle de acesso local sem simular um login real no provedor.


## Oficina de personagens

Painel privado em `/studio/personagens`, com biblioteca, ficha em três seções, prévia e referência canônica somente leitura. Criação nesta entrega usa rascunhos na sessão e arquivos JSON de trabalho, sem gravação no servidor ou publicação automática. Importação estrita e controle de saída protegem o trabalho no fluxo suportado. Persistência privada durável e exportação de livros continuam pendentes. Ver [oficina e direção de exportação Kindle](docs/architecture/studio-character-workshop.md).


## Vitrine mínima e acesso privado — revisão de 28/10/2026

Esta revisão substitui os estados públicos descritos nas entradas históricas acima. A vitrine apresenta somente a edição publicada Red Right Hand: Ascensão e seu link Amazon. As artes e estudos permanecem na galeria, separados dos livros; não foram adotados como capa oficial. Obras futuras deixam de ter página pública de catálogo.

A lista de capítulos públicos está vazia. A cronologia exige sessão do autor na página e API. O Codex público recebe apenas campos resumidos dos personagens classificados como públicos, sem opção de abrir o acervo inteiro. O Studio continua com consulta de todos os capítulos de trabalho e oficina privada. Isso não remove arquivos ou histórico de um repositório público.

A ativação real do login depende de cadastrar a OAuth App e as variáveis na Vercel, publicar novamente e conferir o callback. Sem configuração válida, o Studio permanece fechado. Consulte o [passo a passo](docs/architecture/studio-access.md).


## Vitrine editorial, personagens e galeria de ideias — 28/10/2026

Revisão pedida pelo autor: tipografia editorial local, capa de RRH recuperada pelo ASIN no servidor de imagens da Amazon e seção separada de projetos em desenvolvimento. Páginas individuais de personagens públicos restauradas, com dados canônicos e sem transformar artes do acervo em retratos oficiais.

Galeria privada implementada em `/studio/galeria`: inventário das 87 imagens da codebase, busca, prévia autenticada, notas, ideias, texto, tags e conexões a personagens/histórias/capítulos. Cópia local no navegador e importação/exportação JSON; sincronização remota e publicação por essa tela continuam pendentes. Cadastro da OAuth App e credenciais na Vercel dependem de acesso autenticado às respectivas contas.

Validação desta revisão: lint, tipos, formatação, validação de conteúdo e build passaram; 17 testes unitários e 33 de integração/navegador passaram. As 87 imagens originais foram verificadas como legíveis e incluídas no tracing do endpoint privado. OAuth real continua dependendo da configuração externa e teste de retorno do GitHub.

## Studio com PostgreSQL e espaço de autoria conectado — 28/10/2026

O login do Studio passou a ser por usuário e senha, inicialmente `admin` / `admin`, com hash scrypt e sessões revogáveis no PostgreSQL. Não depende de uma OAuth App do GitHub. A senha conhecida foi solicitada para esta etapa; não oferece exclusividade em um deploy público.

Fichas de personagens, conceitos, lugares, objetos, facções, histórias, manuscritos, eventos, referências visuais e tarefas agora têm persistência real. O editor mantém histórico e controle de versão; conflitos não sobrescrevem silenciosamente o trabalho. O mapa permite navegar por relações direcionadas, ajustar o alcance, ampliar e salvar o layout. A cronologia tem percurso visual e edição da referência temporal/ordem. Tarefas têm prazo, prioridade e estado.

A galeria passou a ser estritamente visual, com descrição e conexões. Conceitos e ideias têm fichas próprias. A wiki consulta fichas publicadas e exclui notas de trabalho. O acervo público tem 31 personagens; os registros adicionais vêm do legado e têm proveniência documentada. Nenhum texto narrativo dos personagens existentes foi reescrito.

Marginal é o único projeto em desenvolvimento na vitrine. Seu PDF de 81 páginas foi importado no PostgreSQL local, com texto editável e original privado preservado. O texto integral, backups e credenciais não foram adicionados ao Git. A importação pelo app também aceita PDF, TXT e Markdown, com limites explícitos e sem OCR fictício.

Infraestrutura: PostgreSQL local com volume persistente e banco separado para testes. Projeto hospedado `UVC Studio` criado no Neon (`sweet-leaf-60096410`); a conexão do deploy depende da autorização das contas e provisionamento das variáveis da Vercel. Instalar a skill não autentica a CLI automaticamente. Não tratar banco local ou projeto vazio hospedado como conexão de produção concluída.

Veja [arquitetura e persistência](docs/architecture/studio-database.md), [acesso](docs/architecture/studio-access.md) e [contratos](docs/architecture/api-schemas.md). Exportação de livros para Kindle, formatação editorial avançada e troca da autenticação temporária permanecem evoluções separadas.

Validação local desta entrega: 20 testes unitários e 36 de integração/navegador passaram, além de lint, tipos, formatação, build e auditoria de dependências sem vulnerabilidades reportadas. O original importado de Marginal tem SHA-256 idêntico ao PDF fornecido. A sessão admin/admin foi conferida também no navegador com o banco de trabalho, separado do banco descartável dos testes.

### 2026-10-29 — Escrita como ambiente próprio

A coleção de manuscritos deixou de usar o formulário genérico. A mesa de escrita reúne árvore de capítulos/cenas por projeto, editor formatado, notas, pesquisa de referências, histórico e foco. O salvamento automático serializa requisições e conserva digitação feita durante uma gravação; falhas e conflitos mantêm o rascunho no editor. A implementação e os limites estão em `docs/architecture/writing-workspace.md`. Fontes e manuscritos originais não foram reescritos.

### 2026-10-29 — Entrada de documentos do Docs e Word

Importação DOCX integrada à mesa de escrita e ao catálogo, com prévia sem gravação, divisão opcional por estilos de títulos, formatação editável, original privado e confirmação idempotente em transação. Limites e diferenças de fidelidade aparecem na prévia e em `docs/architecture/docx-import.md`. Validação: 27 testes unitários e 45 testes de integração/interface passaram, incluindo concorrência, download do original e acessibilidade da prévia.
