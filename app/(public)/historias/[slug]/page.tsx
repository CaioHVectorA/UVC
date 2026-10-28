import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { publishedStories, publishedEditions } from "@/lib/catalog";
import { getSiteUrl } from "@/lib/site-url";

export function generateStaticParams() {
  return publishedStories.map((story) => ({ slug: story.slug }));
}
function getEdition(slug: string) {
  const edition = publishedEditions.find((entry) => entry.story.slug === slug);
  if (!edition) notFound();
  return edition;
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const edition = getEdition(slug);
  const title = `${edition.titulo}${edition.subtitulo ? `: ${edition.subtitulo}` : ""}`;
  return {
    title,
    description: edition.story.sinopse,
    ...(getSiteUrl()
      ? { alternates: { canonical: `/historias/${slug}` } }
      : {}),
    openGraph: { title, description: edition.story.sinopse, type: "book" },
  };
}
export default async function StoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const edition = getEdition((await params).slug);
  return (
    <article className="storefront-book-detail">
      <Link href="/#livros" className="breadcrumb">
        <ArrowLeft size={16} aria-hidden /> Livros
      </Link>
      <p className="storefront-kicker">Caio Henrique · {edition.formato}</p>
      <div className="book-detail-grid">
        <div>
          <Image
            src={edition.cover}
            alt={`Capa de ${edition.titulo}: ${edition.subtitulo}`}
            width={350}
            height={500}
            priority
            className="published-cover"
          />
        </div>
        <div>
          <h1>{edition.titulo}</h1>
          {edition.subtitulo && (
            <p className="published-book-subtitle">{edition.subtitulo}</p>
          )}
          <p className="published-book-synopsis">{edition.story.sinopse}</p>
          <a href={edition.amazonUrl} className="button button-primary">
            Ver na Amazon <ArrowUpRight size={17} aria-hidden />
          </a>
          <Link href="/codex" className="text-link book-character-link">
            Conhecer os personagens →
          </Link>
        </div>
      </div>
    </article>
  );
}
