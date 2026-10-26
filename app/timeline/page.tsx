"use client";

import { useState } from "react";
import { 
  Compass, 
  Layers, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Filter, 
  Lock, 
  ChevronRight, 
  Copy, 
  Check, 
  ArrowUpDown,
  BookOpen,
  User,
  MapPin
} from "lucide-react";
import timelineData from "@/data/timeline.json";

export default function TimelinePage() {
  const [activeTab, setActiveTab] = useState<"beats-rrh" | "eras" | "series">("beats-rrh");
  const [filterStatus, setFilterStatus] = useState<string>("TODOS");
  const [filterPov, setFilterPov] = useState<string>("TODOS");
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);

  const eras = timelineData.erasCosmicas;
  const series = timelineData.seriesParalelas;
  const bookRRH = timelineData.livros.find((b) => b.id === "rrh-1");
  const bookPM = timelineData.livros.find((b) => b.id === "punho-mortal-1");

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 text-xs font-mono mb-2">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>FigJam Canônico & Linearidade</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Linha do Tempo Universal Modular
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Navegue da macro-história cósmica até os beats atômicos de cada cena para nunca mais se perder em reescritas.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("beats-rrh")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              activeTab === "beats-rrh"
                ? "bg-[#ff2a54] text-white shadow-[0_0_12px_rgba(255,42,84,0.4)]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Beats: Red Right Hand I
          </button>
          <button
            onClick={() => setActiveTab("eras")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              activeTab === "eras"
                ? "bg-cyan-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(0,242,254,0.4)]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            5 Eras Cósmicas
          </button>
          <button
            onClick={() => setActiveTab("series")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              activeTab === "series"
                ? "bg-amber-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(255,184,0,0.4)]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Séries Paralelas
          </button>
        </div>
      </div>

      {/* Tab: Beats de Red Right Hand I */}
      {activeTab === "beats-rrh" && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[#0b0e17] border border-slate-800">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-cyan-400" /> Filtros:
              </span>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 px-2.5 py-1.5 font-mono focus:border-cyan-500 focus:outline-none"
              >
                <option value="TODOS">Todos os Status</option>
                <option value="CANONE_TRAVADO">🔒 Cânone Travado</option>
                <option value="EM_REVISAO">✍️ Em Revisão</option>
                <option value="RASCUNHO">💡 Rascunho</option>
              </select>

              {/* POV Filter */}
              <select
                value={filterPov}
                onChange={(e) => setFilterPov(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 px-2.5 py-1.5 font-mono focus:border-cyan-500 focus:outline-none"
              >
                <option value="TODOS">Todos os POVs</option>
                <option value="Arner">Arner</option>
                <option value="Deroo Da">Deroo Da</option>
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{beats.filter((b) => b.status === "CANONE_TRAVADO").length} Travados</span>
              <span className="text-slate-700">•</span>
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>{beats.filter((b) => b.status === "EM_REVISAO").length} Em Revisão</span>
              <span className="text-slate-700">•</span>
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <span>{beats.filter((b) => b.status === "RASCUNHO").length} Rascunhos</span>
            </div>
          </div>

          {/* Timeline Cards Container */}
          <div className="relative border-l-2 border-slate-800 ml-4 sm:ml-6 pl-6 sm:pl-8 space-y-6">
            {filteredBeats.map((beat, idx) => (
              <div
                key={beat.id}
                className={`relative rounded-xl border p-5 transition-all group ${
                  beat.status === "CANONE_TRAVADO"
                    ? "bg-[#0b101d] border-emerald-900/50 hover:border-emerald-500/50"
                    : beat.status === "EM_REVISAO"
                    ? "bg-[#141018] border-amber-900/50 hover:border-amber-500/50"
                    : "bg-[#170e12] border-red-900/50 hover:border-red-500/50"
                }`}
              >
                {/* Node on Timeline */}
                <div
                  className={`absolute -left-[31px] sm:-left-[39px] top-6 w-4 h-4 rounded-full border-2 transition-all ${
                    beat.status === "CANONE_TRAVADO"
                      ? "bg-emerald-950 border-emerald-400"
                      : beat.status === "EM_REVISAO"
                      ? "bg-amber-950 border-amber-400"
                      : "bg-red-950 border-red-400"
                  }`}
                />

                {/* Card Content */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        Beat #{idx + 1} • Cap. {beat.capitulo}
                      </span>
                      <span
                        className={`text-[11px] font-mono px-2 py-0.5 rounded flex items-center gap-1 font-semibold ${
                          beat.status === "CANONE_TRAVADO"
                            ? "bg-emerald-950 text-emerald-300 border border-emerald-700/50"
                            : beat.status === "EM_REVISAO"
                            ? "bg-amber-950 text-amber-300 border border-amber-700/50"
                            : "bg-red-950 text-red-300 border border-red-700/50"
                        }`}
                      >
                        {beat.status === "CANONE_TRAVADO" && <Lock className="w-3 h-3" />}
                        {beat.status === "CANONE_TRAVADO" ? "Cânone Travado" : beat.status === "EM_REVISAO" ? "Em Revisão" : "Rascunho"}
                      </span>
                    </div>

                    <button
                      onClick={() => copyLoreGuardPrompt(beat.titulo, beat.resumo)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-cyan-950 border border-slate-700 hover:border-cyan-500/50 text-[11px] font-mono text-cyan-300 transition-all"
                      title="Copiar prompt de auditoria para o chat do Antigravity"
                    >
                      {copiedPrompt === beat.titulo ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 text-cyan-400" />
                          <span>Auditar no Antigravity</span>
                        </>
                      )}
                    </button>
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-cyan-200 transition-colors">
                    {beat.titulo}
                  </h3>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {beat.resumo}
                  </p>

                  {beat.notas && (
                    <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 font-mono">
                      <span className="text-amber-400 font-semibold">Nota do Autor: </span>
                      {beat.notas}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60 text-xs text-slate-400 font-mono">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-cyan-400" /> POV: <strong className="text-white">{beat.pov}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-red-400" /> {beat.local}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {beat.personagens.map((p) => (
                        <span key={p} className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800 text-[10px]">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Punho Mortal Connection Callout */}
          {bookPM && (
            <div className="p-6 rounded-2xl border border-pink-900/40 bg-gradient-to-r from-pink-950/30 via-slate-950 to-slate-900 space-y-3">
              <div className="flex items-center gap-2 text-pink-400 text-xs font-mono font-bold uppercase tracking-wider">
                <Sparkles className="w-4 h-4" /> Cruzamento de Sagas: Severum ➔ Iutania
              </div>
              <h4 className="text-lg font-bold text-white">
                Origem Paralela: {bookPM.titulo}
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                O Beat #8 de Red Right Hand (a invasão de Delimitador) se conecta diretamente ao início da história de Naok em Iutania, criando uma linha de causa e efeito perfeita no cânone.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {bookPM.beats.map((b) => (
                  <div key={b.id} className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1">
                    <span className="text-pink-400 font-bold">{b.titulo}</span>
                    <p className="text-slate-400 text-[11px]">{b.resumo}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: 5 Eras Cósmicas */}
      {activeTab === "eras" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {eras.map((era) => (
            <div
              key={era.id}
              className="rounded-2xl border border-slate-800 bg-[#0c101c] p-6 space-y-4 relative overflow-hidden"
            >
              <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ backgroundColor: era.cor }}
              />
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="px-2.5 py-1 rounded bg-slate-900 text-slate-300 border border-slate-800">
                  Era #{era.ordem}
                </span>
                <span style={{ color: era.cor }} className="font-bold">
                  {era.id.toUpperCase()}
                </span>
              </div>
              <h3 className="text-xl font-extrabold text-white">
                {era.nome}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {era.resumo}
              </p>
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400 leading-relaxed">
                {era.descricao}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Séries Paralelas */}
      {activeTab === "series" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {series.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-slate-800 bg-[#0b0e17] p-5 space-y-3"
            >
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                  {item.escala}
                </span>
                <span className="text-cyan-400 font-bold">{item.localPrincipal}</span>
              </div>
              <h3 className="font-bold text-base text-white">
                {item.titulo}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {item.descricao}
              </p>
              <div className="pt-2 text-xs font-mono text-slate-300">
                Protagonista: <span className="text-white font-bold">{item.protagonista}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
