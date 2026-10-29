import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import book from "@/books/red-right-hand/book.json";
import characters from "@/data/characters.json";
import factions from "@/data/factions.json";
import series from "@/data/series_and_solos.json";
import timeline from "@/data/timeline.json";
import media from "@/data/media.json";
import assets from "@/data/studio-assets.json";
import type { StudioEntity, StudioRelation } from "./workspace";
function entity(
  id: string,
  kind: StudioEntity["kind"],
  title: string,
  body: string,
  attributes: Record<string, unknown> = {},
  published = false,
): StudioEntity {
  return {
    id,
    kind,
    title,
    body,
    summary: body.slice(0, 1000),
    status: "review",
    published,
    tags: [],
    attributes,
    version: 0,
  };
}
export const seedEntities: StudioEntity[] = [
  ...book.capitulos.map((chapter) =>
    entity(
      `document-rrh-${chapter.numero}`,
      "document",
      `RRH · ${String(chapter.numero).padStart(2, "0")} · ${chapter.titulo}`,
      readFileSync(`books/red-right-hand/${chapter.arquivo}`, "utf8"),
      {
        source: `books/red-right-hand/${chapter.arquivo}`,
        order: chapter.numero,
        storyId: "story-red-right-hand",
      },
    ),
  ),
  ...characters.map((c) =>
    entity(
      c.id,
      "character",
      c.nome,
      c.desc,
      {
        equipe: c.equipe,
        alinhamento: c.alinhamento,
        escala: c.escala,
        poderes: c.poderes,
        aparicoes: c.aparicoes,
        source: "data/characters.json",
      },
      true,
    ),
  ),
  ...factions.map((f) =>
    entity(`faction-${f.id}`, "faction", f.nome, f.desc, {
      base: f.base,
      lider: f.lider,
      membros: f.membros,
      source: "data/factions.json",
    }),
  ),
  ...series.map((s) =>
    entity(`story-${s.id}`, "story", s.titulo, s.sinopse, {
      ...s,
      source: "data/series_and_solos.json",
    }),
  ),
  entity(
    "concept-planetas-cegos",
    "concept",
    "Planetas cegos",
    "Conceito indicado pelo autor. Definição, regras e exemplos a preencher.",
    { source: "Indicação do autor", definitionPending: true },
  ),
  entity(
    "place-glen",
    "place",
    "Glen",
    "Metrópole central das histórias na Terra.",
    { source: "docs/lore/world-building.md" },
    true,
  ),
  entity(
    "place-severum",
    "place",
    "Severum",
    "Cidade-estado espacial governada por Arner. Sede dos laboratórios de Deroo Da e da Red Right Hand.",
    { source: "docs/lore/world-building.md" },
    true,
  ),
  entity(
    "artifact-bracelete",
    "artifact",
    "Bracelete Divino",
    "Artefato ligado a Ormuz e usado por Ciecon.",
    { source: "docs/lore/cosmology.md" },
    true,
  ),
  entity(
    "artifact-lampiao",
    "artifact",
    "O Lampião",
    "Artefato de Hades para extrair energia dos astros.",
    { source: "docs/lore/cosmology.md" },
    true,
  ),
  entity(
    "concept-enokiti",
    "concept",
    "Maldição Enokití",
    "Maldição dos Irmãos Yaa que permite conjurar lâminas de energia.",
    { source: "docs/characters/irmaos-yaa.md" },
    true,
  ),
  entity(
    "place-antartida",
    "place",
    "Antártida",
    "Continente terrestre onde se passam os acontecimentos de Cole Froz e Yeti no relato legado.",
    { source: "legacy/uvc-1.0/txt/S_GLAC.txt" },
    true,
  ),
  entity(
    "place-lamprois",
    "place",
    "Planeta dos Lamprois",
    "Local das missões de Masin e Tsuuya no relato legado de Red Right Hand.",
    { source: "legacy/uvc-1.0/txt/SE_RRH/3.txt" },
    true,
  ),
  ...timeline.erasCosmicas.map((e) =>
    entity(`era-${e.id}`, "event", e.nome, e.descricao, {
      order: e.ordem,
      era: true,
      source: "data/timeline.json",
    }),
  ),
  ...timeline.livros.flatMap((b) =>
    b.beats.map((beat, index) =>
      entity(`event-${beat.id}`, "event", beat.titulo, beat.resumo, {
        ...beat,
        order: 100 + index,
        source: "data/timeline.json",
      }),
    ),
  ),
  ...assets.map((a) => {
    const original = media.find((item) => item.source === a.source);
    const selected = [
      "rrh-art",
      "guardioes",
      "congregadores",
      "mr",
      "ciecon",
      "deroo-art",
      "tarlin",
      "delimitador",
      "city",
      "space",
      "congregadores-logo",
      "uvc",
    ];
    const category =
      original?.kind === "scenery"
        ? "Cenários"
        : original?.kind === "symbol"
          ? "Símbolos"
          : original?.kind === "cover"
            ? "Estudos"
            : "Artes";
    return entity(
      `visual-${a.id}`,
      "visual",
      a.name,
      "",
      { assetId: a.id, source: a.source, category },
      Boolean(original && selected.includes(original.id)),
    );
  }),
  entity(
    "task-revisar-marginal",
    "task",
    "Revisar Marginal",
    "Organizar o manuscrito, as fichas e as cenas antes da próxima revisão.",
    { priority: "normal" },
  ),
];
const pairs: [string, string, string][] = book.capitulos.map((chapter) => [
  `document-rrh-${chapter.numero}`,
  "story-red-right-hand",
  "capítulo de",
]);
pairs.push(
  ["arner", "place-severum", "governa"],
  ["deroo-da", "place-severum", "trabalha em"],
  ["ciecon", "artifact-bracelete", "usa"],
  ["hades", "artifact-lampiao", "usa"],
  ["ormuz", "artifact-bracelete", "ligado a"],
  ["kin", "kerry", "pai de"],
  ["clara", "kerry", "mãe de"],
  ["dizz", "ciecon", "orienta"],
  ["cole-froz", "yeti", "encontra"],
  ["story-marginal", "place-glen", "ambientado em"],
  ["task-revisar-marginal", "story-marginal", "trabalha em"],
);
pairs.push(
  ["general-dawmnes", "cole-froz", "enfrenta"],
  ["tay", "delimitador", "enfrenta"],
  ["masin", "irmaos-yaa", "integra"],
  ["tsuuya", "irmaos-yaa", "integra"],
  ["masin", "concept-enokiti", "porta"],
  ["tsuuya", "concept-enokiti", "porta"],
  ["cole-froz", "place-antartida", "atua em"],
  ["yeti", "place-antartida", "habita"],
  ["masin", "place-lamprois", "atua em"],
  ["tsuuya", "place-lamprois", "atua em"],
);
for (const c of characters)
  for (const s of series)
    if (c.aparicoes.some((a) => a.includes(s.titulo) || s.titulo.includes(a)))
      pairs.push([c.id, `story-${s.id}`, "aparece em"]);
export const seedRelations: StudioRelation[] = pairs.map(
  ([sourceId, targetId, label]) => ({
    id: `seed-${createHash("sha256").update(`${sourceId}:${targetId}:${label}`).digest("hex").slice(0, 24)}`,
    sourceId,
    targetId,
    label,
  }),
);
