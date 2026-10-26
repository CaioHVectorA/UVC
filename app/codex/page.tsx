"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { Search, Users } from "lucide-react";
import { characters as charactersData } from "@/lib/content";
import { characterArt, mediaUrl } from "@/lib/catalog";
import { PageIntro } from "@/components/ui";

export default function CodexPage() {
  const [search, setSearch] = useState("");
  const [scale, setScale] = useState("TODOS");
  const [complete, setComplete] = useState(false);
  useEffect(() => {
    const team = new URLSearchParams(window.location.search).get("equipe");
    if (team) {
      setSearch(team);
      setComplete(true);
    }
  }, []);
  const characters = charactersData.filter(
    (c) =>
      (complete || c.statusVisibilidade === "PUBLICO") &&
      (scale === "TODOS" || c.escala.includes(scale)) &&
      [c.nome, c.equipe, ...c.poderes].some((value) =>
        value
          .toLocaleLowerCase("pt-BR")
          .includes(search.trim().toLocaleLowerCase("pt-BR")),
      ),
  );
  return (
    <>
      <PageIntro
        label="Pessoas, poderes e outras possibilidades"
        title="Todo universo tem seus personagens."
      >
        Heróis, anti-heróis e as forças que movem suas histórias. Conheça as
        alianças, os poderes e os conflitos do UVC.
      </PageIntro>
      <div className="segmented" aria-label="Visibilidade do acervo">
        <button aria-pressed={!complete} onClick={() => setComplete(false)}>
          Seleção sem spoilers
        </button>
        <button aria-pressed={complete} onClick={() => setComplete(true)}>
          Acervo completo · spoilers
        </button>
      </div>
      <div className="toolbar">
        <label className="search-field">
          <Search size={19} aria-hidden />
          <span className="sr-only">
            Buscar por personagem, equipe ou poder
          </span>
          <input
            type="search"
            placeholder="Um nome, uma equipe, um poder…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label className="filter-label">
          Explorar por mundo
          <select value={scale} onChange={(e) => setScale(e.target.value)}>
            <option value="TODOS">Todos os mundos</option>
            <option value="TERRA">Terra / Glen</option>
            <option value="UNIVERSAL">Universo / Severum</option>
          </select>
        </label>
      </div>
      <div className="results-label" role="status">
        <span>{characters.length} personagens encontrados</span>
        <span>
          {complete
            ? "O acervo completo pode revelar acontecimentos das histórias."
            : "Seleção conforme a classificação pública do acervo."}
        </span>
      </div>
      {characters.length ? (
        <div className="character-grid">
          {characters.map((c) => (
            <article className="character-card" key={c.id} id={c.id}>
              <div
                className={`character-portrait ${["arner", "deroo-da", "tarlin", "delimitador"].includes(c.id) ? "is-art" : ""}`}
              >
                {characterArt[c.id] ? (
                  <Image
                    src={mediaUrl(characterArt[c.id])}
                    alt={`Arte ou símbolo associado a ${c.nome}`}
                    width={500}
                    height={300}
                    sizes="(max-width:760px) 90vw, (max-width:1000px) 45vw, 380px"
                  />
                ) : (
                  <span className="portrait-initial" aria-hidden>
                    {c.nome.slice(0, 1)}
                  </span>
                )}
                <span>
                  {c.escala === "TERRA" ? "TERRA / GLEN" : "ESCALA UNIVERSAL"}
                </span>
              </div>
              <div className="character-body">
                <h2>{c.nome}</h2>
                <p className="character-team">
                  {c.equipe} · {c.alinhamento}
                </p>
                <p>{c.desc}</p>
                <details>
                  <summary>Habilidades e aparições</summary>
                  <ul>
                    {c.poderes.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                  <p className="character-appearances">
                    Aparições: {c.aparicoes.join(" · ")}
                  </p>
                </details>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Users size={28} className="mx-auto" aria-hidden />
          <h2>Nenhum personagem por aqui.</h2>
          <p>Tente outro nome ou explore todos os mundos.</p>
          <button
            className="button button-secondary"
            onClick={() => {
              setSearch("");
              setScale("TODOS");
            }}
          >
            Limpar filtros
          </button>
        </div>
      )}
    </>
  );
}
