# Problemas técnicos e de produto do UVC

Revisão: 26/10/2026. Base inspecionada: `03a85bb`. Este registro acompanha a reformulação visual; não representa uma auditoria exaustiva de segurança nem confirma as condições do deploy remoto. As evidências abaixo vêm do código, da execução local de produção e dos comandos citados.

## Como interpretar

- **P0**: pode permitir alteração indevida do conteúdo; resolver antes de expor escrita publicamente.
- **P1**: afeta integridade, segurança, privacidade ou persistência; próxima prioridade técnica.
- **P2**: afeta coerência, manutenção, acessibilidade ou descoberta do conteúdo.
- **P3**: evolução de produto/editorial, sem bloquear a navegação atual.
- **Aberto** significa que o redesenho não implementou a solução. Recomendação não significa funcionalidade existente.

## Pendências abertas

### UVC-001 — P0 — APIs de escrita sem autenticação e autorização

**Evidência:** `app/api/chapters/route.ts`, função `POST`; `app/api/timeline/route.ts`, função `POST`. Não há verificação de sessão, papel ou proprietário nessas funções, nem middleware de autenticação no repositório.

**Impacto:** quem alcançar as rotas pode enviar alterações. Num ambiente com filesystem gravável, é possível sobrescrever capítulos e cronologia. O fato de o Studio ser destinado ao autor não restringe o endpoint. Uma proteção adicional na hospedagem não foi verificada.

**Correção proposta:** autenticar no servidor, autorizar cada operação de escrita e manter leitura pública separada. Até existir esse fluxo, desabilitar escrita em produção. Para sessões baseadas em cookies, implementar proteção contra requisições de origem indevida.

**Aceite:** POST anônimo retorna 401, usuário sem papel retorna 403, somente o autor consegue gravar; registrar identidade e alterações. Não usar CORS como autenticação.

### UVC-002 — P1 — Persistência incompatível com o modelo serverless

**Evidência:** as duas APIs escrevem em arquivos do código-fonte usando `fs.writeFileSync`. A timeline usa uma variável global `dynamicTimeline` como fallback.

**Impacto:** arquivos da aplicação normalmente são somente leitura no ambiente serverless. Memória de uma instância é temporária e não é compartilhada entre instâncias. Reinícios, concorrência e novo deploy podem perder alterações. O GET de timeline relê o arquivo e pode substituir até o estado alterado em memória. Em ambiente gravável, dois POST concorrentes podem causar atualização perdida.

**Correção proposta:** banco ou armazenamento persistente com controle de versão e transações; para fluxo editorial baseado em Git, usar commits autenticados no servidor e rebuild explícito. Escolher uma fonte de verdade, sem fallback silencioso para memória.

**Aceite:** salvar, reiniciar, consultar em outra instância e confirmar o mesmo conteúdo; alterações concorrentes devem gerar conflito controlado ou merge definido.

### UVC-003 — P1 — Respostas de sucesso sem gravação

**Evidência:** capítulos devolvem `{ success: true, status: 'cached' }` quando não encontram arquivo/diretório, sem realmente criar cache. Timeline devolve sucesso mesmo quando `writeFileSync` lança exceção.

**Impacto:** um futuro editor pode informar “salvo” e perder trabalho. O novo Studio não apresenta botão de salvar e não depende desses endpoints.

**Correção proposta:** responder 404 para capítulo inexistente, 400 para conteúdo inválido e erro de servidor/armazenamento para falhas reais. Somente devolver sucesso após confirmação durável.

**Aceite:** induzir falha de armazenamento e confirmar resposta não-2xx; jamais declarar cache ou persistência inexistente.

### UVC-004 — P1 — Falta validação dos contratos de API

**Evidência:** o POST da timeline espalha qualquer JSON recebido sobre o objeto (`{ ...dynamicTimeline, ...body }`). Capítulos usam `startsWith` para escolher arquivo e recebem `content` sem validar tipo, tamanho ou estado de cânone.

**Impacto:** objetos com estrutura incorreta podem quebrar leitores posteriores; entradas ambíguas podem selecionar capítulos indevidos; capítulos classificados como travados não têm proteção de servidor. Não foi demonstrado path traversal: o caminho final é escolhido entre arquivos existentes no diretório, e não diretamente do parâmetro.

**Correção proposta:** schemas explícitos, limites de tamanho, números de capítulo válidos, associação exata ao manifesto `book.json`, allowlist de campos e regra de alteração do cânone no servidor.

**Aceite:** entradas malformadas, números inválidos e alterações de campos não permitidos retornam 400/422; regras de bloqueio são verificadas independentemente da UI.

### UVC-005 — P1 — CORS amplo e ausência de limites operacionais

**Evidência:** APIs permitem origem `*` e métodos de escrita. Não há limitação de frequência ou trilha de auditoria nas rotas. Leituras/escritas são síncronas nas APIs antigas.

**Impacto:** qualquer origem pode consumir as respostas públicas; POST permitido amplia a superfície acessível a sites externos. Escrita sem autenticação é o problema principal (UVC-001). I/O síncrono e ausência de limites também prejudicam disponibilidade sob carga.

**Correção proposta:** definir quais clientes precisam acessar as rotas; restringir origem quando apropriado, autenticar escrita, limitar tamanho/frequência e usar I/O assíncrono ou armazenamento apropriado. Adicionar logs sem registrar manuscritos ou segredos indiscriminadamente.

**Aceite:** testar origem permitida e não permitida, carga, payload excessivo e respostas 413/429; preservar leitura pública deliberadamente escolhida.

### UVC-006 — P1 — Versão do Next.js com alertas de segurança

**Evidência:** `npm ls` identifica Next.js 15.3.9. `npm audit --omit=dev --json` nesta revisão registrou **3 pacotes afetados: 1 crítico e 2 altos**, incluindo Next.js e suas dependências transitivas PostCSS e Sharp. Exemplos de avisos: [GHSA-2464-fhr4-w9xw](https://github.com/advisories/GHSA-2464-fhr4-w9xw), [GHSA-p3m5-59mp-jv5r](https://github.com/advisories/GHSA-p3m5-59mp-jv5r), [GHSA-fxqj-rqcc-2cmp](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp), [GHSA-wq5f-xc86-pv6w](https://github.com/advisories/GHSA-wq5f-xc86-pv6w).

**Limites:** classificação do audit não comprova que todas as falhas sejam exploráveis nesta aplicação. Algumas dependem de configuração/funcionalidade específica. `images.unoptimized` está habilitado; o Sharp usado diretamente na preparação das imagens é 0.35.5, mas Next mantém sua própria versão transitiva 0.34.5. O PostCSS direto foi resolvido em 8.5.31; Next ainda inclui 8.4.31.

**Correção proposta:** atualizar para uma versão corrigida e suportada do Next, revisar o lockfile transitivo e rodar novamente build, testes de navegação e auditoria. Não aplicar atualização major automaticamente sem verificar compatibilidade.

**Aceite:** ausência dos avisos aplicáveis ou justificativa documentada para cada exceção; confirmar deploy com o lockfile corrigido. A migração do framework ficou fora da alteração visual.

### UVC-007 — P1 — Visibilidade editorial não equivale a controle de acesso

**Evidência:** o Codex filtra dados no cliente; o JSON completo faz parte do bundle. A opção de acervo completo é acessível a todos. `/studio`, cronologia completa e APIs GET também são públicas pelo código. As novas páginas de leitura publicam os seis capítulos já presentes no repositório público, identificando revisão/rascunho.

**Impacto:** um filtro não mantém texto ou personagens secretos. A nova interface explicita spoilers e não chama essa opção de área protegida. A publicação de cada capítulo ainda precisa de política editorial própria.

**Correção proposta:** decidir quais obras e capítulos podem ser lidos publicamente. Para manuscritos privados, autenticar no servidor e nunca incluir conteúdo reservado em páginas estáticas, props públicas ou bundles. Manter os arquivos privados fora de um repositório público, se confidencialidade for necessária.

**Aceite:** usuário anônimo não recebe nenhum campo reservado no HTML, RSC, JS nem API. Documentar claramente o que é conteúdo público, rascunho compartilhado e manuscrito privado.

### UVC-008 — P2 — APIs dinâmicas e páginas estáticas não estão integradas

**Evidência:** home/Codex/cronologia importam JSON; catálogo usa `data/series_and_solos.json`; leitor/Studio carregam Markdown via `lib/chapters.ts`. As páginas de leitura são geradas no build e não fazem POST nas APIs.

**Impacto:** alterar um arquivo por uma API não atualiza automaticamente os dados já incorporados ao build ou bundle. O Studio é leitor/revisor, não editor persistente. Seu texto é fiel aos Markdown do build, sem o objeto duplicado `CHAPTER_TEXTS` da versão anterior.

**Correção proposta:** escolher geração estática com revisão por Git e novo deploy, ou leitura dinâmica/revalidação com armazenamento persistente. Não misturar os modelos sem definir invalidação de cache.

**Aceite:** salvar conteúdo e confirmar quando/como aparece em todas as telas, inclusive em nova sessão; UI deve comunicar publicação pendente quando exigir build.

### UVC-009 — P2 — Dados canônicos com contratos e classificações incompletos

**Evidência:** vários personagens não têm `statusVisibilidade`; alguns só têm símbolo e outros não têm imagem. A seleção pública possui Arner, Deroo Da e Irmãos Yaa, enquanto a documentação descreve um grupo público maior. Séries aparecem em `series_and_solos.json` e também em `timeline.json`; sinopses e títulos não possuem um identificador comum obrigatório.

**Impacto:** filtros podem ocultar personagens esperados e fontes podem divergir. Não se deve completar status ou alterar o cânone por inferência de frontend.

**Correção proposta:** criar schemas e IDs estáveis, validar os JSON no CI e revisar classificação editorial com o autor. O mapeamento de apresentação em `lib/catalog.ts` usa os títulos atuais e falha explicitamente quando uma entrada não está mapeada; IDs estáveis no dataset evitariam acoplamento a renomeações editoriais.

**Aceite:** datasets passam por validação; novos registros não somem silenciosamente; cada entrada tem estado editorial, ID e relação definida com as demais fontes.

### UVC-010 — P2 — Proveniência, acessibilidade e resolução das artes

**Evidência:** o arquivo histórico possui duplicatas, nomes com acentos/espaços, ícones de aplicações e imagens heterogêneas. Algumas são símbolos, não retratos; há referências visuais sem ficha de crédito/licença no dataset. Algumas capas têm resolução pequena ou texto com pouco contraste incorporado à imagem.

**Impacto:** não é possível afirmar autoria/licença de cada arquivo apenas por estar no repositório. Cortes e ampliação podem prejudicar texto de capas; uma imagem não deve ser usada para inventar a aparência canônica de um personagem.

**Tratamento nesta alteração:** seleção explícita de arquivos existentes, textos alternativos como “arte ou símbolo”, derivados WebP em `public/media`, preservação integral de `/assets` e `/legacy`. Nenhuma arte de DC/Marvel/Image foi incorporada.

**Correção proposta:** manifesto com arquivo original, autoria, licença, descrição, finalidade, foco/corte e dimensões; novos retratos aprovados pelo autor. Derivados atuais devem ser regenerados com `npm run media:prepare` quando os originais selecionados mudarem.

**Aceite:** cada imagem publicada tem proveniência e descrição verificadas; arquivos de baixa qualidade possuem substituto ou uso adequado, sem atribuição inventada.

### UVC-011 — P2 — Lint ainda não configurado e ausência de CI de regressão

**Evidência:** `npm run lint` executa `next lint`, mas sem configuração ESLint abre o assistente interativo e não conclui em execução não interativa. Não há workflow de CI no repositório. Build e TypeScript são verificações diferentes de lint.

**Impacto:** lint não é uma barreira reprodutível de qualidade. Typecheck e build aprovados não validam automaticamente acessibilidade, contrastes, navegação nem comportamento.

**Correção proposta:** configurar ESLint explicitamente e executar lint, `npm run typecheck`, build e testes relevantes no CI. Adicionar testes de autenticação/armazenamento quando UVC-001 a UVC-004 forem implementados; manter regressões de menu, filtros e leitor.

**Aceite:** `npm run lint` termina sem prompts, CI roda em cada mudança e falha em regressões relevantes. Nesta alteração foram feitos testes de navegador; não há suite E2E permanente adicionada.

### UVC-012 — P2 — Migração do design system ainda parcial na cronologia

**Evidência:** `components/ui.tsx`, cabeçalho, catálogo, leitor, galeria e Codex usam os novos padrões. A cronologia foi adaptada para nova tipografia/paleta e responsividade, mas conserva utilitários e estruturas antigas com uma camada CSS de migração.

**Impacto:** há duas formas de estilizar superfícies e abas; manutenção futura pode introduzir divergência. A visualização é uma lista de eventos/eras, não um canvas arrastável ou grafo interativo.

**Correção proposta:** migrar cronologia para os mesmos componentes semânticos; definir estados de cenas com dados validados e separar a visão pública das notas de escrita. Construir grafo/canvas somente com requisito de interação definido.

**Aceite:** remover overrides transitórios, compartilhar componentes/estados e testar teclado, foco e filtros. Não anunciar drag-and-drop ou grafo que não existem.

### UVC-013 — P2 — Acessibilidade e desempenho precisam de medição contínua

**Evidência:** esta alteração inclui skip-link, foco visível, labels, navegação por teclado, menu com `aria-expanded`, estados de seleção e `prefers-reduced-motion`. Imagens usam dimensões e WebP. Fontes são locais do sistema, sem pedido obrigatório a Google Fonts. A otimização dinâmica do Next permanece desativada em `next.config.ts`.

**Limites:** não houve auditoria completa WCAG com leitores de tela, dispositivos físicos ou medição de Core Web Vitals em produção. As imagens são pré-dimensionadas, porém não há múltiplas resoluções geradas por dispositivo; dependências do renderer Markdown aumentam o JS do leitor.

**Correção proposta:** medir contraste, zoom a 200%, VoiceOver/NVDA, LCP/CLS/INP e conexão lenta. Ajustar variantes de imagens e avaliar Markdown renderizado no servidor caso o custo de JS se mostre relevante.

**Aceite:** navegação completa por teclado/leitor de tela, sem perda de conteúdo em zoom, orçamento de desempenho documentado com dados reais. Não declarar nota Lighthouse ou conformidade que não foi medida.

### UVC-014 — P3 — Publicação KDP/EPUB e edição ainda não implementadas

**Evidência:** `book.json` não possui ISBN/ASIN preenchidos. Não há pipeline de exportação EPUB/PDF, validação EPUBCheck ou confirmação de publicação. Não há editor, salvamento, histórico/undo, bloqueio transacional de cânone ou auditoria automática de Lore Guard.

**Tratamento nesta alteração:** removidas paginação fixa e alegações de prontidão/serviço ativo da apresentação. O Studio identifica sua função de leitura/revisão; copiar prompt não é executar auditoria. O catálogo diferencia leitura disponível de sinopse sem capítulos.

**Correção proposta:** definir fluxo de manuscrito → revisão → arte/capa → exportação → validação → publicação, com metadados verdadeiros e links somente quando existirem. Priorizar integridade de salvamento antes de um editor visual.

**Aceite:** arquivos exportados passam por validação e revisão nos dispositivos-alvo; compra/publicação só aparece com destino real. Nenhuma integração KDP é pressuposta nesta versão.

### UVC-015 — P3 — Documentação histórica e descoberta das histórias

**Evidência:** README/documentos antigos ainda descrevem etapas futuras como se fossem atuais, contêm links `file:///home/usuario/...` e números/status aproximados. As páginas de catálogo agora têm metadados próprios, mas não há sitemap, robots, Open Graph específico por obra nem URLs de leitura para as demais histórias.

**Correção proposta:** atualizar documentação antiga distinguindo plano de implementação, corrigir links locais e definir plano de publicação das demais obras. Adicionar sitemap/metadata social após escolher domínio canônico e conteúdo autorizado.

**Aceite:** documentação coincide com funcionalidades verificáveis; prévias sociais usam artes permitidas; nenhuma obra sem capítulo oferece botão de leitura enganoso.

## Problemas corrigidos no redesenho

| Problema anterior | Solução implementada | Evidência |
| --- | --- | --- |
| Cabeçalho espremido no celular | Menu dedicado, controle de expansão e links com área de toque adequada | `components/site-header.tsx` |
| Identidade reduzida a painéis cinza | Direção editorial indie, símbolo histórico, capas, cenários e cores com papéis definidos | `app/page.tsx`, `app/globals.css` |
| Galeria sem imagens | Imagens reais, filtros por categoria e abertura para ampliar | `app/assets/page.tsx`, `public/media` |
| Histórias sem destino | Oito páginas de história e seis páginas de capítulo, com disponibilidade explícita | `app/historias/[slug]`, `app/ler/[chapter]` |
| Markdown exibido literalmente | Renderização com `react-markdown` e `remark-gfm`, sem HTML arbitrário habilitado | `components/reader.tsx` |
| Textos de capítulos duplicados em TypeScript | Fonte de verdade nos Markdown oficiais, carregados no servidor | `lib/chapters.ts` |
| Paginação e palavras fixas | Removida paginação inventada; duração/palavras calculadas do arquivo | `components/reader.tsx` |
| “Auditoria ativa” sem serviço | Ação descrita como copiar prompt, com tratamento de falha | leitor e cronologia |
| Filtro sem retorno vazio | Mensagem e ação de limpar filtros | Codex e cronologia |
| Controle de visibilidade apresentado como proteção | Acervo completo explicitamente marcado com spoilers | Codex |
| Numeração de beats mudava ao filtrar | Identidade posicional mantida no conjunto original | cronologia |

## Validação e limites desta entrega

- Compilação de produção: `npm run build` (inclui geração das páginas de histórias e leitura).
- Tipos: `npm run typecheck`.
- Navegador: rotas, links internos, imagens, larguras mobile/tablet/desktop, menu, filtros, expansão de habilidades, capítulo seguinte/anterior, tema de leitura e Studio.
- `npm run lint`: pendente conforme UVC-011; não foi declarado aprovado.
- `npm audit --omit=dev`: pendências conforme UVC-006; não foi declarado limpo.
- Nenhum POST foi enviado às APIs de manuscritos/cronologia durante a revisão; riscos de escrita foram avaliados pelo código, sem sobrescrever o cânone.
- Nenhum arquivo original de `/assets`, `/legacy`, `/books` ou `/data` foi reescrito por esta alteração.
- As verificações locais não comprovam o comportamento do deploy de produção, de proteções externas ou de serviços não presentes no repositório.

## Ordem de trabalho recomendada

1. Restringir escrita e decidir política de manuscritos públicos (001, 007).
2. Armazenamento durável, contratos e respostas corretas (002–005).
3. Atualizar framework/dependências com validação (006).
4. Definir fonte de verdade, schemas e fluxo de publicação (008–010, 014).
5. CI, acessibilidade/desempenho medidos e migração final dos componentes (011–013).
6. Atualização editorial/documental e descoberta (015).
