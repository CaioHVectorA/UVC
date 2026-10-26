"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, ArrowUpRight, Orbit } from "lucide-react";
const links = [
  { href: "/#historias", label: "Histórias" },
  { href: "/codex", label: "Personagens" },
  { href: "/timeline", label: "Cronologia" },
  { href: "/assets", label: "Acervo" },
];
export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="indie-strip">
        <span>Um universo independente. Infinitas histórias.</span>
        <span>
          <Orbit size={12} aria-hidden /> Feito no Brasil, por Caio Henrique
        </span>
      </div>
      <header className="site-header">
        <div className="header-inner">
          <Link
            href="/"
            className="brand"
            aria-label="UVC — página inicial"
            onClick={() => setOpen(false)}
          >
            <Image
              src="/media/uvc.webp"
              alt=""
              width={98}
              height={42}
              priority
            />
            <span>
              UNIVERSO VIRTUAL
              <br />
              DE CAIO<span className="brand-dot"> / </span>
            </span>
          </Link>
          <nav className="desktop-nav" aria-label="Navegação principal">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={pathname === link.href ? "page" : undefined}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/studio"
            className={`studio-link ${pathname === "/studio" ? "is-active" : ""}`}
          >
            Studio do autor
            <ArrowUpRight size={15} aria-hidden />
          </Link>
          <button
            className="menu-toggle"
            type="button"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
        {open && (
          <nav
            id="mobile-nav"
            className="mobile-nav"
            aria-label="Navegação no celular"
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={pathname === link.href ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                {link.label}
                <ArrowUpRight size={17} aria-hidden />
              </Link>
            ))}
            <Link href="/studio" onClick={() => setOpen(false)}>
              Studio do autor
              <ArrowUpRight size={17} aria-hidden />
            </Link>
          </nav>
        )}
      </header>
    </>
  );
}
