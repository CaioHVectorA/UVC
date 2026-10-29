import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";
import { publishedStories } from "@/lib/catalog";
import { book, isPublicChapter } from "@/lib/content";
import { databaseConfigured, loadWorkspace } from "@/lib/database";
import { seedEntities } from "@/lib/workspace-seed";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getSiteUrl();
  if (!origin) return [];
  const entities = databaseConfigured()
    ? (await loadWorkspace(true)).entities
    : seedEntities.filter((e) => e.published);
  return [
    "/",
    "/codex",
    "/conceitos",
    "/assets",
    ...publishedStories.map((s) => `/historias/${s.slug}`),
    ...entities
      .filter((e) => e.kind === "character")
      .map((e) => `/codex/${e.id}`),
    ...entities
      .filter((e) => ["concept", "place", "artifact"].includes(e.kind))
      .map((e) => `/conceitos/${e.id}`),
    ...book.capitulos
      .filter((c) => isPublicChapter(c.numero))
      .map((c) => `/ler/${c.numero}`),
  ].map((route) => ({ url: new URL(route, origin).href }));
}
