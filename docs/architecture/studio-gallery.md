# Galeria de ideias do Studio

## Fluxo implementado

`/studio/galeria` exige a sessão autorizada do autor antes de carregar o inventário e as referências. O inventário `data/studio-assets.json` indexa as 87 imagens atuais em `assets/`, com ID estável derivado do caminho relativo. `npm run assets:index` atualiza o índice após adicionar ou mover arquivos. A validação do build recusa índice desatualizado ou IDs duplicados/incompatíveis. Nenhum original é modificado.

O painel permite buscar por nome, caminho, título de trabalho, ideia ou tag, selecionar uma imagem e editar título, uso criativo, ideia, texto, tags e vínculos a personagens, histórias e capítulos. Os vínculos consomem os datasets canônicos; não criam fatos novos no cânone. Capítulos vinculados abrem o leitor privado no capítulo selecionado. Filtros mostram o acervo inteiro, assets com notas ou com vínculos.

As imagens do workspace são fornecidas por `/api/studio/assets/[id]`, que verifica autorização antes de procurar o ID, conferir a contenção do caminho e gerar uma prévia WebP limitada a 1000 px. Respostas são privadas e sem cache compartilhado. IDs inexistentes retornam 404 apenas após autenticação; sem autorização, 401. Os arquivos são incluídos no tracing do deploy. O acesso ao endpoint não é uma permissão para escrever arquivos.

## Salvamento e publicação

**Salvar neste navegador** grava uma cópia local das notas, associada ao ID do autor e à origem do site. Não sincroniza dispositivos, não grava na Vercel, não altera o Git e não publica material. Só é possível editar pela interface autorizada; o armazenamento do navegador depende da segurança do dispositivo e não é um cofre criptografado.

**Baixar cópia** exporta um JSON versionado. **Abrir arquivo** valida formato, tamanho, campos, IDs e referências antes de substituir as notas atuais, com confirmação quando houver trabalho existente. Falhas preservam o estado atual. Limite de importação: 10 MB, 500 assets anotados e limites de caracteres por campo. A interface avisa antes de sair com trabalho sem cópia salva. Limpar os dados do navegador remove a cópia local; recomenda-se manter o arquivo de backup.

A galeria pública continua uma seleção visual independente. Uma ideia ou trecho escrito no Studio não vai para `/assets` automaticamente. Publicação remota e sincronização exigem um serviço de armazenamento privado, autorização de escrita, controle de concorrência e backups; não são simulados por escrita no filesystem de uma função serverless.

## Validação

Testes verificam acesso anônimo/forjado/outra conta, prévias autenticadas, IDs inválidos, edição de notas, vínculos, persistência após recarga, exportação/importação, rejeição sem perda de notas, navegação para capítulo, aviso de saída, reflow e Axe. Testes locais usam sessões assinadas exclusivamente com credenciais fictícias de teste.
