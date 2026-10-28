import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";
import { publishedStories } from "@/lib/catalog";
import { book, isPublicChapter } from "@/lib/content";
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getSiteUrl();
  if (!origin) return [];
  return [
    "/",
    "/codex",
    "/assets",
    ...publishedStories.map((story) => `/historias/${story.slug}`),
    ...book.capitulos
      .filter((chapter) => isPublicChapter(chapter.numero))
      .map((chapter) => `/ler/${chapter.numero}`),
  ].map((route) => ({ url: new URL(route, origin).href }));
}
