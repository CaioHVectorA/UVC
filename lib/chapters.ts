import { readFile } from "node:fs/promises";
import path from "node:path";
import { book, isPublicChapter } from "./content";
export async function getChapter(numero: number) {
  const chapter = book.capitulos.find((c) => c.numero === numero);
  if (!chapter) throw new Error("Capítulo não encontrado no manifesto.");
  const root = path.resolve(process.cwd(), "books/red-right-hand");
  const filename = path.resolve(root, chapter.arquivo);
  if (!filename.startsWith(root + path.sep))
    throw new Error("Arquivo de capítulo fora do diretório permitido.");
  const text = await readFile(filename, "utf8");
  const words = text.trim().split(/\s+/u).length;
  return {
    ...chapter,
    text,
    words,
    minutes: Math.max(1, Math.ceil(words / 200)),
  };
}
export async function getChapters() {
  return Promise.all(
    book.capitulos
      .filter((c) => isPublicChapter(c.numero))
      .map((c) => getChapter(c.numero)),
  );
}
export type Chapter = Awaited<ReturnType<typeof getChapter>>;
