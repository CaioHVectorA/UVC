import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";
import { stories } from "@/lib/catalog";
import { book, isPublicChapter } from "@/lib/content";
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getSiteUrl();
  if (!origin) return [];
  return [
    "/",
    "/codex",
    "/assets",
    "/timeline",
    ...stories.map((s) => `/historias/${s.slug}`),
    ...book.capitulos
      .filter((c) => isPublicChapter(c.numero))
      .map((c) => `/ler/${c.numero}`),
  ].map((route) => ({ url: new URL(route, origin).href }));
}
