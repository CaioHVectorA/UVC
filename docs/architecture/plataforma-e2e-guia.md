> **Planejamento histórico.** Os diagramas e capacidades abaixo não descrevem todos o produto implementado. O estado atual, publicação por Git e limites do Studio estão no [fluxo editorial](editorial-workflow.md) e no [README](../../README.md). Editor com salvamento, exportação KDP e auditoria automática permanecem evoluções futuras.

# Guia Definitivo da Plataforma E2E & UVC Studio 🌌📖

Este documento é o manual oficial da **Plataforma E2E do Universo Virtual de Caio (UVC)**, integrando a ferramenta de criação literária, o sistema de canonização com IA, a Linha do Tempo Universal e a preparação editorial para publicação na **Amazon KDP**.

---

## 🏛️ 1. Arquitetura da Plataforma

A plataforma foi desenhada em duas frentes complementares:

```
                                  PLATAFORMA UVC
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
       🌌 PORTAL PÚBLICO (Leitores)                   🛠️ UVC STUDIO (Autor)
       • Vitrine de Livros Publicados                 • Writing Room (Kindle Create style)
       • Codex / Wiki Canônica                        • Linha do Tempo Modular (FigJam)
       • Leitor Web Distraction-Free                  • Grafo de Conexões & Moodboard
       • Galeria de Mídias e Logos                    • Auditoria Lore Guard no Antigravity
```

---

## ⏱️ 2. A Linha do Tempo Universal em 3 Camadas

Para eliminar a desorientação e manter a consistência entre obras independentes, a cronologia divide-se em 3 níveis hierárquicos dentro de [`data/timeline.json`](../../data/timeline.json):

### Camada 1: As 5 Grandes Eras Cósmicas (Macro)
1. **Pré-Universal:** A formação das leis físicas por Ormuz e o florescer da vida estelar.
2. **Formação:** O surgimento da Terra e a dicotomia seminal Beenie vs. Kevin.
3. **Ascensão:** A fase "Sodoma e Gomorra", apogeu financeiro e mercantil galáctico (Severum).
4. **Redenção:** A Grande Guerra Cósmica e os sacrifícios por liberdade.
5. **Renegação:** A descida de Hades na forma mortal e a marcha rumo a Ormuz.

### Camada 2: As Séries Paralelas (Meso)
- **Red Right Hand:** A expansão militar de Severum e o império corporativo de Arner.
- **Congregadores:** A revolta dos sobreviventes armados com o Bracelete Divino de Ciecon.
- **Guardiões:** A proteção de Glen e da Terra liderada por Beenie.
- **Aventuras de Deroo Da no Espaço:** A ciência autônoma e segredos cibernéticos pós-Severum.
- **Menino Resiliente & Marginal:** A vida urbana, gangues e resiliência das ruas.
- **Punho Mortal:** A simbiose pacífica entre Aedificantes e Mures e a resistência contra Severum.

### Camada 3: Os Beats Atômicos do Livro (Micro)
Cada capítulo é fatiado em **Beats Narrativos** com:
- **POV (Ponto de Vista):** De quem é a visão da cena (ex: *Arner*, *Deroo Da*, *Naok*).
- **Personagens Presentes:** Tags canônicas vinculadas à enciclopédia.
- **Local:** (ex: *Torre RRH*, *Arena de Thyragons*, *Planeta Iutania*).
- **Status do Cânone:**
  - `CANONE_TRAVADO 🔒`: Cena finalizada e validada. Não pode sofrer alterações acidentais.
  - `EM_REVISAO ✍️`: Cena estruturada passando por aprimoramento de estilo e ritmo.
  - `RASCUNHO 💡`: Ideia bruta para ser escrita ou movida na linha do tempo.

---

## ✍️ 3. O Writing Studio (Kindle Create + Google Docs)

Localizado em `/studio`, o editor foi projetado com os padrões de diagramação exigidos pela **Amazon KDP**:
1. **Visualizador Multi-Dispositivo:**
   - **Kindle Paperwhite (E-ink):** Fundo suave papel, fonte Bookerly/Garamond, margens de e-reader, recuo de primeira linha e entrelinha balanceada.
   - **Smartphone:** Leitura contínua vertical para revisão rápida.
   - **Impresso:** Diagramação de páginas com cabeçalho e rodapé.
2. **Inspetor de Cânone Lateral:** Enquanto redige uma cena, consulte em tempo real a psicologia de Arner, a dilação temporal de Tarlin ou as lâminas dérmicas dos Irmãos Yaa sem mudar de aba.
3. **Capítulos Canônicos em Markdown:** Os textos estão salvos em [`books/red-right-hand/capitulos/`](../../books/red-right-hand/capitulos), prontos para exportação direta em `.epub` e `.pdf`.

---

## 🛡️ 4. Como Usar o Lore Guard & Pacing Analyzer no Antigravity

Você não precisa de uma ferramenta externa ou de chats genéricos: **o próprio Antigravity é o seu co-autor técnico**.

### Exemplo 1: Ativando o Lore Guard
Abra uma conversa com o Antigravity e diga:
> *"Ative o Lore Guard no Capítulo 01 de Red Right Hand: verifique se o recrutamento de Tarlin e a fratura da perna de Arner respeitam as 35 Teses de Severum."*

O Antigravity audita o arquivo e aponta se há inconsistências de tom, poderes ou datas.

### Exemplo 2: Calibrando o Pacing
> *"Analise o pacing do Capítulo 05: o ataque do Delimitador a Iutania e o massacre dos Aedificantes está corrido demais ou a tensão está no nível certo para fechar o Ato I?"*

---

## 🔐 5. Regra de Visibilidade Canônica (Anti-Spoilers)

Para valorizar os livros publicados e evitar vazamento de lore:
- **Modo Leitor Público:** O `/codex` exibe **apenas os personagens já presentes em livros publicados** (neste momento, a equipe oficial de *Red Right Hand Volume I*: Arner, Deroo Da, Irmãos Yaa, Delimitador, Tarlin e os Fingers).
- **Modo Studio Autor:** Mostra todos os 21+ personagens, incluindo entidades futuras (*Ormuz*, *Hades*, *Beenie*, *Larry*, *Kerry*), marcados com status reservado.

---

## 🚀 6. Comandos e Deploy com Vercel CLI

Para rodar a plataforma localmente ou publicar na internet:

```bash
# Iniciar o servidor de desenvolvimento local
npm run dev

# Compilar para produção e checar tipos
npm run build

# Deploy imediato na Vercel via CLI
npx vercel
```
