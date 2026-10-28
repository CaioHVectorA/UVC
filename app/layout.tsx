import type { Metadata } from "next";
import "./globals.css";
import localFont from "next/font/local";
const editorialFont = localFont({
  src: "./fonts/CormorantGaramond.ttf",
  variable: "--font-editorial",
  display: "swap",
  weight: "300 700",
});
const interfaceFont = localFont({
  src: "./fonts/SpaceGrotesk.ttf",
  variable: "--font-interface",
  display: "swap",
  weight: "300 700",
});
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
      <body className={`${editorialFont.variable} ${interfaceFont.variable}`}>
        <a href="#conteudo" className="skip-link">
          Pular para o conteúdo
        </a>
        {children}
      </body>
    </html>
  );
}
