"use client";

import { useState } from "react";
import { Shield, Sparkles, Filter, Lock, Eye, EyeOff, Search, Compass, BookOpen } from "lucide-react";
import charactersData from "@/data/characters.json";
import factionsData from "@/data/factions.json";

export default function CodexPage() {
  const [search, setSearch] = useState("");
  const [filterScale, setFilterScale] = useState("TODOS");
  const [visibilityMode, setVisibilityMode] = useState<"PUBLICO_LEITORES" | "STUDIO_AUTOR">("PUBLICO_LEITORES");

  const characters = charactersData.filter((c) => {
    // If in public reader mode, only show published characters
    if (visibilityMode === "PUBLICO_LEITORES" && c.statusVisibilidade !== "PUBLICO") {
      return false;
    }
    if (filterScale !== "TODOS" && c.escala !== filterScale) {
      return false;
    }
    if (search.trim() !== "") {
      const q = search.toLowerCase();
      const matchName = c.nome.toLowerCase().includes(q);
      const matchEquipe = c.equipe.toLowerCase().includes(q);
      const matchPoderes = c.poderes.some((p) => p.toLowerCase().includes(q));
      return matchName || matchEquipe || matchPoderes;
    }
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full border border-amber-500/30 bg-amber-950/40 text-amber-300 text-xs font-mono mb-2">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>Enciclopédia Canônica UVC</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Codex de Personagens & Facções
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Fichas técnicas oficiais, alinhamentos, poderes e controle de visibilidade sincronizado com os livros publicados.
          </p>
        </div>

        {/* Visibility Mode Switcher (Public Reader vs Creator Studio) */}
        <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-900 border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setVisibilityMode("PUBLICO_LEITORES")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              visibilityMode === "PUBLICO_LEITORES"
                ? "bg-cyan-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(0,242,254,0.3)]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Visão Pública (Só Livros Lançados)</span>
          </button>
          <button
            onClick={() => setVisibilityMode("STUDIO_AUTOR")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              visibilityMode === "STUDIO_AUTOR"
                ? "bg-[#ff2a54] text-white font-bold shadow-[0_0_12px_rgba(255,42,84,0.3)]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <EyeOff className="w-3.5 h-3.5" />
            <span>Visão Studio (Todos os 21+ Arquivos)</span>
          </button>
        </div>
      </div>

      {/* Mode Callout Alert */}
      {visibilityMode === "PUBLICO_LEITORES" ? (
        <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-xs text-cyan-200 font-mono flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            <strong>Filtro Ativo:</strong> Exibindo apenas os personagens já canonicamente apresentados no livro <em>Red Right Hand (Volume I)</em>. Os demais permanecem protegidos contra spoilers.
          </span>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-800/40 text-xs text-red-200 font-mono flex items-center gap-2">
          <Lock className="w-4 h-4 text-red-400 shrink-0" />
          <span>
            <strong>Modo Autor (Studio):</strong> Visualizando o acervo total, incluindo personagens de Glen (Beenie, Larry, Kerry) e entidades cósmicas de obras futuras.
          </span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[#0b0e17] border border-slate-800">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, equipe ou poder..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">Escala:</span>
          <select
            value={filterScale}
            onChange={(e) => setFilterScale(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 px-3 py-2 font-mono focus:border-cyan-500 focus:outline-none"
          >
            <option value="TODOS">Todas as Escalas</option>
            <option value="UNIVERSAL">Universal (Severum / Cosmos)</option>
            <option value="TERRA">Terra (Glen)</option>
          </select>
        </div>
      </div>

      {/* Characters Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {characters.map((char) => (
          <div
            key={char.id}
            className="group rounded-2xl border border-slate-800 bg-[#0c101c] p-6 space-y-4 hover:border-cyan-500/40 hover:bg-[#101524] transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                  {char.escala}
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                    char.statusVisibilidade === "PUBLICO"
                      ? "bg-emerald-950 text-emerald-300 border border-emerald-800/40"
                      : "bg-red-950 text-red-300 border border-red-800/40"
                  }`}
                >
                  {char.statusVisibilidade === "PUBLICO" ? "Publicado em Livro" : "Arquivo Reservado"}
                </span>
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-white group-hover:text-cyan-300 transition-colors">
                  {char.nome}
                </h3>
                <span className="text-xs font-mono text-amber-400 font-semibold">
                  {char.equipe} • {char.alinhamento}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
                {char.desc}
              </p>

              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-1.5 font-bold">
                  Habilidades & Poderes Canônicos:
                </span>
                <ul className="space-y-1">
                  {char.poderes.map((p, i) => (
                    <li key={i} className="text-[11px] text-cyan-300 font-mono flex items-start gap-1.5">
                      <span className="text-cyan-500">•</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/60 text-[10px] font-mono text-slate-400 flex items-center justify-between">
              <span>Aparições:</span>
              <span className="text-slate-200 font-semibold">{char.aparicoes.join(", ")}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
