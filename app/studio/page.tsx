"use client";

import { useState } from "react";
import { 
  BookOpen, 
  Smartphone, 
  Tablet, 
  Monitor, 
  Download, 
  Sparkles, 
  Check, 
  Copy, 
  Lock, 
  FileText, 
  User, 
  ChevronRight, 
  Sliders, 
  Printer, 
  HelpCircle 
} from "lucide-react";
import bookData from "@/books/red-right-hand/book.json";
import charactersData from "@/data/characters.json";

// Conteúdo dos capítulos para leitura e teste no visualizador
const CHAPTER_TEXTS: Record<number, string> = {
  0: `# Capítulo 00: A Reunião

Num dia ensolarado de manhã no planeta de Severum, Arner — que dormia — escuta batidas na porta. Ele desperta, assustado, e diz:

— *Diga.*

— Arner! Se apresse, ou irá se atrasar!

Arner reconhece a voz, que é de seu conselheiro, Firn. Percebendo que tinha passado do tempo planejado, ele se levanta e começa a se preparar, às pressas, para o encontro que ele tanto esperava. Ele vai à "Torre RRH" — um prédio enorme e chamativo — tal qual será o Quartel-General da Red Right Hand.

Ele entra no edifício e vai até a sala de reuniões. Para sua surpresa, todos os participantes já estavam presentes antes mesmo dele. Sem delongar, ele começa seu longo discurso.

---

### *1ª Reunião Red Right Hand*

— Bom dia a todos. Já vejo que todos chegaram antes mesmo de mim, devem estar ansiosos assim como eu. Antes de tudo, devo tirar as perguntas que vocês têm em suas cabeças. Primeiramente: o que é a Red Right Hand?

Arner caminha até a ponta da mesa envidraçada que reflete a luz solar avermelhada de Severum.

— Somos mais que uma equipe, muito mais que um governo. Somos uma potência, somos a autoridade, a ordem. Conquistamos, urbanizamos e povoamos Severum e a faremos ser o planeta mais rico de todos.

Ele olha nos olhos de cada um dos presentes:

— Somos os melhores, e tenham certeza… Com esforço e inteligência, nós conquistaremos qualquer coisa que quisermos. Para vocês se conhecerem entre si: nós somos e temos tudo que será necessário.

Arner aponta calmamente para cada canto da mesa:

— **Delimitador**, a força bruta.
— **Tarlin** e sua equipe, o poder de fogo de alta potência.
— **Irmãos Yaa**, a agilidade e o corte fatal.
— **Deroo Da**, a mente científica suprema.

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
  const [previewDevice, setPreviewDevice] = useState<"kindle" | "mobile" | "desktop" | "print">("kindle");
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>("arner");
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [fontSize, setFontSize] = useState<number>(18);

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
      {/* Top Studio Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#0b0e17] border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#ff2a54]">
            <BookOpen className="w-4 h-4" />
            <span>KINDLE CREATE STUDIO & PREVIEWER</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">
            {bookData.titulo} <span className="text-slate-400 font-normal text-sm">({bookData.subtitulo})</span>
          </h1>
        </div>

        {/* Device Switcher & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setPreviewDevice("kindle")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                previewDevice === "kindle"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Tablet className="w-3.5 h-3.5" />
              <span>Kindle E-ink</span>
            </button>

            <button
              onClick={() => setPreviewDevice("mobile")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                previewDevice === "mobile"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Celular</span>
            </button>

            <button
              onClick={() => setPreviewDevice("print")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                previewDevice === "print"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Impresso</span>
            </button>
          </div>

          <button
            onClick={handleCopyLoreGuard}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-700 hover:from-cyan-500 hover:to-sky-600 text-white font-mono text-xs font-bold shadow-[0_0_15px_rgba(0,242,254,0.3)] transition-all"
          >
            {copiedPrompt ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span>Prompt Copiado!</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auditar no Antigravity</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar: Book Hierarchy */}
        <div className="lg:col-span-3 space-y-4">
          <div className="p-4 rounded-xl bg-[#0a0d16] border border-slate-800 space-y-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block font-bold">
              Sumário de Capítulos (KDP)
            </span>

            <div className="space-y-1.5">
              {capitulos.map((cap) => (
                <button
                  key={cap.numero}
                  onClick={() => setSelectedChapter(cap.numero)}
                  className={`w-full text-left p-2.5 rounded-lg text-xs font-mono transition-all flex items-center justify-between ${
                    selectedChapter === cap.numero
                      ? "bg-red-950/60 border border-[#ff2a54]/50 text-white font-bold"
                      : "bg-slate-900/60 border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  <div className="truncate">
                    <span className="text-slate-500 mr-1.5">#{cap.numero}</span>
                    <span>{cap.titulo}</span>
                  </div>
                  {cap.status === "CANONE_TRAVADO" ? (
                    <Lock className="w-3 h-3 text-emerald-400 shrink-0 ml-1" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 ml-1" />
                  )}
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-800/80 space-y-2 text-[11px] font-mono text-slate-400">
              <div className="flex justify-between">
                <span>Total de Palavras:</span>
                <span className="text-white font-bold">~14.100</span>
              </div>
              <div className="flex justify-between">
                <span>Status KDP:</span>
                <span className="text-amber-400 font-bold">Pronto para Revisão</span>
              </div>
            </div>
          </div>

          {/* Front Matter Box */}
          <div className="p-4 rounded-xl bg-[#0a0d16] border border-slate-800 space-y-2 text-xs">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block font-bold">
              Epígrafe Oficial
            </span>
            <p className="text-slate-300 italic text-[11px] leading-relaxed">
              {bookData.frontMatter.epigrafe}
            </p>
          </div>
        </div>

        {/* Center: Device Reader / Preview */}
        <div className="lg:col-span-6 flex justify-center">
          <div
            className={`w-full transition-all duration-300 ${
              previewDevice === "kindle"
                ? "max-w-[560px] bg-[#fbf9f5] text-[#1a1a1a] rounded-[24px] p-8 sm:p-12 shadow-[0_0_40px_rgba(0,0,0,0.8)] border-[10px] border-[#1e1e1e]"
                : previewDevice === "mobile"
                ? "max-w-[360px] bg-[#0c101b] text-slate-100 rounded-[36px] p-6 shadow-2xl border-[8px] border-[#1f293d]"
                : "w-full bg-[#fcfcfc] text-[#111] rounded-xl p-10 sm:p-14 shadow-2xl border border-slate-300"
            }`}
          >
            {/* Kindle Device Header Mock */}
            {previewDevice === "kindle" && (
              <div className="border-b border-[#e5dfd5] pb-3 mb-6 flex items-center justify-between text-[11px] font-serif text-[#666]">
                <span>{bookData.titulo}</span>
                <span>Capítulo {selectedChapter}</span>
              </div>
            )}

            {/* Book Body */}
            <article
              className={`book-font leading-relaxed whitespace-pre-wrap ${
                previewDevice === "kindle"
                  ? "text-[#1a1a1a] text-justify"
                  : previewDevice === "mobile"
                  ? "text-slate-200 text-left text-sm"
                  : "text-[#111] text-justify"
              }`}
              style={{ fontSize: `${fontSize}px` }}
            >
              {chapterText}
            </article>

            {/* Kindle Footer Mock */}
            {previewDevice === "kindle" && (
              <div className="border-t border-[#e5dfd5] pt-4 mt-8 flex items-center justify-between text-[10px] font-mono text-[#888]">
                <span>Capítulo {selectedChapter} de 5</span>
                <span>Página 14 de 128 • 2 min restantes no capítulo</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Lore Inspector Drawer */}
        <div className="lg:col-span-3 space-y-4">
          <div className="p-4 rounded-xl bg-[#0a0d16] border border-slate-800 space-y-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 font-bold">
              <User className="w-3.5 h-3.5" /> Lore Inspector (Cânone)
            </span>

            <select
              value={selectedCharacterId}
              onChange={(e) => setSelectedCharacterId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg text-xs text-white p-2 font-mono focus:border-cyan-500 focus:outline-none"
            >
              <option value="arner">Arner (Severum)</option>
              <option value="deroo-da">Deroo Da (Cientista)</option>
              <option value="tarlin">Tarlin (Fingers / Tempo)</option>
              <option value="delimitador">Delimitador (Força)</option>
              <option value="irmaos-yaa">Irmãos Yaa (Lâminas)</option>
            </select>

            {selectedCharacter && (
              <div className="space-y-3 pt-2 text-xs">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Nome & Alinhamento</span>
                  <p className="font-bold text-white text-sm">{selectedCharacter.nome}</p>
                  <span className="text-[11px] font-mono text-[#ff2a54]">{selectedCharacter.alinhamento}</span>
                </div>

                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Psicologia & Cânone</span>
                  <p className="text-slate-300 leading-relaxed text-[11px] mt-1 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                    {selectedCharacter.desc}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Poderes Registrados</span>
                  <ul className="mt-1 space-y-1">
                    {selectedCharacter.poderes.map((pod, i) => (
                      <li key={i} className="text-[11px] text-cyan-300 font-mono flex items-start gap-1">
                        <span className="text-cyan-500">•</span>
                        <span>{pod}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Typography Controls */}
          <div className="p-4 rounded-xl bg-[#0a0d16] border border-slate-800 space-y-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-bold">
              <Sliders className="w-3.5 h-3.5" /> Ajuste de Leitura
            </span>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Tamanho da Fonte:</span>
              <span className="text-white font-bold">{fontSize}px</span>
            </div>
            <input
              type="range"
              min="14"
              max="24"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
