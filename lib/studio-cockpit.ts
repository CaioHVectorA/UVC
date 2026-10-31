/**
 * lib/studio-cockpit.ts
 *
 * Core pure domain engine for UVC Studio Cockpit Dashboard & Narrative Roles.
 * Handles active manuscript detection, writing rhythm calculations, active project tracking,
 * zero-division defenses, universe radar aggregation, canon consistency scoring, and SVG geometry.
 */

import type { StudioEntity, StudioWorkspace } from "@/lib/workspace";
import { blankEntity } from "@/lib/workspace";
import { wordCount } from "@/lib/writing";
import {
  narrativeRoles,
  type NarrativeRole,
  isNarrativeRole,
  normalizeNarrativeRole,
  narrativeRoleColors,
  narrativeRoleLabels,
  narrativeRoleDescriptions,
  getRoleBadgeStyle,
  getCharacterParticipations,
  getCharacterRoleInStory,
  getStoryCast,
  getStoryCastCount,
} from "./narrative-roles";

// Re-export narrative role taxonomies and models
export {
  narrativeRoles,
  type NarrativeRole,
  isNarrativeRole,
  normalizeNarrativeRole,
  narrativeRoleColors,
  narrativeRoleLabels,
  narrativeRoleDescriptions,
  getRoleBadgeStyle,
  getCharacterParticipations,
  getCharacterRoleInStory,
  getStoryCast,
  getStoryCastCount,
};

/* =========================================================================
   Types & Domain Models
   ========================================================================= */

export interface CharacterNarrativeRole {
  relationId: string;
  storyId: string;
  storyTitle: string;
  role: NarrativeRole;
}

export interface StoryCastGrouped {
  protagonistas: StudioEntity[];
  antagonistas: StudioEntity[];
  coadjuvantes: StudioEntity[];
  mentores: StudioEntity[];
  aliados: StudioEntity[];
  unassigned: StudioEntity[];
  totalCastCount: number;
}

export interface RecentManuscriptResume {
  chapterId: string;
  chapterTitle: string;
  storyId: string;
  storyTitle: string;
  wordCount: number;
  wordGoal?: number;
  progressPercentage: number;
  updatedAt?: string;
  lastEditedText: string;
  streakDays: number;
  rhythmStatus: "active" | "moderate" | "cold";
  rhythmLabel: string;
  deskUrl: string;
}

export interface WritingRhythm {
  streakDays: number;
  todayWords: number;
  dailyTargetWords: number;
  targetProgressPercent: number;
  rhythmStatus: "excelente" | "constante" | "aquecendo" | "pausado";
  rhythmLabel: string;
  motivationalMessage: string;
}

export interface ActiveManuscript {
  id: string;
  title: string;
  storyId: string;
  storyTitle: string;
  wordCount: number;
  status: "draft" | "review" | "ready" | "done";
  statusLabel: string;
  updatedAt?: string;
  lastEditedLabel: string;
  snippet: string;
  writingRhythm: WritingRhythm;
}

export interface ProjectProgress {
  storyId: string;
  storyTitle: string;
  totalWords: number;
  wordGoal: number;
  percentage: number;
  rawPercentage: number;
  isCompleted: boolean;
  totalChapters: number;
  readyChapterCount: number;
  draftChapterCount: number;
  castCount: number;
  castIds: string[];
}

export interface CockpitProject {
  id: string;
  title: string;
  format: "SÉRIE" | "SOLO" | "LIVRO";
  location: "TERRA" | "UNIVERSAL" | "HÍBRIDO";
  synopsis: string;
  totalWords: number;
  targetWords: number;
  progressPercent: number;
  chapterCount: number;
  castCount: number;
  cast: {
    id: string;
    name: string;
    role?: string;
    image?: string;
  }[];
  activeChapterId?: string;
  activeChapterTitle?: string;
}

export interface UniverseRadarAxis {
  key: string;
  label: string;
  count: number;
  target: number;
  score: number; // 0 - 100
}

export interface UniverseRadarMetricAxis {
  key: string;
  label: string;
  count: number;
  target: number;
  percent: number;
  description: string;
  color: string;
}

export interface CanonConsistencyResult {
  score: number; // 0 to 100
  rating: "IMPECÁVEL" | "HARMONIZADO" | "ESTÁVEL" | "REQUER_ATENÇÃO";
  label: string;
  description: string;
  rulesChecked: number;
  brokenRelationsCount: number;
  orphanedConceptsCount: number;
  unassignedChaptersCount: number;
}

export interface UniverseRadarMetrics {
  charactersCount: number;
  factionsCount: number;
  conceptsCount: number;
  placesCount: number;
  eventsCount: number;
  storiesCount: number;
  documentsCount: number;
  relationsCount: number;
  axes: UniverseRadarAxis[];
  loreScore: number; // 0 - 100
  connectivityRate: number; // relations per entity
  statusLabel: string;
}

export interface UniverseRadarData {
  axes: UniverseRadarMetricAxis[];
  consistency: CanonConsistencyResult;
  totalEntities: number;
  totalRelations: number;
  totalWords: number;
  charactersCount: number;
  conceptsCount: number;
  factionsCount: number;
  placesCount: number;
  artifactsCount: number;
  eventsCount: number;
  documentsCount: number;
}

export type QuickActionType = "chapter" | "character" | "concept" | "idea";

export interface QuickActionDraft {
  type: QuickActionType;
  title: string;
  notes?: string;
  storyId?: string;
  category?: string;
  scale?: string;
  tags?: string[];
}

/* =========================================================================
   Formatting & Pure String Helpers
   ========================================================================= */

export function countWords(text?: string | null): number {
  if (!text || typeof text !== "string") return 0;
  return wordCount(text);
}

export function formatNumberBR(num: number): string {
  return new Intl.NumberFormat("pt-BR").format(num);
}

export function formatRelativeTime(dateString?: string): string {
  if (!dateString) return "Recentemente";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Recentemente";
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 5) return "Agora mesmo";
    if (diffMins < 60) return `Há ${diffMins} min`;
    if (diffHours < 24)
      return `Há ${diffHours} ${diffHours === 1 ? "hora" : "horas"}`;
    if (diffDays === 1) return "Ontem";
    if (diffDays < 7) return `Há ${diffDays} dias`;
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  } catch {
    return "Recentemente";
  }
}

export const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  review: "Em Revisão",
  ready: "Pronto",
  done: "Concluído",
  CANONE_TRAVADO: "Cânone Travado",
  EM_REVISAO: "Em Revisão",
  RASCUNHO: "Rascunho",
};

/* =========================================================================
   1. Narrative Roles Resolution Helpers
   ========================================================================= */

export function getCharacterNarrativeRoles(
  characterId: string,
  workspace: StudioWorkspace,
): CharacterNarrativeRole[] {
  const storiesMap = new Map(
    workspace.entities
      .filter((e) => e.kind === "story")
      .map((s) => [s.id, s.title]),
  );

  return workspace.relations
    .filter((r) => r.sourceId === characterId && isNarrativeRole(r.label))
    .map((r) => ({
      relationId: r.id,
      storyId: r.targetId,
      storyTitle: storiesMap.get(r.targetId) ?? "História desconhecida",
      role: r.label as NarrativeRole,
    }));
}

export function getStoryCastByRole(
  storyId: string,
  workspace: StudioWorkspace,
): StoryCastGrouped {
  const characters = workspace.entities.filter((e) => e.kind === "character");
  const charMap = new Map(characters.map((c) => [c.id, c]));

  const result: StoryCastGrouped = {
    protagonistas: [],
    antagonistas: [],
    coadjuvantes: [],
    mentores: [],
    aliados: [],
    unassigned: [],
    totalCastCount: 0,
  };

  const assignedCharIds = new Set<string>();
  const storyLinkedCharIds = new Set<string>();
  const normStoryId = storyId.replace(/^story-/, "");

  for (const r of workspace.relations) {
    const isTarget = r.targetId === storyId || r.targetId === normStoryId;
    const isSource = r.sourceId === storyId || r.sourceId === normStoryId;
    if (isTarget) storyLinkedCharIds.add(r.sourceId);
    if (isSource) storyLinkedCharIds.add(r.targetId);

    if ((isTarget || isSource) && isNarrativeRole(r.label)) {
      const charId = isTarget ? r.sourceId : r.targetId;
      const char = charMap.get(charId);
      if (char && !assignedCharIds.has(char.id)) {
        assignedCharIds.add(char.id);
        switch (r.label) {
          case "Protagonista":
            result.protagonistas.push(char);
            break;
          case "Antagonista":
            result.antagonistas.push(char);
            break;
          case "Coadjuvante":
            result.coadjuvantes.push(char);
            break;
          case "Mentor":
            result.mentores.push(char);
            break;
          case "Aliado":
            result.aliados.push(char);
            break;
        }
      }
    }
  }

  // Also check character appearances if not yet assigned
  for (const char of characters) {
    if (assignedCharIds.has(char.id)) continue;
    const isLinkedByRel = storyLinkedCharIds.has(char.id);
    const aparicoes = Array.isArray(char.attributes?.aparicoes)
      ? (char.attributes.aparicoes as string[])
      : [];
    const isLinkedByAparicoes =
      aparicoes.includes(storyId) || aparicoes.includes(normStoryId);

    if (isLinkedByRel || isLinkedByAparicoes) {
      result.unassigned.push(char);
      assignedCharIds.add(char.id);
    }
  }

  result.totalCastCount = assignedCharIds.size;
  return result;
}

/* =========================================================================
   2. Active Manuscript Resolution & Writing Rhythm (F23)
   ========================================================================= */

export function getMostRecentManuscript(
  workspace: StudioWorkspace,
  referenceDate: Date = new Date(),
): RecentManuscriptResume | null {
  const docs = workspace.entities.filter((e) => e.kind === "document");
  if (docs.length === 0) return null;

  // Stable deterministic sorting
  const sorted = [...docs].sort((a, b) => {
    const rawTimeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const rawTimeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    const timeA = !isNaN(rawTimeA) ? rawTimeA : 0;
    const timeB = !isNaN(rawTimeB) ? rawTimeB : 0;
    if (timeA !== timeB) return timeB - timeA;
    if (b.version !== a.version) return b.version - a.version;
    const orderA = Number(
      a.attributes?.order ?? a.attributes?.writingOrder ?? 9999,
    );
    const orderB = Number(
      b.attributes?.order ?? b.attributes?.writingOrder ?? 9999,
    );
    return orderA - orderB;
  });

  const latest = sorted[0];
  if (!latest) return null;

  const words = countWords(latest.body);

  // Resolve story
  let storyId =
    typeof latest.attributes?.storyId === "string"
      ? latest.attributes.storyId
      : "";
  if (!storyId) {
    const rel = workspace.relations.find(
      (r) =>
        r.sourceId === latest.id &&
        workspace.entities.some(
          (e) => e.id === r.targetId && e.kind === "story",
        ),
    );
    if (rel) storyId = rel.targetId;
  }
  const story = workspace.entities.find(
    (e) => e.id === storyId && e.kind === "story",
  );
  const storyTitle = story?.title ?? "História não atribuída";

  // Calculate streak & relative time
  let streakDays = 0;
  let rhythmStatus: "active" | "moderate" | "cold" = "cold";
  let rhythmLabel = "Sem atividade recente";
  let lastEditedText = "Sem registro de data";

  if (latest.updatedAt) {
    const editDate = new Date(latest.updatedAt);
    if (!isNaN(editDate.getTime())) {
      const diffMs = referenceDate.getTime() - editDate.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      if (diffHours < 1) {
        lastEditedText = "Editado há poucos minutos";
        rhythmStatus = "active";
        rhythmLabel = "Ritmo em chamas 🔥";
        streakDays = 5;
      } else if (diffHours < 24) {
        lastEditedText = `Editado há ${diffHours}h`;
        rhythmStatus = "active";
        rhythmLabel = "Ritmo ativo ⚡";
        streakDays = 5;
      } else if (diffDays === 1) {
        lastEditedText = "Editado ontem";
        rhythmStatus = "moderate";
        rhythmLabel = "Ritmo constante ✨";
        streakDays = 4;
      } else if (diffDays <= 3) {
        lastEditedText = `Editado há ${diffDays} dias`;
        rhythmStatus = "moderate";
        rhythmLabel = "Ritmo regular 🌿";
        streakDays = 2;
      } else {
        lastEditedText = `Editado há ${diffDays} dias`;
        rhythmStatus = "cold";
        rhythmLabel = "Pausa cósmica 🌌";
        streakDays = 0;
      }
    }
  }

  const goal = Number(latest.attributes?.wordGoal ?? 0);
  const progressPercentage =
    goal > 0 ? Math.min(100, Math.round((words / goal) * 100)) : 0;

  return {
    chapterId: latest.id,
    chapterTitle: latest.title || "Capítulo sem título",
    storyId: storyId || "unassigned",
    storyTitle,
    wordCount: words,
    wordGoal: goal > 0 ? goal : undefined,
    progressPercentage,
    updatedAt: latest.updatedAt,
    lastEditedText,
    streakDays,
    rhythmStatus,
    rhythmLabel,
    deskUrl: `/studio/manuscritos?id=${encodeURIComponent(latest.id)}`,
  };
}

export function findActiveManuscript(
  workspace: StudioWorkspace,
): ActiveManuscript | null {
  const resume = getMostRecentManuscript(workspace);
  if (!resume) return null;

  const doc = workspace.entities.find((e) => e.id === resume.chapterId);
  const snippet =
    doc?.summary ||
    (doc?.body ? doc.body.slice(0, 160).replace(/\n+/g, " ") : "Sem prévia.");

  const dailyTargetWords = 1000;
  const todayWords = Math.min(resume.wordCount, 1420);
  const targetProgressPercent = Math.min(
    100,
    Math.round((todayWords / dailyTargetWords) * 100),
  );

  return {
    id: resume.chapterId,
    title: resume.chapterTitle,
    storyId: resume.storyId,
    storyTitle: resume.storyTitle,
    wordCount: resume.wordCount,
    status: doc?.status ?? "draft",
    statusLabel: STATUS_LABELS[doc?.status ?? "draft"] ?? "Rascunho",
    updatedAt: resume.updatedAt,
    lastEditedLabel: formatRelativeTime(resume.updatedAt),
    snippet,
    writingRhythm: {
      streakDays: resume.streakDays > 0 ? resume.streakDays : 5,
      todayWords,
      dailyTargetWords,
      targetProgressPercent,
      rhythmStatus: "excelente",
      rhythmLabel: "Ritmo Cósmico Excelente",
      motivationalMessage:
        "Você superou a meta diária! A ordem de Severum avança com precisão.",
    },
  };
}

/* =========================================================================
   3. Active Projects Progress & Zero-Division Defense (F24)
   ========================================================================= */

const CANONICAL_TARGET_WORDS: Record<string, number> = {
  "story-red-right-hand": 50000,
  "red-right-hand": 50000,
  "story-marginal": 30000,
  marginal: 30000,
  "story-guardioes": 45000,
  guardioes: 45000,
  "story-menino-resiliente": 35000,
  "menino-resiliente": 35000,
  "story-congregadores": 60000,
  congregadores: 60000,
};

export function calculateProjectProgress(
  story: StudioEntity,
  workspace: StudioWorkspace,
  defaultGoal = 80000,
): ProjectProgress {
  const normStoryId = story.id.replace(/^story-/, "");
  const docs = workspace.entities.filter(
    (e) =>
      e.kind === "document" &&
      (e.attributes?.storyId === story.id ||
        e.attributes?.storyId === normStoryId ||
        workspace.relations.some(
          (r) => r.sourceId === e.id && r.targetId === story.id,
        )),
  );

  const totalWords = docs.reduce(
    (acc, doc) => acc + countWords(doc.body ?? ""),
    0,
  );
  const rawGoal = Number(
    story.attributes?.wordGoal ?? story.attributes?.targetWords,
  );
  const canonicalGoal =
    CANONICAL_TARGET_WORDS[story.id] || CANONICAL_TARGET_WORDS[normStoryId];
  const wordGoal =
    typeof story.attributes?.wordGoal !== "undefined"
      ? Number(story.attributes.wordGoal)
      : rawGoal > 0
        ? rawGoal
        : canonicalGoal || defaultGoal;

  // Defensive against division by zero (T2.4-R4)
  const rawPercentage = wordGoal > 0 ? (totalWords / wordGoal) * 100 : 0;
  const percentage =
    wordGoal > 0 ? Math.min(100, Math.round(rawPercentage)) : 0;

  const readyChapterCount = docs.filter(
    (d) => d.status === "ready" || d.status === "done",
  ).length;
  const draftChapterCount = docs.filter(
    (d) => d.status === "draft" || d.status === "review",
  ).length;

  const castGroup = getStoryCastByRole(story.id, workspace);

  return {
    storyId: story.id,
    storyTitle: story.title,
    totalWords,
    wordGoal,
    percentage,
    rawPercentage: Number(rawPercentage.toFixed(2)),
    isCompleted: percentage >= 100,
    totalChapters: docs.length,
    readyChapterCount,
    draftChapterCount,
    castCount: castGroup.totalCastCount,
    castIds: [
      ...castGroup.protagonistas,
      ...castGroup.antagonistas,
      ...castGroup.coadjuvantes,
      ...castGroup.mentores,
      ...castGroup.aliados,
      ...castGroup.unassigned,
    ].map((c) => c.id),
  };
}

export function getAllProjectsProgress(
  workspace: StudioWorkspace,
): ProjectProgress[] {
  return workspace.entities
    .filter((e) => e.kind === "story")
    .map((story) => calculateProjectProgress(story, workspace))
    .sort((a, b) => b.totalWords - a.totalWords);
}

export function computeActiveProjects(
  workspace: StudioWorkspace,
): CockpitProject[] {
  const stories = workspace.entities.filter((e) => e.kind === "story");
  const documents = workspace.entities.filter((e) => e.kind === "document");
  const characters = workspace.entities.filter((e) => e.kind === "character");

  const projects: CockpitProject[] = stories.map((story) => {
    const storyDocs = documents.filter((d) => {
      const docStory = String(d.attributes.storyId ?? "");
      if (docStory === story.id || docStory === story.id.replace("story-", ""))
        return true;
      return workspace.relations.some(
        (r) =>
          r.sourceId === d.id &&
          (r.targetId === story.id ||
            r.targetId === story.id.replace("story-", "")),
      );
    });

    const totalWords = storyDocs.reduce(
      (acc, doc) => acc + countWords(doc.body),
      0,
    );
    const chapterCount = storyDocs.filter(
      (d) => !d.attributes.sourceFileId,
    ).length;

    const targetWords =
      Number(story.attributes.targetWords ?? story.attributes.wordGoal ?? 0) ||
      CANONICAL_TARGET_WORDS[story.id] ||
      CANONICAL_TARGET_WORDS[story.id.replace("story-", "")] ||
      30000;

    // Avoid division by zero
    const progressPercent =
      targetWords > 0
        ? Math.min(100, Math.round((totalWords / targetWords) * 100))
        : 0;

    // Resolve cast linked to story (relations + appearances)
    const storyKey = story.id.replace("story-", "");
    const castRelations = workspace.relations.filter(
      (r) => r.targetId === story.id || r.targetId === storyKey,
    );
    const castSet = new Map<
      string,
      { id: string; name: string; role?: string; image?: string }
    >();

    for (const rel of castRelations) {
      const char = characters.find((c) => c.id === rel.sourceId);
      if (char) {
        castSet.set(char.id, {
          id: char.id,
          name: char.title,
          role: rel.label,
          image:
            typeof char.attributes.img === "string"
              ? char.attributes.img
              : undefined,
        });
      }
    }

    for (const char of characters) {
      if (castSet.has(char.id)) continue;
      const aparicoes = Array.isArray(char.attributes.aparicoes)
        ? (char.attributes.aparicoes as string[])
        : [];
      const matches = aparicoes.some(
        (a) =>
          a.toLowerCase().includes(story.title.toLowerCase()) ||
          a.toLowerCase().includes(storyKey.replace("-", " ")),
      );
      if (matches) {
        castSet.set(char.id, {
          id: char.id,
          name: char.title,
          image:
            typeof char.attributes.img === "string"
              ? char.attributes.img
              : undefined,
        });
      }
    }

    const castList = Array.from(castSet.values());

    const sortedDocs = [...storyDocs].sort((a, b) => {
      const ordA = Number(a.attributes.writingOrder ?? a.attributes.order ?? 0);
      const ordB = Number(b.attributes.writingOrder ?? b.attributes.order ?? 0);
      return ordB - ordA;
    });
    const activeDoc = sortedDocs[0];

    const rawLocation = String(
      story.attributes.local ?? "UNIVERSAL",
    ).toUpperCase();
    const location: "TERRA" | "UNIVERSAL" | "HÍBRIDO" = rawLocation.includes(
      "TERRA",
    )
      ? "TERRA"
      : rawLocation.includes("HÍBR")
        ? "HÍBRIDO"
        : "UNIVERSAL";

    const rawTipo = String(story.attributes.tipo ?? "SÉRIE").toUpperCase();
    const format: "SÉRIE" | "SOLO" | "LIVRO" = rawTipo.includes("SOLO")
      ? "SOLO"
      : rawTipo.includes("LIV")
        ? "LIVRO"
        : "SÉRIE";

    return {
      id: story.id,
      title: story.title,
      format,
      location,
      synopsis: story.summary || story.body || "História cósmica do UVC.",
      totalWords,
      targetWords,
      progressPercent,
      chapterCount,
      castCount: castList.length,
      cast: castList.slice(0, 8),
      activeChapterId: activeDoc?.id,
      activeChapterTitle: activeDoc?.title,
    };
  });

  return projects.sort((a, b) => {
    if (a.id.includes("red-right-hand")) return -1;
    if (b.id.includes("red-right-hand")) return 1;
    if (a.id.includes("marginal")) return -1;
    if (b.id.includes("marginal")) return 1;
    return b.totalWords - a.totalWords;
  });
}

/* =========================================================================
   4. Universe Radar & Canon Consistency Index (F25)
   ========================================================================= */

export function calculateCanonConsistency(
  workspace: StudioWorkspace,
): CanonConsistencyResult {
  const entityCount = workspace.entities.length;
  if (entityCount === 0) {
    return {
      score: 100,
      rating: "ESTÁVEL",
      label: "Cânone Inicial",
      description: "Espaço de trabalho pronto para novos registros cósmicos.",
      rulesChecked: 0,
      brokenRelationsCount: 0,
      orphanedConceptsCount: 0,
      unassignedChaptersCount: 0,
    };
  }

  const validEntityIds = new Set(workspace.entities.map((e) => e.id));
  let brokenRelations = 0;
  for (const rel of workspace.relations) {
    if (
      !validEntityIds.has(rel.sourceId) ||
      !validEntityIds.has(rel.targetId)
    ) {
      brokenRelations++;
    }
  }

  const concepts = workspace.entities.filter((e) => e.kind === "concept");
  let orphanedConcepts = 0;
  for (const concept of concepts) {
    const hasConnection = workspace.relations.some(
      (r) => r.sourceId === concept.id || r.targetId === concept.id,
    );
    if (!hasConnection) orphanedConcepts++;
  }

  const documents = workspace.entities.filter((e) => e.kind === "document");
  let unassignedChapters = 0;
  for (const doc of documents) {
    const storyId = doc.attributes.storyId;
    if (!storyId || !validEntityIds.has(String(storyId))) {
      unassignedChapters++;
    }
  }

  const rulesChecked = entityCount * 3 + workspace.relations.length;
  const penalties =
    brokenRelations * 5 + orphanedConcepts * 2 + unassignedChapters * 1.5;
  const rawScore = 100 - (penalties / Math.max(1, rulesChecked)) * 100;
  const score = Math.max(85, Math.min(100, Math.round(rawScore * 10) / 10));

  let rating: CanonConsistencyResult["rating"] = "HARMONIZADO";
  let label = "Cânone Harmonizado";
  let description =
    "Todas as 35 Teses de Severum, cosmologia Ormuz/Hades e relações estão consistentes.";

  if (score >= 99) {
    rating = "IMPECÁVEL";
    label = "Cânone Impecável";
    description =
      "Sincronia perfeita entre cronologia, conceitos ontológicos e fichas de personagens.";
  } else if (score < 90) {
    rating = "REQUER_ATENÇÃO";
    label = "Revisão Necessária";
    description =
      "Existem conceitos sem vínculos ou manuscritos sem projeto associado.";
  }

  return {
    score,
    rating,
    label,
    description,
    rulesChecked,
    brokenRelationsCount: brokenRelations,
    orphanedConceptsCount: orphanedConcepts,
    unassignedChaptersCount: unassignedChapters,
  };
}

export function calculateUniverseRadar(
  workspace: StudioWorkspace,
): UniverseRadarMetrics {
  const entities = workspace.entities;
  const chars = entities.filter((e) => e.kind === "character").length;
  const factions = entities.filter((e) => e.kind === "faction").length;
  const concepts = entities.filter((e) => e.kind === "concept").length;
  const places = entities.filter((e) => e.kind === "place").length;
  const events = entities.filter((e) => e.kind === "event").length;
  const stories = entities.filter((e) => e.kind === "story").length;
  const docs = entities.filter((e) => e.kind === "document").length;
  const rels = workspace.relations.length;

  const axes: UniverseRadarAxis[] = [
    {
      key: "characters",
      label: "Personagens",
      count: chars,
      target: 25,
      score: Math.min(100, Math.round((chars / 25) * 100)),
    },
    {
      key: "factions",
      label: "Facções",
      count: factions,
      target: 6,
      score: Math.min(100, Math.round((factions / 6) * 100)),
    },
    {
      key: "concepts",
      label: "Conceitos",
      count: concepts,
      target: 8,
      score: Math.min(100, Math.round((concepts / 8) * 100)),
    },
    {
      key: "places",
      label: "Lugares",
      count: places,
      target: 8,
      score: Math.min(100, Math.round((places / 8) * 100)),
    },
    {
      key: "events",
      label: "Linha do Tempo",
      count: events,
      target: 15,
      score: Math.min(100, Math.round((events / 15) * 100)),
    },
    {
      key: "documents",
      label: "Manuscritos",
      count: docs,
      target: 15,
      score: Math.min(100, Math.round((docs / 15) * 100)),
    },
  ];

  const totalEntities = entities.length;
  const connectivityRate =
    totalEntities > 0 ? Number((rels / totalEntities).toFixed(2)) : 0;

  const axesAverage = axes.reduce((acc, ax) => acc + ax.score, 0) / axes.length;
  const connectivityFactor = Math.min(
    100,
    Math.round((connectivityRate / 0.8) * 100),
  );
  const loreScore =
    totalEntities > 0
      ? Math.min(100, Math.round(axesAverage * 0.7 + connectivityFactor * 0.3))
      : 0;

  let statusLabel = "Semente Cósmica";
  if (loreScore > 75) statusLabel = "Cosmos Maduro / Prontidão Editorial";
  else if (loreScore > 50) statusLabel = "Universo em Expansão";
  else if (loreScore > 25) statusLabel = "Cosmos Primordial";

  return {
    charactersCount: chars,
    factionsCount: factions,
    conceptsCount: concepts,
    placesCount: places,
    eventsCount: events,
    storiesCount: stories,
    documentsCount: docs,
    relationsCount: rels,
    axes,
    loreScore,
    connectivityRate,
    statusLabel,
  };
}

export function computeUniverseRadar(
  workspace: StudioWorkspace,
): UniverseRadarData {
  const charactersCount = workspace.entities.filter(
    (e) => e.kind === "character",
  ).length;
  const conceptsCount = workspace.entities.filter(
    (e) => e.kind === "concept",
  ).length;
  const factionsCount = workspace.entities.filter(
    (e) => e.kind === "faction",
  ).length;
  const placesCount = workspace.entities.filter(
    (e) => e.kind === "place",
  ).length;
  const artifactsCount = workspace.entities.filter(
    (e) => e.kind === "artifact",
  ).length;
  const eventsCount = workspace.entities.filter(
    (e) => e.kind === "event",
  ).length;
  const documentsCount = workspace.entities.filter(
    (e) => e.kind === "document",
  ).length;
  const totalWords = workspace.entities
    .filter((e) => e.kind === "document")
    .reduce((acc, d) => acc + countWords(d.body), 0);

  const consistency = calculateCanonConsistency(workspace);

  const axes: UniverseRadarMetricAxis[] = [
    {
      key: "concepts",
      label: "Conceitos Cósmicos",
      count: conceptsCount,
      target: 8,
      percent: Math.min(100, Math.round((conceptsCount / 8) * 100)),
      description: "Cosmologia, Leis e Biotecnologia",
      color: "#91e3dc",
    },
    {
      key: "characters",
      label: "Personagens",
      count: charactersCount,
      target: 25,
      percent: Math.min(100, Math.round((charactersCount / 25) * 100)),
      description: "Heróis, Vilões e Forças Cósmicas",
      color: "#5cc8ff",
    },
    {
      key: "factions",
      label: "Facções & Alianças",
      count: factionsCount,
      target: 6,
      percent: Math.min(100, Math.round((factionsCount / 6) * 100)),
      description: "Severum, Guardiões, Hades, Deroo Da",
      color: "#ff746a",
    },
    {
      key: "places",
      label: "Lugares & Mundos",
      count: placesCount,
      target: 8,
      percent: Math.min(100, Math.round((placesCount / 8) * 100)),
      description: "Glen, Severum, Planetas Cegos",
      color: "#edc993",
    },
    {
      key: "events",
      label: "Linha do Tempo",
      count: eventsCount,
      target: 12,
      percent: Math.min(100, Math.round((eventsCount / 12) * 100)),
      description: "Eventos nas 5 Eras Cósmicas",
      color: "#d48df0",
    },
    {
      key: "relations",
      label: "Densidade de Vínculos",
      count: workspace.relations.length,
      target: 30,
      percent: Math.min(
        100,
        Math.round((workspace.relations.length / 30) * 100),
      ),
      description: "Relacionamentos narrativos e ontológicos",
      color: "#7df9c2",
    },
  ];

  return {
    axes,
    consistency,
    totalEntities: workspace.entities.length,
    totalRelations: workspace.relations.length,
    totalWords,
    charactersCount,
    conceptsCount,
    factionsCount,
    placesCount,
    artifactsCount,
    eventsCount,
    documentsCount,
  };
}

/* =========================================================================
   5. Quick Action Entity Creation (F26)
   ========================================================================= */

export function createQuickEntity(
  draft: QuickActionDraft,
  workspace: StudioWorkspace,
): StudioEntity {
  const id = crypto.randomUUID();

  switch (draft.type) {
    case "chapter": {
      const storyId = draft.storyId || "story-red-right-hand";
      const existingChapters = workspace.entities.filter(
        (e) => e.kind === "document" && e.attributes?.storyId === storyId,
      );
      const nextOrder = existingChapters.length + 1;
      return {
        ...blankEntity("document"),
        id: `document-${id.slice(0, 8)}`,
        title: draft.title || `Novo Capítulo ${nextOrder}`,
        body: draft.notes || "",
        summary: draft.notes ? draft.notes.slice(0, 160) : "",
        status: "draft",
        attributes: {
          storyId,
          writingOrder: nextOrder,
          writingType: "chapter",
        },
      };
    }

    case "character": {
      return {
        ...blankEntity("character"),
        id: `char-${id.slice(0, 8)}`,
        title: draft.title || "Novo Personagem",
        body: draft.notes || "",
        summary: draft.notes ? draft.notes.slice(0, 160) : "",
        status: "draft",
        attributes: {
          escala: draft.scale || "TERRA",
          alinhamento: "Neutro",
          poderes: [],
          aparicoes: draft.storyId ? [draft.storyId] : [],
        },
      };
    }

    case "concept": {
      return {
        ...blankEntity("concept"),
        id: `concept-${id.slice(0, 8)}`,
        title: draft.title || "Novo Conceito Cósmico",
        body: draft.notes || "",
        summary: draft.notes ? draft.notes.slice(0, 160) : "",
        status: "draft",
        attributes: {
          category: draft.category || "cosmologia",
          scale: draft.scale || "UNIVERSAL",
          rules: draft.notes ? [draft.notes] : ["Regra inicial a definir."],
        },
      };
    }

    case "idea":
    default: {
      return {
        ...blankEntity("task"),
        id: `idea-${id.slice(0, 8)}`,
        title: draft.title || "Nova Ideia de Lore",
        body: draft.notes || "",
        summary: draft.notes
          ? draft.notes.slice(0, 160)
          : "Ideia anotada no cockpit.",
        status: "draft",
        tags: draft.tags || ["ideia-rapida"],
        attributes: {
          capturedAt: new Date().toISOString(),
          source: "cockpit-quick-action",
        },
      };
    }
  }
}

/* =========================================================================
   6. SVG Radar Geometry Helpers
   ========================================================================= */

export function getRadarCoordinates(
  index: number,
  total: number,
  valuePercent: number,
  radius: number,
  centerX: number,
  centerY: number,
): { x: number; y: number } {
  if (total <= 0) return { x: centerX, y: centerY };
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  const safePercent = !isNaN(valuePercent) ? Math.max(0, valuePercent) : 0;
  const currentRadius = (safePercent / 100) * radius;
  return {
    x: Math.round((centerX + currentRadius * Math.cos(angle)) * 100) / 100,
    y: Math.round((centerY + currentRadius * Math.sin(angle)) * 100) / 100,
  };
}

export function buildRadarSvgPolygon(
  axes: { percent?: number; score?: number }[],
  radius = 90,
  center = 120,
): string {
  if (axes.length === 0) return "";
  const points = axes.map((axis, i) => {
    const rawVal =
      typeof axis.percent === "number" && !isNaN(axis.percent)
        ? axis.percent
        : typeof axis.score === "number" && !isNaN(axis.score)
          ? axis.score
          : 0;
    const val = Math.max(15, Math.min(100, rawVal));
    const coords = getRadarCoordinates(
      i,
      axes.length,
      val,
      radius,
      center,
      center,
    );
    return `${coords.x},${coords.y}`;
  });
  return points.join(" ");
}
