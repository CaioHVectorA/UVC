import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ReactNode } from "react";
import type { Chapter } from "./chapters";
export type RenderedChapter = Chapter & { rendered: ReactNode };
// Runs only in server pages. Raw HTML remains disabled by react-markdown.
export function renderChapters(
  chapters: Chapter[],
  activeNumber?: number,
): RenderedChapter[] {
  return chapters.map((chapter) => ({
    ...chapter,
    ...(activeNumber !== undefined && chapter.numero !== activeNumber
      ? { text: "", rendered: null }
      : {
          rendered: (
            <Markdown remarkPlugins={[remarkGfm]}>{chapter.text}</Markdown>
          ),
        }),
  }));
}
