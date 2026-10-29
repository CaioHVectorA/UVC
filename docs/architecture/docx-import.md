# Importar do Docs e Word

Na mesa **Escrita**, escolha **Importar texto** e selecione um `.docx`. No Google Docs, baixe o documento como Microsoft Word antes de importar. O catálogo de fichas também oferece essa importação.

A prévia identifica os estilos de títulos e oferece manter um texto único ou separar por Título 1/Título 2. Ela lista os textos e suas contagens de palavras antes de qualquer gravação. Um trecho anterior ao primeiro título vira **Texto de abertura**. Os títulos e o corpo permanecem no conteúdo convertido, sem completar, resumir ou reescrever a narrativa. Títulos visuais que não usam estilos semânticos não são adivinhados.

## O que chega ao editor

O importador conserva parágrafos, títulos (níveis superiores a três são normalizados), negrito, itálico, sublinhado, tachado, listas, quebras de linha e links compatíveis. O texto das tabelas entra como parágrafos. Imagens, cabeçalhos, rodapés, comentários e marcas de revisão permanecem disponíveis no original; não são recriados como recursos do editor. A prévia informa essas diferenças, além de possíveis mudanças de fonte, margens e paginação.

O original fica em **Material de origem**, com SHA-256 e download autenticado do arquivo exato. Cada capítulo editável se liga ao original e ao projeto escolhido. A edição de um capítulo não altera os bytes do DOCX. A tela permite baixar o original também a partir dos capítulos derivados.

## Implementação

`POST /api/studio/import/docx` exige sessão e origem válida. A ação `preview` retorna um ID de importação, digest, opções de divisão e avisos; não insere documentos. A ação `import` reconverte o mesmo arquivo no servidor e confere o digest. O cliente não envia conteúdo convertido para ser aceito pelo banco.

A gravação usa uma transação para fonte, arquivo, capítulos e vínculos. Um lock por ID torna a confirmação idempotente, inclusive quando duas requisições chegam juntas. Outro lock serializa a ordenação por projeto; capítulos e relações são inseridos em lote. Uma falha não deixa uma importação parcial, e uma repetição após perda de resposta retorna os IDs anteriores.

Limites: DOCX até 4 MB, até mil entradas no ZIP, até 12 MB por entrada e 24 MB expandidos no total, 500 mil caracteres de texto e até 200 capítulos por importação. O ZIP é lido por streams com validação de tamanho real, antes da conversão. Entradas duplicadas, conteúdo criptografado, macros e declarações XML de entidades são recusados. Não são extraídos caminhos para o filesystem.

[Mammoth](https://github.com/mwilliamson/mammoth.js) faz a conversão com acesso externo e mapas de estilo embutidos desativados. O HTML intermediário nunca é renderizado: um conversor fechado produz apenas nós e marcas aceitos pelo editor, descartando elementos ativos e URLs incompatíveis. O limite da representação estruturada também é verificado para que o texto importado continue salvável pelo editor.

## Validação

Fixtures OOXML sintéticas verificam formatação, títulos, divisão sem perda do texto convertido, avisos de imagens/tabelas/comentários, URLs e arquivos inválidos ou grandes. Testes com PostgreSQL verificam autorização, prévia sem gravação, cancelamento, projeto inválido sem resíduos, importação concorrente idempotente, original byte a byte e edição após recarregar. O diálogo passa por reflow e acessibilidade automatizada.
