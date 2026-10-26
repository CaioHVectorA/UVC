"use client";

import { useState } from "react";
import timelineData from "@/data/timeline.json";

export default function TimelinePage() {
  const [activeTab, setActiveTab] = useState<"beats-rrh" | "eras" | "series">("beats-rrh");
  const [filterStatus, setFilterStatus] = useState<string>("TODOS");
  const [filterPov, setFilterPov] = useState<string>("TODOS");
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);

  const eras = timelineData.erasCosmicas;
  const series = timelineData.seriesParalelas;
  const bookRRH = timelineData.livros.find((b) => b.id === "rrh-1");
  const beats = bookRRH ? bookRRH.beats : [];

  const filteredBeats = beats.filter((b) => {
    if (filterStatus !== "TODOS" && b.status !== filterStatus) return false;
    if (filterPov !== "TODOS" && b.pov !== filterPov) return false;
    return true;
  });

  const copyLoreGuardPrompt = (beatTitle: string, beatResumo: string) => {
    const prompt = `Atue como Lore Guard do Universo UVC. Audite a consistência canônica deste beat:
"${beatTitle}":
${beatResumo}
Considere: As 35 Teses de Severum, a psicologia de Arner, a rivalidade dos Irmãos Yaa e a cronologia cósmica.`;
    navigator.clipboard.writeText(prompt);
    setCopiedPrompt(beatTitle);
    setTimeout(() => setCopiedPrompt(null), 3000);
  };

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272a] pb-5">
        <div className="space-y-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
            Cronologia Canônica
          </span>
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            Linha do Tempo Modular
          </h1>
          <p className="text-xs text-zinc-400">
            Mapeamento de causa e efeito para controle de linearidade e beats de cena.
          </p>
        </div>

        {/* Abas */}
        <div className="flex items-center gap-1 p-1 rounded-md bg-[#18181b] border border-[#27272a] self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("beats-rrh")}
            className={`px-3 py-1.5 rounded text-xs font-mono transition-colors ${
              activeTab === "beats-rrh"
                ? "bg-white text-black font-semibold"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Beats: Red Right Hand I
          </button>
          <button
            onClick={() => setActiveTab("eras")}
            className={`px-3 py-1.5 rounded text-xs font-mono transition-colors ${
              activeTab === "eras"
                ? "bg-white text-black font-semibold"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            5 Eras Cósmicas
          </button>
          <button
            onClick={() => setActiveTab("series")}
            className={`px-3 py-1.5 rounded text-xs font-mono transition-colors ${
              activeTab === "series"
                ? "bg-white text-black font-semibold"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Séries Paralelas
          </button>
        </div>
      </div>

      {/* Beats de Red Right Hand I */}
      {activeTab === "beats-rrh" && (
        <div className="space-y-5">
          {/* Barra de Filtros */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-md bg-[#18181b] border border-[#27272a] text-xs font-mono">
            <div className="flex items-center gap-3">
              <span className="text-zinc-400">Filtros:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-[#121214] border border-[#27272a] rounded px-2.5 py-1 text-zinc-200 focus:outline-none focus:border-zinc-500"
              >
                <option value="TODOS">Todos os Status</option>
                <option value="CANONE_TRAVADO">Cânone Travado</option>
                <option value="EM_REVISAO">Em Revisão</option>
                <option value="RASCUNHO">Rascunho</option>
              </select>

              <select
                value={filterPov}
                onChange={(e) => setFilterPov(e.target.value)}
                className="bg-[#121214] border border-[#27272a] rounded px-2.5 py-1 text-zinc-200 focus:outline-none focus:border-zinc-500"
              >
                <option value="TODOS">Todos os POVs</option>
                <option value="Arner">POV: Arner</option>
                <option value="Deroo Da">POV: Deroo Da</option>
              </select>
            </div>

            <div className="flex items-center gap-3 text-zinc-500">
              <span>{beats.filter((b) => b.status === "CANONE_TRAVADO").length} Travados</span>
              <span>•</span>
              <span>{beats.filter((b) => b.status === "EM_REVISAO").length} Em Revisão</span>
              <span>•</span>
              <span>{beats.filter((b) => b.status === "RASCUNHO").length} Rascunhos</span>
            </div>
          </div>

          {/* Lista de Beats */}
          <div className="space-y-3">
            {filteredBeats.map((beat, idx) => (
              <div
                key={beat.id}
                className="p-5 rounded-lg border border-[#27272a] bg-[#18181b] space-y-3 hover:border-zinc-600 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500">Beat #{idx + 1}</span>
                    <span className="text-zinc-600">•</span>
                    <span className="text-zinc-400">Cap. {beat.capitulo}</span>
                    <span className="text-zinc-600">•</span>
                    <span className="px-2 py-0.5 rounded bg-[#121214] border border-[#27272a] text-zinc-300">
                      {beat.status === "CANONE_TRAVADO"
                        ? "Cânone Travado"
                        : beat.status === "EM_REVISAO"
                        ? "Em Revisão"
                        : "Rascunho"}
                    </span>
                  </div>

                  <button
                    onClick={() => copyLoreGuardPrompt(beat.titulo, beat.resumo)}
                    className="px-2.5 py-1 rounded bg-[#121214] hover:bg-zinc-800 border border-[#27272a] hover:border-zinc-500 text-zinc-300 text-[11px] transition-colors"
                  >
                    {copiedPrompt === beat.titulo ? "Prompt Copiado!" : "Copiar Auditoria (Lore Guard)"}
                  </button>
                </div>

                <h3 className="text-base font-semibold text-white">
                  {beat.titulo}
                </h3>

                <p className="text-xs text-zinc-300 leading-relaxed">
                  {beat.resumo}
                </p>

                {beat.notas && (
                  <div className="p-2.5 rounded bg-[#121214] border border-[#27272a] text-[11px] text-zinc-400 font-mono">
                    <span className="text-zinc-300 font-medium">Nota: </span>
                    {beat.notas}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#27272a] text-xs font-mono text-zinc-400">
                  <div className="flex items-center gap-4">
                    <span>POV: <strong className="text-zinc-200">{beat.pov}</strong></span>
                    <span>Local: <strong className="text-zinc-200">{beat.local}</strong></span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {beat.personagens.map((p) => (
                      <span key={p} className="px-2 py-0.5 rounded bg-[#121214] text-zinc-400 text-[10px] border border-[#27272a]">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5 Eras Cósmicas */}
      {activeTab === "eras" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {eras.map((era) => (
            <div
              key={era.id}
              className="p-5 rounded-lg border border-[#27272a] bg-[#18181b] space-y-3"
            >
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-500">Era #{era.ordem}</span>
                <span className="text-zinc-400 uppercase">{era.id}</span>
              </div>
              <h3 className="text-base font-semibold text-white">
                {era.nome}
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {era.resumo}
              </p>
              <p className="text-[11px] text-zinc-400 leading-relaxed pt-2 border-t border-[#27272a]">
                {era.descricao}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Séries Paralelas */}
      {activeTab === "series" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {series.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-lg border border-[#27272a] bg-[#18181b] space-y-2"
            >
              <div className="text-[10px] font-mono text-zinc-500 uppercase flex justify-between">
                <span>{item.escala}</span>
                <span>{item.localPrincipal}</span>
              </div>
              <h3 className="text-sm font-semibold text-white">
                {item.titulo}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                {item.descricao}
              </p>
              <div className="text-xs font-mono text-zinc-400 pt-1">
                Protagonista: <span className="text-zinc-200">{item.protagonista}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
