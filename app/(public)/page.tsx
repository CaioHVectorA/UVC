import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Orbit } from "lucide-react";
import { publishedEditions, inProgressStories } from "@/lib/catalog";

export default function HomePage() {
  return (
    <div className="storefront editorial-storefront">
      <section className="editorial-hero">
        <div className="editorial-hero-copy">
          <p className="storefront-kicker">
            <Orbit size={16} aria-hidden /> Universo Virtual de Caio
          </p>
          <h1>
            Histórias de um
            <br />
            <em>universo em expansão.</em>
          </h1>
          <p className="editorial-lead">
            Ficção de Caio Henrique. Conheça os livros, os personagens e as
            ideias que dão forma ao UVC.
          </p>
          <a href="#livros" className="text-link">
            Explorar os livros <ArrowRight size={17} aria-hidden />
          </a>
        </div>
        <div className="editorial-orbit" aria-hidden>
          <span>UVC</span>
          <small>Terra · Universo</small>
        </div>
      </section>
      <section
        id="livros"
        className="storefront-books"
        aria-label="Livros publicados"
      >
        <div className="editorial-section-heading">
          <p className="eyebrow">Na sua biblioteca</p>
          <h2>Publicado</h2>
          <span>01</span>
        </div>
        {publishedEditions.map((edition) => (
          <article className="published-book" key={edition.id}>
            <Link
              href={`/historias/${edition.story.slug}`}
              className="published-cover-link"
              aria-label={`Conhecer ${edition.titulo}: ${edition.subtitulo}`}
            >
              <Image
                src={edition.cover}
                alt={`Capa de ${edition.titulo}: ${edition.subtitulo}, de Caio Henrique`}
                width={350}
                height={500}
                priority
                className="published-cover"
                sizes="(max-width:760px) 65vw, 280px"
              />
            </Link>
            <div className="published-book-copy">
              <p className="storefront-kicker">
                <span className="edition-dot" /> Disponível em {edition.formato}
              </p>
              <h3>{edition.titulo}</h3>
              <p className="published-book-subtitle">{edition.subtitulo}</p>
              <p className="editorial-book-description">
                {edition.story.sinopse}
              </p>
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
      <section
        className="in-progress-section"
        aria-labelledby="in-progress-title"
      >
        <div className="editorial-section-heading">
          <p className="eyebrow">O que vem a seguir</p>
          <h2 id="in-progress-title">Em desenvolvimento</h2>
          <span>In progress</span>
        </div>
        <div className="in-progress-grid">
          {inProgressStories.map((story, index) => (
            <article key={story.id} className="in-progress-card">
              <div>
                <span className="story-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="progress-label">Em andamento</span>
              </div>
              <h3>{story.titulo}</h3>
              <p>{story.sinopse}</p>
              <small>
                {story.tipo === "SÉRIE" ? "Série" : "Solo"} ·{" "}
                {story.local === "TERRA" ? "Terra" : "Universo"}
              </small>
            </article>
          ))}
        </div>
      </section>
      <section className="editorial-discover" aria-label="Explore o universo">
        <Link href="/codex">
          <span className="eyebrow">Quem habita esse universo</span>
          <h2>
            Os personagens <ArrowUpRight size={24} aria-hidden />
          </h2>
          <p>Conheça os nomes por trás das histórias.</p>
        </Link>
        <Link href="/assets">
          <span className="eyebrow">Arquivo visual</span>
          <h2>
            A galeria <ArrowUpRight size={24} aria-hidden />
          </h2>
          <p>Artes, símbolos e estudos de um mundo em construção.</p>
        </Link>
      </section>
    </div>
  );
}
