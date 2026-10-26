import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "UVC — Universo Virtual de Caio",
  description: "Plataforma de criação literária, linha do tempo canônica e publicação.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen flex flex-col bg-[#121214] text-[#f4f4f5]">
        {/* Header Sóbrio e Monocromático */}
        <header className="border-b border-[#27272a] bg-[#121214]/95 backdrop-blur sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <span className="px-2 py-0.5 rounded bg-white text-black font-mono font-bold text-xs tracking-wider">
                UVC
              </span>
              <span className="font-semibold text-sm tracking-tight text-white hover:text-zinc-300 transition-colors">
                Universo Virtual de Caio
              </span>
            </Link>

            <nav className="flex items-center gap-1 sm:gap-2">
              <Link
                href="/timeline"
                className="px-3 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors"
              >
                Linha do Tempo
              </Link>
              <Link
                href="/studio"
                className="px-3 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors"
              >
                Writing Studio
              </Link>
              <Link
                href="/codex"
                className="px-3 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors"
              >
                Codex
              </Link>
              <Link
                href="/assets"
                className="px-3 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors"
              >
                Mapa Mental
              </Link>
            </nav>
          </div>
        </header>

        {/* Conteúdo Principal */}
        <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>

        {/* Footer Minimalista */}
        <footer className="border-t border-[#27272a] py-6 text-xs text-zinc-500 font-mono">
          <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>UVC © Caio Henrique — Todos os direitos reservados</span>
            <div className="flex items-center gap-4 text-zinc-400">
              <span>Next.js 15</span>
              <span>Amazon KDP</span>
              <span>Lore Guard</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
