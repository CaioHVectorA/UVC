"use client";

import { useState } from "react";
import bookData from "@/books/red-right-hand/book.json";
import charactersData from "@/data/characters.json";

const CHAPTER_TEXTS: Record<number, string> = {
  0: `# Capítulo 00: A Reunião

Num dia ensolarado de manhã no planeta de Severum, Arner — que dormia — escuta batidas na porta. Ele desperta, assustado, e diz:

— Diga.

— Arner! Se apresse, ou irá se atrasar!

Arner reconhece a voz, que é de seu conselheiro, Firn. Percebendo que tinha passado do tempo planejado, ele se levanta e começa a se preparar, às pressas, para o encontro que ele tanto esperava. Ele vai à "Torre RRH" — um prédio enorme e chamativo — tal qual será o Quartel-General da Red Right Hand.

Ele entra no edifício e vai até a sala de reuniões. Para sua surpresa, todos os participantes já estavam presentes antes mesmo dele. Sem delongar, ele começa seu longo discurso.

---

### 1ª Reunião Red Right Hand

— Bom dia a todos. Já vejo que todos chegaram antes mesmo de mim, devem estar ansiosos assim como eu. Antes de tudo, devo tirar as perguntas que vocês têm em suas cabeças. Primeiramente: o que é a Red Right Hand?

Arner caminha até a ponta da mesa que reflete a luz solar de Severum.

— Somos mais que uma equipe, muito mais que um governo. Somos uma potência, somos a autoridade, a ordem. Conquistamos, urbanizamos e povoamos Severum e a faremos ser o planeta mais rico de todos.

Ele olha nos olhos de cada um dos presentes:

— Somos os melhores, e tenham certeza… Com esforço e inteligência, nós conquistaremos qualquer coisa que quisermos. Para vocês se conhecerem entre si: nós somos e temos tudo que será necessário.

Arner aponta calmamente para cada canto da mesa:

— Delimitador, a força bruta.
— Tarlin e sua equipe, o poder de fogo de alta potência.
— Irmãos Yaa, a agilidade e o corte fatal.
— Deroo Da, a mente científica suprema.

E assim, a primeira engrenagem de Severum começou a girar.`,

  1: `# Capítulo 01: Fundação e Recrutamento

Muitos anos antes de ser um grande planeta, Severum era nada. Apenas massa, poeira e solidez. Não havia terra fértil, não havia vida, não havia calor. Severum sequer tinha um nome.

Então apareceu Arner.

Desde jovem, Arner sempre quis entender como as engrenagens do universo funcionavam — por que funcionavam e para quê. Ele passou anos estudando incansavelmente, acumulando uma vultosa fortuna através de manobras financeiras e acordos nem sempre convencionais. Quando sentiu que era a hora de mudar o cosmos, abandonou seu planeta natal e passou a vagar pelo espaço profundo.

Muitos viam aquela rocha morta e cinzenta e passavam direto. Mas os olhos de Arner brilharam. Ali não havia governos estabelecidos, nem regras prévias: havia uma tela em branco para erguer um império universal.

Mas ele sabia que sozinho seria impossível. Precisava de uma mente pensante à altura da sua.

---

### O Encontro com Deroo Da

Após meses de busca pelos quadrantes científicos, o nome de Deroo Da ecoava como uma lenda: um cientista de intelecto inigualável, mas blindado por uma arrogância inabalável.

Arner o encontrou. Como esperado, foi recebido com desdém. Porém, com paciência cirúrgica, Arner desdobrou as projeções de como aquele planeta morto se tornaria o maior polo de riqueza do cosmos. Deroo Da aceitou o desafio — menos por lealdade ou política, e mais pela pura curiosidade científica de dobrar as leis de um mundo hostil.

Juntos, analisaram cada obstáculo. Para vencer o frio mortal, Deroo Da projetou uma colossal fornalha subterrânea com dutovias que distribuíam calor geotérmico para toda a superfície. Bilhões foram investidos. Em pouco tempo, a temperatura de Severum tornou-se habitável.

Arner redigiu as 35 Teses de Severum, estabelecendo um monopólio de trocas, segurança e comércio. Mas em um universo onde entidades superpoderosas governam setores inteiros, uma civilização sem força bélica seria devorada em semanas.

Era preciso forjar a Red Right Hand.

---

### A Maldição dos Irmãos Yaa

A busca de Arner por guerreiros o levou a um mundo arruinado pela miséria e pela violência. Em meio aos escombros, encontrou dois gêmeos bivitelinos: Masin e Tsuuya Yaa. Tinham acabado de perder o pai e lutavam pela sobrevivência como animais acuados.

Arner ofereceu-lhes uma saída com uma condição: deveriam se tornar dignos da RRH.

Levados a uma misteriosa feiticeira, uma maldição ancestral foi cravada em seus corpos: um elo inquebrável que lhes permitia conjurar lâminas afiadíssimas diretamente de sua epiderme. Masin atordoava e vulnerabilizava; Tsuuya desferia o golpe fatal, retalhando e desmembrando o alvo.

Masin passou a enxergar Severum como o paraíso; Tsuuya, por outro lado, jamais confiou em Arner, guardando um ressentimento silencioso que crescia a cada dia.

---

### O Homem que não Quebra

Faltava a infantaria tática. O nome de Tarlin — o atirador mercenário que distorcia a passagem do tempo — era temido em todo o quadrante.

Arner rastreou Tarlin e seu esquadrão no meio de um sequestro militar pago. Ao ser cercado pelos soldados de Tarlin (Curtin, Mylon, Chin e Ellis), as miras foram apontadas para a sua cabeça. Tarlin zombou daquele homem comum.

Um dos soldados de Tarlin quebrou a perna de Arner com um golpe seco de coronha.

Arner caiu no chão de metal. Porém, não gritou. Não pediu misericórdia. Não expressou um único traço de dor ou pânico. Apoiando-se com a perna fraturada, continuou o discurso com a mesma entonação serena:

— Severum é o futuro. Se vocês marcharem comigo, a glória será nossa. Se ficarem aqui, morrerão como mercenários esquecidos.

O silêncio tomou o hangar. Tarlin abaixou o rifle. A Red Right Hand estava completa.`,

  2: `# Capítulo 02: As Corridas de Thyragons

Para inaugurar Severum perante a elite galáctica e consolidar seu poder comercial, Arner anunciou o maior evento de apostas e entretenimento do setor: As Corridas de Thyragons.

Monarcas, contrabandistas e governantes de dezenas de sistemas desceram em Severum. O fluxo de créditos estelares explodiu em poucas horas. No entanto, o espetáculo era apenas a cortina de fumaça para o verdadeiro objetivo traçado na 1ª Reunião: desferir o primeiro golpe contra as reservas do planeta Lamproico.

Enquanto as arquibancadas tremiam, Masin e Tsuuya invadiam o palácio dos Lamprois em uma nave ligeira de dobra. Suas lâminas dérmicas abriram caminho pelos andares inferiores fortificados. No cofre principal, descobriram o mapa confidencial com a localização dos verdadeiros tesouros subterrâneos dos Lamprois.`,

  3: `# Capítulo 03: A Diplomacia Falsa

Com o mapa em mãos, Arner convocou a reunião de Veredicto. Elogiou o desempenho dos operacionais, mas avisou que o verdadeiro plano estava apenas começando: A Diplomacia Falsa.

Em um asteroide neutro do setor leste, Arner agendou um encontro com o monarca Lamproy. Sozinho, vestido com trajes civis comuns e sem escolta armada visível, Arner propôs um acordo: a Red Right Hand destruiria a armada invasora dos Ethosthianos em troca da inclusão definitiva de Severum na prestigiada Liga das Riquezas e Potências do Leste (LRPL).

A armada da RRH massacrou os Ethosthianos em uma ofensiva relâmpago. Mas em Severum, Arner recebia um alerta: Ciecon havia sido avistado nos radares da órbita.`,

  4: `# Capítulo 04: O Homem de Sangue de Diamante

Conforme a poeira da batalha se assentava no planeta dos Lamprois, os Irmãos Yaa arrombaram a câmara subterrânea indicada no mapa. Não havia diamantes empilhados. Havia apenas uma cela de contenção com um homem acorrentado.

Deroo Da passou a madrugada analisando seu sangue: as moléculas orgânicas eram compostas por puro diamante regenerativo de valor astronômico. 

Porém, na manhã seguinte, perante a mesa diretora da Torre RRH, Deroo Da fez a revelação que congelou Severum:
— A partir de hoje, não faço mais parte da Red Right Hand.`,

  5: `# Capítulo 05: Férias Interrompidas & Invasão a Iutania

A saída de Deroo Da paralisou as tecnologias de Severum e o mercado de diamantes quebrou. 

Arner convocou a 5ª Reunião e ordenou a Operação Iutania: invadir o mundo verdejante dos Aedificantes — humanoides incansáveis que viviam em simbiose com os telepáticos Mures. 

Delimitador desceu sobre as plantações e cidades de Iutania com força devastadora, escravizando os habitantes e plantando a semente de rancor que daria origem ao Punho Mortal.`
};

export default function StudioPage() {
  const [selectedChapter, setSelectedChapter] = useState<number>(0);
  const [previewDevice, setPreviewDevice] = useState<"kindle" | "mobile" | "impresso">("kindle");
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>("arner");
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [fontSize, setFontSize] = useState<number>(17);

  const capitulos = bookData.capitulos;
  const currentChapter = capitulos.find((c) => c.numero === selectedChapter) || capitulos[0];
  const chapterText = CHAPTER_TEXTS[selectedChapter] || "Capítulo em desenvolvimento.";
  const selectedCharacter = charactersData.find((c) => c.id === selectedCharacterId);

  const handleCopyLoreGuard = () => {
    const prompt = `Atue como Lore Guard e Pacing Analyzer do UVC no Capítulo ${selectedChapter} de "${bookData.titulo}":
Capítulo: ${currentChapter.titulo}
Texto em análise:
${chapterText.slice(0, 1500)}...
Verifique:
1. Respeito ao cânone de Severum e às 35 Teses.
2. Comportamento e falas dos personagens envolvidos.
3. Ritmo dramático (pacing) e transições de cena.`;
    navigator.clipboard.writeText(prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Barra Superior do Studio */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272a] pb-4">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
            Writing Studio & Leitor KDP
          </span>
          <h1 className="text-xl font-semibold text-white">
            {bookData.titulo} <span className="text-zinc-500 text-sm font-normal">— {bookData.subtitulo}</span>
          </h1>
        </div>

        {/* Seleção de Visualizador */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#18181b] border border-[#27272a] rounded-md p-0.5 text-xs font-mono">
            <button
              onClick={() => setPreviewDevice("kindle")}
              className={`px-3 py-1 rounded transition-colors ${
                previewDevice === "kindle" ? "bg-white text-black font-medium" : "text-zinc-400 hover:text-white"
              }`}
            >
              Kindle
            </button>
            <button
              onClick={() => setPreviewDevice("mobile")}
              className={`px-3 py-1 rounded transition-colors ${
                previewDevice === "mobile" ? "bg-white text-black font-medium" : "text-zinc-400 hover:text-white"
              }`}
            >
              Celular
            </button>
            <button
              onClick={() => setPreviewDevice("impresso")}
              className={`px-3 py-1 rounded transition-colors ${
                previewDevice === "impresso" ? "bg-white text-black font-medium" : "text-zinc-400 hover:text-white"
              }`}
            >
              Impresso
            </button>
          </div>

          <button
            onClick={handleCopyLoreGuard}
            className="px-3 py-1.5 rounded-md bg-[#18181b] hover:bg-zinc-800 border border-[#27272a] text-zinc-200 text-xs font-mono transition-colors"
          >
            {copiedPrompt ? "Prompt Copiado!" : "Auditar no Antigravity"}
          </button>
        </div>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Painel Esquerdo: Capítulos */}
        <div className="lg:col-span-3 space-y-4">
          <div className="p-4 rounded-lg bg-[#18181b] border border-[#27272a] space-y-3">
            <span className="text-[11px] font-mono uppercase text-zinc-400 block font-semibold">
              Sumário de Capítulos
            </span>

            <div className="space-y-1">
              {capitulos.map((cap) => (
                <button
                  key={cap.numero}
                  onClick={() => setSelectedChapter(cap.numero)}
                  className={`w-full text-left p-2 rounded text-xs font-mono transition-colors flex items-center justify-between ${
                    selectedChapter === cap.numero
                      ? "bg-zinc-800 text-white font-semibold"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
                  }`}
                >
                  <span className="truncate">
                    #{cap.numero} {cap.titulo}
                  </span>
                  <span className="text-[10px] text-zinc-500 ml-2">
                    {cap.status === "CANONE_TRAVADO" ? "Travado" : "Revisão"}
                  </span>
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-[#27272a] text-[11px] font-mono text-zinc-400 space-y-1">
              <div className="flex justify-between">
                <span>Total de Palavras:</span>
                <span className="text-zinc-200">~14.100</span>
              </div>
              <div className="flex justify-between">
                <span>Formato de Saída:</span>
                <span className="text-zinc-200">EPUB 3 / KDP</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-[#18181b] border border-[#27272a] space-y-1.5 text-xs">
            <span className="text-[10px] font-mono uppercase text-zinc-400 font-semibold block">
              Epígrafe
            </span>
            <p className="text-zinc-300 italic text-[11px] leading-relaxed">
              {bookData.frontMatter.epigrafe}
            </p>
          </div>
        </div>

        {/* Centro: Visualizador de Livro */}
        <div className="lg:col-span-6 flex justify-center">
          <div
            className={`w-full transition-all duration-200 ${
              previewDevice === "kindle"
                ? "max-w-[540px] bg-[#fbf9f5] text-[#1c1c1c] rounded-lg p-8 sm:p-12 shadow-md border border-[#e5dfd5]"
                : previewDevice === "mobile"
                ? "max-w-[340px] bg-[#18181b] text-zinc-200 rounded-2xl p-6 shadow-md border border-[#27272a]"
                : "w-full bg-[#fdfdfd] text-[#111] rounded-lg p-10 sm:p-14 shadow-md border border-zinc-300"
            }`}
          >
            {/* Header de Livro */}
            {previewDevice === "kindle" && (
              <div className="border-b border-[#e5dfd5] pb-2.5 mb-6 flex items-center justify-between text-[11px] font-book text-[#777]">
                <span>{bookData.titulo}</span>
                <span>Capítulo {selectedChapter}</span>
              </div>
            )}

            {/* Texto */}
            <article
              className={`font-book leading-relaxed whitespace-pre-wrap ${
                previewDevice === "kindle"
                  ? "text-[#1c1c1c] text-justify"
                  : previewDevice === "mobile"
                  ? "text-zinc-200 text-left text-sm"
                  : "text-[#111] text-justify"
              }`}
              style={{ fontSize: `${fontSize}px` }}
            >
              {chapterText}
            </article>

            {/* Rodapé Kindle */}
            {previewDevice === "kindle" && (
              <div className="border-t border-[#e5dfd5] pt-3 mt-8 flex items-center justify-between text-[10px] font-mono text-[#888]">
                <span>Capítulo {selectedChapter} de 5</span>
                <span>Página 14 de 128</span>
              </div>
            )}
          </div>
        </div>

        {/* Painel Direito: Lore Inspector */}
        <div className="lg:col-span-3 space-y-4">
          <div className="p-4 rounded-lg bg-[#18181b] border border-[#27272a] space-y-3">
            <span className="text-[11px] font-mono uppercase text-zinc-400 font-semibold block">
              Lore Inspector (Cânone)
            </span>

            <select
              value={selectedCharacterId}
              onChange={(e) => setSelectedCharacterId(e.target.value)}
              className="w-full bg-[#121214] border border-[#27272a] rounded p-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-zinc-500"
            >
              <option value="arner">Arner (Severum)</option>
              <option value="deroo-da">Deroo Da (Cientista)</option>
              <option value="tarlin">Tarlin (Fingers)</option>
              <option value="delimitador">Delimitador (Força)</option>
              <option value="irmaos-yaa">Irmãos Yaa (Lâminas)</option>
            </select>

            {selectedCharacter && (
              <div className="space-y-3 pt-2 text-xs">
                <div>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">Nome & Alinhamento</span>
                  <p className="font-semibold text-white text-sm">{selectedCharacter.nome}</p>
                  <span className="text-[11px] font-mono text-zinc-400">{selectedCharacter.alinhamento}</span>
                </div>

                <div>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">Psicologia Canônica</span>
                  <p className="text-zinc-300 leading-relaxed text-[11px] mt-1 p-2.5 rounded bg-[#121214] border border-[#27272a]">
                    {selectedCharacter.desc}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">Poderes Registrados</span>
                  <ul className="mt-1 space-y-1">
                    {selectedCharacter.poderes.map((pod, i) => (
                      <li key={i} className="text-[11px] text-zinc-300 font-mono flex items-start gap-1">
                        <span className="text-zinc-500">•</span>
                        <span>{pod}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Ajuste de Leitura */}
          <div className="p-4 rounded-lg bg-[#18181b] border border-[#27272a] space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-400">Tamanho da Fonte:</span>
              <span className="text-zinc-200 font-medium">{fontSize}px</span>
            </div>
            <input
              type="range"
              min="14"
              max="22"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full accent-zinc-400 bg-zinc-800 h-1.5 rounded cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
