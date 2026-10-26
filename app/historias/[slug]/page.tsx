import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen } from "lucide-react";
import { stories, mediaUrl } from "@/lib/catalog";
import { SectionHeading, StoryCard } from "@/components/ui";
import book from "@/books/red-right-hand/book.json";
export function generateStaticParams() {
  return stories.map((s) => ({ slug: s.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const story = stories.find((s) => s.slug === slug);
  return { title: story?.titulo, description: story?.sinopse };
}
export default async function StoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const story = stories.find((s) => s.slug === slug);
  if (!story) notFound();
  const readable = slug === "red-right-hand";
  return (
    <>
      <section className="story-detail">
        <div>
          <Image
            className="detail-cover"
            src={mediaUrl(story.art)}
            alt={`Capa ou símbolo de ${story.titulo}`}
            width={500}
            height={680}
            priority
          />
        </div>
        <div className="detail-copy">
          <Link href="/#historias" className="breadcrumb">
            <ArrowLeft size={15} aria-hidden />
            Voltar às histórias
          </Link>
          <p className="eyebrow">
            {story.tipo} /{" "}
            {story.local === "TERRA" ? "Glen e a Terra" : "Escala universal"}
          </p>
          <h1>{story.titulo}</h1>
          <p>{story.sinopse}</p>
          <div className="hero-actions">
            {readable ? (
              <Link href="/ler/0" className="button button-primary">
                <BookOpen size={17} aria-hidden />
                Ler o primeiro capítulo
                <ArrowRight size={17} aria-hidden />
              </Link>
            ) : (
              <Link className="button button-secondary" href="/codex">
                Conhecer os personagens
                <ArrowUpRight size={17} aria-hidden />
              </Link>
            )}
          </div>
          <p className="detail-note">
            {readable
              ? "Texto em revisão · Leitura gratuita da versão de trabalho."
              : "Esta história faz parte do acervo UVC. A leitura ainda não está disponível nesta versão do site."}
          </p>
        </div>
      </section>
      {readable ? (
        <section className="mb-16">
          <SectionHeading
            eyebrow="Red Right Hand / Ato I"
            title="Uma ambição. Seis capítulos."
          />
          <div>
            {book.capitulos.map((c, i) => (
              <Link
                className="chapter-link"
                href={`/ler/${c.numero}`}
                key={c.numero}
              >
                <span>
                  <small>{String(i + 1).padStart(2, "0")}</small>
                  {c.titulo}
                </span>
                <span>
                  <span>
                    {c.status === "CANONE_TRAVADO"
                      ? "Cânone consolidado"
                      : c.status === "RASCUNHO"
                        ? "Rascunho"
                        : "Em revisão"}
                  </span>
                  <ArrowUpRight size={18} aria-hidden />
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : "arcos" in story && story.arcos ? (
        <section>
          <SectionHeading eyebrow="Pelo caminho" title="Arcos da história" />
          <ul className="arc-list">
            {story.arcos.map((arc) => (
              <li key={arc}>{arc}</li>
            ))}
          </ul>
        </section>
      ) : null}
      <section className="home-section">
        <SectionHeading
          eyebrow="Continue explorando"
          title="Outros cantos do universo."
        />
        <div className="stories-grid">
          {stories
            .filter((s) => s.slug !== slug)
            .slice(0, 4)
            .map((s) => (
              <StoryCard key={s.slug} story={s} />
            ))}
        </div>
      </section>
    </>
  );
}
