import { createHash } from "node:crypto";
import { readFile, access, readdir } from "node:fs/promises";
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
  const knownSeries = new Set(series.map((story) => story.id));
  for (const id of publication.workInProgress) {
    if (!knownSeries.has(id))
      throw new Error(`Série em andamento desconhecida: ${id}`);
    if (publication.catalog.some((edition) => edition.seriesId === id))
      throw new Error(`Série publicada também marcada em andamento: ${id}`);
  }
  for (const edition of publication.catalog) {
    if (!knownSeries.has(edition.seriesId))
      throw new Error(`Edição sem história: ${edition.id}`);
    await access(`public${edition.cover}`);
    const cover = await sharp(`public${edition.cover}`).metadata();
    if (!cover.width || !cover.height)
      throw new Error(`Capa inválida: ${edition.id}`);
  }
  const inventory = (await json("data/studio-assets.json")) as {
    id: string;
    source: string;
    name: string;
    folder: string;
  }[];
  async function assetFiles(directory: string): Promise<string[]> {
    const groups = await Promise.all(
      (await readdir(directory, { withFileTypes: true })).map(async (entry) => {
        const source = path.posix.join(directory, entry.name);
        return entry.isDirectory()
          ? assetFiles(source)
          : entry.isFile() && /\.(png|jpe?g|webp)$/i.test(entry.name)
            ? [source]
            : [];
      }),
    );
    return groups.flat();
  }
  const files = (await assetFiles("assets")).sort();
  if (
    JSON.stringify(files) !==
    JSON.stringify(inventory.map((entry) => entry.source).sort())
  )
    throw new Error("Acervo mudou: execute npm run assets:index.");
  if (new Set(inventory.map((entry) => entry.id)).size !== inventory.length)
    throw new Error("IDs de assets duplicados.");
  for (const entry of inventory)
    if (
      entry.id !==
      createHash("sha256").update(entry.source).digest("hex").slice(0, 20)
    )
      throw new Error("ID de asset inválido.");
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
