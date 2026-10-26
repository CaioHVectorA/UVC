"use client";

import { useState } from "react";
import { Image as ImageIcon, Network, Sparkles, Folder, Eye } from "lucide-react";

export default function AssetsPage() {
  const [activeTab, setActiveTab] = useState<"mindmap" | "gallery">("mindmap");

  const nodes = [
    {
      id: "severum",
      categoria: "PLANETA & ESTADO",
      titulo: "Severum (O Empório Cósmico)",
      detalhes: "Planeta transformado de rocha morta em polo comercial hegemônico via fornalhas geotérmicas e 35 Teses de Arner.",
      conexoes: ["Arner (Governante)", "Deroo Da (Fornalhas & Dutovias)", "Red Right Hand (Exército Estatal)"],
      cor: "#ff2a54"
    },
    {
      "id": "rrh",
      "categoria": "CORPORAÇÃO MILITAR",
      "titulo": "Red Right Hand (RRH)",
      "detalhes": "Elite de imposição bélica, mercantil e diplomática de Severum. Conquistou monopólios e combateu os Ethosthianos.",
      "conexoes": ["Arner (Comandante)", "Delimitador (Força Bruta)", "Tarlin / Esquadrão Fingers (Atiradores)", "Irmãos Yaa (Lâminas Dérmicas)"],
      "cor": "#ff2a54"
    },
    {
      "id": "fingers",
      "categoria": "DIVISÃO TÁTICA",
      "titulo": "Esquadrão Fingers",
      "detalhes": "Célula cirúrgica armada com rifles selados e táticas de infiltração. Liderada por Tarlin com seu poder de dilação temporal.",
      "conexoes": ["Tarlin (Líder)", "Curtin (Pistolas Turbo)", "Mylon (Munição)", "Chin (Batedor)", "Ellis (Camuflagem Óptica)"],
      "cor": "#ffb800"
    },
    {
      "id": "iutania",
      "categoria": "PLANETA INVADIDO",
      "titulo": "Planeta Iutania & Aedificantes",
      "detalhes": "Mundo verdejante de cooperação simbiótica entre Aedificantes (físico titânico) e Mures (telepatia racional). Alvo da invasão do Delimitador.",
      "conexoes": ["Aedificantes (Vigor)", "Mures (Telepatia & Ciência)", "Delimitador (Invasor)", "Naok (Punho Mortal)"],
      "cor": "#ec4899"
    },
    {
      "id": "ormuz-hades",
      "categoria": "COSMOLOGIA SUPREMA",
      "titulo": "Dicotomia Ormuz vs Hades",
      "detalhes": "A Mente da Criação e casualidade cósmica (Ormuz) em conflito eterno com a encarnação do mal e da entropia (Hades).",
      "conexoes": ["Bracelete Divino (Ciecon)", "O Lampião (Hades)", "Aliança Demoníaca"],
      "cor": "#00f2fe"
    },
    {
      "id": "glen-terra",
      "categoria": "ESFERA TERRESTRE",
      "titulo": "Glen & Os Guardiões",
      "detalhes": "Heroísmo urbano e amadurecimento juvenil na Terra defendendo a humanidade contra gangues e invasões cósmicas.",
      "conexoes": ["Beenie (Telecinese)", "Larry (Menino Resiliente)", "Kerry (Corpo de Aço)", "Inera", "Alero"],
      "cor": "#3b82f6"
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full border border-purple-500/30 bg-purple-950/40 text-purple-300 text-xs font-mono mb-2">
            <Network className="w-3.5 h-3.5 text-purple-400" />
            <span>Mapa Mental & Acervo Visual</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Grafo de Conexões & Biblioteca de Assets
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Mapeamento relacional de Severum, Iutania e Glen para manter a coerência visual e conceitual em toda a saga.
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("mindmap")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              activeTab === "mindmap"
                ? "bg-purple-600 text-white font-bold shadow-[0_0_12px_rgba(168,85,247,0.4)]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>Mapa Mental do Universo</span>
          </button>
          <button
            onClick={() => setActiveTab("gallery")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              activeTab === "gallery"
                ? "bg-cyan-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(0,242,254,0.4)]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Acervo de Imagens & Logos</span>
          </button>
        </div>
      </div>

      {/* Mind Map Section */}
      {activeTab === "mindmap" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {nodes.map((node) => (
            <div
              key={node.id}
              className="rounded-2xl border border-slate-800 bg-[#0c101c] p-6 space-y-4 hover:border-purple-500/40 transition-all flex flex-col justify-between relative overflow-hidden"
            >
              <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ backgroundColor: node.cor }}
              />
              <div className="space-y-3">
                <span
                  className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-slate-900 border border-slate-800"
                  style={{ color: node.cor }}
                >
                  {node.categoria}
                </span>

                <h3 className="text-xl font-extrabold text-white">
                  {node.titulo}
                </h3>

                <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
                  {node.detalhes}
                </p>

                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-2 font-bold">
                    Nós Conectados no Cânone:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {node.conexoes.map((c, i) => (
                      <span
                        key={i}
                        className="text-[11px] font-mono px-2 py-1 rounded bg-slate-900 text-slate-200 border border-slate-800 flex items-center gap-1"
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: node.cor }} />
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

      {/* Gallery Section */}
      {activeTab === "gallery" && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 font-mono flex items-center justify-between">
            <span>📁 Acervo localizado no repositório: <strong>/assets/</strong> (80+ arquivos minerados e preservados)</span>
            <span className="text-cyan-400 font-bold">Logos • Capas • Personagens • Cenários</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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
                className="rounded-xl border border-slate-800 bg-[#0a0d16] p-4 space-y-2 hover:border-cyan-500/40 transition-colors"
              >
                <div className="aspect-square bg-slate-950 rounded-lg border border-slate-800/80 flex flex-col items-center justify-center p-3 text-center">
                  <ImageIcon className="w-8 h-8 text-slate-600 mb-2" />
                  <span className="text-[11px] font-mono text-cyan-300 font-semibold truncate max-w-full">
                    {item.nome}
                  </span>
                </div>
                <div className="text-[10px] font-mono flex justify-between text-slate-400">
                  <span>{item.cat}</span>
                  <span className="text-slate-500 truncate max-w-[100px]">{item.pasta}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
