# Direção visual — UVC independente

## Referências e intenção

O [UVC Contos original](https://uvcontos.netlify.app) traz o símbolo UVC, o espaço, a cor e o convite à leitura. A nova interface preserva essa origem e torna histórias e artes o centro da navegação. Das referências [DC Comics](https://www.dc.com/comics) e [Image Comics](https://imagecomics.com), aproveita a hierarquia editorial, as capas e os caminhos de descoberta. Marvel foi considerada como referência de catálogo, mas seu site bloqueou a consulta automatizada nesta revisão. Não foram copiados layouts, logotipos ou artes dessas editoras.

O objetivo é um portal de ficção independente brasileiro: acolhedor, autoral e organizado, com tecnologia discreta. As sinopses e o cânone continuam nos datasets existentes. A interface distingue texto em revisão, rascunho, acervo com spoilers e história sem leitura disponível.

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

Espaçamento principal segue múltiplos de 4/8 px, com seções de 40–64 px. Cards de capa 3:4, galeria 4:3. Breakpoints em 760 e 1000 px; grades passam a duas ou uma coluna conforme conteúdo. Foco, tamanho mínimo de controles, estados vazios e movimento reduzido fazem parte do CSS base.

## Componentes e rotas

- `components/site-header.tsx`: símbolo histórico, navegação ativa, menu mobile acessível e entrada separada para Studio.
- `components/ui.tsx`: título de seção, abertura de página e card de história.
- `components/reader.tsx`: sumário, tamanho de texto, papel/noturno, navegação e referência canônica opcional.
- `lib/catalog.ts`: apresentação das séries, slugs e seleção de imagens, consumindo JSON canônico.
- `lib/chapters.ts`: leitura dos caminhos do manifesto `book.json`; cálculo real de palavras e duração. Nunca constrói caminhos diretamente a partir de entrada do visitante.
- `/historias/[slug]`: sinopse, capa, arcos e disponibilidade real de leitura.
- `/ler/[chapter]`: leitura dos Markdown atuais de Red Right Hand, identificada como versão de trabalho.
- `/studio`: leitura/revisão e consulta de personagens. Não promete edição, salvamento, auditoria ou exportação implementados.
- `/codex`: seleção pública e acervo completo com aviso de spoilers, busca, filtros e expansão de habilidades.
- `/assets`: seleção visual real, categorias e conexões de facções.
- `/timeline`: eras como entrada padrão; cenas e séries disponíveis em abas. Conserva uma camada de migração descrita em `problems.md`.

## Mídia e manutenção

`npm run media:prepare` executa `scripts/prepare-media.mjs` com Sharp e cria WebP em `public/media`. Os arquivos originais são preservados. O cenário urbano é limitado a 1400 px, o espaço a 1000 px e as demais imagens a 900 px, sem ampliar originais pequenos. A seleção inteira ocupa aproximadamente 876 KB. O navegador carrega imagens fora da primeira dobra sob demanda.

Adicionar uma imagem requer registrar a origem no script e aprovar sua proveniência. O nome “arte ou símbolo” evita apresentar logotipos como retratos oficiais. A reformulação não estabelece licença/autoria dos itens históricos por inferência.

## Verificação

Executar `npm run typecheck` e `npm run build`. Conferir menu, foco, busca sem resultados, categorias, links de histórias, capítulos anterior/seguinte, tema noturno e tamanhos de texto. Incluir larguras de 320, 390, 768 e 1440 px e não depender apenas de screenshot da primeira dobra para conferir imagens lazy.

Pendências de APIs, autenticação, auditoria de dependências, publicação, CI e acessibilidade contínua estão em [`../../problems.md`](../../problems.md).
