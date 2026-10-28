import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { publishedEditions } from "@/lib/catalog";

export default function HomePage() {
  return (
    <div className="storefront">
      <section className="storefront-intro">
        <p className="storefront-kicker">Universo Virtual de Caio</p>
        <h1>
          Livros de
          <br />
          Caio Henrique.
        </h1>
      </section>
      <section
        id="livros"
        className="storefront-books"
        aria-label="Livros publicados"
      >
        {publishedEditions.map((edition) => (
          <article className="published-book" key={edition.id}>
            <div className="published-book-mark" aria-hidden>
              <span>RRH</span>
              <span>UVC / {edition.formato}</span>
            </div>
            <div className="published-book-copy">
              <p className="storefront-kicker">
                Disponível em {edition.formato}
              </p>
              <h2>{edition.titulo}</h2>
              {edition.subtitulo && (
                <p className="published-book-subtitle">{edition.subtitulo}</p>
              )}
              <div className="storefront-actions">
                <a href={edition.amazonUrl} className="button button-primary">
                  Ver na Amazon <ArrowUpRight size={17} aria-hidden />
                </a>
                <Link
                  href={`/historias/${edition.story.slug}`}
                  className="text-link"
                >
                  Sobre o livro <ArrowRight size={16} aria-hidden />
                </Link>
              </div>
            </div>
          </article>
        ))}
      </section>
      <section className="storefront-about" id="sobre">
        <p>O UVC reúne as histórias de Caio Henrique.</p>
        <Link href="/assets" className="text-link">
          Galeria <ArrowRight size={16} aria-hidden />
        </Link>
      </section>
    </div>
  );
}
