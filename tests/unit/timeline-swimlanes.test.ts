import test from "node:test";
import assert from "node:assert/strict";
import timelineData from "../../data/timeline.json";
import { seedEntities } from "../../lib/workspace-seed";
import type { StudioEntity } from "../../lib/workspace";
import {
  cosmicEras,
  cosmicEraIds,
  swimlaneIds,
  swimlaneConfigs,
  canonicalBaselineEvents,
  canonicalSyncAnchors,
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
  type CosmicEra,
  type CosmicEraId,
  type EventScale,
} from "../../lib/timeline-swimlanes";

// Fixture helper
function createMockEvent(
  id: string,
  title: string,
  eraId: string,
  scale: string,
  local: string,
  extra: Record<string, unknown> = {},
): StudioEntity {
  return {
    id,
    kind: "event",
    title,
    summary: `Resumo de ${title}`,
    body: `Corpo completo de ${title}`,
    status: "review",
    published: false,
    tags: [],
    attributes: {
      eraId,
      escala: scale,
      local,
      order: 1,
      ...extra,
    },
    version: 0,
  };
}

test("Unit 0: Constantes e Taxonomias Canônicas de Raias e Eras", () => {
  assert.equal(swimlaneIds.length, 2);
  assert.ok(swimlaneConfigs.earth);
  assert.ok(swimlaneConfigs.severum);
  assert.ok(canonicalBaselineEvents.length >= 10);
  assert.equal(canonicalSyncAnchors.length, 6);
});

test("Unit 1: Classificação canônica de eventos na Raia 1 (Terra/Glen)", () => {
  const earthEvent = createMockEvent(
    "event-earth-01",
    "Chegada de Beenie em Glen",
    "formacao",
    "TERRA",
    "Glen",
    { personagens: ["Beenie", "Kevin"], storyId: "story-guardioes" },
  );
  assert.equal(classifyEventSwimlane(earthEvent), "earth");
  assert.equal(classifySwimlane(earthEvent), "earth");

  // Variações adicionais por saga e local
  assert.equal(classifySwimlane({ sagaId: "menino-resiliente" }), "earth");
  assert.equal(classifySwimlane({ sagaId: "kerry" }), "earth");
  assert.equal(classifySwimlane({ sagaId: "marginal" }), "earth");
  assert.equal(classifySwimlane({ local: "Subúrbios de Glen" }), "earth");
  assert.equal(classifySwimlane({ local: "Antártida" }), "earth");
  assert.equal(classifySwimlane({ personagens: ["Larry/MR"] }), "earth");
  assert.equal(classifySwimlane({ pov: "Kerry" }), "earth");
});

test("Unit 2: Classificação canônica de eventos na Raia 2 (Severum/Espaço Profundo)", () => {
  const severumEvent = createMockEvent(
    "event-severum-01",
    "Origem de Severum e as 35 Teses",
    "ascensao",
    "UNIVERSAL",
    "Severum",
    { personagens: ["Arner", "Deroo Da"], storyId: "story-red-right-hand" },
  );
  assert.equal(classifyEventSwimlane(severumEvent), "severum");
  assert.equal(classifySwimlane(severumEvent), "severum");

  // Variações adicionais por saga, local e elenco
  assert.equal(classifySwimlane({ sagaId: "congregadores" }), "severum");
  assert.equal(classifySwimlane({ sagaId: "punho-mortal" }), "severum");
  assert.equal(classifySwimlane({ sagaId: "deroo-da-no-espaco" }), "severum");
  assert.equal(classifySwimlane({ local: "Planeta Iutania" }), "severum");
  assert.equal(
    classifySwimlane({ local: "Espaço Cósmico Profundo" }),
    "severum",
  );
  assert.equal(classifySwimlane({ personagens: ["Ciecon", "Rex"] }), "severum");
  assert.equal(classifySwimlane({ pov: "Naok" }), "severum");
});

test("Unit 3: Particionamento estrito de coleção mista em raias paralelas sem perda de itens", () => {
  const mixed: StudioEntity[] = [
    createMockEvent("e1", "Evento Terra 1", "formacao", "TERRA", "Glen"),
    createMockEvent("e2", "Evento Terra 2", "ascensao", "TERRA", "Glen"),
    createMockEvent(
      "s1",
      "Evento Severum 1",
      "ascensao",
      "UNIVERSAL",
      "Severum",
    ),
    createMockEvent(
      "s2",
      "Evento Severum 2",
      "ascensao",
      "UNIVERSAL",
      "Espaço Profundo",
    ),
    createMockEvent("u1", "Evento Sem Escala", "redencao", "", ""),
  ];
  const { earthLane, severumLane, unclassified } = partitionSwimlanes(mixed);
  assert.equal(earthLane.length, 2);
  assert.equal(severumLane.length, 2);
  assert.equal(unclassified.length, 1);
  assert.equal(
    earthLane.length + severumLane.length + unclassified.length,
    mixed.length,
  );
});

test("Unit 4: Ordenação cronológica estável sobre as 5 Eras Cósmicas e ordem interna", () => {
  const eras: readonly CosmicEra[] = cosmicEras;
  const events: StudioEntity[] = [
    createMockEvent("e-renegacao", "Fim", "renegacao", "UNIVERSAL", "Severum", {
      order: 500,
    }),
    createMockEvent("e-pre", "Origem", "pre-universal", "UNIVERSAL", "Cosmos", {
      order: 10,
    }),
    createMockEvent(
      "e-ascensao-2",
      "Ascensao 2",
      "ascensao",
      "UNIVERSAL",
      "Severum",
      { order: 200 },
    ),
    createMockEvent(
      "e-ascensao-1",
      "Ascensao 1",
      "ascensao",
      "UNIVERSAL",
      "Severum",
      { order: 100 },
    ),
    createMockEvent("e-formacao", "Terra Surge", "formacao", "TERRA", "Glen", {
      order: 50,
    }),
  ];
  const sorted = sortTimelineEvents(events, eras);
  assert.equal(sorted[0].id, "e-pre");
  assert.equal(sorted[1].id, "e-formacao");
  assert.equal(sorted[2].id, "e-ascensao-1");
  assert.equal(sorted[3].id, "e-ascensao-2");
  assert.equal(sorted[4].id, "e-renegacao");
});

test("Unit 5: Agrupamento matricial por Era Cósmica e alinhamento de raias paralelas", () => {
  const eras: readonly CosmicEra[] = cosmicEras;
  const events: StudioEntity[] = [
    createMockEvent("e1", "Glen 1", "formacao", "TERRA", "Glen"),
    createMockEvent("s1", "Severum 1", "formacao", "UNIVERSAL", "Severum"),
    createMockEvent("s2", "Severum 2", "ascensao", "UNIVERSAL", "Severum"),
  ];
  const grouped = groupEventsByEra(events, eras);
  assert.equal(Object.keys(grouped).length, 5);
  assert.equal(grouped["formacao"].earthEvents.length, 1);
  assert.equal(grouped["formacao"].severumEvents.length, 1);
  assert.equal(grouped["ascensao"].earthEvents.length, 0);
  assert.equal(grouped["ascensao"].severumEvents.length, 1);
  assert.equal(grouped["pre-universal"].earthEvents.length, 0);
  assert.equal(grouped["pre-universal"].severumEvents.length, 0);

  // Também testa formato array matrix
  const matrix = groupEventsByEraAndSwimlane(
    events.map((e) => ({
      id: e.id,
      titulo: e.title,
      resumo: e.summary,
      eraId: ((e.attributes.eraId as string) || "formacao") as CosmicEraId,
      swimlane: classifySwimlane(e),
      scale: ((e.attributes.escala as string) || "TERRA") as EventScale,
      order: 10,
      local: (e.attributes.local as string) || "Glen",
      pov: "Narrador",
      personagens: [],
      status: "CANONE_TRAVADO",
    })),
    eras,
  );
  assert.equal(matrix.length, 5);
  assert.equal(matrix[1].earthEvents.length, 1);
  assert.equal(matrix[1].severumEvents.length, 1);
});

test("Unit 6: Filtragem dinâmica multidimensional por Era, Escala e Status canônico", () => {
  const events: TimelineEvent[] = [
    {
      id: "1",
      titulo: "A",
      resumo: "Resumo A",
      eraId: "ascensao",
      swimlane: "severum",
      scale: "UNIVERSAL",
      order: 10,
      local: "Severum",
      pov: "Arner",
      personagens: ["Arner"],
      status: "CANONE_TRAVADO",
    },
    {
      id: "2",
      titulo: "B",
      resumo: "Resumo B",
      eraId: "ascensao",
      swimlane: "severum",
      scale: "UNIVERSAL",
      order: 20,
      local: "Severum",
      pov: "Deroo Da",
      personagens: ["Deroo Da"],
      status: "EM_REVISAO",
    },
    {
      id: "3",
      titulo: "C",
      resumo: "Resumo C",
      eraId: "formacao",
      swimlane: "earth",
      scale: "TERRA",
      order: 30,
      local: "Glen",
      pov: "Beenie",
      personagens: ["Beenie"],
      status: "CANONE_TRAVADO",
    },
  ];

  const res1 = filterTimelineEvents(events, {
    eraId: "ascensao",
    status: "CANONE_TRAVADO",
  });
  assert.equal(res1.length, 1);
  assert.equal(res1[0].id, "1");

  const res2 = filterTimelineEvents(events, { scale: "TERRA" });
  assert.equal(res2.length, 1);
  assert.equal(res2[0].id, "3");

  const res3 = filterTimelineEvents(events, { swimlane: "severum" });
  assert.equal(res3.length, 2);
});

test("Unit 7: Filtragem de eventos por Personagem participante", () => {
  const events: TimelineEvent[] = [
    {
      id: "1",
      titulo: "A",
      resumo: "Resumo A",
      eraId: "ascensao",
      swimlane: "severum",
      scale: "UNIVERSAL",
      order: 10,
      local: "Severum",
      pov: "Arner",
      personagens: ["Arner", "Deroo Da"],
      status: "CANONE_TRAVADO",
    },
    {
      id: "2",
      titulo: "B",
      resumo: "Resumo B",
      eraId: "ascensao",
      swimlane: "severum",
      scale: "UNIVERSAL",
      order: 20,
      local: "Iutania",
      pov: "Naok",
      personagens: ["Naok", "Delimitador"],
      status: "CANONE_TRAVADO",
    },
    {
      id: "3",
      titulo: "C",
      resumo: "Resumo C",
      eraId: "formacao",
      swimlane: "earth",
      scale: "TERRA",
      order: 30,
      local: "Glen",
      pov: "Arner",
      personagens: [],
      status: "EM_REVISAO",
    },
  ];

  const res = filterTimelineEvents(events, { character: "Arner" });
  assert.equal(res.length, 2);
  assert.deepEqual(
    res.map((e) => e.id),
    ["1", "3"],
  );

  const resById = filterTimelineEvents(events, { characterId: "naok" });
  assert.equal(resById.length, 1);
  assert.equal(resById[0].id, "2");
});

test("Unit 8: Filtragem de eventos por Saga narrativa (storyId ou sagaId)", () => {
  const events: TimelineEvent[] = [
    {
      id: "1",
      titulo: "Beat RRH 1",
      resumo: "Resumo",
      eraId: "ascensao",
      swimlane: "severum",
      scale: "UNIVERSAL",
      order: 10,
      local: "Severum",
      pov: "Arner",
      personagens: [],
      status: "CANONE_TRAVADO",
      sagaId: "red-right-hand",
    },
    {
      id: "2",
      titulo: "Beat RRH 2",
      resumo: "Resumo",
      eraId: "ascensao",
      swimlane: "severum",
      scale: "UNIVERSAL",
      order: 20,
      local: "Severum",
      pov: "Arner",
      personagens: [],
      status: "CANONE_TRAVADO",
      sagaId: "red-right-hand",
    },
    {
      id: "3",
      titulo: "Beat Guardiões",
      resumo: "Resumo",
      eraId: "formacao",
      swimlane: "earth",
      scale: "TERRA",
      order: 30,
      local: "Glen",
      pov: "Beenie",
      personagens: [],
      status: "CANONE_TRAVADO",
      sagaId: "guardioes",
    },
  ];

  const rrh = filterTimelineEvents(events, { sagaId: "red-right-hand" });
  assert.equal(rrh.length, 2);

  const guard = filterTimelineEvents(events, { storyId: "guardioes" });
  assert.equal(guard.length, 1);
  assert.equal(guard[0].id, "3");
});

test("Unit 9: Busca textual defensiva e insensível a maiúsculas/acentos", () => {
  const events: TimelineEvent[] = [
    {
      id: "1",
      titulo: "Dutovias Térmicas de Severum",
      resumo: "Instalação subterrânea de fornalhas",
      eraId: "ascensao",
      swimlane: "severum",
      scale: "UNIVERSAL",
      order: 10,
      local: "Severum",
      pov: "Arner",
      personagens: ["Arner"],
      status: "CANONE_TRAVADO",
    },
    {
      id: "2",
      titulo: "Conflito dos Tineros",
      resumo: "Batalha nos becos de Glen",
      eraId: "formacao",
      swimlane: "earth",
      scale: "TERRA",
      order: 20,
      local: "Glen",
      pov: "Kerry",
      personagens: ["Kerry"],
      status: "CANONE_TRAVADO",
    },
  ];

  const foundWithoutAccents = filterTimelineEvents(events, {
    searchQuery: "dutovias termicas",
  });
  assert.equal(foundWithoutAccents.length, 1);
  assert.equal(foundWithoutAccents[0].id, "1");

  // Metacaracteres de regex não devem causar erro
  assert.doesNotThrow(() => {
    const metaSearch = filterTimelineEvents(events, {
      searchQuery: "severum [.*+?^${}()|[\\r\\n]",
    });
    assert.equal(metaSearch.length, 0);
  });
});

test("Unit 10: Detecção de nós concorrentes e geração de âncoras de sincronicidade", () => {
  const earth = createMockEvent(
    "e1",
    "Batalha em Glen",
    "ascensao",
    "TERRA",
    "Glen",
    {
      syncMarker: "conflito-simultaneo-1",
    },
  );
  const severum = createMockEvent(
    "s1",
    "Ataque a Iutania",
    "ascensao",
    "UNIVERSAL",
    "Planeta Iutania",
    {
      syncMarker: "conflito-simultaneo-1",
    },
  );
  const pairs = findConcurrentEventPairs([earth, severum]);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].earthEventId, "e1");
  assert.equal(pairs[0].severumEventId, "s1");
});

test("Unit 11 (Corner Case): Evento com era ausente ou inválida", () => {
  const eventWithoutEra = createMockEvent(
    "bad",
    "Sem Era",
    "",
    "TERRA",
    "Glen",
    { eraId: undefined },
  );
  const eras: readonly CosmicEra[] = cosmicEras;
  assert.doesNotThrow(() => {
    const sorted = sortTimelineEvents([eventWithoutEra], eras);
    assert.equal(sorted.length, 1);
  });
});

test("Unit 12 (Corner Case): Evento com atributos corrompidos ou incompletos", () => {
  const corrupted: StudioEntity = {
    id: "corrupted",
    kind: "event",
    title: "Corrompido",
    summary: "",
    body: "",
    status: "draft",
    published: false,
    tags: [],
    attributes: {},
    version: 0,
  };
  assert.doesNotThrow(() => {
    const swimlane = classifyEventSwimlane(corrupted);
    assert.ok(["earth", "severum", "unclassified"].includes(swimlane));
  });
});

test("Unit 13 (Corner Case): Era sem eventos em determinada raia mantém integridade", () => {
  const eras: readonly CosmicEra[] = cosmicEras;
  const events = [
    createMockEvent(
      "s1",
      "Apenas Severum",
      "pre-universal",
      "UNIVERSAL",
      "Cosmos",
    ),
  ];
  const grouped = groupEventsByEra(events, eras);
  assert.equal(grouped["pre-universal"].earthEvents.length, 0);
  assert.equal(grouped["pre-universal"].severumEvents.length, 1);
});

test("Unit 14 (Stress & Desempenho): Processamento de coleção volumosa (200 eventos) em < 50ms", () => {
  const eras: readonly CosmicEra[] = cosmicEras;
  const largeSet: StudioEntity[] = Array.from({ length: 200 }, (_, i) =>
    createMockEvent(
      `ev-${i}`,
      `Evento Cósmico ${i}`,
      eras[i % eras.length].id,
      i % 2 === 0 ? "TERRA" : "UNIVERSAL",
      i % 2 === 0 ? "Glen" : "Severum",
      { order: i },
    ),
  );
  const start = performance.now();
  const { earthLane, severumLane } = partitionSwimlanes(largeSet);
  const sorted = sortTimelineEvents(largeSet, eras);
  const grouped = groupEventsByEra(largeSet, eras);
  const duration = performance.now() - start;

  assert.equal(earthLane.length, 100);
  assert.equal(severumLane.length, 100);
  assert.equal(sorted.length, 200);
  assert.equal(Object.keys(grouped).length, 5);
  assert.ok(
    duration < 50,
    `Esperado < 50ms, executou em ${duration.toFixed(2)}ms`,
  );
});

test("Unit 15 (Fidelidade Canônica): Mapeamento dos 10 beats de timeline.json", () => {
  const beats = timelineData.livros.flatMap((b) => b.beats);
  assert.equal(
    beats.length,
    10,
    "timeline.json deve possuir exatamente 10 beats canônicos",
  );

  const entities: StudioEntity[] = beats.map((b, i) =>
    createMockEvent(b.id, b.titulo, b.eraId, "UNIVERSAL", b.local, {
      ...b,
      order: 100 + i,
    }),
  );
  const { severumLane } = partitionSwimlanes(entities);
  assert.equal(
    severumLane.length,
    10,
    "Todos os 10 beats pertencem à escala Universal / Severum / Iutania",
  );
});

test("Unit 16: Âncoras Canônicas de Sincronização entre as Raias (Sync Anchors)", () => {
  const anchors = getSyncAnchors();
  assert.equal(
    anchors.length,
    6,
    "Devem existir exatamente 6 âncoras canônicas de sincronização",
  );

  const normalized = normalizeTimelineEvents([], []);
  const eventIds = new Set(normalized.map((e) => e.id));

  for (const anchor of anchors) {
    assert.ok(
      eventIds.has(anchor.earthEventId),
      `Âncora ${anchor.id} referencia evento terrestre inexistente: ${anchor.earthEventId}`,
    );
    assert.ok(
      eventIds.has(anchor.severumEventId),
      `Âncora ${anchor.id} referencia evento cósmico inexistente: ${anchor.severumEventId}`,
    );
  }

  // Bidirecionalidade e pareamento
  const earthAnchor = getSyncLinksForEvent("event-earth-asc-01", anchors);
  assert.equal(earthAnchor.length, 1);
  assert.equal(earthAnchor[0].id, "sync-anchor-trauma-mercantile");

  const paired = getPairedEventId("event-earth-asc-01", anchors);
  assert.equal(paired, "event-rrh1-b01");

  const reversePaired = getPairedEventId("event-rrh1-b01", anchors);
  assert.equal(reversePaired, "event-earth-asc-01");
});

test("Unit 17: Cálculo de Métricas e Estatísticas do Universo", () => {
  const normalized = normalizeTimelineEvents([], []);
  const stats = computeTimelineStats(normalized);
  const metrics = calculateTimelineMetrics(normalized);

  assert.equal(stats.totalEvents, normalized.length);
  assert.equal(metrics.totalEvents, stats.totalEvents);
  assert.equal(stats.earthCount + stats.severumCount, stats.totalEvents);
  assert.ok(stats.ratioEarthPercent > 0);
  assert.ok(stats.ratioSeverumPercent > 0);
  assert.equal(stats.ratioEarthPercent + stats.ratioSeverumPercent, 100);
  assert.equal(stats.syncAnchorsCount, 6);

  for (const eraId of cosmicEraIds) {
    assert.ok(
      stats.byEra[eraId].total > 0,
      `Era ${eraId} sem eventos calculados`,
    );
  }
});

test("Unit 18: Normalização Integrada com Workspace Seed e Cobertura das 5 Eras", () => {
  const normalized = normalizeTimelineEvents(seedEntities);
  assert.ok(
    normalized.length >= 20,
    `Total normalizado com seed: ${normalized.length}`,
  );

  const matrix = groupEventsByEraAndSwimlane(normalized, cosmicEras);
  assert.equal(matrix.length, 5);

  for (const row of matrix) {
    assert.ok(
      row.earthEvents.length > 0,
      `Era ${row.era.id} sem eventos da Terra`,
    );
    assert.ok(
      row.severumEvents.length > 0,
      `Era ${row.era.id} sem eventos de Severum`,
    );
  }
});
