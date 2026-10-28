"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, UsersRound, Waypoints, Images } from "lucide-react";

export function StudioNavigation() {
  const pathname = usePathname();
  return (
    <nav aria-label="Ferramentas do Studio" className="studio-workspace-nav">
      <Link
        href="/studio"
        prefetch={false}
        onNavigate={(event) => {
          event.preventDefault();
          window.location.assign("/studio");
        }}
        aria-current={pathname === "/studio" ? "page" : undefined}
      >
        <BookOpen size={17} aria-hidden /> Manuscrito
      </Link>
      <Link
        href="/studio/personagens"
        prefetch={false}
        onNavigate={(event) => {
          event.preventDefault();
          window.location.assign("/studio/personagens");
        }}
        aria-current={pathname === "/studio/personagens" ? "page" : undefined}
      >
        <UsersRound size={17} aria-hidden /> Personagens
      </Link>
      <Link
        href="/studio/cronologia"
        prefetch={false}
        onNavigate={(event) => {
          event.preventDefault();
          window.location.assign("/studio/cronologia");
        }}
        aria-current={pathname === "/studio/cronologia" ? "page" : undefined}
      >
        <Waypoints size={17} aria-hidden /> Cronologia
      </Link>
      <Link
        href="/studio/galeria"
        prefetch={false}
        onNavigate={(event) => {
          event.preventDefault();
          window.location.assign("/studio/galeria");
        }}
        aria-current={pathname === "/studio/galeria" ? "page" : undefined}
      >
        <Images size={17} aria-hidden /> Galeria
      </Link>
    </nav>
  );
}
