import { z } from "zod";
export const kinds = [
  "character",
  "concept",
  "place",
  "artifact",
  "faction",
  "story",
  "document",
  "event",
  "visual",
  "task",
] as const;
export type EntityKind = (typeof kinds)[number];
export const kindLabels: Record<EntityKind, string> = {
  character: "Personagens",
  concept: "Conceitos",
  place: "Lugares",
  artifact: "Objetos",
  faction: "Facções",
  story: "Histórias",
  document: "Manuscritos",
  event: "Linha do tempo",
  visual: "Galeria visual",
  task: "Tarefas",
};
export const entitySchema = z
  .object({
    id: z.string().min(1).max(120),
    kind: z.enum(kinds),
    title: z.string().trim().min(1).max(200),
    body: z.string().max(500000),
    summary: z.string().max(2000),
    status: z.enum(["draft", "review", "ready", "done"]),
    published: z.boolean(),
    tags: z.array(z.string().max(80)).max(30),
    attributes: z.record(z.string(), z.unknown()),
    version: z.number().int().nonnegative(),
  })
  .strict();
export type StudioEntity = z.infer<typeof entitySchema> & {
  updatedAt?: string;
};
export const relationSchema = z
  .object({
    id: z.string().max(120),
    sourceId: z.string().max(120),
    targetId: z.string().max(120),
    label: z.string().trim().min(1).max(120),
  })
  .strict()
  .refine((v) => v.sourceId !== v.targetId, "Escolha duas fichas diferentes.");
export type StudioRelation = z.infer<typeof relationSchema>;
export type StudioWorkspace = {
  entities: StudioEntity[];
  relations: StudioRelation[];
  positions?: Record<string, { x: number; y: number }>;
};
export function blankEntity(kind: EntityKind): StudioEntity {
  return {
    id: crypto.randomUUID(),
    kind,
    title: "",
    summary: "",
    body: "",
    status: "draft",
    published: false,
    tags: [],
    attributes: {},
    version: 0,
  };
}
export function neighbors(id: string, relations: StudioRelation[], depth = 1) {
  const found = new Set([id]);
  for (let n = 0; n < depth; n++) {
    const current = new Set(found);
    for (const edge of relations)
      if (current.has(edge.sourceId) || current.has(edge.targetId)) {
        found.add(edge.sourceId);
        found.add(edge.targetId);
      }
  }
  return found;
}

// --- Concepts Taxonomy & Contracts ---

export const conceptCategories = [
  "cosmologia",
  "tecnologia",
  "geopolitica",
  "biologia",
  "misticismo",
] as const;
export type ConceptCategory = (typeof conceptCategories)[number];

export const conceptCategoryLabels: Record<ConceptCategory, string> = {
  cosmologia: "Cosmologia",
  tecnologia: "Tecnologia",
  geopolitica: "Geopolítica Cósmica",
  biologia: "Biologia & Enxertos",
  misticismo: "Misticismo & Maldições",
};

export const conceptScales = ["UNIVERSAL", "TERRA", "SETOR"] as const;
export type ConceptScale = (typeof conceptScales)[number];

export const conceptScaleLabels: Record<ConceptScale, string> = {
  UNIVERSAL: "Universal",
  TERRA: "Terra / Planetária",
  SETOR: "Setor / Regional",
};

export const conceptRelationLabels = [
  "fundamenta",
  "relacionado",
  "rege",
  "utiliza",
  "manifesta",
] as const;
export type ConceptRelationLabel = (typeof conceptRelationLabels)[number];

export const conceptAttributesSchema = z
  .object({
    category: z.enum(conceptCategories),
    rules: z.array(z.string().trim().min(1).max(500)),
    scale: z.enum(conceptScales),
    visualAssetId: z.string().trim().max(120).optional(),
    source: z.string().max(300).optional(),
    definitionPending: z.boolean().optional(),
    alias: z.string().max(120).optional(),
  })
  .strict();

export type ConceptAttributes = z.infer<typeof conceptAttributesSchema>;

export function isConceptEntity(entity: StudioEntity): boolean {
  return entity.kind === "concept";
}

export function normalizeConceptCategory(
  category?: string | null,
): ConceptCategory {
  if (!category || typeof category !== "string") return "cosmologia";
  const normalized = category
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  if (!normalized) return "cosmologia";

  if ((conceptCategories as readonly string[]).includes(normalized)) {
    return normalized as ConceptCategory;
  }

  // 1. Biologia & Enxertos: bio, genet, muta, enxert take precedence over tec/eng
  if (
    normalized.includes("bio") ||
    normalized.includes("genet") ||
    normalized.includes("muta") ||
    normalized.includes("enxert")
  ) {
    return "biologia";
  }

  // 2. Geopolitica Cosmica: geo, politic, militar take precedence over generic cosmo
  if (
    normalized.includes("geo") ||
    normalized.includes("politic") ||
    normalized.includes("militar")
  ) {
    return "geopolitica";
  }

  // 3. Misticismo & Maldicoes: mist, maldic, magia, magic, espirit, esoter, ocult
  if (
    normalized.includes("mist") ||
    normalized.includes("maldic") ||
    normalized.includes("magia") ||
    normalized.includes("magic") ||
    normalized.includes("espirit") ||
    normalized.includes("esoter") ||
    normalized.includes("ocult")
  ) {
    return "misticismo";
  }

  // 4. Tecnologia: tec, eng, ciber, armam, belic
  if (
    normalized.includes("tec") ||
    normalized.includes("eng") ||
    normalized.includes("ciber") ||
    normalized.includes("armam") ||
    normalized.includes("belic")
  ) {
    return "tecnologia";
  }

  // 5. Cosmologia: cosmo, astro, universo, entrop (and universal fallback)
  if (
    normalized.includes("cosmo") ||
    normalized.includes("astro") ||
    normalized.includes("universo") ||
    normalized.includes("entrop")
  ) {
    return "cosmologia";
  }

  return "cosmologia";
}

export function parseConceptAttributes(
  attributes: Record<string, unknown>,
): ConceptAttributes {
  const parsed = conceptAttributesSchema.safeParse(attributes);
  if (parsed.success) return parsed.data;

  const rawCat =
    typeof attributes.category === "string" ? attributes.category : "";
  const category = normalizeConceptCategory(rawCat);

  return {
    category,
    rules: Array.isArray(attributes.rules)
      ? attributes.rules.filter(
          (r): r is string => typeof r === "string" && r.trim().length > 0,
        )
      : [],
    scale: (conceptScales.includes(attributes.scale as ConceptScale)
      ? attributes.scale
      : "UNIVERSAL") as ConceptScale,
    visualAssetId:
      typeof attributes.visualAssetId === "string"
        ? attributes.visualAssetId
        : undefined,
    source:
      typeof attributes.source === "string" ? attributes.source : undefined,
    definitionPending:
      typeof attributes.definitionPending === "boolean"
        ? attributes.definitionPending
        : undefined,
    alias: typeof attributes.alias === "string" ? attributes.alias : undefined,
  };
}

export function blankConcept(title = ""): StudioEntity {
  return {
    ...blankEntity("concept"),
    title,
    attributes: {
      category: "cosmologia",
      rules: [],
      scale: "UNIVERSAL",
    },
  };
}
