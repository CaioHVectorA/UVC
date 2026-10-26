import { readFile } from "node:fs/promises";
import path from "node:path";
import book from "@/books/red-right-hand/book.json";
// File paths come exclusively from the canonical book manifest, never user input.
export async function getChapters() {
  return Promise.all(
    book.capitulos.map(async (chapter) => {
      const text = await readFile(
        path.join(process.cwd(), "books/red-right-hand", chapter.arquivo),
        "utf8",
      );
      const words = text.trim().split(/\s+/u).length;
      return {
        ...chapter,
        text,
        words,
        minutes: Math.max(1, Math.ceil(words / 200)),
      };
    }),
  );
}
export type Chapter = Awaited<ReturnType<typeof getChapters>>[number];
