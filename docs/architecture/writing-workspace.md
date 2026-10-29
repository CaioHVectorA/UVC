# Mesa de escrita

`/studio/manuscritos` é um ambiente de redação, separado do formulário de fichas. A navegação do Studio chama essa área de **Escrita**, e a visão geral oferece uma entrada direta.

À esquerda, o projeto reúne capítulos, cenas e material de origem. Capítulos e cenas são documentos privados; cenas podem pertencer a um capítulo do mesmo projeto. A ordem é editável no inspetor. A URL acompanha o documento aberto, e a entrada sem ID retoma o texto de Marginal editado mais recentemente. O PDF importado continua separado como material de origem; criar capítulos não divide nem reescreve automaticamente o original.

O centro usa Tiptap/ProseMirror, com corpo, título, subtítulo e seção, negrito, itálico, citação, lista e desfazer/refazer. A fonte e a largura de leitura priorizam texto longo. O tamanho na tela é uma preferência visual; não define a tipografia de uma edição Kindle. O modo de foco esconde estrutura, inspetor e navegação; Escape volta ao ambiente completo.

O inspetor contém estado, sinopse, notas privadas, meta de palavras e versões. Referências permitem pesquisar personagens, conceitos, lugares, objetos, eventos e imagens, ler a ficha e vinculá-la ao texto sem abandonar a redação. Abrir a ficha completa usa outra aba.

## Persistência e concorrência

O salvamento automático acontece após uma pausa de 1,1 segundo; Ctrl/Cmd+S e o botão salvam imediatamente. Uma única fila serializa as gravações por documento. Se o autor continuar digitando durante uma requisição, a resposta atualiza a versão do banco sem substituir o texto mais recente; a fila grava as alterações seguintes com essa nova versão. Trocar de texto, projeto ou criar/importar outro aguarda o salvamento pendente.

Cada gravação usa o controle de versão e o histórico transacional já existentes. Erros de rede e conflitos suspendem as tentativas automáticas, mantêm o texto no editor e oferecem cópia TXT. Conflitos não forçam sobrescrita: o autor pode abrir a versão do banco em outra aba para comparar. Restaurar uma versão exige confirmação e cria uma nova versão pelo salvamento normal. Há aviso ao sair com alterações pendentes. Não há promessa de funcionamento offline ou de recuperação de uma aba fechada à força.

`body` mantém o texto simples para buscas e compatibilidade. `attributes.richText` contém o documento estruturado; `writingType`, `writingParentId`, `writingOrder`, `storyId` e `wordGoal` guardam a organização. Não foi necessário migrar tabelas. O servidor valida projeto, tipo e capítulo pai e recusa publicação de manuscritos. Uma edição em texto simples pelo catálogo descarta a representação formatada antiga para que ela não esconda o novo conteúdo.

Abrir um texto legado não provoca gravação, conversão de arquivo ou reescrita. O editor inicializa seus parágrafos a partir de cada linha, preservando o arquivo original no PostgreSQL. Nenhum manuscrito privado entra no Git.

## Verificação

Os testes verificam preservação ao abrir, salvamento de formatação e sinopse, criação de cenas no capítulo/projeto, leitura após recarregar, referência consultável e vinculável, foco, digitação durante requisição lenta, conflito entre clientes, recuperação após falha de rede e reflow/acessibilidade. Os bancos de teste são isolados do acervo de autoria.
