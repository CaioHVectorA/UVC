"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Network,
  UsersRound,
  Lightbulb,
  BookOpen,
  Waypoints,
  Images,
  CheckSquare,
  MapPin,
} from "lucide-react";
const tools = [
  { href: "/studio", label: "Visão geral", icon: Network },
  { href: "/studio/manuscritos", label: "Escrita", icon: BookOpen },
  { href: "/studio/personagens", label: "Personagens", icon: UsersRound },
  { href: "/studio/conceitos", label: "Conceitos", icon: Lightbulb },
  { href: "/studio/lugares", label: "Lugares", icon: MapPin },
  { href: "/studio/cronologia", label: "Cronologia", icon: Waypoints },
  { href: "/studio/galeria", label: "Galeria", icon: Images },
  { href: "/studio/tarefas", label: "Tarefas", icon: CheckSquare },
];
export function StudioNavigation() {
  const pathname = usePathname();
  return (
    <nav aria-label="Ferramentas do Studio" className="studio-workspace-nav">
      {tools.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          prefetch={false}
          onNavigate={(event) => {
            event.preventDefault();
            window.location.assign(href);
          }}
          aria-current={pathname === href ? "page" : undefined}
        >
          <Icon size={17} aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );
}
