import { z } from "zod";
const referenceId = z.string().min(1).max(100);
export const galleryNoteSchema = z
  .object({
    assetId: z.string().regex(/^[a-f0-9]{20}$/),
    title: z.string().max(160),
    idea: z.string().max(5000),
    text: z.string().max(20000),
    tags: z.string().max(500),
    stage: z.enum(["reference", "exploration", "selected"]),
    characterIds: z.array(referenceId).max(30),
    storyIds: z.array(referenceId).max(20),
    chapterNumbers: z.array(z.number().int().min(0).max(99)).max(100),
  })
  .strict();
export type GalleryNote = z.infer<typeof galleryNoteSchema>;
export const galleryWorkspaceSchema = z
  .object({
    format: z.literal("uvc-gallery-workspace"),
    version: z.literal(1),
    notes: z.array(galleryNoteSchema).max(500),
  })
  .strict()
  .refine(
    (value) =>
      new Set(value.notes.map((note) => note.assetId)).size ===
      value.notes.length,
    "Assets duplicados",
  );
export type GalleryWorkspace = z.infer<typeof galleryWorkspaceSchema>;
export type GalleryAsset = {
  id: string;
  source: string;
  name: string;
  folder: string;
};
export type GalleryReferences = {
  characters: { id: string; nome: string }[];
  stories: { id: string; titulo: string }[];
  chapters: { numero: number; titulo: string }[];
};
export function emptyGalleryNote(assetId: string): GalleryNote {
  return {
    assetId,
    title: "",
    idea: "",
    text: "",
    tags: "",
    stage: "reference",
    characterIds: [],
    storyIds: [],
    chapterNumbers: [],
  };
}
export function parseGalleryWorkspace(
  value: unknown,
  assets: GalleryAsset[],
  refs: GalleryReferences,
): GalleryWorkspace {
  const parsed = galleryWorkspaceSchema.parse(value);
  const knownAssets = new Set(assets.map((a) => a.id)),
    knownCharacters = new Set(refs.characters.map((c) => c.id)),
    knownStories = new Set(refs.stories.map((s) => s.id)),
    knownChapters = new Set(refs.chapters.map((c) => c.numero));
  for (const note of parsed.notes)
    if (
      !knownAssets.has(note.assetId) ||
      note.characterIds.some((id) => !knownCharacters.has(id)) ||
      note.storyIds.some((id) => !knownStories.has(id)) ||
      note.chapterNumbers.some((n) => !knownChapters.has(n))
    )
      throw new Error(
        "O arquivo contém um asset ou vínculo que não existe neste projeto.",
      );
  return parsed;
}
