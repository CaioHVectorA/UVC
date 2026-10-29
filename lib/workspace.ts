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
