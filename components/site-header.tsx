"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
const links = [
  { href: "/#livros", label: "Livros" },
  { href: "/codex", label: "Personagens" },
  { href: "/assets", label: "Galeria" },
];
export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    function dismiss(event: KeyboardEvent) {
      if (event.key === "Escape" && open) {
        setOpen(false);
        toggleRef.current?.focus();
      }
    }
    function resize() {
      if (window.matchMedia("(min-width: 761px)").matches) setOpen(false);
    }
    window.addEventListener("keydown", dismiss);
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("keydown", dismiss);
      window.removeEventListener("resize", resize);
    };
  }, [open]);
  const isStory = pathname === "/" || pathname.startsWith("/historias/");
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link
          href="/"
          className="brand"
          aria-label="UVC — página inicial"
          onClick={() => setOpen(false)}
        >
          <span className="brand-wordmark">
            UVC<span aria-hidden>·</span>
          </span>
        </Link>
        <nav className="desktop-nav" aria-label="Navegação principal">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={
                pathname === link.href || (link.href === "/#livros" && isStory)
                  ? "page"
                  : undefined
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <button
          className="menu-toggle"
          ref={toggleRef}
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
              aria-current={
                pathname === link.href || (link.href === "/#livros" && isStory)
                  ? "page"
                  : undefined
              }
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
