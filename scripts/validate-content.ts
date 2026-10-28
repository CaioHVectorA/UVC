import { readFile, access } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  publishedCharactersSchema,
  factionsSchema,
  seriesSchema,
  timelineSchema,
  bookSchema,
  publicationSchema,
  mediaSchema,
} from "../lib/schemas";
const json = async (file: string) =>
  JSON.parse(await readFile(file, "utf8")) as unknown;
async function main() {
  const characters = publishedCharactersSchema.parse(
    await json("data/characters.json"),
  );
  const factions = factionsSchema.parse(await json("data/factions.json"));
  const series = seriesSchema.parse(await json("data/series_and_solos.json"));
  const timeline = timelineSchema.parse(await json("data/timeline.json"));
  const book = bookSchema.parse(await json("books/red-right-hand/book.json"));
  const publication = publicationSchema.parse(
    await json("data/publication.json"),
  );
  const media = mediaSchema.parse(await json("data/media.json"));
  for (const entry of media) {
    const metadata = await sharp(entry.source).metadata();
    if (metadata.width !== entry.width || metadata.height !== entry.height)
      throw new Error(`Dimensões incorretas: ${entry.id}`);
    await access(`public/media/${entry.id}.webp`);
  }
  for (const chapter of book.capitulos) {
    const text = await readFile(
      path.join("books/red-right-hand", chapter.arquivo),
      "utf8",
    );
    if (!text.trim()) throw new Error(`Capítulo vazio: ${chapter.numero}`);
  }
  for (const [id, entry] of Object.entries(publication.books)) {
    if (id !== book.id) throw new Error(`Livro público desconhecido: ${id}`);
    for (const numero of entry.chapters)
      if (!book.capitulos.some((c) => c.numero === numero))
        throw new Error(`Capítulo público desconhecido: ${numero}`);
  }
  for (const character of characters)
    for (const id of character.livroIds ?? [])
      if (!timeline.livros.some((b) => b.id === id))
        throw new Error(`Livro de personagem desconhecido: ${id}`);
  for (const edition of publication.catalog)
    if (!series.some((story) => story.id === edition.seriesId))
      throw new Error(`Edição sem história: ${edition.id}`);
  const rrh = timeline.livros.find((b) => b.id === book.id);
  if (!rrh) throw new Error("Livro sem referência na cronologia.");
  for (const beat of rrh.beats)
    if (!book.capitulos.some((c) => c.numero === beat.capitulo))
      throw new Error(`Cena sem capítulo: ${beat.id}`);
  // The presentation map uses stable dataset IDs; importing it also rejects unmapped stories.
  const { stories, characterArt } = await import("../lib/catalog");
  for (const art of [
    ...stories.map((s) => s.art),
    ...Object.values(characterArt),
  ])
    if (!media.some((m) => m.id === art))
      throw new Error(`Arte não registrada: ${art}`);
  for (const key of Object.keys(characterArt))
    if (!characters.some((c) => c.id === key))
      throw new Error(`Arte vinculada a personagem inexistente: ${key}`);
  console.log(
    `Conteúdo válido: ${characters.length} personagens, ${factions.length} facções, ${series.length} histórias, ${book.capitulos.length} capítulos e ${media.length} imagens. ${characters.filter((c) => !c.statusVisibilidade).length} personagens permanecem sem classificação editorial explícita.`,
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
