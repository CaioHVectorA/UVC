// Validated by validate:content before dev/build. No schema runtime in client bundles.
import charactersJson from "@/data/characters.json";
import factionsJson from "@/data/factions.json";
import seriesJson from "@/data/series_and_solos.json";
import timelineJson from "@/data/timeline.json";
import bookJson from "@/books/red-right-hand/book.json";
import publication from "@/data/publication.json";
import type { Character, Timeline, CanonicalBook } from "./schemas";
export const characters: Character[] = charactersJson.map((c) => ({
  ...c,
  statusVisibilidade: c.statusVisibilidade ?? "NAO_CLASSIFICADO",
})) as Character[];
export const factions = factionsJson;
export const series = seriesJson;
export const timeline = timelineJson as Timeline;
export const book = bookJson as CanonicalBook;
export { publication };
export function isPublicChapter(numero: number) {
  return publication.books["rrh-1"].chapters.includes(numero);
}

export const publicChapters = book.capitulos.filter((c) =>
  isPublicChapter(c.numero),
);
