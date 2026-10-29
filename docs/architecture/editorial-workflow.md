# Fluxo editorial no Studio

O repositório preserva os textos, artes e dados canônicos de origem. O PostgreSQL sustenta o trabalho de autoria. O seed importa o acervo uma vez; reiniciar o app não sobrescreve fichas editadas nem restaura vínculos removidos.

1. Entre no Studio e escolha a coleção: manuscritos, personagens, conceitos, lugares, cronologia, galeria ou tarefas.
2. Crie/edite uma ficha. Use o resumo para busca, texto para o conteúdo e notas privadas para o trabalho interno. Salve no banco pelo botão ou Ctrl/Cmd+S.
3. Conecte duas fichas com um rótulo que descreva a relação. Use o mapa para navegar por conexões e salvar a organização visual.
4. Consulte versões anteriores pelo histórico. Carregar uma versão não publica nem grava sozinho: revise e salve uma nova versão.
5. Para fichas elegíveis, marque explicitamente a publicação e salve. A wiki lê os registros publicados; as notas privadas ficam no Studio. Manuscritos importados são privados.
6. Mantenha uma cópia do original e dos backups fora do Git público. O app preserva o arquivo importado e permite baixá-lo com sessão válida.

Marginal é o único projeto em desenvolvimento na vitrine. Red Right Hand: A Ascensão é a edição publicada com compra na Amazon. Os outros títulos fazem parte do acervo do universo; sua presença nas fichas não equivale a lançamento ou projeto em andamento.

Personagens seguem as fontes estruturadas e o legado documentado. Definições ausentes não são completadas por invenção: Planetas cegos inicia como ficha privada pendente de redação do autor. Os textos brutos e assets originais não foram reescritos.

O deploy precisa de PostgreSQL hospedado e `DATABASE_URL` válida. Sem conexão, o Studio mostra a pendência; não há persistência alternativa em memória ou no disco de uma função serverless. O site pode apresentar o snapshot público versionado enquanto o Studio não está conectado.
