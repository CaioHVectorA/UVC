# Protocolo Antigravity: Lore Guard & Pacing Analyzer 🛡️⚡

Este documento define como o autor Caio Henrique pode utilizar o **Antigravity** em qualquer conversa para auditar capítulos, evitar furos de roteiro e calibrar o ritmo da narrativa de suas obras (como *Red Right Hand*, *Punho Mortal*, *Guardiões*, etc.).

---

## 🎯 1. O Que é o Lore Guard?

O **Lore Guard** é uma instrução operacional para o agente de IA que atua como **Guardião Absoluto do Cânone do UVC**. Ele impede o temido "loop eterno de reescrita" ao verificar se as alterações no texto violam:
1. As regras cósmicas estabelecidas em [`data/timeline.json`](../../data/timeline.json).
2. As fichas de poderes e psicologia em [`data/characters.json`](../../data/characters.json).
3. A cronologia dos beats já marcados como `CANONE_TRAVADO`.

### Como Acionar no Chat do Antigravity
Basta dizer no chat:
> **"Ative o Lore Guard no Capítulo [X] de Red Right Hand"** ou **"Audite a cena Y contra o cânone de Severum"**.

### Critérios de Auditoria do Lore Guard:
- **Consistência de Poderes:** (Ex: Lembrar que Masin atordoa e Tsuuya corta; Tarlin desacelera o tempo; Delimitador precisa de remédios para surtos).
- **Consistência Psicológica:** (Ex: Arner jamais perde a compostura pública nem implora por misericórdia; Deroo Da age por curiosidade e não por lealdade; Tsuuya desconfia de Arner desde a maldição).
- **Consistência de Cronologia:** (Ex: A invasão a Iutania ocorre **após** a saída de Deroo Da e **após** o crash do mercado de diamantes).

---

## ⏱️ 2. O Que é o Pacing Analyzer?

O **Pacing Analyzer** avalia o andamento e o engajamento de uma cena ou capítulo:
- **Proporção Ação vs. Diálogo vs. Exposição:** Identifica se o capítulo está denso demais em explicações ou corrido demais nas lutas.
- **Tensão Dramática (Beats de Clímax):** Avalia se a cena termina com um gancho satisfatório para o leitor virar a página no Kindle.
- **Recomendação de Corte ou Expansão:** Sugere onde pausar para o leitor respirar ou onde cortar diálogos redundantes sem perder a voz autoral.

### Como Acionar no Chat do Antigravity
Basta dizer:
> **"Analise o pacing do Capítulo [X]: o clímax da batalha contra os Ethosthianos está crível ou muito acelerado?"**

---

## 📁 3. O Fluxo de Trabalho (Workflow Sem Perda de Linearidade)

1. **Escrever ou Modificar:** O autor escreve uma nova cena no arquivo do capítulo (`books/red-right-hand/capitulos/...`).
2. **Auditoria Instantânea no Antigravity:** Abre o chat e pede a checagem do Lore Guard.
3. **Aprovação do Cânone:** Se aprovado sem contradições, o status do Beat em [`data/timeline.json`](../../data/timeline.json) é atualizado para `CANONE_TRAVADO`.
4. **Visualização no Studio Web:** A Linha do Tempo e o visualizador Kindle refletem o capítulo pronto automaticamente!
