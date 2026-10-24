# AGENTS.md — Diretrizes para Agentes de IA no UVC

Você está atuando no repositório **UVC (Universo Virtual de Caio)**. Siga rigorosamente as instruções abaixo ao gerar código, documentação ou responder a perguntas:

## 1. Respeito Absoluto ao Cânone
- Nunca invente contradições com a cosmologia oficial (**Ormuz** como divindade suprema, **Hades** como o mal primordial, **Ciecon** como líder dos Congregadores, **Arner** como governante de Severum).
- Respeite as características e poderes descritos em `/data/characters.json` e `/docs/characters/`.
- O foco atual do projeto **não é reescrever os textos brutos das histórias**, mas sim construir as ferramentas de software, o design do site, a enciclopédia (wiki) e a integração dos livros publicados.

## 2. Padrões de Código para o Futuro Site
- Toda implementação de frontend para o site deve seguir **TypeScript**, **Next.js 15 (App Router)** ou **Astro**, utilizando **Tailwind CSS v4** e ícones **Lucide**.
- Sempre consuma os dados estruturados de `/data/characters.json`, `/data/factions.json` e `/data/series_and_solos.json` como fonte de verdade para a Wiki.
- Mantenha a identidade visual: tons escuros cósmicos, neon cyan, toques de vermelho Severum e dourado solar.

## 3. Integridade dos Arquivos
- Não delete arquivos de arte dentro de `/assets/`.
- Ao criar novos componentes ou páginas, preserve a documentação em `/docs/`.
