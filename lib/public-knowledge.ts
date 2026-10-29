import "server-only";
import { databaseConfigured, loadPublicEntities } from "./database";
import { seedEntities } from "./workspace-seed";
import type { EntityKind } from "./workspace";
export async function getPublicKnowledge(kind?: EntityKind) {
  const entities = databaseConfigured()
    ? await loadPublicEntities(kind)
    : seedEntities.filter((e) => e.published);
  return entities
    .filter(
      (e) =>
        (!kind || e.kind === kind) &&
        ["character", "concept", "place", "artifact", "visual"].includes(
          e.kind,
        ),
    )
    .map((e) => ({
      ...e,
      attributes: Object.fromEntries(
        Object.entries(e.attributes).filter(([key]) =>
          [
            "equipe",
            "alinhamento",
            "escala",
            "poderes",
            "aparicoes",
            "assetId",
            "category",
          ].includes(key),
        ),
      ),
    }));
}
export async function getPublicCharacters() {
  return (await getPublicKnowledge("character")).map((e) => ({
    id: e.id,
    nome: e.title,
    desc: e.body,
    equipe: String(e.attributes.equipe ?? ""),
    alinhamento: String(e.attributes.alinhamento ?? ""),
    escala: String(e.attributes.escala ?? ""),
    poderes: Array.isArray(e.attributes.poderes)
      ? (e.attributes.poderes as string[])
      : [],
    aparicoes: Array.isArray(e.attributes.aparicoes)
      ? (e.attributes.aparicoes as string[])
      : [],
  }));
}
