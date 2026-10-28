# Oficina de personagens do Studio

## Experiência entregue

`/studio/personagens` é uma ferramenta privada do autor, com a mesma autorização GitHub do restante do Studio. O servidor verifica acesso em `getStudioCharacterData` antes de fornecer personagens, facções e histórias. O layout organiza três áreas: biblioteca pesquisável, ficha de trabalho e prévia/checklist. Em telas menores, as áreas se empilham e a biblioteca começa recolhida.

A navegação do Studio oferece Manuscrito e Personagens. Na oficina:

- **Identidade:** nome, escala, alinhamento, equipe/facção e descrição.
- **Motivações:** papel narrativo, desejo e conflito.
- **Poderes e arco:** habilidades, limites/custos, arco, aparições e notas.
- **Cânone:** consulta às fichas oficiais de `data/characters.json`, sem edição. Sugestões de facções e histórias vêm dos datasets estruturados existentes.
- **Rascunhos:** múltiplas fichas, prévia durante a edição, descarte explícito, exportação e importação de arquivo.

Os indicadores mostram preenchimento, não aprovação literária nem validação automática do cânone. Nenhum poder, histórico ou vínculo é gerado por suposição.

## Persistência e privacidade

Nesta entrega os rascunhos vivem apenas na sessão da página. Não há gravação de novas fichas no servidor, Git, localStorage ou API pública. A interface informa esse limite e oferece **Baixar rascunhos** e **Abrir arquivo**. O arquivo é preparado no navegador; o autor deve conferir seu download e guardá-lo para retomar o trabalho.

Alterações ainda sem cópia geram aviso ao fechar/recarregar e antes de sair por links ou encerrar sessão. A navegação entre ferramentas usa navegação completa de documento para que voltar/avançar também respeite o evento de saída do navegador. Consultar cânone ou mudar de seção da ficha preserva os rascunhos em memória.

Para salvamento automático durável e acesso entre dispositivos, ainda é necessário configurar uma fonte privada, autorização de escrita, histórico/backup e controle de concorrência. Não substituir isso por escrita no filesystem de uma função serverless nem por cache em memória. Proteger o Studio não torna privados os arquivos já presentes no Git público.

## Arquivo de trabalho

O JSON usa `format: uvc-character-drafts`, `version: 1` e `status: RASCUNHO`. Aceita fichas incompletas, porque um rascunho deve poder ser interrompido. Não é o schema de publicação da Wiki e não deve ser copiado automaticamente para `characters.json`.

A importação valida o contrato estrito, campos, escalas, limites de texto e IDs únicos. Aceita até 50 fichas e 10 MB. IDs internos são recriados ao importar para não substituir rascunhos abertos. Arquivos inválidos não apagam o trabalho atual. Não há HTML arbitrário nem chamadas externas para processar o arquivo.

Publicar uma ficha continua sendo uma decisão editorial explícita, com revisão e adaptação ao contrato canônico. Nenhum botão da oficina publica rascunhos.

## Validação

Testes unitários cobrem ida e volta de ficha incompleta, rejeição de publicação/campos extras, IDs duplicados e limites. Testes de navegador cobrem autorização, RSC, criação, troca entre formulário e cânone, exportação/importação, cancelamento de saída, preservação dos dados canônicos e ausência de novos rascunhos no Codex público. Há reflow em 320/390/768/1440 px e análise automatizada de acessibilidade.

## Exportação literária: direção de produto

A exportação de livros ainda não está implementada. A direção é oferecer poucos modelos editoriais consistentes e estilos semânticos para título, parte, capítulo, parágrafo inicial, corpo, citação e separador de cena. A formatação do ebook deve continuar adaptável ao dispositivo e às preferências de leitura.

- EPUB formatado para validar no Kindle Previewer e enviar ao KDP.
- DOCX estruturado para quem quiser finalizar no Kindle Create.
- PDF com configuração própria para a edição impressa.
- KPF pode ser gerado pelo Kindle Create **ou pelo Kindle Previewer 4**, cuja CLI oficial aceita `kindlepreviewer4 livro.epub --convert --output saida`. A conversão gera KPF quando o livro é compatível com Enhanced Typesetting; o pipeline deve recusar fallback MOBI em vez de apresentar sucesso como KPF. O Previewer é disponibilizado para Windows/macOS, portanto essa etapa exige um executor compatível fora do servidor Linux atual. A integração ainda não está implementada nem testada neste projeto.

Referências: [manual oficial do Kindle Previewer 4, seções 1.6.2 e 3](https://driz46fl8b4jf.cloudfront.net/UserGuideKPR4_EN.pdf), [temas e elementos do Kindle Create](https://kdp.amazon.com/en_US/help/topic/G7R2L7V5X6SJH948) e [formatos de manuscrito aceitos pelo KDP](https://kdp.amazon.com/en_US/help/topic/G200634390). Os modelos visuais futuros do Studio não devem ser apresentados como cópias exatas dos temas da Amazon.
