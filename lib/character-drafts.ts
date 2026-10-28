import { z } from "zod";

const short = z.string().max(160);
export const characterDraftSchema = z
  .object({
    id: z.string().min(1).max(80),
    nome: short,
    equipe: short,
    alinhamento: short,
    escala: z.enum(["", "TERRA", "UNIVERSAL", "UNIVERSAL / TERRA"]),
    desc: z.string().max(5000),
    poderes: z.string().max(5000),
    aparicoes: z.string().max(3000),
    papel: short,
    desejo: z.string().max(3000),
    conflito: z.string().max(3000),
    limites: z.string().max(3000),
    arco: z.string().max(5000),
    notas: z.string().max(10000),
  })
  .strict();
export type CharacterDraft = z.infer<typeof characterDraftSchema>;
export const characterWorkspaceSchema = z
  .object({
    format: z.literal("uvc-character-drafts"),
    version: z.literal(1),
    status: z.literal("RASCUNHO"),
    drafts: z.array(characterDraftSchema).min(1).max(50),
  })
  .strict()
  .refine(
    (value) =>
      new Set(value.drafts.map((draft) => draft.id)).size ===
      value.drafts.length,
    "IDs duplicados",
  );

export function emptyCharacterDraft(id: string): CharacterDraft {
  return {
    id,
    nome: "",
    equipe: "",
    alinhamento: "",
    escala: "",
    desc: "",
    poderes: "",
    aparicoes: "",
    papel: "",
    desejo: "",
    conflito: "",
    limites: "",
    arco: "",
    notas: "",
  };
}
export function hasDraftContent(draft: CharacterDraft) {
  return Object.entries(draft).some(
    ([key, value]) => key !== "id" && value.trim() !== "",
  );
}
export function draftChecklist(draft: CharacterDraft) {
  return [
    {
      label: "Nome e identidade",
      done: Boolean(draft.nome.trim() && draft.escala),
    },
    { label: "Descrição", done: Boolean(draft.desc.trim()) },
    {
      label: "Desejo e conflito",
      done: Boolean(draft.desejo.trim() && draft.conflito.trim()),
    },
    {
      label: "Poderes e limites",
      done: Boolean(draft.poderes.trim() && draft.limites.trim()),
    },
  ];
}
export function serializeCharacterDrafts(drafts: CharacterDraft[]) {
  return JSON.stringify(
    characterWorkspaceSchema.parse({
      format: "uvc-character-drafts",
      version: 1,
      status: "RASCUNHO",
      drafts,
    }),
    null,
    2,
  );
}
