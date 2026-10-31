import test from "node:test";
import assert from "node:assert/strict";
import {
  cosmicEras,
  cosmicEraIds,
  swimlaneIds,
  swimlaneConfigs,
  canonicalBaselineEvents,
  canonicalSyncAnchors,
  timelineEventSchema,
  syncAnchorSchema,
  classifySwimlane,
  classifyEventSwimlane,
  partitionSwimlanes,
  sortTimelineEvents,
  groupEventsByEra,
  groupEventsByEraAndSwimlane,
  filterTimelineEvents,
  normalizeTimelineEvents,
  getSyncAnchors,
  getSyncLinksForEvent,
  getPairedEventId,
  findConcurrentEventPairs,
  computeTimelineStats,
  calculateTimelineMetrics,
  type TimelineEvent,
  type CandidateEvent,
  type CosmicEraId,
} from "../../lib/timeline-swimlanes";
import type { StudioEntity } from "../../lib/workspace";

// Helper to create synthetic StudioEntity events for stress testing
function makeSyntheticEvent(
  id: string,
  overrides: {
    title?: string;
    eraId?: string;
    swimlane?: string;
    scale?: string;
    order?: number;
    local?: string;
    pov?: string;
    personagens?: string[];
    sagaId?: string;
    status?: string;
    syncAnchorId?: string;
    syncTargetEventId?: string;
    attributes?: Record<string, unknown>;
  } = {},
): StudioEntity {
  const {
    title = `Event ${id}`,
    eraId = "ascensao",
    swimlane,
    scale = "TERRA",
    order = 100,
    local = "Glen",
    pov = "Narrador",
    personagens = [],
    sagaId,
    status = "CANONE_TRAVADO",
    syncAnchorId,
    syncTargetEventId,
    attributes = {},
  } = overrides;

  return {
    id,
    kind: "event",
    title,
    summary: `Summary of ${title}`,
    body: `Body description of ${title}`,
    status: "done",
    published: true,
    tags: ["canon", eraId],
    attributes: {
      eraId,
      swimlane,
      escala: scale,
      order,
      local,
      pov,
      personagens,
      sagaId,
      status,
      syncAnchorId,
      syncTargetEventId,
      ...attributes,
    },
    version: 1,
  };
}

// ============================================================================
// SUITE 1: CLASSIFICATION CASCADE & AMBIGUITY STRESS
// ============================================================================

test("Stress 1.1: classifySwimlane precedence hierarchy (Tag > Saga > Local > Cast > Scale > Fallback)", () => {
  assert.deepEqual(swimlaneIds, ["earth", "severum"]);
  assert.ok(swimlaneConfigs.earth.sagas.includes("guardioes"));
  assert.ok(swimlaneConfigs.severum.sagas.includes("red-right-hand"));

  // Case A: Explicit swimlane tag overrides everything (even if local is Severum and saga is Red Right Hand)
  const explicitEarth = classifySwimlane({
    swimlane: "earth",
    sagaId: "red-right-hand",
    local: "Torre RRH de Severum",
    personagens: ["Arner", "Delimitador"],
    scale: "UNIVERSAL",
  });
  assert.equal(
    explicitEarth,
    "earth",
    "Explicit swimlane tag 'earth' must win over Severum cues",
  );

  const explicitSeverum = classifySwimlane({
    attributes: { swimlane: "severum" },
    sagaId: "guardioes",
    local: "Centro de Glen",
    personagens: ["Beenie", "Larry/MR"],
    scale: "TERRA",
  });
  assert.equal(
    explicitSeverum,
    "severum",
    "Attribute swimlane 'severum' must win over Earth cues",
  );

  // Case B: Saga overrides Local, Cast, and Scale
  const sagaEarth = classifySwimlane({
    sagaId: "guardioes",
    local: "Planeta Iutania", // Severum location
    personagens: ["Arner"], // Severum character
    scale: "UNIVERSAL",
  });
  assert.equal(
    sagaEarth,
    "earth",
    "Earth saga must override Severum local and cast",
  );

  const sagaSeverum = classifySwimlane({
    attributes: { serieId: "congregadores" },
    local: "Glen", // Earth location
    personagens: ["Beenie"], // Earth character
    scale: "TERRA",
  });
  assert.equal(
    sagaSeverum,
    "severum",
    "Severum saga must override Earth local and cast",
  );

  // Case C: Local overrides Cast and Scale when saga is neutral/unknown
  const localEarth = classifySwimlane({
    sagaId: "saga-neutra-desconhecida",
    local: "Subúrbios de Glen",
    personagens: ["Arner", "Deroo Da"],
    scale: "UNIVERSAL",
  });
  assert.equal(
    localEarth,
    "earth",
    "Earth location must override Severum characters",
  );

  const localSeverum = classifySwimlane({
    sagaId: "saga-neutra-desconhecida",
    local: "Espaço Cósmico Profundo",
    personagens: ["Beenie", "Kerry"],
    scale: "TERRA",
  });
  assert.equal(
    localSeverum,
    "severum",
    "Severum location must override Earth characters",
  );

  // Case D: Cast decides when saga and local are neutral
  const castEarth = classifySwimlane({
    local: "Zona Neutra",
    personagens: ["Larry-MR", "Desconhecido"],
  });
  assert.equal(castEarth, "earth", "Earth character must classify as earth");

  const castSeverum = classifySwimlane({
    local: "Zona Neutra",
    pov: "Masin Yaa",
  });
  assert.equal(castSeverum, "severum", "Severum POV must classify as severum");

  // Case E: Scale acts as fallback
  assert.equal(classifySwimlane({ scale: "TERRA" }), "earth");
  assert.equal(classifySwimlane({ scale: "UNIVERSAL" }), "severum");

  // Case F: Total ambiguity with default fallback
  assert.equal(
    classifySwimlane({}),
    "severum",
    "Default fallback must be severum",
  );
  assert.equal(
    classifySwimlane({}, { fallback: "earth" }),
    "earth",
    "Custom fallback must be respected",
  );
});

test("Stress 1.2: Ambiguous multi-character ensemble and tie-breaking order", () => {
  // When characters from both realms participate in neutral ground:
  // First matched character in cast array determines swimlane
  const earthFirst = classifySwimlane({
    local: "Limbo Dimensional",
    personagens: ["Beenie", "Arner"],
  });
  assert.equal(earthFirst, "earth");

  const severumFirst = classifySwimlane({
    local: "Limbo Dimensional",
    personagens: ["Arner", "Beenie"],
  });
  assert.equal(severumFirst, "severum");

  // Variations with uppercase, diacritics, and aliases
  assert.equal(classifySwimlane({ personagens: ["PAW FROZ"] }), "earth");
  assert.equal(classifySwimlane({ personagens: ["Cole-Froz"] }), "earth");
  assert.equal(classifySwimlane({ personagens: ["Tsuuya Yaa"] }), "severum");
  assert.equal(classifySwimlane({ personagens: ["Irmaos-Yaa"] }), "severum");
});

test("Stress 1.3: Defensive handling of null, undefined, and malformed candidate objects", () => {
  // Null and undefined candidates
  assert.equal(classifySwimlane(null as unknown as CandidateEvent), "severum");
  assert.equal(
    classifySwimlane(undefined as unknown as CandidateEvent),
    "severum",
  );
  assert.equal(
    classifyEventSwimlane(null as unknown as CandidateEvent),
    "unclassified",
  );
  assert.equal(
    classifyEventSwimlane(undefined as unknown as CandidateEvent),
    "unclassified",
  );

  // Candidate with null/empty attributes
  const emptyAttrs: CandidateEvent = {
    id: "empty-attrs",
    attributes: null,
  };
  assert.doesNotThrow(() => classifySwimlane(emptyAttrs));
  assert.equal(classifySwimlane(emptyAttrs), "severum");

  // Candidate with non-array personagens
  const malformedCast: CandidateEvent = {
    id: "bad-cast",
    personagens: "Beenie" as unknown as string[],
    attributes: { personagens: 42 as unknown as string[] },
  };
  assert.doesNotThrow(() => classifySwimlane(malformedCast));

  // Candidate with invalid swimlane string
  const invalidSwimlane: CandidateEvent = {
    id: "invalid-lane",
    swimlane: "andromeda",
    local: "Glen",
  };
  assert.equal(
    classifySwimlane(invalidSwimlane),
    "earth",
    "Invalid swimlane string should fall through to local",
  );

  // Non-string primitive edge cases in sagaId / local
  const nonStringSaga: CandidateEvent = {
    id: "num-saga",
    sagaId: 123 as unknown as string,
  };
  assert.throws(
    () => classifySwimlane(nonStringSaga),
    /toLowerCase/,
    "Unchecked non-string sagaId causes TypeError when .toLowerCase() is called",
  );

  const nonStringLocal: CandidateEvent = {
    id: "num-loc",
    local: 999 as unknown as string,
  };
  assert.throws(
    () => classifySwimlane(nonStringLocal),
    /toLowerCase/,
    "Unchecked non-string local causes TypeError when .toLowerCase() is called",
  );
});

// ============================================================================
// SUITE 2: LARGE DATASET SCALING & STRESS PERFORMANCE
// ============================================================================

test("Stress 2.1: Performance under heavy scale (500 synthetic entities)", () => {
  const count = 500;
  const entities: StudioEntity[] = [];

  for (let i = 0; i < count; i++) {
    const isEarth = i % 2 === 0;
    const eraIndex = i % cosmicEraIds.length;
    entities.push(
      makeSyntheticEvent(`synthetic-${i}`, {
        title: `Synthetic Event ${i}`,
        eraId: cosmicEraIds[eraIndex],
        scale: isEarth ? "TERRA" : "UNIVERSAL",
        local: isEarth ? "Glen" : "Severum",
        personagens: isEarth ? ["Beenie", "Larry/MR"] : ["Arner", "Deroo Da"],
        order: (i * 7) % 500,
        status:
          i % 3 === 0
            ? "CANONE_TRAVADO"
            : i % 3 === 1
              ? "EM_REVISAO"
              : "RASCUNHO",
      }),
    );
  }

  // 1. Benchmark Partition
  const t0 = performance.now();
  const { earthLane, severumLane, unclassified } = partitionSwimlanes(entities);
  const tPartition = performance.now() - t0;

  assert.equal(earthLane.length, 250);
  assert.equal(severumLane.length, 250);
  assert.equal(unclassified.length, 0);
  assert.ok(
    tPartition < 30,
    `Partitioning 500 items took ${tPartition.toFixed(2)}ms (expected < 30ms)`,
  );

  // 2. Benchmark Sort
  const t1 = performance.now();
  const sorted = sortTimelineEvents(entities, cosmicEras);
  const tSort = performance.now() - t1;

  assert.equal(sorted.length, 500);
  assert.ok(
    tSort < 40,
    `Sorting 500 items took ${tSort.toFixed(2)}ms (expected < 40ms)`,
  );

  // 3. Benchmark Group by Era & Swimlane
  const t2 = performance.now();
  const matrix = groupEventsByEraAndSwimlane(
    sorted.map((e) => ({
      id: e.id,
      titulo: e.title,
      resumo: e.summary,
      eraId: (e.attributes.eraId as CosmicEraId) || "ascensao",
      swimlane: classifySwimlane(e),
      scale: (e.attributes.escala as "TERRA" | "UNIVERSAL") || "TERRA",
      order: (e.attributes.order as number) || 100,
      local: (e.attributes.local as string) || "Glen",
      pov: "Narrador",
      personagens: (e.attributes.personagens as string[]) || [],
      status: "CANONE_TRAVADO",
    })),
    cosmicEras,
  );
  const tGroup = performance.now() - t2;

  assert.equal(matrix.length, 5);
  let totalInMatrix = 0;
  for (const m of matrix) {
    totalInMatrix += m.earthEvents.length + m.severumEvents.length;
  }
  assert.equal(totalInMatrix, 500);
  assert.ok(
    tGroup < 30,
    `Grouping 500 items took ${tGroup.toFixed(2)}ms (expected < 30ms)`,
  );

  // 4. Benchmark normalizeTimelineEvents with 500 entities
  const t3 = performance.now();
  const normalized = normalizeTimelineEvents(entities);
  const tNormalize = performance.now() - t3;

  assert.ok(normalized.length >= 500);
  assert.ok(
    tNormalize < 60,
    `Normalizing 500 items took ${tNormalize.toFixed(2)}ms (expected < 60ms)`,
  );
});

test("Stress 2.2: Compute stats with extreme distributions (All-Earth, All-Severum, and 50/50)", () => {
  // Empty
  const emptyStats = computeTimelineStats([]);
  assert.equal(emptyStats.totalEvents, 0);
  assert.equal(emptyStats.ratioEarthPercent, 50);
  assert.equal(emptyStats.ratioSeverumPercent, 50);
  assert.equal(emptyStats.lockedPercent, 0);

  // All Earth (100 events)
  const allEarth: CandidateEvent[] = Array.from({ length: 100 }, (_, i) => ({
    id: `earth-${i}`,
    swimlane: "earth",
    eraId: "formacao",
    status: "CANONE_TRAVADO",
  }));
  const earthStats = computeTimelineStats(allEarth);
  assert.equal(earthStats.totalEvents, 100);
  assert.equal(earthStats.earthCount, 100);
  assert.equal(earthStats.severumCount, 0);
  assert.equal(earthStats.ratioEarthPercent, 100);
  assert.equal(earthStats.ratioSeverumPercent, 0);
  assert.equal(earthStats.lockedPercent, 100);
  assert.equal(earthStats.byEra["formacao"].earth, 100);
  assert.equal(earthStats.byEra["formacao"].severum, 0);

  // All Severum (50 events, all draft)
  const allSeverum: CandidateEvent[] = Array.from({ length: 50 }, (_, i) => ({
    id: `sev-${i}`,
    swimlane: "severum",
    eraId: "renegacao",
    status: "RASCUNHO",
  }));
  const sevStats = computeTimelineStats(allSeverum);
  assert.equal(sevStats.totalEvents, 50);
  assert.equal(sevStats.earthCount, 0);
  assert.equal(sevStats.severumCount, 50);
  assert.equal(sevStats.ratioEarthPercent, 0);
  assert.equal(sevStats.ratioSeverumPercent, 100);
  assert.equal(sevStats.lockedPercent, 0);
  assert.equal(sevStats.draftCount, 50);

  // Alias verification
  assert.deepEqual(calculateTimelineMetrics(allEarth), earthStats);
});

// ============================================================================
// SUITE 3: 6 SYNC ANCHORS INTEGRITY & DANGLING LINK TOLERANCE
// ============================================================================

test("Stress 3.1: Strict validation of 6 Canonical Sync Anchors against Zod schema", () => {
  assert.equal(canonicalSyncAnchors.length, 6);
  const anchors = getSyncAnchors();
  assert.equal(anchors.length, 6, "Must define exactly 6 sync anchors");

  for (const anchor of anchors) {
    const parseResult = syncAnchorSchema.safeParse(anchor);
    assert.ok(
      parseResult.success,
      `Anchor ${anchor.id} failed schema validation: ${JSON.stringify(parseResult.error)}`,
    );
    assert.ok(
      anchor.title.length > 5,
      `Anchor ${anchor.id} has insufficient title`,
    );
    assert.ok(
      anchor.description.length > 15,
      `Anchor ${anchor.id} has insufficient description`,
    );
  }
});

test("Stress 3.2: Complete era coverage of the 6 Sync Anchors", () => {
  const anchors = getSyncAnchors();
  const representedEras = new Set(anchors.map((a) => a.eraId));

  // Check that every one of the 5 cosmic eras has at least one anchor
  for (const eraId of cosmicEraIds) {
    assert.ok(
      representedEras.has(eraId),
      `Cosmic era '${eraId}' has no synchronisation anchor`,
    );
  }

  // Era distribution check
  const eraCounts = anchors.reduce<Record<string, number>>((acc, a) => {
    acc[a.eraId] = (acc[a.eraId] || 0) + 1;
    return acc;
  }, {});

  assert.equal(eraCounts["pre-universal"], 1);
  assert.equal(eraCounts["formacao"], 1);
  assert.equal(
    eraCounts["ascensao"],
    2,
    "Ascensão should have 2 anchors (Kerry/RRH and Larry/Iutania)",
  );
  assert.equal(eraCounts["redencao"], 1);
  assert.equal(eraCounts["renegacao"], 1);
});

test("Stress 3.3: Bidirectional link resolution and identity symmetry", () => {
  const anchors = getSyncAnchors();

  for (const anchor of anchors) {
    // earth -> severum
    const forwardPaired = getPairedEventId(anchor.earthEventId, anchors);
    assert.equal(
      forwardPaired,
      anchor.severumEventId,
      `Forward pair mismatch for anchor ${anchor.id}`,
    );

    // severum -> earth
    const reversePaired = getPairedEventId(anchor.severumEventId, anchors);
    assert.equal(
      reversePaired,
      anchor.earthEventId,
      `Reverse pair mismatch for anchor ${anchor.id}`,
    );

    // Links query
    const earthLinks = getSyncLinksForEvent(anchor.earthEventId, anchors);
    assert.ok(earthLinks.some((l) => l.id === anchor.id));

    const severumLinks = getSyncLinksForEvent(anchor.severumEventId, anchors);
    assert.ok(severumLinks.some((l) => l.id === anchor.id));
  }
});

test("Stress 3.4: Dangling and missing link tolerance in findConcurrentEventPairs", () => {
  const anchors = getSyncAnchors();

  // Test 1: Query with unknown event ID
  assert.equal(getPairedEventId("non-existent-event-id", anchors), undefined);
  assert.deepEqual(getSyncLinksForEvent("non-existent-event-id", anchors), []);

  // Test 2: Dataset where only Earth event exists (Severum side is missing/deleted)
  const partialEvents: CandidateEvent[] = [
    {
      id: "event-earth-pre-01",
      titulo: "Gênese Planetária Terrestre",
      swimlane: "earth",
      eraId: "pre-universal",
    },
  ];

  // findConcurrentEventPairs should gracefully drop anchors with missing endpoints
  const pairs = findConcurrentEventPairs(partialEvents, anchors);
  assert.equal(
    pairs.length,
    0,
    "Should not form a pair when one endpoint is missing from the dataset",
  );

  // Test 3: Dataset with both endpoints present
  const completePairEvents: CandidateEvent[] = [
    {
      id: "event-earth-pre-01",
      titulo: "Gênese Planetária Terrestre",
      swimlane: "earth",
      eraId: "pre-universal",
    },
    {
      id: "event-cosmic-pre-01",
      titulo: "A Luz de Ormuz",
      swimlane: "severum",
      eraId: "pre-universal",
    },
  ];

  const validPairs = findConcurrentEventPairs(completePairEvents, anchors);
  assert.equal(validPairs.length, 1);
  assert.equal(validPairs[0].id, "sync-anchor-genesis");
  assert.equal(validPairs[0].earthEventId, "event-earth-pre-01");
  assert.equal(validPairs[0].severumEventId, "event-cosmic-pre-01");

  // Test 4: Custom direct pairing via syncTargetEventId with dangling target
  const danglingDirectTarget: CandidateEvent[] = [
    {
      id: "event-custom-01",
      swimlane: "earth",
      syncTargetEventId: "ghost-target-999", // does not exist in dataset
    },
  ];
  const danglingPairs = findConcurrentEventPairs(danglingDirectTarget, anchors);
  assert.equal(
    danglingPairs.length,
    0,
    "Dangling syncTargetEventId must not produce invalid pair",
  );
});

test("Stress 3.5: Custom syncMarker resolution between arbitrary events", () => {
  const customEvents: CandidateEvent[] = [
    {
      id: "ev-earth-custom",
      swimlane: "earth",
      attributes: { syncMarker: "marker-cosmic-eclipse" },
    },
    {
      id: "ev-sev-custom",
      swimlane: "severum",
      attributes: { syncMarker: "marker-cosmic-eclipse" },
    },
  ];

  const pairs = findConcurrentEventPairs(customEvents, []);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].earthEventId, "ev-earth-custom");
  assert.equal(pairs[0].severumEventId, "ev-sev-custom");
  assert.equal(pairs[0].syncMarker, "marker-cosmic-eclipse");
});

// ============================================================================
// SUITE 4: BOUNDARY & DEGENERATE CONDITIONS
// ============================================================================

test("Stress 4.1: Canonical Baseline Events strictly conform to timelineEventSchema", () => {
  assert.equal(canonicalBaselineEvents.length, 11);

  for (const ev of canonicalBaselineEvents) {
    const parseResult = timelineEventSchema.safeParse(ev);
    assert.ok(
      parseResult.success,
      `Canonical event ${ev.id} failed schema validation: ${JSON.stringify(parseResult.error)}`,
    );
    assert.ok(ev.titulo.length > 0);
    assert.ok(ev.resumo.length > 0);
    assert.ok(ev.local.length > 0);
    assert.ok(ev.pov.length > 0);
  }
});

test("Stress 4.2: Handling unknown, missing, and corrupted Era IDs in sort and group", () => {
  const corruptedEvents: CandidateEvent[] = [
    { id: "e-valid-1", title: "Valid Formacao", eraId: "formacao", order: 10 },
    { id: "e-corrupt-1", title: "Era Null", eraId: undefined, order: 20 },
    {
      id: "e-corrupt-2",
      title: "Era Unknown",
      eraId: "era-alienigena",
      order: 30,
    },
    { id: "e-valid-2", title: "Valid Renegacao", eraId: "renegacao", order: 5 },
  ];

  // Sorting: unknown eras get order 999 and are placed at the end
  const sorted = sortTimelineEvents(corruptedEvents, cosmicEras);
  assert.equal(sorted[0].id, "e-valid-1"); // formacao (ordem 2)
  assert.equal(sorted[1].id, "e-valid-2"); // renegacao (ordem 5)
  // Corrupted events placed after valid eras
  assert.ok(sorted.findIndex((e) => e.id === "e-corrupt-1") >= 2);
  assert.ok(sorted.findIndex((e) => e.id === "e-corrupt-2") >= 2);

  // Grouping: groupEventsByEra should not crash and should skip unknown eras
  const grouped = groupEventsByEra(corruptedEvents, cosmicEras);
  assert.equal(
    grouped["formacao"].earthEvents.length +
      grouped["formacao"].severumEvents.length,
    1,
  );
  assert.equal(
    grouped["renegacao"].earthEvents.length +
      grouped["renegacao"].severumEvents.length,
    1,
  );
});

test("Stress 4.3: Unranked beats and duplicate order values maintain deterministic sort", () => {
  const unrankedEvents: CandidateEvent[] = [
    { id: "c-event", title: "C Event", eraId: "ascensao" }, // order defaults to 100
    { id: "a-event", title: "A Event", eraId: "ascensao" }, // order defaults to 100
    { id: "b-event", title: "B Event", eraId: "ascensao" }, // order defaults to 100
    { id: "early-event", title: "Early Event", eraId: "ascensao", order: 10 },
  ];

  const sorted1 = sortTimelineEvents(unrankedEvents, cosmicEras);
  const sorted2 = sortTimelineEvents([...unrankedEvents].reverse(), cosmicEras);

  // Early event must be first
  assert.equal(sorted1[0].id, "early-event");
  assert.equal(sorted2[0].id, "early-event");

  // Remaining unranked events with equal order (100) must sort alphabetically by title
  assert.equal(sorted1[1].id, "a-event");
  assert.equal(sorted1[2].id, "b-event");
  assert.equal(sorted1[3].id, "c-event");

  // Determinism check: sorting reversed array yields identical result
  assert.deepEqual(
    sorted1.map((e) => e.id),
    sorted2.map((e) => e.id),
    "Sorting unranked beats must be strictly deterministic regardless of input order",
  );
});

// ============================================================================
// SUITE 5: FILTERING & MULTI-DIMENSIONAL QUERY STRESS
// ============================================================================

test("Stress 5.1: Accent-insensitive and case-insensitive search with Portuguese characters", () => {
  const events: TimelineEvent[] = [
    {
      id: "ev-1",
      titulo: "Operação Antártida Glacial",
      resumo: "Confronto contra Cole Froz no gelo",
      eraId: "redencao",
      swimlane: "earth",
      scale: "TERRA",
      order: 10,
      local: "Antártida",
      pov: "Beenie",
      personagens: ["Beenie", "Cole Froz"],
      status: "CANONE_TRAVADO",
    },
    {
      id: "ev-2",
      titulo: "A Mente de Ormuz e a Dimensão Primordial",
      resumo: "Criação das leis cósmicas e casualidade",
      eraId: "pre-universal",
      swimlane: "severum",
      scale: "UNIVERSAL",
      order: 20,
      local: "Cosmos Primordial",
      pov: "Ormuz",
      personagens: ["Ormuz"],
      status: "CANONE_TRAVADO",
    },
  ];

  // Searching "antartida" (no accent) matches "Antártida"
  const r1 = filterTimelineEvents(events, { searchQuery: "antartida" });
  assert.equal(r1.length, 1);
  assert.equal(r1[0].id, "ev-1");

  // Searching "dimensao" (no tilde) matches "Dimensão"
  const r2 = filterTimelineEvents(events, { searchQuery: "dimensao" });
  assert.equal(r2.length, 1);
  assert.equal(r2[0].id, "ev-2");

  // Searching "GLACIAL" (uppercase) matches "glacial"
  const r3 = filterTimelineEvents(events, { searchQuery: "GLACIAL" });
  assert.equal(r3.length, 1);
  assert.equal(r3[0].id, "ev-1");
});

test("Stress 5.2: Search query with extreme symbols and regex metacharacters", () => {
  const events: TimelineEvent[] = [
    {
      id: "ev-1",
      titulo: "Evento [Especial] (v1.0) + Teste *",
      resumo: "Resumo com $100 dólares e ^início?",
      eraId: "ascensao",
      swimlane: "earth",
      scale: "TERRA",
      order: 10,
      local: "Glen",
      pov: "Narrador",
      personagens: [],
      status: "CANONE_TRAVADO",
    },
  ];

  // Raw regex metacharacters should not trigger SyntaxError
  assert.doesNotThrow(() => {
    filterTimelineEvents(events, { searchQuery: "[.*+?^${}()|]" });
    filterTimelineEvents(events, { searchQuery: "+++" });
    filterTimelineEvents(events, { searchQuery: "\\\\\\\\" });
  });

  // Substring match with bracket
  const matchBracket = filterTimelineEvents(events, {
    searchQuery: "[especial]",
  });
  assert.equal(matchBracket.length, 1);
});

test("Stress 5.3: Multi-dimensional combination filter (era + swimlane + status + saga)", () => {
  const events = normalizeTimelineEvents();

  // Find all locked events in Ascensão on the Severum swimlane
  const filtered = filterTimelineEvents(events, {
    eraId: "ascensao",
    swimlane: "severum",
    status: "CANONE_TRAVADO",
  });

  assert.ok(filtered.length > 0);
  for (const ev of filtered) {
    assert.equal(ev.eraId, "ascensao");
    assert.equal(ev.swimlane, "severum");
    assert.equal(ev.status, "CANONE_TRAVADO");
  }

  // Find events for character "Larry"
  const larryEvents = filterTimelineEvents(events, {
    character: "Larry",
  });
  assert.ok(
    larryEvents.length >= 2,
    "Larry should appear in multiple canonical events",
  );
  for (const ev of larryEvents) {
    const isLarryInvolved =
      ev.personagens.some((p) => p.toLowerCase().includes("larry")) ||
      ev.pov.toLowerCase().includes("larry");
    assert.ok(isLarryInvolved);
  }
});

// ============================================================================
// SUITE 6: NORMALIZATION CONVERGENCE & WORKSPACE MERGING
// ============================================================================

test("Stress 6.1: normalizeTimelineEvents merges workspace override correctly over baseline", () => {
  // Create an entity with the exact ID of a baseline event to test merging
  const overrideTitle = "A Verdadeira Luz de Ormuz (Editado no Studio)";
  const customOrder = 5;
  const workspaceOverride: StudioEntity = {
    id: "event-cosmic-pre-01", // Existing baseline ID
    kind: "event",
    title: overrideTitle,
    summary: "Resumo atualizado no Workspace",
    body: "Corpo detalhado expandido",
    status: "ready", // maps to CANONE_TRAVADO
    published: true,
    tags: ["canon", "override"],
    attributes: {
      eraId: "pre-universal",
      order: customOrder,
      local: "Trono Supremo de Ormuz",
    },
    version: 2,
  };

  const normalized = normalizeTimelineEvents([workspaceOverride]);
  const overridden = normalized.find((e) => e.id === "event-cosmic-pre-01");

  assert.ok(overridden, "Overridden event must exist in normalized list");
  assert.equal(overridden.titulo, overrideTitle);
  assert.equal(overridden.order, customOrder);
  assert.equal(overridden.local, "Trono Supremo de Ormuz");
  assert.equal(overridden.source, "uvc_entities");
  // Ensure total count didn't duplicate
  const duplicates = normalized.filter((e) => e.id === "event-cosmic-pre-01");
  assert.equal(
    duplicates.length,
    1,
    "Must not produce duplicate IDs when merging workspace",
  );
});

test("Stress 6.2: normalizeTimelineEvents skips workspace entities that represent Eras", () => {
  const eraEntity: StudioEntity = {
    id: "era-ascensao-entity",
    kind: "event",
    title: "Entidade Representativa de Era",
    summary: "Esta entidade representa a era e não um evento em si",
    body: "",
    status: "done",
    published: true,
    tags: [],
    attributes: {
      era: true, // Marker for cosmic era entity
      eraId: "ascensao",
    },
    version: 1,
  };

  const normalized = normalizeTimelineEvents([eraEntity]);
  const found = normalized.find((e) => e.id === "era-ascensao-entity");
  assert.equal(
    found,
    undefined,
    "Entities with attributes.era === true must be skipped",
  );
});

test("Stress 6.3: normalizeTimelineEvents ignores non-event workspace entities (character, concept, story)", () => {
  const nonEvents: StudioEntity[] = [
    {
      id: "char-beenie",
      kind: "character",
      title: "Beenie",
      summary: "",
      body: "",
      status: "done",
      published: true,
      tags: [],
      attributes: {},
      version: 1,
    },
    {
      id: "concept-planetas-cegos",
      kind: "concept",
      title: "Planetas Cegos",
      summary: "",
      body: "",
      status: "done",
      published: true,
      tags: [],
      attributes: {},
      version: 1,
    },
    {
      id: "story-rrh",
      kind: "story",
      title: "Red Right Hand",
      summary: "",
      body: "",
      status: "done",
      published: true,
      tags: [],
      attributes: {},
      version: 1,
    },
  ];

  const baseCount = normalizeTimelineEvents([]).length;
  const mergedCount = normalizeTimelineEvents(nonEvents).length;
  assert.equal(
    mergedCount,
    baseCount,
    "Non-event entities must not pollute normalized timeline",
  );
});

// ============================================================================
// SUITE 7: OUT-OF-ORDER ERAS, EXTREME TIMESTAMPS, AND CHRONOLOGICAL STABILITY
// ============================================================================

test("Stress 7.1: Sorting events with extreme negative, zero, and out-of-bounds orders", () => {
  const eventsWithExtremeOrders: CandidateEvent[] = [
    {
      id: "e-pos-large",
      title: "Ordem 99999",
      eraId: "ascensao",
      order: 99999,
    },
    { id: "e-zero", title: "Ordem Zero", eraId: "ascensao", order: 0 },
    { id: "e-neg-large", title: "Ordem -500", eraId: "ascensao", order: -500 },
    { id: "e-neg-small", title: "Ordem -1", eraId: "ascensao", order: -1 },
    { id: "e-pos-small", title: "Ordem 10", eraId: "ascensao", order: 10 },
    { id: "e-default-b", title: "Beta Sem Ordem", eraId: "ascensao" }, // defaults to 100
    { id: "e-default-a", title: "Alpha Sem Ordem", eraId: "ascensao" }, // defaults to 100
  ];

  const sorted = sortTimelineEvents(eventsWithExtremeOrders, cosmicEras);

  assert.equal(sorted[0].id, "e-neg-large", "-500 order must sort 1st");
  assert.equal(sorted[1].id, "e-neg-small", "-1 order must sort 2nd");
  assert.equal(sorted[2].id, "e-zero", "0 order must sort 3rd");
  assert.equal(sorted[3].id, "e-pos-small", "10 order must sort 4th");
  // Both default orders (100) are tie-broken alphabetically by title: "Alpha Sem Ordem" before "Beta Sem Ordem"
  assert.equal(
    sorted[4].id,
    "e-default-a",
    "Alpha Sem Ordem must precede Beta Sem Ordem",
  );
  assert.equal(
    sorted[5].id,
    "e-default-b",
    "Beta Sem Ordem follows Alpha Sem Ordem",
  );
  assert.equal(sorted[6].id, "e-pos-large", "99999 order must sort last");
});

test("Stress 7.2: Custom eras arrays with inverted order, duplicate order, or negative era orders", () => {
  // Invert era order: Renegacao is 1, Ascensao is 2, Pre-Universal is 5
  const invertedEras = [
    { id: "renegacao", ordem: 1 },
    { id: "redencao", ordem: 2 },
    { id: "ascensao", ordem: 3 },
    { id: "formacao", ordem: 4 },
    { id: "pre-universal", ordem: 5 },
  ];

  const mixedEvents: CandidateEvent[] = [
    {
      id: "ev-pre",
      title: "Evento Pré-Universal",
      eraId: "pre-universal",
      order: 10,
    },
    { id: "ev-ren", title: "Evento Renegação", eraId: "renegacao", order: 10 },
    { id: "ev-asc", title: "Evento Ascensão", eraId: "ascensao", order: 10 },
  ];

  const sorted = sortTimelineEvents(mixedEvents, invertedEras);

  assert.equal(
    sorted[0].id,
    "ev-ren",
    "Renegacao must sort 1st with custom era order 1",
  );
  assert.equal(
    sorted[1].id,
    "ev-asc",
    "Ascensao must sort 2nd with custom era order 3",
  );
  assert.equal(
    sorted[2].id,
    "ev-pre",
    "Pre-Universal must sort 3rd with custom era order 5",
  );

  // Event with eraId not in custom eras array gets order 999 and falls to the end
  const withUnknownEra: CandidateEvent[] = [
    {
      id: "ev-unknown",
      title: "Era Desconhecida",
      eraId: "era-inexistente",
      order: 1,
    },
    { id: "ev-known", title: "Era Conhecida", eraId: "renegacao", order: 50 },
  ];
  const sortedUnknown = sortTimelineEvents(withUnknownEra, invertedEras);
  assert.equal(sortedUnknown[0].id, "ev-known");
  assert.equal(
    sortedUnknown[1].id,
    "ev-unknown",
    "Unrecognized era must sort to the end",
  );
});

test("Stress 7.3: Out-of-order era assignments in mixed datasets with unclassified swimlanes", () => {
  const scrambledEvents: CandidateEvent[] = [
    { id: "e5", title: "E5", eraId: "renegacao", order: 1 },
    { id: "e1", title: "E1", eraId: "pre-universal", order: 1 },
    { id: "e4", title: "E4", eraId: "redencao", order: 1 },
    { id: "e2", title: "E2", eraId: "formacao", order: 1 },
    { id: "e3", title: "E3", eraId: "ascensao", order: 1 },
  ];

  const grouped = groupEventsByEraAndSwimlane(
    scrambledEvents.map((ev) => ({
      id: ev.id!,
      titulo: ev.title!,
      resumo: "Resumo",
      eraId: ev.eraId as CosmicEraId,
      swimlane: "earth",
      scale: "TERRA",
      order: ev.order as number,
      local: "Glen",
      pov: "Narrador",
      personagens: [],
      status: "CANONE_TRAVADO",
    })),
    cosmicEras,
  );

  assert.equal(grouped.length, 5);
  assert.equal(
    grouped[0].era.id,
    "pre-universal",
    "Index 0 must be pre-universal",
  );
  assert.equal(grouped[1].era.id, "formacao", "Index 1 must be formacao");
  assert.equal(grouped[2].era.id, "ascensao", "Index 2 must be ascensao");
  assert.equal(grouped[3].era.id, "redencao", "Index 3 must be redencao");
  assert.equal(grouped[4].era.id, "renegacao", "Index 4 must be renegacao");
});

test("Stress 7.4: Self-referential and circular syncTargetEventId links", () => {
  // Circular pair: event A targets event B, and event B targets event A
  const circularEvents: CandidateEvent[] = [
    {
      id: "ev-earth-circ",
      swimlane: "earth",
      syncTargetEventId: "ev-sev-circ",
    },
    {
      id: "ev-sev-circ",
      swimlane: "severum",
      syncTargetEventId: "ev-earth-circ",
    },
  ];

  const pairs = findConcurrentEventPairs(circularEvents, []);
  // processedKeys prevents duplicate entries: exactly 1 pair should be created
  assert.equal(
    pairs.length,
    1,
    "Circular syncTargetEventId between Earth and Severum must be deduplicated to 1 pair",
  );
  assert.equal(pairs[0].earthEventId, "ev-earth-circ");
  assert.equal(pairs[0].severumEventId, "ev-sev-circ");
});

test("Stress 7.5: Multi-event syncMarker collisions across same and mixed swimlanes", () => {
  const multiMarkerEvents: CandidateEvent[] = [
    {
      id: "ev-earth-m1",
      swimlane: "earth",
      attributes: { syncMarker: "convergencia-compartilhada" },
    },
    {
      id: "ev-earth-m2",
      swimlane: "earth",
      attributes: { syncMarker: "convergencia-compartilhada" },
    },
    {
      id: "ev-sev-m1",
      swimlane: "severum",
      attributes: { syncMarker: "convergencia-compartilhada" },
    },
  ];

  const pairs = findConcurrentEventPairs(multiMarkerEvents, []);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].severumEventId, "ev-sev-m1");
  // Last processed earth event with that marker becomes the partner
  assert.equal(pairs[0].earthEventId, "ev-earth-m2");
  assert.equal(pairs[0].syncMarker, "convergencia-compartilhada");
});

test("Stress 7.6: Resiliency of normalizeTimelineEvents against null attributes and malformed beats", () => {
  const hostileEntities: StudioEntity[] = [
    {
      id: "event-null-attrs",
      kind: "event",
      title: "Evento Com Atributos Nulos",
      summary: "Resumo",
      body: "Corpo",
      status: "draft",
      published: true,
      tags: [],
      attributes: null as unknown as Record<string, unknown>,
      version: 1,
    },
    {
      id: "event-unknown-status",
      kind: "event",
      title: "Evento Com Status Desconhecido",
      summary: "Resumo",
      body: "Corpo",
      status: "draft",
      published: true,
      tags: [],
      attributes: {
        status: "STATUS_INVENTADO",
        eraId: "ascensao",
      },
      version: 1,
    },
  ];

  // Must not throw when normalizing entities with null attributes
  assert.doesNotThrow(() => {
    const normalized = normalizeTimelineEvents(hostileEntities);
    const evNull = normalized.find((e) => e.id === "event-null-attrs");
    assert.ok(evNull, "Event with null attributes must be normalized cleanly");
    assert.equal(evNull.eraId, "ascensao", "Defaults to ascensao");
    assert.equal(evNull.swimlane, "severum", "Falls back to severum");

    const evStatus = normalized.find((e) => e.id === "event-unknown-status");
    assert.ok(evStatus);
    assert.equal(
      evStatus.status,
      "RASCUNHO",
      "Unknown status falls back to RASCUNHO",
    );
  });
});
