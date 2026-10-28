# Conteúdo versionado, publicação por build

## Decisão

Esta versão usa o Git como fonte de verdade e histórico editorial. A aplicação publicada é um snapshot do commit compilado. Não há banco, armazenamento de manuscritos em memória, escrita no filesystem do servidor nem editor com salvamento.

As rotas HTTP de escrita antigas foram desabilitadas. Isso resolve os riscos de alteração anônima e falso sucesso sem exigir credenciais inventadas ou um serviço externo que não foi configurado. O Studio agora exige login GitHub e autorização do autor conforme [o guia de acesso](studio-access.md). Permissões de escrita e persistência transacional serão necessárias **se** for introduzido um editor remoto; não há endpoint de escrita oculto aguardando um token.

## Alterar e publicar conteúdo

1. Alterar os Markdown oficiais e/ou dados estruturados no checkout Git. O autor decide mudanças de cânone; estado `CANONE_TRAVADO` é informação editorial, não um bloqueio de filesystem. Não reescrever capítulos consolidados por inferência automática.
2. Declarar disponibilidade de capítulos em `data/publication.json`. A lista controla páginas, sumário público e API de capítulos. O Studio recebe todos os capítulos de trabalho somente após autorizar a sessão do autor. O leitor público só recebe os capítulos liberados explicitamente; a lista atual está vazia. O repositório continua público: remover um capítulo da UI não apaga arquivos nem histórico do Git.
3. Para uma nova história, adicionar ID estável em `series_and_solos.json`, referências adequadas na cronologia e, apenas quando publicada, uma edição em `data/publication.json` com título e link de compra confirmados. IDs sobrevivem a renomeações de títulos. Não reaproveitar um ID para outra obra.
4. Para nova mídia, registrar arquivo, dimensões, descrição, finalidade e situação de crédito/licença em `data/media.json`; `verified` exige crédito e licença preenchidos. A aprovação de direitos é humana; `review-needed` não significa licença comprovada. Gerar os WebP com `npm run media:prepare`, sem alterar originais.
5. Rodar validação, lint, tipos, testes e build. A validação verifica schemas estritos, unicidade, referências de era/série/capítulo, arquivos e dimensões reais de mídia. Ela não avalia qualidade literária nem substitui revisão do cânone pelo autor.
6. Commitar as alterações autorizadas e publicar um novo build. O deploy deve usar o lockfile e o mesmo commit para HTML, APIs e mídia.
7. Conferir a versão publicada. Para desfazer uma alteração de conteúdo, criar um commit de reversão e publicar novamente. Não depender de estado de uma instância serverless.

## Público, spoilers e manuscritos privados

- A seção de publicados contém Red Right Hand: A Ascensão, com capa e link Amazon. Projetos em desenvolvimento são selecionados explicitamente em `publication.workInProgress`, em seção separada. Os seis capítulos de trabalho não são liberados no leitor público.
- `statusVisibilidade: PUBLICO` seleciona os únicos personagens enviados à interface pública do Codex, com páginas individuais de dados canônicos. Ausência de classificação é normalizada como `NAO_CLASSIFICADO`; ela não é convertida automaticamente em publicado nem privado.
- O build rejeita personagens explicitamente marcados como `RESERVADO`; isso evita publicação silenciosa no snapshot, mas não protege o histórico público do Git.
- O acervo completo de personagens e a cronologia são consultados no Studio após autorização. A galeria é uma seção pública separada e não funciona como catálogo de livros publicados. O Studio é privado, com autorização no servidor; isso não torna privados os arquivos já presentes no Git público. Não armazenar segredos ou manuscritos privados em JSON enviados ao cliente, nesta área ou neste repositório público.
- Um futuro workspace privado precisa de armazenamento separado, autenticação no servidor, autorização por recurso, proteção de origem para sessões, controle de concorrência, histórico e política de backup antes de aceitar gravação.

## Operação

`UVC_SITE_URL` é opcional para execução local e deve ser a origem HTTPS real do site em produção. Configurada antes do build, habilita sitemap e canonical por história. `robots.txt` pede que bots não indexem Studio e API; isso **não é** controle de acesso.

A API de capítulos respeita a lista pública explícita; a API de cronologia exige sessão do autor. Não possuem CORS de origem universal, callbacks externos, chamadas de IA ou acesso a segredos. O código não alega rate limiting distribuído: limites de tráfego, alertas e proteção contra abuso de GET devem ser configurados no provedor de hospedagem quando necessário.

Os cabeçalhos de resposta incluem `nosniff`, política de referência, bloqueio de iframe e restrição de permissões sem uso. Não há CSP estrita com nonces fingida; uma política completa exige compatibilidade com os scripts/RSC do Next e medição no deploy.

## Evoluções que exigem implementação própria

- **Editor remoto:** não basta reativar POST. Exige autenticação, armazenamento durável, validação de escrita, detecção de conflitos e UI de falha real de salvamento.
- **EPUB/PDF/KDP:** não há arquivo exportado ou publicação presumida. Preparar front matter, capa, metadados e direitos; gerar arquivo e validar com ferramentas editoriais antes de anunciar prontidão.
- **Privacidade:** repositório público não pode ser usado como depósito de material confidencial. A política de leitura da UI não oferece sigilo.
