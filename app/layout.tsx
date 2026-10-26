import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Orbit } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";
import { getSiteUrl } from "@/lib/site-url";
const siteUrl = getSiteUrl();
export const metadata: Metadata = {
  ...(siteUrl ? { metadataBase: siteUrl } : {}),
  openGraph: {
    title: "UVC — Histórias de um universo independente",
    description:
      "Ficção independente brasileira. Explore as histórias e personagens do Universo Virtual de Caio.",
    locale: "pt_BR",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  title: {
    default: "UVC — Histórias de um universo independente",
    template: "%s | UVC",
  },
  description:
    "Da cidade de Glen aos confins do cosmos. Explore as histórias, personagens e artes do Universo Virtual de Caio, um universo de ficção independente brasileiro.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <a href="#conteudo" className="skip-link">
          Pular para o conteúdo
        </a>
        <SiteHeader />
        <main id="conteudo" className="site-main">
          {children}
        </main>
        <footer className="site-footer">
          <div className="footer-top">
            <div>
              <Link href="/" className="footer-wordmark">
                UVC<span>✳</span>
              </Link>
              <p>
                Histórias feitas de imaginação.
                <br />
                Um universo feito para você explorar.
              </p>
            </div>
            <div>
              <p className="eyebrow">Encontre seu próximo mundo</p>
              <Link href="/#historias">
                Nossas histórias <ArrowUpRight size={16} aria-hidden />
              </Link>
              <Link href="/codex">
                Conheça os personagens <ArrowUpRight size={16} aria-hidden />
              </Link>
              <Link href="/#sobre">
                Sobre o projeto <ArrowUpRight size={16} aria-hidden />
              </Link>
            </div>
            <div className="footer-note">
              <Orbit size={26} aria-hidden />
              <p>
                Ficção independente.
                <br />
                Imaginação sem fronteiras.
              </p>
            </div>
          </div>
          <div className="footer-bottom">
            <span>
              © {new Date().getFullYear()} Caio Henrique. Todos os direitos
              reservados.
            </span>
            <span>Glen · Severum · E muito além.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
