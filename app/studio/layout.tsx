import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Studio do autor",
  robots: { index: false, follow: false, noarchive: true },
};

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="studio-shell">
      <header className="studio-header">
        <Link href="/studio" className="studio-brand">
          <LockKeyhole size={20} aria-hidden /> UVC Studio{" "}
          <span>Área do autor</span>
        </Link>
        <Link href="/" className="text-link">
          <ArrowLeft size={17} aria-hidden /> Voltar ao portal público
        </Link>
      </header>
      <main id="conteudo" className="site-main studio-main">
        {children}
      </main>
    </div>
  );
}
