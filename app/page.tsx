import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Orbit,
  BookOpen,
  MoveUpRight,
} from "lucide-react";
import { SectionHeading, StoryCard } from "@/components/ui";
import { stories, mediaUrl } from "@/lib/catalog";
import { factions, publicChapters } from "@/lib/content";

export default function HomePage() {
  const featured = [
    "red-right-hand",
    "congregadores",
    "guardioes",
    "menino-resiliente",
  ].map((slug) => stories.find((s) => s.slug === slug)!);
  return (
    <>
      <section className="home-hero">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="live-dot" /> Ficção independente brasileira
          </p>
          <h1>
            Pequenas origens.
            <br />
            Histórias de
            <br />
            <em>outro universo.</em>
          </h1>
          <p>
            Heróis nas ruas de Glen. Impérios entre as estrelas. Entre em um
            universo de contos, conflitos e personagens que têm muito a contar.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/#historias">
              Encontre sua história
              <ArrowRight size={18} aria-hidden />
            </Link>
            <Link className="text-link" href="/#sobre">
              Conheça o UVC
              <ArrowUpRight size={17} aria-hidden />
            </Link>
          </div>
          <div className="hero-signature">
            <span className="signature-orbit">
              <Orbit size={24} aria-hidden />
            </span>
            <p>
              Uma criação de <strong>Caio Henrique.</strong>
              <br />
              <span>Para quem gosta de descobrir novos mundos.</span>
            </p>
          </div>
        </div>
        <Link
          href="/historias/red-right-hand"
          className="hero-feature"
          aria-label="Conheça Red Right Hand"
        >
          <Image
            src={mediaUrl("rrh-art")}
            alt="Arte de Red Right Hand: retrato em preto e branco sobre fundo vermelho"
            fill
            sizes="(max-width: 760px) 100vw, 50vw"
            priority
          />
          <div className="hero-feature-top">
            <span className="tag">Do arquivo UVC</span>
            <span className="feature-coordinate">SEVERUM / 001</span>
          </div>
          <div className="hero-feature-bottom">
            <p className="eyebrow">Em destaque · Space opera</p>
            <h2>
              Red Right
              <br />
              Hand
              <span>
                <ArrowUpRight size={42} aria-hidden />
              </span>
            </h2>
            <p>Todo império começa com uma ambição.</p>
            <span className="feature-cta">
              Conhecer a história <ArrowRight size={18} aria-hidden />
            </span>
          </div>
        </Link>
      </section>
      <div className="universe-ribbon">
        <span>
          <span className="tiny-star">✳</span> Histórias conectadas
        </span>
        <span>Das ruas de Glen aos confins do cosmos</span>
        <span>
          Um universo. Muitos pontos de partida.
          <MoveUpRight size={16} aria-hidden />
        </span>
      </div>
      <section id="historias" className="home-section">
        <SectionHeading
          eyebrow="Escolha por onde começar"
          title="Seu próximo universo favorito."
          href="/#colecao"
          action="Ver toda a coleção"
        />
        <div className="stories-grid">
          {featured.map((story) => (
            <StoryCard key={story.slug} story={story} />
          ))}
        </div>
        <p className="collection-note">
          <BookOpen size={15} aria-hidden /> Explore as sinopses e conheça cada
          saga.{" "}
          {publicChapters.length > 0 &&
            "Red Right Hand também tem capítulos disponíveis para leitura."}
        </p>
      </section>
      <section className="world-feature">
        <Image
          src={mediaUrl("city")}
          alt="Vista ilustrada de uma metrópole futurista do acervo UVC"
          fill
          sizes="(max-width: 760px) 100vw, 1200px"
        />
        <div className="world-overlay">
          <p className="eyebrow">Um mundo além das páginas</p>
          <h2>
            Algumas histórias
            <br />
            começam na rua.
            <br />
            <em>Outras, nas estrelas.</em>
          </h2>
          <p>
            Glen, Severum e os caminhos que conectam seus personagens. Descubra
            onde cada história se encontra.
          </p>
          <Link href="/timeline" className="button button-light">
            Explorar a cronologia
            <ArrowUpRight size={18} aria-hidden />
          </Link>
        </div>
        <span className="world-coordinate">ARQUIVO VISUAL / CENÁRIOS</span>
      </section>
      <section className="home-section">
        <SectionHeading
          eyebrow="Alianças, conflitos e ideais"
          title="Quem move esse universo?"
          href="/codex"
          action="Conhecer os personagens"
        />
        <div className="faction-grid">
          {factions.slice(0, 3).map((f, i) => (
            <Link
              href={`/codex?equipe=${encodeURIComponent(i === 0 ? "Guardiões" : i === 1 ? "Red Right Hand" : "Congregadores")}`}
              className="faction-card"
              key={f.id}
            >
              <span className="faction-index">0{i + 1} / FACÇÃO</span>
              <h3>{f.nome}</h3>
              <p>{f.desc}</p>
              <span className="text-link">
                Explorar personagens
                <ArrowUpRight size={16} aria-hidden />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section id="colecao" className="home-section collection-section">
        <SectionHeading
          eyebrow="Mais caminhos para explorar"
          title="Cada história, um novo olhar."
        />
        <div className="stories-grid">
          {stories
            .filter((s) => !featured.includes(s))
            .map((story) => (
              <StoryCard key={story.slug} story={story} />
            ))}
        </div>
      </section>
      <section id="sobre" className="about-section">
        <div>
          <p className="eyebrow">Independente por natureza</p>
          <h2>
            Uma ideia que
            <br />
            virou <em>universo.</em>
          </h2>
        </div>
        <div>
          <p>
            O Universo Virtual de Caio nasceu da vontade de contar histórias. De
            reunir heróis imperfeitos, cidades cheias de possibilidades e
            conflitos que atravessam galáxias.
          </p>
          <p>
            Um projeto de ficção independente criado por Caio Henrique, que
            continua crescendo a cada personagem, conto e nova conexão. Este é o
            seu convite para fazer parte dessa descoberta.
          </p>
          <Link className="text-link" href="/assets">
            Visite o acervo do UVC
            <ArrowUpRight size={17} aria-hidden />
          </Link>
        </div>
      </section>
    </>
  );
}
