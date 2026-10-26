import Link from "next/link";
import { BookOpen, Compass, Cpu, FileText, Image as ImageIcon, ShieldAlert, Sparkles, CheckCircle2, Clock, ArrowRight } from "lucide-react";
import timelineData from "@/data/timeline.json";
import bookData from "@/books/red-right-hand/book.json";

export default function HomePage() {
  const eras = timelineData.erasCosmicas;
  const series = timelineData.seriesParalelas;
  const beats = bookData.capitulos;

  return (
    <div className="space-y-10">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-[#0e1424] via-[#090d16] to-[#07090e] p-8 sm:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#ff2a54]/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 text-xs font-mono">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>UVC Studio E2E & Plataforma Canônica</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            A Oficina de Criação do <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-[#ff2a54] bg-clip-text text-transparent">Universo UVC</span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Plataforma dedicada à estruturação da **Linha do Tempo Universal**, combate ao loop de reescritas com **Lore Guard**, formatação nativa para **Amazon KDP** e gestão da rica mitologia de Severum, Iutania e Glen.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-3">
            <Link
              href="/timeline"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm shadow-[0_0_20px_rgba(0,242,254,0.3)] transition-all"
            >
              <Compass className="w-4 h-4" />
              <span>Explorar Linha do Tempo</span>
            </Link>

            <Link
              href="/studio"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-red-500/50 text-white font-medium text-sm transition-all"
            >
              <BookOpen className="w-4 h-4 text-[#ff2a54]" />
              <span>Abrir Writing Studio (RRH)</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Livro em Foco: Red Right Hand */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff2a54] animate-pulse" />
              Obra em Destaque no Studio
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Volume I configurado para revisão, beats e exportação Kindle Create
            </p>
          </div>
          <Link
            href="/studio"
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono transition-colors"
          >
            <span>Ver capítulos no editor</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0b0f19] p-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold uppercase bg-red-950/70 text-red-300 border border-red-500/30">
                {bookData.status}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Autor: {bookData.autor}
              </span>
            </div>
            <h3 className="text-2xl font-extrabold text-white">
              {bookData.titulo} <span className="text-slate-400 text-lg font-normal">({bookData.subtitulo})</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
              {bookData.sinopse}
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              {beats.map((cap) => (
                <span
                  key={cap.numero}
                  className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 flex items-center gap-1.5"
                >
                  {cap.status === "CANONE_TRAVADO" ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Clock className="w-3 h-3 text-amber-400" />
                  )}
                  Cap. {cap.numero}: {cap.titulo}
                </span>
              ))}
            </div>
          </div>

          <div className="border-t md:border-t-0 md:border-l border-slate-800 md:pl-6 space-y-3 flex flex-col justify-center">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Padrão Editorial</span>
              <p className="text-sm font-semibold text-slate-200">Amazon KDP / EPUB 3</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Total de Capítulos</span>
              <p className="text-sm font-semibold text-cyan-400">06 Capítulos Estruturados</p>
            </div>
            <Link
              href="/studio"
              className="mt-2 w-full py-2 px-3 rounded-lg bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-center text-xs font-bold text-white transition-all shadow-[0_0_15px_rgba(255,42,84,0.3)]"
            >
              Abrir no Kindle Reader & Editor
            </Link>
          </div>
        </div>
      </section>

      {/* As 5 Eras Cósmicas (A Linha do Tempo Geral) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Compass className="w-5 h-5 text-cyan-400" />
              As 5 Grandes Eras Cósmicas
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              A arquitetura macro do FigJam canônico: do florescimento cósmico à batalha final contra Hades
            </p>
          </div>
          <Link
            href="/timeline"
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono transition-colors"
          >
            <span>Ver canvas modular</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {eras.map((era) => (
            <div
              key={era.id}
              className="group rounded-xl border border-slate-800/80 bg-[#0c101b] p-4 flex flex-col justify-between hover:border-cyan-500/40 hover:bg-[#101524] transition-all relative overflow-hidden"
            >
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: era.cor }}
              />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                    Era #{era.ordem}
                  </span>
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: era.cor }}
                  />
                </div>
                <h3 className="font-bold text-sm text-white group-hover:text-cyan-300 transition-colors">
                  {era.nome}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                  {era.resumo}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/50 mt-4 text-[11px] font-mono text-cyan-400/80 flex items-center justify-between">
                <span>Ver beats</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Séries Paralelas */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-amber-400" />
          Séries e Sagas Paralelas do UVC
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {series.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-slate-800 bg-[#0a0e18] p-4 space-y-2.5 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                  {item.escala}
                </span>
                <span className="text-slate-400">{item.localPrincipal}</span>
              </div>
              <h3 className="font-bold text-base text-white">
                {item.titulo}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                {item.descricao}
              </p>
              <div className="pt-2 text-xs font-mono text-slate-400">
                Protagonista: <span className="text-cyan-300 font-semibold">{item.protagonista}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
