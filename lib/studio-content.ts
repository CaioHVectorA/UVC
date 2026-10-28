import "server-only";
import { requireStudioAuthor } from "./studio-auth";
import { getChapter } from "./chapters";
import { characters, factions, series, book, timeline } from "./content";

// Authorization belongs at the data boundary, before filesystem reads/serialization.
export async function getStudioContent() {
  await requireStudioAuthor();
  return {
    chapters: await Promise.all(
      book.capitulos.map((chapter) => getChapter(chapter.numero)),
    ),
    characters,
  };
}

export async function getStudioCharacterData() {
  await requireStudioAuthor();
  return {
    characters,
    factions: factions.map((faction) => faction.nome),
    stories: series.map((story) => story.titulo),
  };
}

export async function getStudioTimeline() {
  await requireStudioAuthor();
  return {
    timeline,
    stories: series.map((story) => ({ id: story.id, titulo: story.titulo })),
  };
}
