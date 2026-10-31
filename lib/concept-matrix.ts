import { z } from "zod";
import type { StudioEntity, StudioRelation } from "./workspace";

export const conceptCategories = [
  "cosmologia",
  "tecnologia",
  "geopolitica",
  "biologia",
  "misticismo",
] as const;

export type ConceptCategory = (typeof conceptCategories)[number];

export const conceptScales = ["UNIVERSAL", "TERRA", "SETOR"] as const;

export type ConceptScale = (typeof conceptScales)[number];

export const conceptCategoryLabels: Record<ConceptCategory, string> = {
  cosmologia: "Cosmologia",
  tecnologia: "Tecnologia",
  geopolitica: "Geopolítica Cósmica",
  biologia: "Biologia & Enxertos",
  misticismo: "Misticismo & Maldições",
};

export const conceptScaleLabels: Record<ConceptScale, string> = {
  UNIVERSAL: "Universal",
  TERRA: "Terra / Planetária",
  SETOR: "Setor / Regional",
};

export const conceptAttributesSchema = z
  .object({
    category: z.enum(conceptCategories),
    rules: z.array(z.string().trim().min(1).max(500)),
    scale: z.enum(conceptScales),
    visualAssetId: z.string().optional(),
    definitionPending: z.boolean().optional(),
    source: z.string().optional(),
    alias: z.string().optional(),
  })
  .strict();

export type ConceptAttributes = z.infer<typeof conceptAttributesSchema>;

export function validateConceptAttributes(attrs: unknown) {
  return conceptAttributesSchema.safeParse(attrs);
}

export function isConceptEntity(entity: StudioEntity): boolean {
  return entity.kind === "concept";
}

export interface ConceptFilterOptions {
  storyId?: string;
  documentId?: string;
  searchQuery?: string;
  category?: ConceptCategory | "all";
}

export function filterReferenceConcepts(
  concepts: StudioEntity[],
  relations: StudioRelation[],
  options: ConceptFilterOptions = {},
): StudioEntity[] {
  const { storyId, documentId, searchQuery = "", category = "all" } = options;
  const q = searchQuery.trim().toLocaleLowerCase("pt-BR");

  const filtered = concepts.filter((c) => {
    if (c.kind !== "concept") return false;
    if (category !== "all") {
      const cat = c.attributes?.category;
      if (cat !== category) return false;
    }
    if (!q) return true;
    const rules = Array.isArray(c.attributes?.rules)
      ? (c.attributes.rules as string[]).join(" ")
      : "";
    const text =
      `${c.title} ${c.summary} ${c.body.slice(0, 500)} ${rules}`.toLocaleLowerCase(
        "pt-BR",
      );
    return text.includes(q);
  });

  const score = (c: StudioEntity) => {
    let pts = 0;
    const isDocLinked = documentId
      ? relations.some(
          (r) =>
            (r.sourceId === documentId && r.targetId === c.id) ||
            (r.targetId === documentId && r.sourceId === c.id),
        )
      : false;
    const isStoryLinked = storyId
      ? relations.some(
          (r) =>
            (r.sourceId === storyId && r.targetId === c.id) ||
            (r.targetId === storyId && r.sourceId === c.id),
        )
      : false;
    const isUniversal =
      String(c.attributes?.scale).toUpperCase() === "UNIVERSAL";

    if (isDocLinked) pts += 100;
    else if (isStoryLinked) pts += 70;

    if (isUniversal) pts += 40;

    return pts;
  };

  return filtered.sort((a, b) => {
    const diff = score(b) - score(a);
    if (diff !== 0) return diff;
    return a.title.localeCompare(b.title, "pt-BR");
  });
}

export function formatConceptCitation(concept: StudioEntity): string {
  const rules = Array.isArray(concept.attributes?.rules)
    ? (concept.attributes.rules as string[])
    : [];
  const ruleExcerpt =
    rules.length > 0 ? `\nRegra fundamental: ${rules[0]}` : "";
  return `« [Conceito: ${concept.title}] ${concept.summary || concept.body.slice(0, 200)}${ruleExcerpt} »`;
}
