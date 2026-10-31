/**
 * tests/unit/studio-cockpit-stress.test.ts
 *
 * Empirical Stress Testing & Edge Cases Harness for Studio Cockpit & Narrative Roles.
 * Challenger M4.1 (teamwork_preview_challenger)
 *
 * Test Matrix:
 * 1. Empty workspace (0 entities, 0 relations)
 * 2. Zero word goals and zero words (NaN / Infinity division-by-zero protection)
 * 3. Massive entity datasets (10,000+ entities and 15,000+ relations)
 * 4. Characters with multiple roles across stories and within stories
 * 5. Invalid dates, missing updatedAt timestamps, future dates, non-ISO dates
 * 6. Radar geometry trigonometry math bounds (0 total, extreme values, clamps, precision)
 * 7. Quick action entity creation boundary drafts
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  countWords,
  formatNumberBR,
  formatRelativeTime,
  getCharacterNarrativeRoles,
  getStoryCastByRole,
  getMostRecentManuscript,
  findActiveManuscript,
  calculateProjectProgress,
  getAllProjectsProgress,
  computeActiveProjects,
  calculateCanonConsistency,
  calculateUniverseRadar,
  computeUniverseRadar,
  createQuickEntity,
  getRadarCoordinates,
  buildRadarSvgPolygon,
} from "../../lib/studio-cockpit";
import {
  type NarrativeRole,
  isNarrativeRole,
  normalizeNarrativeRole,
  getRoleBadgeStyle,
  getCharacterParticipations,
  getCharacterRoleInStory,
  getStoryCast,
  getStoryCastCount,
} from "../../lib/narrative-roles";

import {
  blankEntity,
  type StudioEntity,
  type StudioRelation,
  type StudioWorkspace,
} from "../../lib/workspace";

/* =========================================================================
   1. Empty Workspace & Null / Undefined Boundaries
   ========================================================================= */

test("Challenger 1.1: Complete Empty Workspace (0 entities, 0 relations)", () => {
  const emptyWs: StudioWorkspace = { entities: [], relations: [] };

  // Manuscript resolution must return null cleanly without throwing
  assert.equal(getMostRecentManuscript(emptyWs), null);
  assert.equal(findActiveManuscript(emptyWs), null);

  // Projects progress must return empty array
  assert.deepEqual(getAllProjectsProgress(emptyWs), []);
  assert.deepEqual(computeActiveProjects(emptyWs), []);

  // Canon consistency on empty workspace
  const consistency = calculateCanonConsistency(emptyWs);
  assert.equal(consistency.score, 100);
  assert.equal(consistency.rating, "ESTÁVEL");
  assert.equal(consistency.rulesChecked, 0);
  assert.equal(consistency.brokenRelationsCount, 0);
  assert.equal(consistency.orphanedConceptsCount, 0);
  assert.equal(consistency.unassignedChaptersCount, 0);

  // Universe Radar on empty workspace
  const radar = calculateUniverseRadar(emptyWs);
  assert.equal(radar.loreScore, 0);
  assert.equal(radar.connectivityRate, 0);
  assert.equal(radar.charactersCount, 0);
  assert.equal(radar.factionsCount, 0);
  assert.equal(radar.conceptsCount, 0);
  assert.equal(radar.placesCount, 0);
  assert.equal(radar.eventsCount, 0);
  assert.equal(radar.storiesCount, 0);
  assert.equal(radar.documentsCount, 0);
  assert.equal(radar.relationsCount, 0);
  assert.equal(radar.axes.length, 6);
  for (const ax of radar.axes) {
    assert.equal(ax.count, 0);
    assert.equal(ax.score, 0);
  }
  assert.equal(radar.statusLabel, "Semente Cósmica");

  // computeUniverseRadar on empty workspace
  const radarData = computeUniverseRadar(emptyWs);
  assert.equal(radarData.totalEntities, 0);
  assert.equal(radarData.totalRelations, 0);
  assert.equal(radarData.totalWords, 0);
  assert.equal(radarData.axes.length, 6);
  for (const ax of radarData.axes) {
    assert.equal(ax.count, 0);
    assert.equal(ax.percent, 0);
  }

  // Lookups with arbitrary IDs in empty workspace
  assert.deepEqual(getCharacterNarrativeRoles("any-id", emptyWs), []);
  const cast = getStoryCastByRole("any-id", emptyWs);
  assert.equal(cast.totalCastCount, 0);
  assert.equal(cast.protagonistas.length, 0);
  assert.equal(cast.antagonistas.length, 0);
  assert.equal(cast.coadjuvantes.length, 0);
  assert.equal(cast.mentores.length, 0);
  assert.equal(cast.aliados.length, 0);
  assert.equal(cast.unassigned.length, 0);

  // Narrative-roles module on empty lists
  assert.deepEqual(getCharacterParticipations("any-id", [], []), []);
  assert.equal(getCharacterRoleInStory("any-id", "story-id", []), null);
  const narrativeCast = getStoryCast("any-id", [], []);
  assert.equal(getStoryCastCount("any-id", [], []), 0);
  assert.equal(narrativeCast.Protagonista.length, 0);
});

test("Challenger 1.2: Formatting & string helper boundary handling", () => {
  assert.equal(countWords(""), 0);
  assert.equal(countWords("    "), 0);
  assert.equal(countWords(null), 0);
  assert.equal(countWords(undefined), 0);
  assert.equal(countWords("\n\n\t  \r\n"), 0);

  assert.equal(formatRelativeTime(undefined), "Recentemente");
  assert.equal(formatRelativeTime(""), "Recentemente");
  assert.equal(formatRelativeTime("invalid-date"), "Recentemente");
  assert.equal(formatRelativeTime("2026-99-99T99:99:99Z"), "Recentemente");
  assert.equal(formatNumberBR(1000), "1.000");
  assert.equal(formatNumberBR(0), "0");

  assert.equal(normalizeNarrativeRole(""), null);
  assert.equal(normalizeNarrativeRole(null), null);
  assert.equal(normalizeNarrativeRole(undefined), null);
  assert.equal(normalizeNarrativeRole("   "), null);
  assert.equal(normalizeNarrativeRole("VILÃO"), null);

  assert.equal(isNarrativeRole(""), false);
  assert.equal(isNarrativeRole(null), false);
  assert.equal(isNarrativeRole(undefined), false);
  assert.equal(isNarrativeRole(12345), false);
  assert.equal(isNarrativeRole({}), false);
});

/* =========================================================================
   2. Zero Word Goals, Zero Words, and Division-by-Zero Defense
   ========================================================================= */

test("Challenger 2.1: Mathematical integrity with zero word goals and zero words", () => {
  const storyZeroGoal: StudioEntity = {
    ...blankEntity("story"),
    id: "story-zero-goal",
    title: "História Meta Zero",
    attributes: { wordGoal: 0 },
  };

  const emptyWs: StudioWorkspace = {
    entities: [storyZeroGoal],
    relations: [],
  };

  // Both totalWords = 0 and wordGoal = 0
  const progress1 = calculateProjectProgress(storyZeroGoal, emptyWs);
  assert.equal(progress1.totalWords, 0);
  assert.equal(progress1.wordGoal, 0);
  assert.equal(progress1.percentage, 0);
  assert.equal(progress1.rawPercentage, 0);
  assert.equal(Number.isNaN(progress1.percentage), false);
  assert.equal(Number.isFinite(progress1.percentage), true);
  assert.equal(Number.isNaN(progress1.rawPercentage), false);
  assert.equal(Number.isFinite(progress1.rawPercentage), true);

  // Document with words, but story has wordGoal = 0
  const docWithWords: StudioEntity = {
    ...blankEntity("document"),
    id: "doc-w1",
    title: "Capítulo Com Palavras",
    body: "Palavra ".repeat(500).trim(),
    attributes: { storyId: "story-zero-goal" },
  };
  const wsWithWords: StudioWorkspace = {
    entities: [storyZeroGoal, docWithWords],
    relations: [],
  };
  const progress2 = calculateProjectProgress(storyZeroGoal, wsWithWords);
  assert.equal(progress2.totalWords, 500);
  assert.equal(
    progress2.percentage,
    0,
    "When goal is 0, percentage must be guarded to 0",
  );
  assert.equal(Number.isNaN(progress2.percentage), false);

  // Negative word goal
  const storyNegativeGoal: StudioEntity = {
    ...blankEntity("story"),
    id: "story-negative",
    title: "Meta Negativa",
    attributes: { wordGoal: -1000 },
  };
  const progressNeg = calculateProjectProgress(storyNegativeGoal, emptyWs);
  assert.equal(progressNeg.percentage, 0);
  assert.equal(Number.isNaN(progressNeg.percentage), false);

  // String / Corrupted wordGoal
  const storyCorruptedGoal: StudioEntity = {
    ...blankEntity("story"),
    id: "story-corrupted",
    title: "Meta Corrompida",
    attributes: { wordGoal: "cem mil palavras" },
  };
  const progressCorrupted = calculateProjectProgress(
    storyCorruptedGoal,
    emptyWs,
  );
  assert.equal(Number.isNaN(progressCorrupted.percentage), false);
  assert.equal(Number.isFinite(progressCorrupted.percentage), true);
});

test("Challenger 2.2: computeActiveProjects zero-division and goal fallback defense", () => {
  const story: StudioEntity = {
    ...blankEntity("story"),
    id: "story-calc-test",
    title: "Projeto de Teste",
    attributes: { targetWords: 0, wordGoal: 0 },
  };

  const ws: StudioWorkspace = {
    entities: [story],
    relations: [],
  };

  const activeProjects = computeActiveProjects(ws);
  assert.equal(activeProjects.length, 1);
  const p = activeProjects[0];
  assert.equal(p.totalWords, 0);
  assert.ok(
    p.targetWords > 0,
    "targetWords falls back to default 30000 when 0",
  );
  assert.equal(p.progressPercent, 0);
  assert.equal(Number.isNaN(p.progressPercent), false);
  assert.equal(Number.isFinite(p.progressPercent), true);

  // Massive words exceeding target: progressPercent capped at 100
  const massiveDoc: StudioEntity = {
    ...blankEntity("document"),
    id: "doc-massive",
    title: "Super Capítulo",
    body: "Palavra ".repeat(100000).trim(),
    attributes: { storyId: "story-calc-test" },
  };
  const wsMassive: StudioWorkspace = {
    entities: [story, massiveDoc],
    relations: [],
  };
  const activeMassive = computeActiveProjects(wsMassive);
  assert.equal(activeMassive[0].progressPercent, 100);
});

test("Challenger 2.3: getMostRecentManuscript progress percentage with zero/missing goal", () => {
  const docZeroGoal: StudioEntity = {
    ...blankEntity("document"),
    id: "doc-zero-g",
    title: "Capítulo Zero Goal",
    body: "Texto com cinco palavras aqui.",
    updatedAt: "2026-10-31T00:00:00Z",
    attributes: { wordGoal: 0 },
  };
  const ws: StudioWorkspace = { entities: [docZeroGoal], relations: [] };
  const resume = getMostRecentManuscript(ws);
  assert.ok(resume !== null);
  assert.equal(resume.wordCount, 5);
  assert.equal(resume.wordGoal, undefined);
  assert.equal(resume.progressPercentage, 0);
  assert.equal(Number.isNaN(resume.progressPercentage), false);
});

/* =========================================================================
   3. Massive Entity Datasets & Performance Benchmarks
   ========================================================================= */

test("Challenger 3.1: Massive entity scale benchmark (10,000+ entities & 15,000 relations)", () => {
  // Construct 10,050 synthetic entities across all types
  const characters: StudioEntity[] = Array.from({ length: 4000 }, (_, i) => ({
    ...blankEntity("character"),
    id: `char-mass-${i}`,
    title: `Personagem ${i}`,
    attributes: {
      escala: i % 2 === 0 ? "TERRA" : "UNIVERSAL",
      aparicoes: [`story-${i % 50}`],
    },
  }));

  const concepts: StudioEntity[] = Array.from({ length: 1000 }, (_, i) => ({
    ...blankEntity("concept"),
    id: `concept-mass-${i}`,
    title: `Conceito ${i}`,
    attributes: {
      category: "cosmologia",
      scale: "UNIVERSAL",
    },
  }));

  const factions: StudioEntity[] = Array.from({ length: 200 }, (_, i) => ({
    ...blankEntity("faction"),
    id: `faction-mass-${i}`,
    title: `Facção ${i}`,
  }));

  const places: StudioEntity[] = Array.from({ length: 500 }, (_, i) => ({
    ...blankEntity("place"),
    id: `place-mass-${i}`,
    title: `Lugar ${i}`,
  }));

  const events: StudioEntity[] = Array.from({ length: 1000 }, (_, i) => ({
    ...blankEntity("event"),
    id: `event-mass-${i}`,
    title: `Evento ${i}`,
  }));

  const stories: StudioEntity[] = Array.from({ length: 50 }, (_, i) => ({
    ...blankEntity("story"),
    id: `story-${i}`,
    title: `História Cósmica ${i}`,
    attributes: { wordGoal: 50000 },
  }));

  const documents: StudioEntity[] = Array.from({ length: 3300 }, (_, i) => ({
    ...blankEntity("document"),
    id: `doc-mass-${i}`,
    title: `Capítulo ${i}`,
    body: `Capítulo de teste número ${i} com texto padrão para contagem.`,
    updatedAt: new Date(Date.now() - i * 3600000).toISOString(),
    attributes: {
      storyId: `story-${i % 50}`,
      writingOrder: i,
    },
  }));

  const allEntities: StudioEntity[] = [
    ...characters,
    ...concepts,
    ...factions,
    ...places,
    ...events,
    ...stories,
    ...documents,
  ];

  assert.equal(
    allEntities.length,
    10050,
    "Workspace must contain 10,050 entities",
  );

  // Construct 15,000 synthetic relations
  const rolesList: NarrativeRole[] = [
    "Protagonista",
    "Antagonista",
    "Coadjuvante",
    "Mentor",
    "Aliado",
  ];

  const allRelations: StudioRelation[] = Array.from(
    { length: 15000 },
    (_, i) => ({
      id: `rel-mass-${i}`,
      sourceId: `char-mass-${i % 4000}`,
      targetId: `story-${i % 50}`,
      label: rolesList[i % 5],
    }),
  );

  const massiveWs: StudioWorkspace = {
    entities: allEntities,
    relations: allRelations,
  };

  // 1. calculateUniverseRadar benchmark
  const tRadarStart = Date.now();
  const radar = calculateUniverseRadar(massiveWs);
  const tRadar = Date.now() - tRadarStart;
  assert.equal(radar.charactersCount, 4000);
  assert.equal(radar.conceptsCount, 1000);
  assert.equal(radar.factionsCount, 200);
  assert.equal(radar.placesCount, 500);
  assert.equal(radar.eventsCount, 1000);
  assert.equal(radar.storiesCount, 50);
  assert.equal(radar.documentsCount, 3300);
  assert.equal(radar.relationsCount, 15000);
  assert.equal(radar.loreScore, 100);
  assert.equal(radar.statusLabel, "Cosmos Maduro / Prontidão Editorial");
  assert.ok(tRadar < 500, `calculateUniverseRadar took ${tRadar}ms (< 500ms)`);

  // 2. getMostRecentManuscript benchmark
  const tRecentStart = Date.now();
  const recent = getMostRecentManuscript(massiveWs);
  const tRecent = Date.now() - tRecentStart;
  assert.ok(recent !== null);
  assert.equal(recent.chapterId, "doc-mass-0");
  assert.ok(
    tRecent < 200,
    `getMostRecentManuscript took ${tRecent}ms (< 200ms)`,
  );

  // 3. getStoryCastByRole benchmark on single story (pre-indexed relations):
  const tCastStart = Date.now();
  const cast = getStoryCastByRole("story-0", massiveWs);
  const tCast = Date.now() - tCastStart;
  assert.ok(cast.totalCastCount > 0);
  assert.ok(tCast < 200, `getStoryCastByRole took ${tCast}ms (< 200ms)`);

  // 4. getStoryCast benchmark (narrative-roles module)
  const tStoryCastStart = Date.now();
  const storyCast = getStoryCast(
    "story-0",
    massiveWs.relations,
    massiveWs.entities,
  );
  const tStoryCast = Date.now() - tStoryCastStart;
  assert.ok(storyCast.Protagonista.length > 0);
  assert.ok(
    tStoryCast < 250,
    `lib/narrative-roles getStoryCast took ${tStoryCast}ms (< 250ms)`,
  );
});

/* =========================================================================
   4. Multiple Roles Across Stories & Multiple Roles in Same Story
   ========================================================================= */

test("Challenger 4.1: Character with multiple distinct roles across multiple stories", () => {
  const beenie: StudioEntity = {
    ...blankEntity("character"),
    id: "char-beenie",
    title: "Beenie",
  };

  const stories: StudioEntity[] = [
    { ...blankEntity("story"), id: "s-guardioes", title: "Guardiões" },
    { ...blankEntity("story"), id: "s-rrh", title: "Red Right Hand" },
    { ...blankEntity("story"), id: "s-marginal", title: "Marginal" },
    { ...blankEntity("story"), id: "s-congregadores", title: "Congregadores" },
    { ...blankEntity("story"), id: "s-severum", title: "Queda de Severum" },
  ];

  const relations: StudioRelation[] = [
    {
      id: "r1",
      sourceId: "char-beenie",
      targetId: "s-guardioes",
      label: "Protagonista",
    },
    { id: "r2", sourceId: "char-beenie", targetId: "s-rrh", label: "Aliado" },
    {
      id: "r3",
      sourceId: "char-beenie",
      targetId: "s-marginal",
      label: "Coadjuvante",
    },
    {
      id: "r4",
      sourceId: "char-beenie",
      targetId: "s-congregadores",
      label: "Mentor",
    },
    {
      id: "r5",
      sourceId: "char-beenie",
      targetId: "s-severum",
      label: "Antagonista",
    },
  ];

  const ws: StudioWorkspace = {
    entities: [beenie, ...stories],
    relations,
  };

  // getCharacterNarrativeRoles
  const roles = getCharacterNarrativeRoles("char-beenie", ws);
  assert.equal(roles.length, 5);
  const roleByStory = new Map(roles.map((r) => [r.storyId, r.role]));
  assert.equal(roleByStory.get("s-guardioes"), "Protagonista");
  assert.equal(roleByStory.get("s-rrh"), "Aliado");
  assert.equal(roleByStory.get("s-marginal"), "Coadjuvante");
  assert.equal(roleByStory.get("s-congregadores"), "Mentor");
  assert.equal(roleByStory.get("s-severum"), "Antagonista");

  // getCharacterRoleInStory lookups
  assert.equal(
    getCharacterRoleInStory("char-beenie", "s-guardioes", relations),
    "Protagonista",
  );
  assert.equal(
    getCharacterRoleInStory("char-beenie", "s-rrh", relations),
    "Aliado",
  );
  assert.equal(
    getCharacterRoleInStory("char-beenie", "s-marginal", relations),
    "Coadjuvante",
  );
  assert.equal(
    getCharacterRoleInStory("char-beenie", "s-congregadores", relations),
    "Mentor",
  );
  assert.equal(
    getCharacterRoleInStory("char-beenie", "s-severum", relations),
    "Antagonista",
  );
  assert.equal(
    getCharacterRoleInStory("char-beenie", "s-inexistente", relations),
    null,
  );

  // Bidirectional relation lookup (when relation has sourceId = story and targetId = character)
  const invertedRelations: StudioRelation[] = [
    {
      id: "r-inv",
      sourceId: "s-guardioes",
      targetId: "char-beenie",
      label: "Protagonista",
    },
  ];
  assert.equal(
    getCharacterRoleInStory("char-beenie", "s-guardioes", invertedRelations),
    "Protagonista",
    "Must resolve bidirectional relation when storyId is sourceId",
  );

  // getCharacterParticipations
  const participations = getCharacterParticipations(
    "char-beenie",
    relations,
    ws.entities,
  );
  assert.equal(participations.length, 5);
  // Verify sorted by storyTitle pt-BR
  for (let i = 0; i < participations.length - 1; i++) {
    assert.ok(
      participations[i].storyTitle.localeCompare(
        participations[i + 1].storyTitle,
        "pt-BR",
      ) <= 0,
      "Participations must be sorted alphabetically by storyTitle",
    );
  }
});

test("Challenger 4.2: Handling multiple/duplicate roles in the same story (deduplication check)", () => {
  const arner: StudioEntity = {
    ...blankEntity("character"),
    id: "char-arner",
    title: "Arner",
  };
  const story: StudioEntity = {
    ...blankEntity("story"),
    id: "story-severum",
    title: "Queda de Severum",
  };

  // Multiple conflicting relations for the same character in the same story
  const duplicateRelations: StudioRelation[] = [
    {
      id: "r-dup-1",
      sourceId: "char-arner",
      targetId: "story-severum",
      label: "Protagonista",
    },
    {
      id: "r-dup-2",
      sourceId: "char-arner",
      targetId: "story-severum",
      label: "Antagonista",
    },
    {
      id: "r-dup-3",
      sourceId: "char-arner",
      targetId: "story-severum",
      label: "Mentor",
    },
  ];

  const ws: StudioWorkspace = {
    entities: [arner, story],
    relations: duplicateRelations,
  };

  // getStoryCastByRole should deduplicate so character isn't double-counted in cast
  const cast = getStoryCastByRole("story-severum", ws);
  assert.equal(
    cast.totalCastCount,
    1,
    "Character must only be counted once in totalCastCount",
  );
  assert.equal(cast.protagonistas.length, 1);
  assert.equal(cast.antagonistas.length, 0); // Second role ignored due to assignedCharIds guard
  assert.equal(cast.mentores.length, 0);

  // getCharacterNarrativeRoles preserves all relations for auditability
  const roles = getCharacterNarrativeRoles("char-arner", ws);
  assert.equal(roles.length, 3);
});

/* =========================================================================
   5. Invalid Dates, Missing Timestamps, Future Dates & Timezones
   ========================================================================= */

test("Challenger 5.1: Sorting sanitization picks most recent valid document when unparseable date exists", () => {
  // When docs have valid timestamps of different dates, newer timestamp correctly wins
  const docsValid: StudioEntity[] = [
    {
      ...blankEntity("document"),
      id: "doc-older",
      title: "Capítulo Mais Velho",
      body: "Texto",
      updatedAt: "2026-10-25T10:00:00Z",
      version: 10,
    },
    {
      ...blankEntity("document"),
      id: "doc-newer",
      title: "Capítulo Mais Novo",
      body: "Texto",
      updatedAt: "2026-10-31T03:00:00Z",
      version: 1,
    },
  ];
  const wsValid: StudioWorkspace = { entities: docsValid, relations: [] };
  const recentValid = getMostRecentManuscript(wsValid);
  assert.equal(
    recentValid?.chapterId,
    "doc-newer",
    "Newer valid timestamp must beat older valid timestamp",
  );

  // SANITIZED SORTING VERIFICATION:
  // When a document has an invalid updatedAt ('data-invalida'), its timestamp is sanitized to 0.
  // The valid recent chapter (with real timestamp) wins regardless of version.
  const docsCorrupted: StudioEntity[] = [
    {
      ...blankEntity("document"),
      id: "doc-corrupted-date",
      title: "Capítulo com Data Corrompida",
      body: "Texto",
      updatedAt: "data-completamente-invalida",
      version: 2,
    },
    {
      ...blankEntity("document"),
      id: "doc-valid-recent",
      title: "Capítulo Recente Válido",
      body: "Texto",
      updatedAt: "2026-10-31T03:00:00Z",
      version: 1,
    },
  ];
  const wsCorrupted: StudioWorkspace = {
    entities: docsCorrupted,
    relations: [],
  };
  const recentCorrupted = getMostRecentManuscript(wsCorrupted);

  // Valid recent document wins over corrupted timestamp:
  assert.equal(
    recentCorrupted?.chapterId,
    "doc-valid-recent",
    "Valid recent document must win over document with invalid timestamp",
  );
  assert.notEqual(recentCorrupted?.lastEditedText, "Sem registro de data");
  assert.ok(recentCorrupted?.streakDays !== undefined);
});

test("Challenger 5.2: Future dates and clock skew resiliency", () => {
  const futureDoc: StudioEntity[] = [
    {
      ...blankEntity("document"),
      id: "doc-future",
      title: "Capítulo do Futuro",
      body: "Texto futuro",
      updatedAt: "2099-01-01T00:00:00Z",
    },
  ];
  const ws: StudioWorkspace = { entities: futureDoc, relations: [] };
  const refDate = new Date("2026-10-31T12:00:00Z");

  const recent = getMostRecentManuscript(ws, refDate);
  assert.ok(recent !== null);
  assert.equal(recent.chapterId, "doc-future");
  // Negative diffMs handled gracefully (diffHours < 1 branch)
  assert.equal(recent.rhythmStatus, "active");
  assert.equal(recent.lastEditedText, "Editado há poucos minutos");

  // Relative time helper with future date
  assert.equal(formatRelativeTime("2099-01-01T00:00:00Z"), "Agora mesmo");
});

/* =========================================================================
   6. Radar Geometry Trigonometry Math Bounds
   ========================================================================= */

test("Challenger 6.1: Radar coordinates trigonometry bounds and precision", () => {
  const center = 120;
  const radius = 90;

  // 1. Top vertex (index 0 of 6): angle should be -PI/2 (straight up)
  const top = getRadarCoordinates(0, 6, 100, radius, center, center);
  assert.equal(top.x, 120, "At angle -PI/2, cos is 0 so x should be centerX");
  assert.equal(
    top.y,
    30,
    "At angle -PI/2, sin is -1 so y should be center - radius (120 - 90 = 30)",
  );

  // 2. Bottom-ish vertices: symmetric x about centerX
  const p1 = getRadarCoordinates(1, 6, 100, radius, center, center);
  const p5 = getRadarCoordinates(5, 6, 100, radius, center, center);
  assert.equal(
    p1.y,
    p5.y,
    "Symmetric vertices must have identical y coordinates",
  );
  assert.equal(
    Math.round(p1.x - center),
    Math.round(center - p5.x),
    "p1 and p5 must be equidistant from centerX",
  );

  // 3. Zero value percent: point collapses to center
  const zeroPt = getRadarCoordinates(0, 6, 0, radius, center, center);
  assert.equal(zeroPt.x, 120);
  assert.equal(zeroPt.y, 120);

  // 4. Zero radius: point collapses to center
  const zeroRadiusPt = getRadarCoordinates(2, 6, 100, 0, center, center);
  assert.equal(zeroRadiusPt.x, 120);
  assert.equal(zeroRadiusPt.y, 120);

  // 5. Overflow value percent (e.g. 200%): scales out proportionally
  const overPt = getRadarCoordinates(0, 6, 200, radius, center, center);
  assert.equal(overPt.x, 120);
  assert.equal(
    overPt.y,
    120 - 180,
    "200% radius should place y at 120 - 180 = -60",
  );

  // 6. High-density polygon (100 axes): valid finite coordinates
  for (let i = 0; i < 100; i++) {
    const coords = getRadarCoordinates(i, 100, 80, radius, center, center);
    assert.equal(Number.isNaN(coords.x), false);
    assert.equal(Number.isNaN(coords.y), false);
    assert.equal(Number.isFinite(coords.x), true);
    assert.equal(Number.isFinite(coords.y), true);
  }

  // 7. NaN guard: total = 0 safely returns center coordinates
  const divZeroCoords = getRadarCoordinates(0, 0, 100, radius, center, center);
  assert.equal(divZeroCoords.x, center, "total=0 safely returns centerX");
  assert.equal(divZeroCoords.y, center, "total=0 safely returns centerY");
  assert.equal(Number.isNaN(divZeroCoords.x), false);
  assert.equal(Number.isNaN(divZeroCoords.y), false);
});

test("Challenger 6.2: buildRadarSvgPolygon edge conditions and string bounds", () => {
  // Empty axes list
  assert.equal(buildRadarSvgPolygon([]), "");

  // All 0 scores: Math.max(15, val) clamps minimum radius to 15
  const polyZero = buildRadarSvgPolygon([
    { score: 0 },
    { score: 0 },
    { score: 0 },
  ]);
  assert.ok(polyZero.includes(","));
  const pointsZero = polyZero.split(" ");
  assert.equal(pointsZero.length, 3);

  // Mixed percent and score
  const polyMixed = buildRadarSvgPolygon([
    { percent: 100 },
    { score: 50 },
    { percent: 80 },
    { score: 20 },
    { percent: 60 },
    { score: 90 },
  ]);
  const pointsMixed = polyMixed.split(" ");
  assert.equal(pointsMixed.length, 6);
  for (const pt of pointsMixed) {
    const [x, y] = pt.split(",").map(Number);
    assert.equal(Number.isNaN(x), false);
    assert.equal(Number.isNaN(y), false);
    assert.equal(Number.isFinite(x), true);
    assert.equal(Number.isFinite(y), true);
  }

  // NaN score guard in buildRadarSvgPolygon: must produce valid coordinates, not NaN
  const polyNaN = buildRadarSvgPolygon([{ score: Number.NaN }]);
  assert.notEqual(polyNaN, "NaN,NaN");
  const [xNaN, yNaN] = polyNaN.split(",").map(Number);
  assert.equal(Number.isNaN(xNaN), false);
  assert.equal(Number.isNaN(yNaN), false);
  assert.equal(Number.isFinite(xNaN), true);
  assert.equal(Number.isFinite(yNaN), true);
});

/* =========================================================================
   7. Quick Action Entity Creation Integrity (F26)
   ========================================================================= */

test("Challenger 7.1: createQuickEntity boundary drafts and slug safety", () => {
  const ws: StudioWorkspace = { entities: [], relations: [] };

  // 1. Chapter with empty notes and empty title
  const chap = createQuickEntity(
    { type: "chapter", title: "", notes: "", storyId: "story-rrh" },
    ws,
  );
  assert.ok(chap.id.startsWith("document-"));
  assert.equal(chap.title, "Novo Capítulo 1");
  assert.equal(chap.body, "");
  assert.equal(chap.summary, "");
  assert.equal(chap.attributes?.storyId, "story-rrh");
  assert.equal(chap.attributes?.writingOrder, 1);

  // 2. Character with empty notes and default scale
  const char = createQuickEntity(
    { type: "character", title: "Cole", notes: "Atirador de Severum" },
    ws,
  );
  assert.ok(char.id.startsWith("char-"));
  assert.equal(char.title, "Cole");
  assert.equal(char.attributes?.escala, "TERRA");
  assert.equal(char.attributes?.alinhamento, "Neutro");

  // 3. Concept with custom category and scale
  const concept = createQuickEntity(
    {
      type: "concept",
      title: "Planetas Cegos",
      category: "cosmologia",
      scale: "UNIVERSAL",
      notes: "Mundos sem sol nos confins de Severum",
    },
    ws,
  );
  assert.ok(concept.id.startsWith("concept-"));
  assert.equal(concept.title, "Planetas Cegos");
  assert.equal(concept.attributes?.category, "cosmologia");
  assert.equal(concept.attributes?.scale, "UNIVERSAL");
  assert.deepEqual(concept.attributes?.rules, [
    "Mundos sem sol nos confins de Severum",
  ]);

  // 4. Idea (task)
  const idea = createQuickEntity(
    {
      type: "idea",
      title: "Ideia Secreta",
      notes: "Expandir o lore de Deroo Da",
    },
    ws,
  );
  assert.ok(idea.id.startsWith("idea-"));
  assert.equal(idea.kind, "task");
  assert.equal(idea.title, "Ideia Secreta");
  assert.ok(idea.tags?.includes("ideia-rapida"));
});

/* =========================================================================
   8. Radar Trigonometry Mathematical Extremes & Coordinate Stress
   ========================================================================= */

test("Challenger 8.1: Extreme polygon vertices and trigonometric singularity in SVG radar", () => {
  const center = 120;
  const radius = 90;

  // Total = 1: Single vertex straight up at (120, 120 - radius)
  const single = getRadarCoordinates(0, 1, 100, radius, center, center);
  assert.equal(single.x, 120);
  assert.equal(single.y, 30);

  // Total = 2: Two antipodal vertices (top and bottom)
  const top = getRadarCoordinates(0, 2, 100, radius, center, center);
  const bottom = getRadarCoordinates(1, 2, 100, radius, center, center);
  assert.equal(top.x, 120);
  assert.equal(top.y, 30);
  assert.equal(bottom.x, 120);
  assert.equal(bottom.y, 210);

  // Total = 360: Full circle discrete steps
  for (let i = 0; i < 360; i += 45) {
    const pt = getRadarCoordinates(i, 360, 100, radius, center, center);
    assert.equal(Number.isNaN(pt.x), false);
    assert.equal(Number.isNaN(pt.y), false);
    // Distance from center must equal radius 90 within rounding tolerance
    const dist = Math.sqrt((pt.x - center) ** 2 + (pt.y - center) ** 2);
    assert.ok(
      Math.abs(dist - radius) < 0.1,
      `Vertex ${i} distance ${dist} must equal radius ${radius}`,
    );
  }

  // Edge: total <= 0 safely collapses to center
  assert.deepEqual(getRadarCoordinates(0, 0, 100, radius, center, center), {
    x: center,
    y: center,
  });
  assert.deepEqual(getRadarCoordinates(0, -10, 100, radius, center, center), {
    x: center,
    y: center,
  });

  // Edge: valuePercent negative or NaN clamped to 0
  const negPt = getRadarCoordinates(0, 6, -100, radius, center, center);
  assert.equal(negPt.x, center);
  assert.equal(negPt.y, center);
});

test("Challenger 8.2: buildRadarSvgPolygon high-density and extreme values", () => {
  // 12 axes polygon (e.g. 12 cosmic dimensions)
  const twelveAxes = Array.from({ length: 12 }, (_, i) => ({
    percent: (i * 10) % 100,
  }));
  const poly12 = buildRadarSvgPolygon(twelveAxes, 100, 150);
  assert.ok(poly12.length > 0);
  const points = poly12.split(" ");
  assert.equal(points.length, 12);
  for (const p of points) {
    const [x, y] = p.split(",").map(Number);
    assert.equal(Number.isFinite(x), true);
    assert.equal(Number.isFinite(y), true);
  }

  // Overflow percent (> 100) is clamped to 100
  const overflowAxes = [{ percent: 500 }, { score: 999 }];
  const polyOver = buildRadarSvgPolygon(overflowAxes, 90, 120);
  const ptsOver = polyOver.split(" ");
  assert.equal(ptsOver.length, 2);
  assert.ok(!polyOver.includes("NaN"));
});

/* =========================================================================
   9. Conflicting Narrative Roles, Inverted Directionality & Appearance Matching
   ========================================================================= */

test("Challenger 9.1: Role precedence and single-cast assignment under conflicting multi-roles", () => {
  const beenie: StudioEntity = {
    ...blankEntity("character"),
    id: "char-beenie",
    title: "Beenie",
  };
  const story: StudioEntity = {
    ...blankEntity("story"),
    id: "story-guardioes",
    title: "Guardiões",
  };

  // Simultaneous conflicting relations in the same story
  const conflictingRels: StudioRelation[] = [
    {
      id: "r1",
      sourceId: "char-beenie",
      targetId: "story-guardioes",
      label: "Protagonista",
    },
    {
      id: "r2",
      sourceId: "char-beenie",
      targetId: "story-guardioes",
      label: "Antagonista",
    },
    {
      id: "r3",
      sourceId: "char-beenie",
      targetId: "story-guardioes",
      label: "Mentor",
    },
    {
      id: "r4",
      sourceId: "char-beenie",
      targetId: "story-guardioes",
      label: "Aliado",
    },
    {
      id: "r5",
      sourceId: "char-beenie",
      targetId: "story-guardioes",
      label: "Coadjuvante",
    },
  ];

  const ws: StudioWorkspace = {
    entities: [beenie, story],
    relations: conflictingRels,
  };

  const cast = getStoryCastByRole("story-guardioes", ws);
  // assignedCharIds prevents double counting
  assert.equal(
    cast.totalCastCount,
    1,
    "Character must be counted exactly once",
  );
  assert.equal(cast.protagonistas.length, 1);
  assert.equal(cast.antagonistas.length, 0);
  assert.equal(cast.mentores.length, 0);
  assert.equal(cast.aliados.length, 0);
  assert.equal(cast.coadjuvantes.length, 0);
});

test("Challenger 9.2: Inverted relation directionality (story -> character) across role helpers", () => {
  const larry: StudioEntity = {
    ...blankEntity("character"),
    id: "char-larry",
    title: "Larry / Menino Resiliente",
  };
  const story: StudioEntity = {
    ...blankEntity("story"),
    id: "story-menino-resiliente",
    title: "Menino Resiliente",
  };

  // Inverted relation: source is story, target is character
  const invertedRelation: StudioRelation[] = [
    {
      id: "r-inv-mr",
      sourceId: "story-menino-resiliente",
      targetId: "char-larry",
      label: "Protagonista",
    },
  ];

  // 1. getCharacterParticipations resolves inverted relation
  const parts = getCharacterParticipations("char-larry", invertedRelation, [
    larry,
    story,
  ]);
  assert.equal(parts.length, 1);
  assert.equal(parts[0].storyId, "story-menino-resiliente");
  assert.equal(parts[0].role, "Protagonista");

  // 2. getCharacterRoleInStory resolves inverted relation
  const role = getCharacterRoleInStory(
    "char-larry",
    "story-menino-resiliente",
    invertedRelation,
  );
  assert.equal(role, "Protagonista");

  // 3. getStoryCast resolves inverted relation
  const cast = getStoryCast("story-menino-resiliente", invertedRelation, [
    larry,
    story,
  ]);
  assert.equal(cast.Protagonista.length, 1);
  assert.equal(cast.Protagonista[0].character.id, "char-larry");
  assert.equal(
    getStoryCastCount("story-menino-resiliente", invertedRelation, [
      larry,
      story,
    ]),
    1,
  );

  // 4. getStoryCastByRole resolves inverted relation
  const ws: StudioWorkspace = {
    entities: [larry, story],
    relations: invertedRelation,
  };
  const castByRole = getStoryCastByRole("story-menino-resiliente", ws);
  assert.equal(castByRole.totalCastCount, 1);
  assert.equal(castByRole.protagonistas.length, 1);
  assert.equal(castByRole.protagonistas[0].id, "char-larry");
});

test("Challenger 9.3: Appearance matching fallback for cast unassigned resolution", () => {
  const kerry: StudioEntity = {
    ...blankEntity("character"),
    id: "char-kerry",
    title: "Kerry",
    attributes: {
      aparicoes: ["red-right-hand", "marginal"],
    },
  };
  const storyRRH: StudioEntity = {
    ...blankEntity("story"),
    id: "story-red-right-hand",
    title: "Red Right Hand",
  };
  const storyGlac: StudioEntity = {
    ...blankEntity("story"),
    id: "story-glacial",
    title: "O Glacial Fim do Mundo",
  };

  const ws: StudioWorkspace = {
    entities: [kerry, storyRRH, storyGlac],
    relations: [], // No explicit relations
  };

  // 1. getStoryCastByRole resolves Kerry via normStoryId ("red-right-hand") into unassigned
  const castRRH = getStoryCastByRole("story-red-right-hand", ws);
  assert.equal(castRRH.totalCastCount, 1);
  assert.equal(castRRH.unassigned.length, 1);
  assert.equal(castRRH.unassigned[0].id, "char-kerry");

  // Kerry has NO appearance in Glacial -> cast is empty
  const castGlac = getStoryCastByRole("story-glacial", ws);
  assert.equal(castGlac.totalCastCount, 0);
  assert.equal(castGlac.unassigned.length, 0);

  // 2. computeActiveProjects also resolves cast via display title matching ("Red Right Hand")
  const kerryWithTitle: StudioEntity = {
    ...blankEntity("character"),
    id: "char-kerry-title",
    title: "Kerry",
    attributes: {
      aparicoes: ["Red Right Hand (Série)"],
    },
  };
  const wsTitle: StudioWorkspace = {
    entities: [kerryWithTitle, storyRRH],
    relations: [],
  };
  const activeProjects = computeActiveProjects(wsTitle);
  assert.equal(activeProjects[0].castCount, 1);
  assert.equal(activeProjects[0].cast[0].id, "char-kerry-title");
});

test("Challenger 9.4: Narrative role badge styles and color tokens conformance", () => {
  const roles: NarrativeRole[] = [
    "Protagonista",
    "Antagonista",
    "Coadjuvante",
    "Mentor",
    "Aliado",
  ];

  const expectedBorders: Record<NarrativeRole, string> = {
    Protagonista: "#91e3dc",
    Antagonista: "#ff746a",
    Coadjuvante: "#edc993",
    Mentor: "#c084fc",
    Aliado: "#4ade80",
  };

  for (const r of roles) {
    const style = getRoleBadgeStyle(r);
    assert.ok(style.badgeClass.includes(expectedBorders[r].replace("#", "")));
    assert.equal(style.borderHex, expectedBorders[r]);
    assert.equal(style.textHex, expectedBorders[r]);
  }
});

/* =========================================================================
   10. Extreme Canon Consistency & Massive Workspaces
   ========================================================================= */

test("Challenger 10.1: Canon consistency score lower bound clamp (85) and penalty escalation", () => {
  // Construct workspace with 10 entities and 100 broken relations + 10 orphaned concepts
  const entities: StudioEntity[] = Array.from({ length: 10 }, (_, i) => ({
    ...blankEntity("concept"),
    id: `concept-${i}`,
    title: `Conceito Órfão ${i}`,
  }));

  const brokenRelations: StudioRelation[] = Array.from(
    { length: 100 },
    (_, i) => ({
      id: `broken-rel-${i}`,
      sourceId: `ghost-source-${i}`,
      targetId: `ghost-target-${i}`,
      label: "fundamenta",
    }),
  );

  const hostileWs: StudioWorkspace = {
    entities,
    relations: brokenRelations,
  };

  const consistency = calculateCanonConsistency(hostileWs);
  assert.equal(consistency.brokenRelationsCount, 100);
  assert.equal(consistency.orphanedConceptsCount, 10);
  // Score clamped at minimum 85
  assert.equal(consistency.score, 85, "Score must clamp at minimum 85");
  assert.equal(consistency.rating, "REQUER_ATENÇÃO");
  assert.equal(consistency.label, "Revisão Necessária");
});

test("Challenger 10.2: Sparse and disconnected massive workspaces (10,000 entities without relations)", () => {
  const entities: StudioEntity[] = Array.from({ length: 10000 }, (_, i) => ({
    ...blankEntity("character"),
    id: `char-sparse-${i}`,
    title: `Personagem Esparso ${i}`,
  }));

  const sparseWs: StudioWorkspace = {
    entities,
    relations: [],
  };

  const tStart = performance.now();
  const consistency = calculateCanonConsistency(sparseWs);
  const radar = calculateUniverseRadar(sparseWs);
  const tElapsed = performance.now() - tStart;

  assert.equal(consistency.brokenRelationsCount, 0);
  assert.equal(consistency.orphanedConceptsCount, 0);
  assert.equal(consistency.score, 100);
  assert.equal(consistency.rating, "IMPECÁVEL");

  assert.equal(radar.charactersCount, 10000);
  assert.equal(radar.relationsCount, 0);
  assert.equal(radar.connectivityRate, 0);
  assert.ok(
    tElapsed < 150,
    `Evaluating 10,000 entities took ${tElapsed.toFixed(2)}ms (< 150ms)`,
  );
});

test("Challenger 10.3: Date recency resolution under identical timestamps and timezone offsets", () => {
  const nowIso = "2026-10-31T05:00:00.000Z";

  // Two docs with identical updatedAt, but doc-v2 has higher version
  const docV1: StudioEntity = {
    ...blankEntity("document"),
    id: "doc-v1",
    title: "Capítulo Versão 1",
    body: "Texto",
    updatedAt: nowIso,
    version: 1,
  };
  const docV2: StudioEntity = {
    ...blankEntity("document"),
    id: "doc-v2",
    title: "Capítulo Versão 2",
    body: "Texto mais recente",
    updatedAt: nowIso,
    version: 2,
  };

  const ws: StudioWorkspace = {
    entities: [docV1, docV2],
    relations: [],
  };

  const recent = getMostRecentManuscript(ws);
  assert.equal(
    recent?.chapterId,
    "doc-v2",
    "Higher version must win tie-breaker on identical timestamps",
  );
});
