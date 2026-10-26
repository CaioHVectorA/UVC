import Link from "next/link";
import timelineData from "@/data/timeline.json";
import bookData from "@/books/red-right-hand/book.json";

export default function HomePage() {
  const eras = timelineData.erasCosmicas;
  const series = timelineData.seriesParalelas;
  const capitulos = bookData.capitulos;

  return (
    <div className="space-y-12">
      {/* Hero Minimalista */}
      <section className="space-y-4 pt-4 pb-2 border-b border-[#27272a]">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-400">
            Plataforma Autoral
          </span>
          <span className="text-zinc-600">•</span>
          <span className="text-[11px] font-mono text-zinc-400">
            Autor: {bookData.autor}
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
          Universo Virtual de Caio
        </h1>

        <p className="text-zinc-400 text-sm sm:text-base max-w-2xl leading-relaxed">
          Central unificada de escrita, cronologia canônica e preparação editorial para a Amazon KDP.
          Desenvolvido para manter a linearidade das sagas e eliminar o loop de reescritas.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link
            href="/studio"
            className="px-4 py-2 rounded-md bg-white text-black font-medium text-xs hover:bg-zinc-200 transition-colors"
          >
            Abrir Writing Studio
          </Link>
          <Link
            href="/timeline"
            className="px-4 py-2 rounded-md bg-[#18181b] border border-[#27272a] text-zinc-300 font-medium text-xs hover:text-white hover:border-zinc-500 transition-colors"
          >
            Ver Linha do Tempo
          </Link>
        </div>
      </section>

      {/* Obra Ativa: Red Right Hand */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight text-white uppercase font-mono text-xs text-zinc-400">
            Obra em Produção
          </h2>
          <span className="text-xs font-mono text-zinc-500">Volume I • Ato I: Primeiros Passos</span>
        </div>

        <div className="rounded-lg border border-[#27272a] bg-[#18181b] p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-xl font-medium text-white">
                {bookData.titulo}
              </h3>
              <p className="text-xs text-zinc-400 font-mono">
                {bookData.subtitulo} • {bookData.genero}
              </p>
            </div>
            <span className="px-2.5 py-1 rounded bg-[#202024] border border-[#27272a] text-[11px] font-mono text-zinc-300 self-start">
              Status: {bookData.status}
            </span>
          </div>

          <p className="text-xs text-zinc-300 leading-relaxed max-w-3xl">
            {bookData.sinopse}
          </p>

          <div className="pt-2 border-t border-[#27272a]">
            <span className="text-[11px] font-mono uppercase text-zinc-500 block mb-2 font-medium">
              Capítulos Estruturados:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {capitulos.map((cap) => (
                <div
                  key={cap.numero}
                  className="p-2.5 rounded bg-[#121214] border border-[#27272a] text-xs font-mono flex items-center justify-between"
                >
                  <span className="text-zinc-300 truncate">
                    #{cap.numero} {cap.titulo}
                  </span>
                  <span className="text-[10px] text-zinc-500 ml-2 shrink-0">
                    {cap.status === "CANONE_TRAVADO" ? "Travado" : "Revisão"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Eras Cósmicas */}
      <section className="space-y-4">
        <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold">
          Cronologia Cósmica (As 5 Eras)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {eras.map((era) => (
            <div
              key={era.id}
              className="p-4 rounded-lg border border-[#27272a] bg-[#18181b] space-y-2 flex flex-col justify-between"
            >
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-zinc-500 uppercase block">
                  Era #{era.ordem}
                </span>
                <h3 className="text-sm font-semibold text-white">
                  {era.nome}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">
                  {era.resumo}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Séries e Sagas */}
      <section className="space-y-4">
        <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold">
          Séries e Universos Paralelos
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {series.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-lg border border-[#27272a] bg-[#18181b] space-y-1.5"
            >
              <span className="text-[10px] font-mono text-zinc-500 uppercase">
                {item.escala} • {item.localPrincipal}
              </span>
              <h3 className="text-sm font-semibold text-white">
                {item.titulo}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                {item.descricao}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
