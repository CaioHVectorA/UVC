import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="public-site">
      <SiteHeader />
      <main id="conteudo" className="site-main">
        {children}
      </main>
      <footer className="storefront-footer">
        <span>© {new Date().getFullYear()} Caio Henrique</span>
        <nav aria-label="Rodapé">
          <Link href="/codex">Personagens</Link>
          <Link href="/assets">Galeria</Link>
          <Link href="/studio" prefetch={false} rel="nofollow">
            Studio
          </Link>
        </nav>
      </footer>
    </div>
  );
}
