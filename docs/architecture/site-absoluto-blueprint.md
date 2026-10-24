# Blueprint Arquitetural: O Site UVC Absoluto

Este documento detalha as especificações técnicas, arquitetura de software e design de produto para a construção da plataforma definitiva do **Universo UVC**.

## 🎯 Objetivos do Projeto
1. **Wikipedia / Codex Interativo:** Enciclopédia canônica rica com ficha técnica de personagens, facções, locais e linhas temporais.
2. **Vitrine dos Livros Publicados:** Espaço de destaque para os livros de ficção publicados por Caio Henrique, com sinopses literárias, amostras de capítulos e botões de compra (Amazon, livrarias físicas, ebooks).
3. **Leitor Web de Histórias & Contos:** Interface de leitura minimalista, ergonômica e veloz com suporte a temas visuais (Dark/Light/Cyberpunk), marcação de progresso e sumário de episódios.
4. **Acervo de Arte & Mídia:** Galeria imersiva com artes conceituais, capas originais, logos das facções e trilha sonora imersiva.

## 🛠️ Stack Tecnológica Recomendada

- **Framework Web:** **Next.js 15 (App Router)** ou **Astro 5** (para performance estática absurda e SEO literário).
- **Linguagem:** **TypeScript** estrito.
- **Estilização:** **Tailwind CSS v4** + Design System inspirado em quadrinhos sci-fi e enciclopédias modernas (como SCP Foundation e Marvel Fandom, mas com estética limpa e profissional).
- **Componentes & Ícones:** **Lucide React** + **Framer Motion** para microinterações e transições fluidas de páginas.
- **Camada de Dados:**
  - Arquivos JSON estruturados localizados no diretório `/data` e `/docs`.
  - Opção para backend headless leve utilizando **Bun SQLite** via a biblioteca `bun-sqlight` (já desenvolvida no portfólio!).
- **Hospedagem & CI/CD:** Vercel ou Cloudflare Pages com deploy contínuo integrado ao GitHub.

## 📐 Estrutura de Rotas Planejada

```
/
├── index (Landing page imersiva, destaques, livro do momento, trailer/lore)
├── wiki/
│   ├── personagens/ (Grid de personagens com filtros por Terra/Universal, facção e poder)
│   │   └── [id]/ (Ficha detalhada com arte, lore, relações e citações)
│   ├── faccoes/ (Guardiões, Red Right Hand, Congregadores, Fingers, etc.)
│   └── locais/ (Glen, Severum, Espaço Cósmico)
├── livros/ (Catálogo dos livros publicados de Caio Henrique com links de compra)
├── ler/
│   ├── series/ (Navegador de séries em episódios)
│   └── solos/ (Histórias solo completas)
└── galeria/ (Acervo de logotipos, artes conceituais e capas)
```

## 🎨 Identidade Visual
- **Paleta Primária:** Deep Cosmic Blue (`#0B0E14`), Neon Cyan (`#00F2FE`), Vermelho Severum (`#FF2A54`) e Dourado Celestial Ormuz (`#FFB800`).
- **Tipografia:** Tipografia sans-serif limpa para leitura contínua (Inter / Satoshi) e display imponente para títulos (Cabinet Grotesk / Orbitron).
