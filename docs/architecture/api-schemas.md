# Contratos do Studio e publicação

## Sessão

- `POST /api/studio/session`: usuário/senha; cria cookie HttpOnly e sessão no banco. Credenciais inválidas: 401; origem inválida: 403; conexão ausente/indisponível: 503.
- `GET /api/studio/session`: informa se há sessão válida.
- `DELETE /api/studio/session`: verifica origem e revoga a sessão no DB.

## Workspace autenticado

- `GET /api/studio/workspace`: fichas, relações e layout.
- `PUT /api/studio/entities`: grava ficha validada, exigindo versão atual. Versão obsoleta: 409. A versão anterior e a alteração são transacionais.
- `GET /api/studio/entities?id=...`: até 30 versões anteriores da ficha.
- `POST /api/studio/relations`: cria ligação direcionada entre fichas existentes, sem duplicação ou autorrelação.
- `DELETE /api/studio/relations`: remove o vínculo; preserva as fichas.
- `POST /api/studio/layout`: salva posições do mapa separadamente do conteúdo editorial.
- `POST /api/studio/import`: multipart de PDF/TXT/Markdown, até 4 MB, PDF até 500 páginas e texto até 500 mil caracteres. O documento inicia privado e o original é preservado no banco. PDF sem texto não recebe OCR fictício.
- `POST /api/studio/import/docx`: multipart de DOCX até 4 MB. `action=preview` devolve opções de divisão e avisos sem gravar fichas. `action=import` exige `storyId`, `split` (`none`, `h1`, `h2`), `importId` UUID e `digest` SHA-256 da prévia. A importação é privada, transacional e idempotente por ID. Fonte, original e capítulos são conectados no banco.
- `GET /api/studio/files/[id]`: download autenticado do original.
- `GET /api/studio/assets/[id]`: prévia autenticada de um asset registrado, sem aceitar um caminho arbitrário do cliente.
- `GET /api/timeline`: eventos do PostgreSQL e seus vínculos, com sessão do autor. A edição ocorre pela API de fichas.

Gravações exigem sessão e origem correspondente à aplicação. Respostas privadas têm no-store; erros não incluem conexão ou stack. Os schemas executáveis estão em `lib/workspace.ts`; o SQL inicial está em `db/migrations/001_initial.sql`.

## Site público

A wiki consulta apenas fichas publicadas e filtra atributos privados antes de renderizar componentes cliente. `/api/public/visuals/[id]` serve somente imagens vinculadas a fichas visuais publicadas. Não é uma rota para abrir manuscritos ou originais importados.

A API legada de capítulos continua somente leitura e respeita a lista explícita de `data/publication.json`, atualmente vazia. Consultas inválidas retornam 400; trechos não liberados retornam 404. As antigas escritas em capítulos e timeline continuam 405, sem falso sucesso. Endpoints OAuth antigos respondem 410; o login atual usa `/api/studio/session`.
