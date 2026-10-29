# Galeria visual do Studio

`/studio/galeria` é uma coleção de referências visuais no PostgreSQL. Cada ficha associa um asset registrado da codebase a um título, categoria, descrição visual, tags e vínculos a outras fichas. A descrição pode registrar roupas, cores, expressão, postura e decisões visuais do autor. Imagens não são presumidas retratos oficiais apenas por existirem no arquivo histórico.

Ideias, conceitos, regras e textos narrativos têm suas próprias fichas; podem ser ligados à referência visual pelo mapa. A galeria não é um depósito geral de manuscritos.

Salvar grava no PostgreSQL com versão e histórico. Marcar a publicação e salvar seleciona a referência para a galeria pública. Notas de trabalho permanecem privadas. A API privada de imagens exige sessão; a pública exige uma ficha visual publicada. Nenhuma rota recebe um caminho arbitrário de arquivo do visitante.

O inventário `data/studio-assets.json` preserva 87 imagens e usa IDs derivados de caminhos relativos. `npm run assets:index` atualiza esse inventário após adicionar/mover arquivos. O seed inicial importa suas referências; novos arquivos precisam de uma nova ficha visual no banco. Originais não são alterados ou deletados.

Esta versão substitui a oficina anterior baseada em cópias no navegador. Fichas e ligações do fluxo atual ficam no DB; exportar uma ficha é uma cópia adicional, não a única persistência.
