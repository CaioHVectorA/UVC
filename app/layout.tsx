import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { BookOpen, Compass, Cpu, FileText, Image as ImageIcon, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "UVC Studio & Universo Cósmico",
  description: "Plataforma End-to-End de Worldbuilding, Linha do Tempo e Publicação KDP do Universo Virtual de Caio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen flex flex-col bg-[#07090e] text-slate-100 antialiased selection:bg-[#00f2fe]/30 selection:text-cyan-200">
        {/* Top Cosmic Navigation Header */}
        <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-[#07090e]/90 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-[#ff2a54] to-[#00f2fe] p-[1.5px] shadow-[0_0_15px_rgba(0,242,254,0.3)] group-hover:shadow-[0_0_20px_rgba(255,42,84,0.5)] transition-all">
                <div className="w-full h-full bg-[#0b0e17] rounded-[7px] flex items-center justify-center font-bold text-xs tracking-wider text-cyan-400">
                  UVC
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold tracking-wide text-sm bg-gradient-to-r from-slate-100 via-cyan-100 to-cyan-400 bg-clip-text text-transparent">
                  UNIVERSO VIRTUAL DE CAIO
                </span>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">
                  Studio & Linha do Tempo
                </span>
              </div>
            </Link>

            <nav className="flex items-center gap-1 sm:gap-2">
              <Link
                href="/timeline"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-cyan-300 hover:bg-slate-800/60 border border-transparent hover:border-cyan-500/30 transition-all"
              >
                <Compass className="w-4 h-4 text-cyan-400" />
                <span>Linha do Tempo</span>
              </Link>

              <Link
                href="/studio"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-red-300 hover:bg-slate-800/60 border border-transparent hover:border-red-500/30 transition-all"
              >
                <BookOpen className="w-4 h-4 text-[#ff2a54]" />
                <span>Writing Studio (KDP)</span>
              </Link>

              <Link
                href="/codex"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-amber-300 hover:bg-slate-800/60 border border-transparent hover:border-amber-500/30 transition-all"
              >
                <FileText className="w-4 h-4 text-amber-400" />
                <span>Codex & Cânone</span>
              </Link>

              <Link
                href="/assets"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-purple-300 hover:bg-slate-800/60 border border-transparent hover:border-purple-500/30 transition-all"
              >
                <ImageIcon className="w-4 h-4 text-purple-400" />
                <span>Assets & Grafo</span>
              </Link>
            </nav>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-900 bg-[#05070a] py-6 text-center text-xs text-slate-500 font-mono">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span>UVC © 2026 — Criado por Caio Henrique (@CaioHVectorA)</span>
            <div className="flex items-center gap-4 text-slate-400">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <Sparkles className="w-3.5 h-3.5" /> Lore Guard Ativo
              </span>
              <span>Next.js 15 App Router</span>
              <span>Amazon KDP Ready</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
