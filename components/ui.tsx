import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { mediaUrl, stories } from "@/lib/catalog";

export function SectionHeading({
  eyebrow,
  title,
  href,
  action,
}: {
  eyebrow: string;
  title: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="section-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {href && (
        <Link className="text-link" href={href}>
          {action || "Explorar"}
          <ArrowUpRight size={17} aria-hidden />
        </Link>
      )}
    </div>
  );
}
export function StoryCard({ story }: { story: (typeof stories)[number] }) {
  return (
    <Link
      href={`/historias/${story.slug}`}
      className="story-card"
      style={{ "--story-accent": story.color } as React.CSSProperties}
    >
      <div className="story-art">
        <Image
          src={mediaUrl(story.art)}
          alt={`Capa ou símbolo de ${story.titulo}`}
          width={500}
          height={680}
        />
        <span className="story-arrow">
          <ArrowUpRight size={20} aria-hidden />
        </span>
      </div>
      <div className="story-meta">
        <span>{story.tipo === "SÉRIE" ? "Série" : "Solo"}</span>
        <span>{story.local === "TERRA" ? "Glen / Terra" : "Universo"}</span>
      </div>
      <h3>{story.titulo}</h3>
    </Link>
  );
}
export function PageIntro({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="page-intro">
      <p className="eyebrow">{label}</p>
      <h1>{title}</h1>
      <p>{children}</p>
    </div>
  );
}
