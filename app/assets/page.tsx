"use client";

import { useState } from "react";

export default function AssetsPage() {
  const [activeTab, setActiveTab] = useState<"mindmap" | "gallery">("mindmap");

  const nodes = [
    {
      id: "severum",
      categoria: "PLANETA & ESTADO",
      titulo: "Severum (O Empório Cósmico)",
      detalhes: "Planeta transformado de rocha morta em polo comercial hegemônico via fornalhas geotérmicas e 35 Teses de Arner.",
      conexoes: ["Arner (Governante)", "Deroo Da (Fornalhas & Dutovias)", "Red Right Hand (Exército Estatal)"]
    },
    {
      id: "rrh",
      categoria: "CORPORAÇÃO MILITAR",
      titulo: "Red Right Hand (RRH)",
      detalhes: "Elite de imposição bélica, mercantil e diplomática de Severum. Conquistou monopólios e combateu os Ethosthianos.",
      conexoes: ["Arner (Comandante)", "Delimitador (Força Bruta)", "Tarlin / Esquadrão Fingers (Atiradores)", "Irmãos Yaa (Lâminas Dérmicas)"]
    },
    {
      id: "fingers",
      categoria: "DIVISÃO TÁTICA",
      titulo: "Esquadrão Fingers",
      detalhes: "Célula cirúrgica armada com rifles selados e dilação temporal liderada por Tarlin.",
      conexoes: ["Tarlin (Líder)", "Curtin (Pistolas Turbo)", "Mylon (Munição)", "Chin (Batedor)", "Ellis (Camuflagem Óptica)"]
    },
    {
      id: "iutania",
      categoria: "PLANETA INVADIDO",
      titulo: "Planeta Iutania & Aedificantes",
      detalhes: "Mundo verdejante de simbiose entre Aedificantes (físico titânico) e Mures (telepatia racional). Alvo de invasão de Severum.",
      conexoes: ["Aedificantes (Vigor)", "Mures (Telepatia & Ciência)", "Delimitador (Invasor)", "Naok (Punho Mortal)"]
    },
    {
      id: "ormuz-hades",
      categoria: "COSMOLOGIA SUPREMA",
      titulo: "Dicotomia Ormuz vs Hades",
      detalhes: "A Mente da Criação (Ormuz) em conflito eterno com a encarnação do mal e da entropia (Hades).",
      conexoes: ["Bracelete Divino (Ciecon)", "O Lampião (Hades)", "Aliança Demoníaca"]
    },
    {
      id: "glen-terra",
      categoria: "ESFERA TERRESTRE",
      titulo: "Glen & Os Guardiões",
      detalhes: "Heroísmo urbano e amadurecimento juvenil na Terra defendendo a humanidade contra gangues e incursões cósmicas.",
      conexoes: ["Beenie (Telecinese)", "Larry (Menino Resiliente)", "Kerry (Corpo de Aço)", "Inera", "Alero"]
    }
  ];

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272a] pb-5">
        <div className="space-y-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
            Estrutura Narrativa
          </span>
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            Mapa Mental & Galeria de Mídias
          </h1>
          <p className="text-xs text-zinc-400">
            Grafo relacional de Severum, Iutania e Glen para coerência conceitual da saga.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-md bg-[#18181b] border border-[#27272a] self-start sm:self-auto text-xs font-mono">
          <button
            onClick={() => setActiveTab("mindmap")}
            className={`px-3 py-1.5 rounded transition-colors ${
              activeTab === "mindmap" ? "bg-white text-black font-semibold" : "text-zinc-400 hover:text-white"
            }`}
          >
            Mapa Mental
          </button>
          <button
            onClick={() => setActiveTab("gallery")}
            className={`px-3 py-1.5 rounded transition-colors ${
              activeTab === "gallery" ? "bg-white text-black font-semibold" : "text-zinc-400 hover:text-white"
            }`}
          >
            Acervo de Arquivos
          </button>
        </div>
      </div>

      {/* Mapa Mental */}
      {activeTab === "mindmap" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {nodes.map((node) => (
            <div
              key={node.id}
              className="p-5 rounded-lg border border-[#27272a] bg-[#18181b] space-y-3 flex flex-col justify-between hover:border-zinc-500 transition-colors"
            >
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-zinc-500 uppercase block font-medium">
                  {node.categoria}
                </span>

                <h3 className="text-base font-semibold text-white">
                  {node.titulo}
                </h3>

                <p className="text-xs text-zinc-300 leading-relaxed p-2.5 rounded bg-[#121214] border border-[#27272a]">
                  {node.detalhes}
                </p>

                <div className="pt-1">
                  <span className="text-[10px] uppercase font-mono text-zinc-500 block mb-1.5 font-medium">
                    Conexões Canônicas:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {node.conexoes.map((c, i) => (
                      <span
                        key={i}
                        className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#121214] text-zinc-300 border border-[#27272a]"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Galeria */}
      {activeTab === "gallery" && (
        <div className="space-y-4">
          <div className="p-3 rounded bg-[#18181b] border border-[#27272a] text-xs text-zinc-400 font-mono flex items-center justify-between">
            <span>Diretório: <strong>/assets/</strong> (80+ arquivos minerados e preservados no repositório)</span>
            <span className="text-zinc-300 font-medium">Logos • Capas • Personagens • Cenários</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              { nome: "Torre & Insígnia RRH", pasta: "logos/RRH vermelha.png", cat: "Logotipo Severum" },
              { nome: "Selo Congregadores", pasta: "logos/congregadores mão.png", cat: "Símbolo Rebelde" },
              { nome: "Brasão Hades", pasta: "logos/HADES.png", cat: "Entidade Primordial" },
              { nome: "Emblema Guardiões", pasta: "logos/Guardians logo de cria.png", cat: "Símbolo Terrestre" },
              { nome: "Logotipo Menino Resiliente", pasta: "logos/mr logo.png", cat: "Herói de Glen" },
              { nome: "Punho Mortal", pasta: "logos/Punho Mortal.png", cat: "Iutania" },
              { nome: "Espaço Cósmico", pasta: "backgrounds/espaço.jpg", cat: "Cenário" },
              { nome: "Metrópole Glen", pasta: "backgrounds/cidade.jpg", cat: "Cenário" },
            ].map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-[#27272a] bg-[#18181b] space-y-1.5 text-xs font-mono"
              >
                <div className="aspect-square bg-[#121214] rounded border border-[#27272a] flex items-center justify-center p-2 text-center text-zinc-500">
                  <span className="text-[11px] text-zinc-300 font-medium">{item.nome}</span>
                </div>
                <div className="flex justify-between text-[10px] text-zinc-500 pt-1">
                  <span>{item.cat}</span>
                  <span className="text-zinc-600 truncate max-w-[90px]">{item.pasta}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
