# APIs públicas de leitura e contratos de conteúdo

Fonte executável dos schemas: [`../../lib/schemas.ts`](../../lib/schemas.ts). O comando `npm run validate:content` roda antes de desenvolvimento/build e no CI. Tipos da aplicação derivam dos schemas; módulos cliente não carregam o runtime Zod para validar dados já verificados no build.

## Capítulos

`GET /api/chapters?num=0` (padrão: capítulo 0). Aceita representação canônica de 0 a 99 e representação de dois dígitos para compatibilidade (`00` a `09`). A busca é **exata** no manifesto `book.json`, com a disponibilidade de `data/publication.json`; não usa `startsWith` nem monta caminho de arquivo a partir da query.

Resposta 200:

```json
{"chapter":"00-a-reuniao.md","content":"…Markdown…","status":"CANONE_TRAVADO","source":"git-static"}
```

| Condição | Resposta |
| --- | --- |
| Número/consulta inválido, parâmetro desconhecido ou `num` duplicado | 400, `INVALID_QUERY` ou `INVALID_CHAPTER` |
| Capítulo inexistente ou fora da lista pública | 404, `NOT_FOUND` |
| Falha ao carregar arquivo do deploy | 500, `CONTENT_UNAVAILABLE`, sem caminhos/stack na resposta |

`HEAD` usa o mesmo resultado sem corpo. Os caminhos do manifesto são validados e o leitor ainda confere contenção no diretório do livro. Não há wildcard CORS.

## Cronologia

`GET /api/timeline` retorna o snapshot de cronologia importado do mesmo conjunto utilizado na página. Não relê um cache mutável, não aplica merge de JSON recebido e não grava no filesystem.

## Métodos de escrita

As duas rotas rejeitam POST, PUT, PATCH e DELETE com HTTP **405** e código `READ_ONLY`. Nenhuma dessas funções lê/grava corpo ou chama armazenamento. `Allow: GET, HEAD, OPTIONS`. OPTIONS retorna 204 e o mesmo Allow, sem autorizar preflight de escrita. Não há resposta `success: true` nem estado `cached` fictício.

Leitura é pública. CORS não é autenticação: clientes fora do navegador podem acessar dados públicos. Escrita só existe pelo fluxo Git, com as permissões e histórico do repositório. Conteúdo privado exigirá arquitetura própria, não um filtro cliente.

## Contratos e referências

- Personagens: IDs únicos, nome/equipe/alinhamento descritivos, poderes/aparições não vazios, escala inclusive a forma híbrida existente de Hades. `livroIds` e classificação são opcionais no arquivo histórico; classificação ausente normaliza para `NAO_CLASSIFICADO`, sem inventar estado editorial.
- Facções: IDs únicos, base, liderança, membros e descrição.
- Histórias: ID estável, título, tipo, local, sinopse e arcos opcionais. Catálogo usa ID, sem depender da posição nem do título.
- Livro: manifesto estrito, números/arquivos únicos e caminhos de Markdown limitados ao diretório de capítulos.
- Cronologia: IDs únicos, estados conhecidos, referências a eras e séries existentes; cenas de RRH devem apontar para capítulos do manifesto.
- Publicação: modo explícito `git-static`, leitura pública de revisão e lista única de capítulos existentes.
- Mídia: IDs únicos, caminhos contidos em `assets`, dimensões verificadas com Sharp e derivados existentes. Estado de direitos `verified` exige crédito/licença; a validação não determina direitos autorais.

Schemas validam estrutura e referências, não fatos narrativos. Não adicionam personagens/estados ao cânone automaticamente.
