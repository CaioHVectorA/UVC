import test from "node:test";
import assert from "node:assert/strict";
import {
  narrativeRoles,
  narrativeRoleColors,
  isNarrativeRole,
  normalizeNarrativeRole,
  getCharacterNarrativeRoles,
  getStoryCastByRole,
  getMostRecentManuscript,
  calculateProjectProgress,
  getAllProjectsProgress,
  calculateUniverseRadar,
  getRadarCoordinates,
  buildRadarSvgPolygon,
} from "../../lib/studio-cockpit";
import {
  blankEntity,
  type StudioEntity,
  type StudioWorkspace,
} from "../../lib/workspace";
import { seedEntities, seedRelations } from "../../lib/workspace-seed";

test("Cockpit 1: Taxonomia canônica dos 5 Papéis Narrativos e Metadados Visuais", () => {
  // 1. Exact 5 canonical roles
  assert.equal(narrativeRoles.length, 5);
  assert.deepEqual(
    [...narrativeRoles],
    ["Protagonista", "Antagonista", "Coadjuvante", "Mentor", "Aliado"],
  );

  // 2. isNarrativeRole type guard
  for (const role of narrativeRoles) {
    assert.equal(isNarrativeRole(role), true, `Deveria aceitar ${role}`);
  }
  assert.equal(isNarrativeRole("Vilão"), false);
  assert.equal(isNarrativeRole("membro"), false);
  assert.equal(isNarrativeRole("fundamenta"), false);
  assert.equal(isNarrativeRole(null), false);
  assert.equal(isNarrativeRole(undefined), false);
  assert.equal(isNarrativeRole(123), false);

  // 3. Normalization (case-insensitive & whitespace trimmed)
  assert.equal(normalizeNarrativeRole("protagonista"), "Protagonista");
  assert.equal(normalizeNarrativeRole("  ANTAGONISTA  "), "Antagonista");
  assert.equal(normalizeNarrativeRole("Coadjuvante"), "Coadjuvante");
  assert.equal(normalizeNarrativeRole("mentor"), "Mentor");
  assert.equal(normalizeNarrativeRole("ALIADO"), "Aliado");
  assert.equal(normalizeNarrativeRole("inexistente"), null);
  assert.equal(normalizeNarrativeRole(""), null);

  // 4. Color metadata tokens defined for all 5 roles
  for (const role of narrativeRoles) {
    const color = narrativeRoleColors[role];
    assert.ok(color.bg.startsWith("rgba"));
    assert.ok(color.text.startsWith("#"));
    assert.ok(color.border.startsWith("#"));
  }
});

test("Cockpit 2: Resolução de papéis narrativos por personagem (getCharacterNarrativeRoles)", () => {
  const ws: StudioWorkspace = {
    entities: [
      { ...blankEntity("character"), id: "char-beenie", title: "Beenie" },
      { ...blankEntity("story"), id: "story-guardioes", title: "Guardiões" },
      { ...blankEntity("story"), id: "story-rrh", title: "Red Right Hand" },
    ],
    relations: [
      {
        id: "rel-1",
        sourceId: "char-beenie",
        targetId: "story-guardioes",
        label: "Protagonista",
      },
      {
        id: "rel-2",
        sourceId: "char-beenie",
        targetId: "story-rrh",
        label: "Aliado",
      },
      {
        id: "rel-3",
        sourceId: "char-beenie",
        targetId: "story-guardioes",
        label: "membro de",
      }, // Non-role relation
    ],
  };

  const roles = getCharacterNarrativeRoles("char-beenie", ws);
  assert.equal(roles.length, 2);
  assert.equal(roles[0].storyId, "story-guardioes");
  assert.equal(roles[0].storyTitle, "Guardiões");
  assert.equal(roles[0].role, "Protagonista");

  assert.equal(roles[1].storyId, "story-rrh");
  assert.equal(roles[1].storyTitle, "Red Right Hand");
  assert.equal(roles[1].role, "Aliado");

  // Character with no roles
  assert.deepEqual(getCharacterNarrativeRoles("char-inexistente", ws), []);
});

test("Cockpit 3: Agrupamento de elenco da história por papel (getStoryCastByRole)", () => {
  const ws: StudioWorkspace = {
    entities: [
      { ...blankEntity("character"), id: "kerry", title: "Kerry" },
      { ...blankEntity("character"), id: "arner", title: "Arner" },
      { ...blankEntity("character"), id: "larry", title: "Larry" },
      { ...blankEntity("character"), id: "ciecon", title: "Ciecon" },
      {
        ...blankEntity("character"),
        id: "cole",
        title: "Cole Froz",
        attributes: { aparicoes: ["story-test"] },
      },
      { ...blankEntity("story"), id: "story-test", title: "História de Teste" },
    ],
    relations: [
      {
        id: "r1",
        sourceId: "kerry",
        targetId: "story-test",
        label: "Protagonista",
      },
      {
        id: "r2",
        sourceId: "arner",
        targetId: "story-test",
        label: "Antagonista",
      },
      {
        id: "r3",
        sourceId: "larry",
        targetId: "story-test",
        label: "Coadjuvante",
      },
      {
        id: "r4",
        sourceId: "ciecon",
        targetId: "story-test",
        label: "Mentor",
      },
    ],
  };

  const cast = getStoryCastByRole("story-test", ws);
  assert.equal(cast.totalCastCount, 5);
  assert.equal(cast.protagonistas.length, 1);
  assert.equal(cast.protagonistas[0].id, "kerry");
  assert.equal(cast.antagonistas.length, 1);
  assert.equal(cast.antagonistas[0].id, "arner");
  assert.equal(cast.coadjuvantes.length, 1);
  assert.equal(cast.coadjuvantes[0].id, "larry");
  assert.equal(cast.mentores.length, 1);
  assert.equal(cast.mentores[0].id, "ciecon");
  assert.equal(cast.unassigned.length, 1);
  assert.equal(cast.unassigned[0].id, "cole");

  // Empty story cast
  const emptyCast = getStoryCastByRole("story-vazia", ws);
  assert.equal(emptyCast.totalCastCount, 0);
  assert.equal(emptyCast.protagonistas.length, 0);
});

test("Cockpit 4: Card de Retomada e seleção do manuscrito mais recente (getMostRecentManuscript)", () => {
  const refDate = new Date("2026-10-31T12:00:00Z");
  const ws: StudioWorkspace = {
    entities: [
      { ...blankEntity("story"), id: "story-rrh", title: "Red Right Hand" },
      {
        ...blankEntity("document"),
        id: "doc-1",
        title: "Capítulo 1",
        body: "Texto do capítulo 1 com dez palavras exatamente contadas aqui.",
        updatedAt: "2026-10-30T10:00:00Z",
        attributes: { storyId: "story-rrh", wordGoal: 1000 },
      },
      {
        ...blankEntity("document"),
        id: "doc-2",
        title: "Capítulo 2",
        body: "Texto mais recente escrito hoje.",
        updatedAt: "2026-10-31T11:30:00Z",
        attributes: { storyId: "story-rrh", wordGoal: 500 },
      },
    ],
    relations: [],
  };

  const resume = getMostRecentManuscript(ws, refDate);
  assert.ok(resume !== null);
  assert.equal(resume.chapterId, "doc-2");
  assert.equal(resume.chapterTitle, "Capítulo 2");
  assert.equal(resume.storyTitle, "Red Right Hand");
  assert.equal(resume.wordCount, 5);
  assert.equal(resume.wordGoal, 500);
  assert.equal(resume.rhythmStatus, "active");
  assert.equal(resume.deskUrl, "/studio/manuscritos?id=doc-2");

  // Corner Case: Workspace without documents
  const emptyWs: StudioWorkspace = { entities: [], relations: [] };
  assert.equal(getMostRecentManuscript(emptyWs), null);
});

test("Cockpit 5: Fallback determinístico de manuscrito recente sem updatedAt", () => {
  const ws: StudioWorkspace = {
    entities: [
      {
        ...blankEntity("document"),
        id: "doc-low",
        title: "Capítulo A",
        body: "Um dois três",
        version: 1,
        attributes: { order: 2 },
      },
      {
        ...blankEntity("document"),
        id: "doc-high",
        title: "Capítulo B",
        body: "Quatro cinco seis",
        version: 3,
        attributes: { order: 1 },
      },
    ],
    relations: [],
  };

  const resume = getMostRecentManuscript(ws);
  assert.ok(resume !== null);
  assert.equal(resume.chapterId, "doc-high");
});

test("Cockpit 6: Cálculo de progresso de projeto e metas de palavras (calculateProjectProgress)", () => {
  const story: StudioEntity = {
    ...blankEntity("story"),
    id: "story-marginal",
    title: "Marginal",
    attributes: { wordGoal: 60000 },
  };

  const ws: StudioWorkspace = {
    entities: [
      story,
      {
        ...blankEntity("document"),
        id: "doc-m1",
        title: "Cap 1",
        body: "Palavra ".repeat(30000).trim(),
        status: "ready",
        attributes: { storyId: "story-marginal" },
      },
      {
        ...blankEntity("document"),
        id: "doc-m2",
        title: "Cap 2",
        body: "Palavra ".repeat(15000).trim(),
        status: "draft",
        attributes: { storyId: "story-marginal" },
      },
      { ...blankEntity("character"), id: "char-1", title: "Cole" },
    ],
    relations: [
      {
        id: "r-c1",
        sourceId: "char-1",
        targetId: "story-marginal",
        label: "Protagonista",
      },
    ],
  };

  const progress = calculateProjectProgress(story, ws);
  assert.equal(progress.storyId, "story-marginal");
  assert.equal(progress.totalWords, 45000);
  assert.equal(progress.wordGoal, 60000);
  assert.equal(progress.percentage, 75);
  assert.equal(progress.isCompleted, false);
  assert.equal(progress.totalChapters, 2);
  assert.equal(progress.readyChapterCount, 1);
  assert.equal(progress.draftChapterCount, 1);
  assert.equal(progress.castCount, 1);
  assert.deepEqual(progress.castIds, ["char-1"]);
});

test("Cockpit 7: Divisão por zero defensiva em projetos vazios ou metas nulas", () => {
  const storyZeroGoal: StudioEntity = {
    ...blankEntity("story"),
    id: "story-zero",
    title: "Meta Zero",
    attributes: { wordGoal: 0 },
  };
  const wsEmpty: StudioWorkspace = { entities: [storyZeroGoal], relations: [] };

  const res = calculateProjectProgress(storyZeroGoal, wsEmpty);
  assert.equal(res.totalWords, 0);
  assert.equal(res.percentage, 0);
  assert.equal(isNaN(res.percentage), false);
  assert.equal(isFinite(res.percentage), true);
});

test("Cockpit 8: Métricas do Radar do Universo e Lore Score (calculateUniverseRadar)", () => {
  const ws: StudioWorkspace = {
    entities: [
      ...Array.from({ length: 25 }, (_, i) => ({
        ...blankEntity("character"),
        id: `c-${i}`,
        title: `Char ${i}`,
      })),
      ...Array.from({ length: 6 }, (_, i) => ({
        ...blankEntity("faction"),
        id: `f-${i}`,
        title: `Faction ${i}`,
      })),
      ...Array.from({ length: 8 }, (_, i) => ({
        ...blankEntity("concept"),
        id: `cp-${i}`,
        title: `Concept ${i}`,
      })),
      ...Array.from({ length: 8 }, (_, i) => ({
        ...blankEntity("place"),
        id: `p-${i}`,
        title: `Place ${i}`,
      })),
      ...Array.from({ length: 15 }, (_, i) => ({
        ...blankEntity("event"),
        id: `e-${i}`,
        title: `Event ${i}`,
      })),
      ...Array.from({ length: 15 }, (_, i) => ({
        ...blankEntity("document"),
        id: `d-${i}`,
        title: `Doc ${i}`,
      })),
      { ...blankEntity("story"), id: "s-1", title: "Story 1" },
    ],
    relations: Array.from({ length: 60 }, (_, i) => ({
      id: `r-${i}`,
      sourceId: `c-${i % 25}`,
      targetId: `s-1`,
      label: "aparece em",
    })),
  };

  const radar = calculateUniverseRadar(ws);
  assert.equal(radar.charactersCount, 25);
  assert.equal(radar.factionsCount, 6);
  assert.equal(radar.conceptsCount, 8);
  assert.equal(radar.placesCount, 8);
  assert.equal(radar.eventsCount, 15);
  assert.equal(radar.documentsCount, 15);
  assert.equal(radar.axes.length, 6);

  // All axes achieved target -> all scores 100
  for (const axis of radar.axes) {
    assert.equal(axis.score, 100);
  }
  assert.ok(radar.loreScore >= 80);
  assert.equal(radar.statusLabel, "Cosmos Maduro / Prontidão Editorial");
  assert.ok(radar.connectivityRate > 0.5);
});

test("Cockpit 9: Execução do Radar sobre o dataset canônico real (seedEntities & seedRelations)", () => {
  const canonicalWs: StudioWorkspace = {
    entities: seedEntities,
    relations: seedRelations,
  };

  const radar = calculateUniverseRadar(canonicalWs);
  assert.ok(radar.charactersCount >= 30);
  assert.ok(radar.conceptsCount >= 5);
  assert.ok(radar.factionsCount >= 5);
  assert.ok(radar.eventsCount >= 10);
  assert.ok(radar.relationsCount >= 50);
  assert.ok(radar.loreScore > 50 && radar.loreScore <= 100);
  assert.ok(
    ["Universo em Expansão", "Cosmos Maduro / Prontidão Editorial"].includes(
      radar.statusLabel,
    ),
  );

  const allProjects = getAllProjectsProgress(canonicalWs);
  assert.ok(allProjects.length >= 2);
  const rrh = allProjects.find((p) => p.storyId === "story-red-right-hand");
  assert.ok(rrh !== undefined);
  assert.ok(rrh.totalWords > 2000);
  assert.ok(rrh.totalChapters >= 6);
});

test("Cockpit 10: Resiliência contra caracteres Unicode extremos, emojis e grandes textos", () => {
  const extremeBody =
    "Ormuz ✨ e Hades ⚡ criaram os mundos primordiais. " +
    "Severum 🚀 ".repeat(10000);
  const story: StudioEntity = {
    ...blankEntity("story"),
    id: "story-unicode",
    title: "Cosmic Odyssey",
  };
  const doc: StudioEntity = {
    ...blankEntity("document"),
    id: "doc-unicode",
    title: "Capítulo Cósmico ✨",
    body: extremeBody,
    status: "ready",
    attributes: { storyId: "story-unicode" },
  };

  const ws: StudioWorkspace = { entities: [story, doc], relations: [] };
  const progress = calculateProjectProgress(story, ws);
  assert.ok(progress.totalWords > 10000);
  assert.ok(progress.percentage > 0);

  // SVG Geometry validation
  const coords = getRadarCoordinates(0, 6, 100, 80, 110, 110);
  assert.equal(typeof coords.x, "number");
  assert.equal(typeof coords.y, "number");
  const poly = buildRadarSvgPolygon([
    { score: 50 },
    { score: 75 },
    { score: 100 },
    { score: 60 },
    { score: 80 },
    { score: 90 },
  ]);
  assert.ok(poly.includes(","));
});
