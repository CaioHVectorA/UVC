/**
 * lib/narrative-roles.ts
 *
 * Pure domain module for UVC Studio Narrative Roles.
 * Models character-story relationships: Protagonista, Antagonista, Coadjuvante, Mentor, Aliado.
 */

import type { StudioEntity, StudioRelation } from "./workspace";

export const narrativeRoles = [
  "Protagonista",
  "Antagonista",
  "Coadjuvante",
  "Mentor",
  "Aliado",
] as const;

export type NarrativeRole = (typeof narrativeRoles)[number];

export const narrativeRoleLabels: Record<NarrativeRole, string> = {
  Protagonista: "Protagonista",
  Antagonista: "Antagonista",
  Coadjuvante: "Coadjuvante",
  Mentor: "Mentor",
  Aliado: "Aliado",
};

export const narrativeRoleDescriptions: Record<NarrativeRole, string> = {
  Protagonista:
    "Herói principal, motor da ação ou protagonista central da trama.",
  Antagonista:
    "Força opositora primordial, arqui-inimigo ou antagonista principal.",
  Coadjuvante:
    "Personagem de suporte que enriquece a jornada e o contexto narrativo.",
  Mentor: "Guia cósmico, mestre, sábio ou fonte de discernimento e orientação.",
  Aliado: "Companheiro de combate, aliado tático ou força de apoio direto.",
};

export const narrativeRoleColors: Record<
  NarrativeRole,
  { bg: string; text: string; border: string; glow: string }
> = {
  Protagonista: {
    bg: "rgba(145, 227, 220, 0.12)",
    text: "#91e3dc",
    border: "#91e3dc",
    glow: "rgba(145, 227, 220, 0.3)",
  },
  Antagonista: {
    bg: "rgba(255, 116, 106, 0.12)",
    text: "#ff746a",
    border: "#ff746a",
    glow: "rgba(255, 116, 106, 0.3)",
  },
  Coadjuvante: {
    bg: "rgba(237, 201, 147, 0.12)",
    text: "#edc993",
    border: "#edc993",
    glow: "rgba(237, 201, 147, 0.3)",
  },
  Mentor: {
    bg: "rgba(183, 148, 244, 0.12)",
    text: "#b794f4",
    border: "#b794f4",
    glow: "rgba(183, 148, 244, 0.3)",
  },
  Aliado: {
    bg: "rgba(104, 211, 145, 0.12)",
    text: "#68d391",
    border: "#68d391",
    glow: "rgba(104, 211, 145, 0.3)",
  },
};

export interface CharacterParticipation {
  relationId: string;
  characterId: string;
  storyId: string;
  storyTitle: string;
  role: NarrativeRole;
}

export interface StoryCastMember {
  relationId: string;
  character: StudioEntity;
  role: NarrativeRole;
}

export type StoryCastByRole = Record<NarrativeRole, StoryCastMember[]>;

/**
 * Validates whether a given string is a canonical NarrativeRole.
 */
export function isNarrativeRole(value: unknown): value is NarrativeRole {
  if (typeof value !== "string") return false;
  return (narrativeRoles as readonly string[]).includes(value);
}

/**
 * Normalizes a string input into a canonical NarrativeRole, or null if invalid.
 */
export function normalizeNarrativeRole(
  role?: string | null,
): NarrativeRole | null {
  if (!role || typeof role !== "string") return null;
  const cleaned = role.trim().toLowerCase();
  for (const nr of narrativeRoles) {
    if (nr.toLowerCase() === cleaned) return nr;
  }
  return null;
}

/**
 * Returns CSS color classes and hex tokens for role badges in dark cosmic theme.
 */
export function getRoleBadgeStyle(role: NarrativeRole): {
  badgeClass: string;
  borderHex: string;
  textHex: string;
} {
  switch (role) {
    case "Protagonista":
      return {
        badgeClass: "bg-[#91e3dc]/15 text-[#91e3dc] border-[#91e3dc]/40",
        borderHex: "#91e3dc",
        textHex: "#91e3dc",
      };
    case "Antagonista":
      return {
        badgeClass: "bg-[#ff746a]/15 text-[#ff746a] border-[#ff746a]/40",
        borderHex: "#ff746a",
        textHex: "#ff746a",
      };
    case "Coadjuvante":
      return {
        badgeClass: "bg-[#edc993]/15 text-[#edc993] border-[#edc993]/40",
        borderHex: "#edc993",
        textHex: "#edc993",
      };
    case "Mentor":
      return {
        badgeClass: "bg-[#c084fc]/15 text-[#c084fc] border-[#c084fc]/40",
        borderHex: "#c084fc",
        textHex: "#c084fc",
      };
    case "Aliado":
      return {
        badgeClass: "bg-[#4ade80]/15 text-[#4ade80] border-[#4ade80]/40",
        borderHex: "#4ade80",
        textHex: "#4ade80",
      };
  }
}

/**
 * Extracts all participations for a given character across stories.
 */
export function getCharacterParticipations(
  characterId: string,
  relations: StudioRelation[],
  entities: StudioEntity[],
): CharacterParticipation[] {
  if (!characterId) return [];
  const storiesMap = new Map(
    entities.filter((e) => e.kind === "story").map((s) => [s.id, s.title]),
  );

  const participations: CharacterParticipation[] = [];

  for (const rel of relations) {
    if (!isNarrativeRole(rel.label)) continue;

    let targetStoryId: string | null = null;
    if (rel.sourceId === characterId && storiesMap.has(rel.targetId)) {
      targetStoryId = rel.targetId;
    } else if (rel.targetId === characterId && storiesMap.has(rel.sourceId)) {
      targetStoryId = rel.sourceId;
    }

    if (targetStoryId) {
      participations.push({
        relationId: rel.id,
        characterId,
        storyId: targetStoryId,
        storyTitle: storiesMap.get(targetStoryId) ?? "História",
        role: rel.label as NarrativeRole,
      });
    }
  }

  return participations.sort((a, b) =>
    a.storyTitle.localeCompare(b.storyTitle, "pt-BR"),
  );
}

/**
 * Resolves the narrative role of a character in a specific story, if any.
 */
export function getCharacterRoleInStory(
  characterId: string,
  storyId: string,
  relations: StudioRelation[],
): NarrativeRole | null {
  if (!characterId || !storyId) return null;
  const rel = relations.find(
    (r) =>
      ((r.sourceId === characterId && r.targetId === storyId) ||
        (r.targetId === characterId && r.sourceId === storyId)) &&
      isNarrativeRole(r.label),
  );
  return rel ? (rel.label as NarrativeRole) : null;
}

/**
 * Groups all characters assigned to a story by their narrative roles.
 */
export function getStoryCast(
  storyId: string,
  relations: StudioRelation[],
  entities: StudioEntity[],
): StoryCastByRole {
  const charactersMap = new Map(
    entities.filter((e) => e.kind === "character").map((c) => [c.id, c]),
  );

  const cast: StoryCastByRole = {
    Protagonista: [],
    Antagonista: [],
    Coadjuvante: [],
    Mentor: [],
    Aliado: [],
  };

  for (const rel of relations) {
    if (!isNarrativeRole(rel.label)) continue;

    let charId: string | null = null;
    if (rel.targetId === storyId && charactersMap.has(rel.sourceId)) {
      charId = rel.sourceId;
    } else if (rel.sourceId === storyId && charactersMap.has(rel.targetId)) {
      charId = rel.targetId;
    }

    if (charId) {
      const character = charactersMap.get(charId);
      if (character) {
        cast[rel.label as NarrativeRole].push({
          relationId: rel.id,
          character,
          role: rel.label as NarrativeRole,
        });
      }
    }
  }

  // Sort each group alphabetically by character title
  for (const role of narrativeRoles) {
    cast[role].sort((a, b) =>
      a.character.title.localeCompare(b.character.title, "pt-BR"),
    );
  }

  return cast;
}

/**
 * Returns total count of cast members for a story.
 */
export function getStoryCastCount(
  storyId: string,
  relations: StudioRelation[],
  entities: StudioEntity[],
): number {
  const cast = getStoryCast(storyId, relations, entities);
  return (
    cast.Protagonista.length +
    cast.Antagonista.length +
    cast.Coadjuvante.length +
    cast.Mentor.length +
    cast.Aliado.length
  );
}
