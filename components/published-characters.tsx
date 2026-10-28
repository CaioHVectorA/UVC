"use client";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { Search } from "lucide-react";
import { PageIntro } from "@/components/ui";
type PublicCharacter = {
  id: string;
  nome: string;
  equipe: string;
  desc: string;
};
export function PublishedCharacters({
  characters,
}: {
  characters: PublicCharacter[];
}) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLocaleLowerCase("pt-BR");
  const filtered = characters.filter((character) =>
    `${character.nome} ${character.equipe}`
      .toLocaleLowerCase("pt-BR")
      .includes(query),
  );
  return (
    <>
      <PageIntro label="Red Right Hand" title="Personagens">
        Alguns dos nomes que fazem parte da história.
      </PageIntro>
      <div className="toolbar">
        <label className="search-field">
          <Search size={18} aria-hidden />
          <span className="sr-only">Buscar personagem</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nome ou equipe"
          />
        </label>
      </div>
      <p className="results-label" role="status">
        {filtered.length} personagens
      </p>
      <div className="published-characters">
        {filtered.map((character) => (
          <article
            key={character.id}
            id={character.id}
            className="character-card"
          >
            <p className="eyebrow">{character.equipe}</p>
            <h2>
              <Link href={`/codex/${character.id}`}>
                {character.nome} <ArrowUpRight size={18} aria-hidden />
              </Link>
            </h2>
            <p>{character.desc}</p>
          </article>
        ))}
      </div>
      {!filtered.length && (
        <div className="empty-state">
          <h2>Nenhum personagem encontrado.</h2>
          <button
            className="button button-secondary"
            onClick={() => setSearch("")}
          >
            Limpar busca
          </button>
        </div>
      )}
    </>
  );
}
