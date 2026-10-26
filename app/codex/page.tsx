"use client";

import { useState } from "react";
import charactersData from "@/data/characters.json";

export default function CodexPage() {
  const [search, setSearch] = useState("");
  const [filterScale, setFilterScale] = useState("TODOS");
  const [visibilityMode, setVisibilityMode] = useState<"PUBLICO_LEITORES" | "STUDIO_AUTOR">("PUBLICO_LEITORES");

  const characters = charactersData.filter((c) => {
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
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272a] pb-5">
        <div className="space-y-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
            Enciclopédia Canônica
          </span>
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            Codex de Personagens
          </h1>
          <p className="text-xs text-zinc-400">
            Fichas técnicas oficiais e poderes registrados.
          </p>
        </div>

        {/* Alternador de Visibilidade */}
        <div className="flex items-center gap-1 p-1 rounded-md bg-[#18181b] border border-[#27272a] self-start sm:self-auto text-xs font-mono">
          <button
            onClick={() => setVisibilityMode("PUBLICO_LEITORES")}
            className={`px-3 py-1.5 rounded transition-colors ${
              visibilityMode === "PUBLICO_LEITORES"
                ? "bg-white text-black font-semibold"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Visão Pública (Livros Lançados)
          </button>
          <button
            onClick={() => setVisibilityMode("STUDIO_AUTOR")}
            className={`px-3 py-1.5 rounded transition-colors ${
              visibilityMode === "STUDIO_AUTOR"
                ? "bg-white text-black font-semibold"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Visão Studio (Todos os Registros)
          </button>
        </div>
      </div>

      {/* Barra de Busca e Filtro */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-md bg-[#18181b] border border-[#27272a]">
        <input
          type="text"
          placeholder="Buscar personagem, facção ou poder..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-1.5 rounded bg-[#121214] border border-[#27272a] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 font-mono"
        />

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-zinc-400">Escala:</span>
          <select
            value={filterScale}
            onChange={(e) => setFilterScale(e.target.value)}
            className="bg-[#121214] border border-[#27272a] rounded px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-500"
          >
            <option value="TODOS">Todas</option>
            <option value="UNIVERSAL">Universal (Severum / Cosmos)</option>
            <option value="TERRA">Terra (Glen)</option>
          </select>
        </div>
      </div>

      {/* Grid de Personagens */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {characters.map((char) => (
          <div
            key={char.id}
            className="p-5 rounded-lg border border-[#27272a] bg-[#18181b] space-y-3 flex flex-col justify-between hover:border-zinc-500 transition-colors"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-500">{char.escala}</span>
                <span className="text-[11px] text-zinc-400">
                  {char.statusVisibilidade === "PUBLICO" ? "Livro Publicado" : "Arquivo Reservado"}
                </span>
              </div>

              <div>
                <h3 className="text-base font-semibold text-white">
                  {char.nome}
                </h3>
                <span className="text-xs font-mono text-zinc-400">
                  {char.equipe} • {char.alinhamento}
                </span>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed p-2.5 rounded bg-[#121214] border border-[#27272a]">
                {char.desc}
              </p>

              <div>
                <span className="text-[10px] uppercase font-mono text-zinc-500 block mb-1 font-semibold">
                  Poderes:
                </span>
                <ul className="space-y-0.5 text-xs text-zinc-300 font-mono">
                  {char.poderes.map((p, i) => (
                    <li key={i} className="text-[11px] flex items-start gap-1">
                      <span className="text-zinc-500">•</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-2 border-t border-[#27272a] text-[10px] font-mono text-zinc-500 flex justify-between">
              <span>Aparições:</span>
              <span className="text-zinc-300 truncate max-w-[200px]">{char.aparicoes.join(", ")}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
