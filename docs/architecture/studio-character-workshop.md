# Personagens no Studio

`/studio/personagens` usa fichas editáveis no PostgreSQL. A biblioteca busca por título, resumo e tags; o formulário oferece afiliação, alinhamento, habilidades, aparições, descrição e notas privadas. Estado editorial e publicação são explícitos. O mapa e as conexões ligam o personagem a histórias, lugares, eventos, objetos, conceitos, tarefas e referências visuais.

O seed inicial consome 31 personagens de `data/characters.json`. Os registros acrescentados do legado incluem Cole Froz, Yeti, Dizz, Kin, Clara, Luy, General Dawmnes, Tay e as fichas individuais de Masin e Tsuuya, com documentação de origem em `docs/characters`. Não foram atribuídos poderes ou alinhamentos não confirmados: os campos pendentes indicam revisão do autor. Os personagens que já existiam preservam descrição e habilidades canônicas.

Foram preparadas fichas privadas iniciais dos personagens de Marginal no banco de trabalho, para revisão. Elas não são publicadas automaticamente. A leitura integral do PDF não entra no Git.

O botão Salvar e Ctrl/Cmd+S gravam no banco. Versões anteriores ficam no histórico e conflitos retornam 409, preservando a edição atual na tela. As notas internas são filtradas do perfil público. O seed não substitui edições posteriores feitas pelo autor.

A oficina antiga de rascunhos apenas em memória foi substituída neste fluxo. A exportação atual baixa uma ficha, enquanto sua cópia principal permanece no PostgreSQL.

Exportação EPUB/KPF, formatação editorial avançada e publicação KDP continuam etapas futuras. Esta entrega não apresenta arquivos JSON de fichas como exportação Kindle.
