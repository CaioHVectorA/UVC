# Direção visual — UVC independente

## Referências e intenção

O [UVC Contos original](https://uvcontos.netlify.app) traz o símbolo UVC, o espaço, a cor e o convite à leitura. A nova interface preserva essa origem e torna histórias e artes o centro da navegação. Das referências [DC Comics](https://www.dc.com/comics) e [Image Comics](https://imagecomics.com), aproveita a hierarquia editorial, as capas e os caminhos de descoberta. Marvel foi considerada como referência de catálogo, mas seu site bloqueou a consulta automatizada nesta revisão. Não foram copiados layouts, logotipos ou artes dessas editoras.

O objetivo é um portal de ficção independente brasileiro: acolhedor, autoral e organizado, com tecnologia discreta. As sinopses e o cânone continuam nos datasets existentes. A vitrine apresenta apenas edições publicadas; estados de trabalho ficam na área do autor.

## Tokens e composição

Definidos em `app/globals.css`:

| Papel | Valor | Uso |
| --- | --- | --- |
| Fundo | `#10151c` | Azul cósmico escuro, leitura e respiro |
| Superfície | `#18202a` | Cards e painéis |
| Texto | `#f5f1e8` | Branco quente |
| Cyan | `#91e3dc` | Navegação, foco, metadados e conexões |
| Vermelho Severum | `#ff746a` | Convite principal à leitura/descoberta |
| Dourado | `#edc993` | Ênfase editorial e dimensão cósmica |
| Papel | `#f1ecdf` | Sobre o projeto e contraste acolhedor |

Títulos usam sans-serif do sistema com espaçamento ajustado; ênfase editorial e textos dos livros usam Georgia. Monoespaçada fica restrita a etiquetas curtas. Não há fonte remota obrigatória. A interface evita brilhos constantes, carrosséis automáticos e badges sem função.

Espaçamento principal segue múltiplos de 4/8 px, com seções de 40–64 px. Galeria com quadros 4:3 e vitrine com composição tipográfica. Breakpoints em 760 e 1000 px; grades passam a duas ou uma coluna conforme conteúdo. Foco, tamanho mínimo de controles, estados vazios e movimento reduzido fazem parte do CSS base.

## Componentes e rotas

- Cabeçalho público discreto com Livros e Galeria; Studio no rodapé.
- `/`: apresentação breve do autor e uma edição publicada, com link direto para Amazon. Sem imagens do acervo como capas oficiais, cronologia ou cartões de obras futuras.
- `/historias/[slug]`: somente séries com edição publicada explícita; sinopse canônica e compra. Não oferece capítulos de trabalho.
- `/assets`: galeria separada de artes, estudos, cenários e símbolos; originais preservados.
- `/codex`: busca de personagens classificados como públicos, com descrições resumidas e sem fichas completas ou imagens do acervo.
- `/ler/[chapter]`: depende da liberação explícita de trechos. Sem trechos liberados atualmente.
- `/studio`: leitor privado com sumário, tema, fonte e referência canônica. `/studio/personagens`: oficina de fichas. `/studio/cronologia`: eras e cenas. Todas exigem autorização do autor antes de enviar dados ao cliente.
- `/studio/entrar`: entrada GitHub ou aviso breve de configuração pendente.
- `/timeline`: encaminha ao Studio; não expõe a cronologia publicamente.

A vitrine usa tipografia, espaço e poucos controles. O marcador tipográfico RRH não é apresentado como capa oficial. Cyan, vermelho e dourado permanecem como acentos discretos da identidade cósmica.

## Mídia e manutenção

`npm run media:prepare` executa `scripts/prepare-media.mjs` com Sharp e cria WebP em `public/media`. A seleção vem de `data/media.json`; os arquivos originais são preservados. O cenário urbano é limitado a 1400 px, o espaço a 1000 px e as demais imagens a 900 px, sem ampliar originais pequenos. A seleção inteira ocupa aproximadamente 876 KB. O navegador carrega imagens fora da primeira dobra sob demanda, e o otimizador local do Next gera resoluções apropriadas para os tamanhos declarados.

Adicionar uma imagem requer registrar a origem no script e aprovar sua proveniência. O nome “arte ou símbolo” evita apresentar logotipos como retratos oficiais. A reformulação não estabelece licença/autoria dos itens históricos por inferência.

## Verificação

Executar `npm run typecheck` e `npm run build`. Conferir menu, foco, busca sem resultados, categorias, links de histórias, capítulos anterior/seguinte, tema noturno e tamanhos de texto. Incluir larguras de 320, 390, 768 e 1440 px e não depender apenas de screenshot da primeira dobra para conferir imagens lazy.

Estado das correções e pendências editoriais/operacionais estão em [`../../problems.md`](../../problems.md).

## Ergonomia revisada em 28/10/2026

A direção editorial e a hierarquia visual foram preservadas. O menu móvel fecha com Escape e devolve o foco ao botão; histórias e leitor mantêm indicação de seção ativa. O sumário apresenta os números canônicos (incluindo 00) em vez de somar um à posição do capítulo. Tema e fonte persistem entre navegações, com fallback quando o armazenamento do navegador está indisponível. No celular, sumário e ajustes de leitura começam recolhidos; os controles de expansão têm alvos de ao menos 44 px. A troca de capítulo dentro do Studio recolhe o sumário móvel e leva foco/rolagem ao texto. Barras laterais têm rolagem própria quando a altura da janela é pequena.

Verificação automatizada cobre reflow público em 320/390/768/1440 px, Axe, navegação, filtros e fronteira de autorização. Os resultados se limitam aos estados testados; conforto de escrita prolongada e leitura com tecnologias assistivas ainda precisam de avaliação humana.

## Oficina de personagens

`/studio/personagens` usa biblioteca à esquerda, formulário central e prévia à direita a partir de 1100 px. Em larguras intermediárias, a prévia fica abaixo do editor; no celular as áreas se empilham e a biblioteca inicia recolhida. Campos de texto têm fonte de 16 px, rótulo explícito e altura mínima de 48 px. As três seções preservam valores ao alternar e a consulta do cânone não permite edição. As ações principais são criar ficha, abrir arquivo e baixar rascunhos; não há botão de salvar que sugira persistência remota inexistente. Veja a [documentação da oficina](studio-character-workshop.md).

## Revisão editorial e galeria de criação

A vitrine combina Cormorant Garamond nos títulos e Space Grotesk na interface, hospedadas localmente com suas licenças OFL em `app/fonts`. A capa publicada de RRH vem do servidor de imagens da Amazon associado ao ASIN `B0CLKRNS29`, preservada em `public/covers/rrh-ascensao.jpg`; a URL de origem está no registro da edição. A imagem mostra o subtítulo **A Ascensão**, refletido na apresentação. Não foi substituída por uma arte histórica.

Os projetos listados em `publication.workInProgress` aparecem separadamente em “Em desenvolvimento”, sem datas estimadas nem páginas de leitura liberadas. O detalhe de livro continua limitado a edições publicadas. Páginas `/codex/[id]` apresentam dados canônicos dos personagens classificados como públicos. A galeria privada usa biblioteca com busca, prévia e formulário de notas e conexões; veja [o contrato de salvamento](studio-gallery.md).
