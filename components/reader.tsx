"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, ArrowRight, Copy, Check } from "lucide-react";
import type { Chapter } from "@/lib/chapters";
import characters from "@/data/characters.json";

export function Reader({
  chapters,
  initialChapter = 0,
  studio = false,
}: {
  chapters: Chapter[];
  initialChapter?: number;
  studio?: boolean;
}) {
  const contentsRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (contentsRef.current && window.matchMedia("(max-width: 760px)").matches)
      contentsRef.current.open = false;
  }, []);
  const [selected, setSelected] = useState(initialChapter);
  const [size, setSize] = useState(18);
  const [night, setNight] = useState(false);
  const [characterId, setCharacterId] = useState("arner");
  const [feedback, setFeedback] = useState("");
  const index = chapters.findIndex(
    (c) => c.numero === (studio ? selected : initialChapter),
  );
  const chapter = chapters[index] || chapters[0];
  const character = characters.find((c) => c.id === characterId);
  const totalWords = chapters.reduce((sum, c) => sum + c.words, 0);
  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(
        `Audite a consistência canônica do capítulo ${chapter.numero} de Red Right Hand: ${chapter.titulo}. Verifique os poderes, a psicologia dos personagens e a cronologia, sem reescrever o texto.\n\n${chapter.text}`,
      );
      setFeedback("Prompt copiado.");
    } catch {
      setFeedback(
        "Não foi possível copiar. Verifique a permissão do navegador.",
      );
    }
  }
  return (
    <div className={`reader-layout ${studio ? "with-inspector" : ""}`}>
      <aside className="reader-sidebar">
        <details ref={contentsRef} open>
          <summary>Sumário de capítulos</summary>
          <nav aria-label="Capítulos de Red Right Hand" className="chapter-nav">
            {chapters.map((c, i) =>
              studio ? (
                <button
                  key={c.numero}
                  className="chapter-choice"
                  aria-pressed={chapter.numero === c.numero}
                  onClick={() => {
                    setSelected(c.numero);
                    setFeedback("");
                  }}
                >
                  {String(i + 1).padStart(2, "0")} · {c.titulo}
                </button>
              ) : (
                <Link
                  key={c.numero}
                  href={`/ler/${c.numero}`}
                  aria-current={
                    chapter.numero === c.numero ? "page" : undefined
                  }
                >
                  {String(i + 1).padStart(2, "0")} · {c.titulo}
                </Link>
              ),
            )}
          </nav>
        </details>
        <label className="reader-control">
          Tamanho do texto: {size}px
          <input
            type="range"
            min="16"
            max="24"
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
          />
        </label>
        <button
          className="button button-secondary mt-5 w-full"
          aria-pressed={night}
          onClick={() => setNight(!night)}
        >
          {night ? "Usar papel claro" : "Usar leitura noturna"}
        </button>
        {studio && (
          <p className="text-xs text-[var(--muted)] mt-5 leading-relaxed">
            {totalWords.toLocaleString("pt-BR")} palavras nos arquivos atuais.
            <br />
            Visualização de leitura e revisão.
          </p>
        )}
      </aside>
      <div className="reader-content">
        <div className="reader-status">
          <span>
            Red Right Hand · {index + 1} de {chapters.length}
          </span>
          <span>
            {chapter.minutes} min de leitura ·{" "}
            {chapter.status === "CANONE_TRAVADO"
              ? "Cânone consolidado"
              : chapter.status === "RASCUNHO"
                ? "Rascunho"
                : "Em revisão"}
          </span>
        </div>
        <article
          className={`reading-paper ${night ? "reader-night" : ""}`}
          style={{ fontSize: `${size}px` }}
        >
          <Markdown remarkPlugins={[remarkGfm]}>{chapter.text}</Markdown>
        </article>
        <nav className="reader-pagination" aria-label="Continuar leitura">
          {index > 0 ? (
            studio ? (
              <button
                className="text-link"
                onClick={() => {
                  setSelected(chapters[index - 1].numero);
                  setFeedback("");
                }}
              >
                ← Capítulo anterior
              </button>
            ) : (
              <Link href={`/ler/${chapters[index - 1].numero}`}>
                <ArrowLeft size={17} aria-hidden />
                Capítulo anterior
              </Link>
            )
          ) : (
            <Link href="/historias/red-right-hand">
              <ArrowLeft size={17} aria-hidden />
              Sobre a história
            </Link>
          )}
          {index < chapters.length - 1 ? (
            studio ? (
              <button
                className="text-link"
                onClick={() => {
                  setSelected(chapters[index + 1].numero);
                  setFeedback("");
                }}
              >
                Próximo capítulo →
              </button>
            ) : (
              <Link href={`/ler/${chapters[index + 1].numero}`}>
                Próximo capítulo
                <ArrowRight size={17} aria-hidden />
              </Link>
            )
          ) : (
            <Link href="/#historias">
              Explorar outras histórias
              <ArrowRight size={17} aria-hidden />
            </Link>
          )}
        </nav>
      </div>
      {studio && (
        <aside className="reader-sidebar inspector">
          <p className="eyebrow">Referência de cânone</p>
          <label className="reader-control">
            Consultar personagem
            <select
              value={characterId}
              onChange={(e) => setCharacterId(e.target.value)}
            >
              {characters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
          {character && (
            <>
              <h2>{character.nome}</h2>
              <p>{character.desc}</p>
              <details>
                <summary className="text-xs text-[var(--accent)]">
                  Ver habilidades
                </summary>
                <ul className="text-xs leading-loose text-[var(--muted)] list-disc pl-4 mt-3">
                  {character.poderes.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </details>
            </>
          )}
          <button className="button button-secondary" onClick={copyPrompt}>
            {feedback === "Prompt copiado." ? (
              <Check size={15} aria-hidden />
            ) : (
              <Copy size={15} aria-hidden />
            )}
            Copiar prompt de revisão
          </button>
          <p role="status">{feedback}</p>
          <p>
            A revisão é feita na ferramenta de sua escolha. Não há auditoria
            automática nesta tela.
          </p>
        </aside>
      )}
    </div>
  );
}
