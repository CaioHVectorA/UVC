import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Shield,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { getPublicCharacters } from "@/lib/public-knowledge";
import { publishedStories } from "@/lib/catalog";
import { getSiteUrl } from "@/lib/site-url";
export const dynamic = "force-dynamic";
async function getCharacter(id: string) {
  const character = (await getPublicCharacters()).find(
    (entry) => entry.id === id,
  );
  if (!character) notFound();
  return character;
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const character = await getCharacter((await params).id);
  return {
    title: character.nome,
    description: character.desc,
    ...(getSiteUrl()
      ? { alternates: { canonical: `/codex/${character.id}` } }
      : {}),
  };
}
export default async function CharacterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const character = await getCharacter((await params).id);
  return (
    <article className="character-profile">
      <Link href="/codex" className="breadcrumb">
        <ArrowLeft size={16} aria-hidden /> Personagens
      </Link>
      <header>
        <p className="eyebrow">{character.equipe}</p>
        <h1>{character.nome}</h1>
        <div className="character-facts">
          <span>{character.alinhamento}</span>
          <span>
            {character.escala === "TERRA"
              ? "Terra"
              : character.escala === "UNIVERSAL / TERRA"
                ? "Universo / Terra"
                : "Universo"}
          </span>
        </div>
        <p className="character-profile-description">{character.desc}</p>
      </header>
      <div className="character-profile-grid">
        <section>
          <h2>
            <Sparkles size={20} aria-hidden /> Habilidades
          </h2>
          <ul>
            {character.poderes.map((power) => (
              <li key={power}>{power}</li>
            ))}
          </ul>
        </section>
        <section>
          <h2>
            <Shield size={20} aria-hidden /> Presença no universo
          </h2>
          <p>{character.equipe}</p>
          <h3>Aparições</h3>
          <ul>
            {character.aparicoes.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </section>
      </div>
      <section className="character-related">
        <h2>
          <BookOpen size={20} aria-hidden /> Leia a história
        </h2>
        {publishedStories
          .filter((story) =>
            character.aparicoes.some((appearance) =>
              appearance.includes(story.titulo),
            ),
          )
          .map((story) => (
            <Link
              key={story.id}
              href={`/historias/${story.slug}`}
              className="text-link"
            >
              {story.titulo} <ArrowUpRight size={17} aria-hidden />
            </Link>
          ))}
      </section>
    </article>
  );
}
