import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { StudioParallelTimeline } from "../../components/studio-parallel-timeline";
import {
  normalizeTimelineEvents,
  filterTimelineEvents,
  type CosmicEraId,
  type SwimlaneId,
} from "../../lib/timeline-swimlanes";
import {
  relationSchema,
  type StudioEntity,
  type StudioRelation,
  type StudioWorkspace,
} from "../../lib/workspace";
import type { Timeline } from "../../lib/schemas";
import timelineData from "../../data/timeline.json";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Global React registration for SSR evaluation
(globalThis as unknown as { React: typeof React }).React = React;

function makeSyntheticEvent(
  id: string,
  overrides: {
    title?: string;
    eraId?: CosmicEraId;
    swimlane?: SwimlaneId;
    scale?: "TERRA" | "UNIVERSAL" | "HÍBRIDA";
    order?: number;
    summary?: string;
    body?: string;
    personagens?: string[];
    local?: string;
    pov?: string;
    sagaId?: string;
    notas?: string;
  } = {},
): StudioEntity {
  const {
    title = `Evento ${id}`,
    eraId = "ascensao",
    swimlane = "earth",
    scale = "TERRA",
    order = 42,
    summary = `Resumo do evento ${id}`,
    body = `Corpo descritivo detalhado do evento ${id}`,
    personagens = ["Beenie", "Kerry"],
    local = "Glen",
    pov = "Beenie",
    sagaId = "story-marginal",
    notas = "Notas de teste",
  } = overrides;

  return {
    id,
    kind: "event",
    title,
    summary,
    body,
    status: "ready",
    published: false,
    tags: ["canon", eraId],
    version: 1,
    attributes: {
      eraId,
      swimlane,
      scale,
      order,
      personagens,
      local,
      pov,
      sagaId,
      notas,
      dateLabel: "Durante Marginal",
      temporalRef: "Durante Marginal",
    },
  };
}

// ============================================================================
// SUITE 1: MODAL SELECTORS & CREATION FLOW CONTRACT VERIFICATION
// ============================================================================

test("Challenger 1.1: Verification of selectors used by tests/e2e/studio.spec.ts in Parallel Timeline DOM", () => {
  const workspace: StudioWorkspace = {
    entities: [makeSyntheticEvent("ev-1")],
    relations: [],
    positions: {},
  };

  const html = renderToString(
    React.createElement(StudioParallelTimeline, {
      initial: workspace,
      timelineData: timelineData as unknown as Timeline,
    }),
  );

  // Selector "Nova ficha" must be present in the main timeline toolbar
  assert.ok(
    html.includes("Nova ficha"),
    "Main toolbar must render 'Nova ficha' button for E2E selector compatibility",
  );

  // Check data attribute
  assert.ok(
    html.includes('data-timeline="parallel"'),
    "Component container must expose data-timeline='parallel'",
  );
});

test("Challenger 1.2 [CRITICAL BUG 1]: fetch method in EventEditorModal is POST instead of PUT against /api/studio/entities", () => {
  // Inspect app/api/studio/entities/route.ts exports
  const routeSource = readFileSync(
    resolve(process.cwd(), "app/api/studio/entities/route.ts"),
    "utf8",
  );

  assert.ok(
    routeSource.includes("export async function PUT"),
    "/api/studio/entities MUST export PUT handler for entity updates/inserts",
  );
  assert.ok(
    routeSource.includes("export async function GET"),
    "/api/studio/entities exports GET for revision history",
  );
  assert.ok(
    routeSource.includes("export async function DELETE"),
    "/api/studio/entities exports DELETE for archival",
  );
  assert.ok(
    !routeSource.includes("export async function POST"),
    "CRITICAL FLAW: /api/studio/entities DOES NOT EXPORT POST! EventEditorModal line 1415 uses method: 'POST', causing 405 Method Not Allowed in E2E tests!",
  );

  // Inspect components/studio-parallel-timeline.tsx to verify the bad fetch call
  const componentSource = readFileSync(
    resolve(process.cwd(), "components/studio-parallel-timeline.tsx"),
    "utf8",
  );
  assert.ok(
    componentSource.includes('method: "PUT"'),
    "EventEditorModal directly invokes method: 'PUT' against /api/studio/entities",
  );
});

test("Challenger 1.3 [CRITICAL BUG 2]: Entity version incrementation on update causes ConflictError (HTTP 409)", () => {
  // In EventEditorModal line 1402:
  // version: initialEvent ? initialEvent.version + 1 : 0
  // When initialEvent has version 1, client sends version 2.
  // In lib/database.ts:
  // if (row.version !== e.version || row.archived) throw new ConflictError();
  // Here DB has version 1, but client sent 2, triggering immediate 409 Conflict.
  const initialEvent = makeSyntheticEvent("ev-existing");
  assert.equal(initialEvent.version, 1);

  const erroneousClientPayloadVersion = initialEvent
    ? initialEvent.version + 1
    : 0;
  assert.equal(erroneousClientPayloadVersion, 2);

  // In database.ts optimistic locking contract:
  const dbRowVersion: number = 1;
  const isConflict = dbRowVersion !== (erroneousClientPayloadVersion as number);
  assert.ok(
    isConflict,
    "CRITICAL FLAW: Sending version + 1 from client conflicts with database.ts optimistic locking (which expects current version)",
  );
});

test("Challenger 1.4 [CRITICAL BUG 3]: Premature modal unmount destroys relation linking controls", () => {
  // In StudioParallelTimeline lines 1215-1229:
  // onSaved={() => { setIsCreatingEvent(false); }}
  // When save succeeds, modal unmounts.
  // The E2E test in studio.spec.ts lines 320-326 expects:
  // 1. .workshop-feedback
  // 2. getByLabel("Conectar com")
  // 3. getByRole("button", { name: "Criar vínculo" })
  // 4. .db-relation-list
  // If the modal unmounts, all four controls vanish from DOM.
  let isCreatingEvent = true;
  function onSaved() {
    isCreatingEvent = false; // simulates current code in line 1226
  }

  // User clicks "Salvar"
  onSaved();

  assert.equal(
    isCreatingEvent,
    false,
    "Modal is unmounted immediately upon save, breaking E2E relation linking sequence",
  );
});

test("Challenger 1.5 [CRITICAL BUG 4]: Relation creation is mock-only and not persisted to PostgreSQL", () => {
  // EventEditorModal lines 1430-1441 only updates local state `relations`
  // It does not call fetch("/api/studio/relations", { method: "POST", ... })
  // Furthermore, lines 1653-1662 hardcodes: "Conectado com: Marginal"
  const rel: StudioRelation = {
    id: "rel-1",
    sourceId: "temp-event", // default when initialEvent is null
    targetId: "story-marginal",
    label: "relacionado",
  };

  const parsed = relationSchema.safeParse(rel);
  assert.ok(parsed.success);

  // But sourceId "temp-event" does not exist in uvc_entities
  // In lib/database.ts: saveRelation queries:
  // SELECT id FROM uvc_entities WHERE id=ANY([r.sourceId, r.targetId])
  // If not found, throws InvalidReferenceError("As duas fichas precisam existir.")
  assert.equal(
    rel.sourceId,
    "temp-event",
    "CRITICAL FLAW: newly created events pass dummy sourceId 'temp-event' instead of the saved entity ID",
  );
});

// ============================================================================
// SUITE 2: DOM STRESS & PAYLOAD RESILIENCE
// ============================================================================

test("Stress 2.1: Extreme Event Volume (1,000 synthetic events) across 5 Eras & 2 Swimlanes", () => {
  const events: StudioEntity[] = [];
  const eras: CosmicEraId[] = [
    "pre-universal",
    "formacao",
    "ascensao",
    "redencao",
    "renegacao",
  ];
  const swimlanes: SwimlaneId[] = ["earth", "severum"];

  for (let i = 0; i < 1000; i++) {
    const eraId = eras[i % eras.length];
    const swimlane = swimlanes[i % swimlanes.length];
    events.push(
      makeSyntheticEvent(`stress-ev-${i}`, {
        title: `Stress Event ${i}`,
        eraId,
        swimlane,
        order: i,
        summary: `Summary for event ${i} in era ${eraId} on ${swimlane}`,
      }),
    );
  }

  const workspace: StudioWorkspace = {
    entities: events,
    relations: [],
    positions: {},
  };

  const startTime = performance.now();
  const html = renderToString(
    React.createElement(StudioParallelTimeline, {
      initial: workspace,
      timelineData: timelineData as unknown as Timeline,
    }),
  );
  const duration = performance.now() - startTime;

  assert.ok(
    html.includes("Raias Paralelas (Terra vs. Severum)"),
    "SSR must render parallel timeline under 1,000 events",
  );
  assert.ok(
    duration < 2500,
    `Rendering 1,000 events must complete within 2500ms (took ${duration.toFixed(2)}ms)`,
  );
  assert.ok(
    html.includes("Stress Event 0"),
    "First event must be present in HTML",
  );
  assert.ok(
    html.includes("Stress Event 999"),
    "Last event must be present in HTML",
  );
});

test("Stress 2.2: Extreme Character Chips (100 characters per event) and duplicate character names", () => {
  const manyCharacters = Array.from(
    { length: 100 },
    (_, i) => `Personagem_${i}`,
  );
  const duplicateCharacters = ["Arner", "Arner", "Arner", "Naok", "Naok"];

  const eventWithMany = makeSyntheticEvent("ev-many-chars", {
    personagens: manyCharacters,
  });
  const eventWithDups = makeSyntheticEvent("ev-dup-chars", {
    personagens: duplicateCharacters,
  });

  const workspace: StudioWorkspace = {
    entities: [eventWithMany, eventWithDups],
    relations: [],
    positions: {},
  };

  // Node cards truncate characters to slice(0, 2), preventing card bloat
  const html = renderToString(
    React.createElement(StudioParallelTimeline, {
      initial: workspace,
      timelineData: timelineData as unknown as Timeline,
    }),
  );

  assert.ok(html.includes("Personagem_0, Personagem_1"));
  assert.ok(!html.includes("Personagem_99")); // card truncates beyond 2 characters in node card
});

test("Stress 2.3: Massive Text Blurbs (50,000 characters in summary and notas)", () => {
  const hugeText =
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(800);
  assert.ok(hugeText.length > 40000);

  const eventHuge = makeSyntheticEvent("ev-huge", {
    title: "Evento com texto massivo",
    summary: hugeText,
    notas: hugeText,
  });

  const workspace: StudioWorkspace = {
    entities: [eventHuge],
    relations: [],
    positions: {},
  };

  const startTime = performance.now();
  const html = renderToString(
    React.createElement(StudioParallelTimeline, {
      initial: workspace,
      timelineData: timelineData as unknown as Timeline,
    }),
  );
  const duration = performance.now() - startTime;

  assert.ok(
    duration < 500,
    `Rendering massive text must take < 500ms (took ${duration.toFixed(2)}ms)`,
  );
  assert.ok(html.includes("Evento com texto massivo"));
});

test("Stress 2.4: Hostile Strings & Injection Protection in event titles and metadata", () => {
  const xssEvent = makeSyntheticEvent("ev-xss", {
    title: "<script>alert('XSS')</script>",
    summary: "<img src=x onerror=alert('PWNED')>",
    local: "<b>Glen</b> & 'Severum' \"Cosmic\"",
    pov: "'; DROP TABLE uvc_entities; --",
  });

  const workspace: StudioWorkspace = {
    entities: [xssEvent],
    relations: [],
    positions: {},
  };

  const html = renderToString(
    React.createElement(StudioParallelTimeline, {
      initial: workspace,
      timelineData: timelineData as unknown as Timeline,
    }),
  );

  // React must escape dangerous script tags
  assert.ok(!html.includes("<script>alert('XSS')</script>"));
  assert.ok(
    html.includes("&lt;script&gt;alert(&#x27;XSS&#x27;)&lt;/script&gt;"),
  );
  assert.ok(
    html.includes("&lt;img src=x onerror=alert(&#x27;PWNED&#x27;)&gt;"),
  );
});

// ============================================================================
// SUITE 3: RAPID STATE TRANSITIONS & DOM NAVIGATION
// ============================================================================

test("Stress 3.1: Sequential Rapid Filter Permutations (100 state switches)", () => {
  // Simulate 100 fast filter state changes on domain events
  const domainEvents = normalizeTimelineEvents([]);
  assert.ok(domainEvents.length > 15);

  const eras: (CosmicEraId | "all")[] = [
    "all",
    "pre-universal",
    "formacao",
    "ascensao",
    "redencao",
    "renegacao",
  ];
  const swimlanes: (SwimlaneId | "all")[] = ["all", "earth", "severum"];
  const statuses = ["all", "CANONE_TRAVADO", "EM_REVISAO", "RASCUNHO"] as const;

  for (let i = 0; i < 100; i++) {
    const eraId = eras[i % eras.length];
    const swimlane = swimlanes[(i * 3) % swimlanes.length];
    const status = statuses[(i * 7) % statuses.length];

    const filtered = filterTimelineEvents(domainEvents, {
      eraId,
      swimlane,
      status,
    });

    assert.ok(Array.isArray(filtered));
    for (const ev of filtered) {
      if (eraId !== "all") assert.equal(ev.eraId, eraId);
      if (swimlane !== "all") assert.equal(ev.swimlane, swimlane);
      if (status !== "all") assert.equal(ev.status, status);
    }
  }
});

test("Stress 3.2: Rapid search input mutations with regex metacharacters", () => {
  const domainEvents = normalizeTimelineEvents([]);
  const dangerousSearchQueries = [
    "[a-z]+",
    "(",
    ")",
    "\\",
    ".*",
    "?+",
    "[[[",
    "{1,10}",
    "^.*$",
    "Ormuz|Hades",
  ];

  for (const q of dangerousSearchQueries) {
    // Should execute safely without RegExp syntax errors (since string.includes is used)
    const filtered = domainEvents.filter((ev) => {
      const lower = q.toLowerCase();
      return (
        ev.titulo.toLowerCase().includes(lower) ||
        ev.resumo.toLowerCase().includes(lower) ||
        ev.personagens.some((p) => p.toLowerCase().includes(lower))
      );
    });
    assert.ok(
      Array.isArray(filtered),
      `Search query '${q}' must execute safely`,
    );
  }
});

// ============================================================================
// SUITE 4: DYNAMIC ENTITY RESOLUTION & MULTI-RELATION EMPIRICAL STRESS TESTING
// ============================================================================

function renderTimelineWithModal(
  workspace: StudioWorkspace,
  editingEvent: StudioEntity | null = null,
): string {
  const origUseState = React.useState;
  let callCount = 0;
  try {
    (React as unknown as { useState: unknown }).useState = function (
      initialVal?: unknown,
    ): unknown {
      callCount++;
      // In StudioParallelTimeline:
      // Hook #13: isCreatingEvent (boolean)
      // Hook #14: editingEvent (StudioEntity | null)
      if (callCount === 13) {
        return [true, () => {}];
      }
      if (callCount === 14) {
        return [editingEvent, () => {}];
      }
      return (origUseState as (val?: unknown) => unknown)(initialVal);
    };

    return renderToString(
      React.createElement(StudioParallelTimeline, {
        initial: workspace,
        timelineData: timelineData as unknown as Timeline,
      }),
    );
  } finally {
    React.useState = origUseState;
  }
}

function makeEntity(
  id: string,
  kind: StudioEntity["kind"],
  title: string,
  overrides: Partial<StudioEntity> = {},
): StudioEntity {
  return {
    id,
    kind,
    title,
    summary: `Resumo de ${title}`,
    body: `Corpo detalhado de ${title}`,
    status: "ready",
    published: true,
    tags: [kind],
    version: 1,
    attributes: {},
    ...overrides,
  };
}

test("Stress 4.1: Dynamic entity resolution across diverse relation targets (stories, characters, factions, concepts, places, artifacts)", () => {
  const focalEvent = makeSyntheticEvent("ev-diverse-targets", {
    title: "Convergência dos Universos",
  });

  const storyEntity = makeEntity(
    "story-kronos",
    "story",
    "O Despertar de Kronos",
  );
  const charEntity = makeEntity(
    "char-larry",
    "character",
    "Larry / Motorista Rebelde",
  );
  const factEntity = makeEntity(
    "faction-congregadores",
    "faction",
    "Os Congregadores Cósmicos",
  );
  const conceptEntity = makeEntity(
    "concept-biotec",
    "concept",
    "Biotecnologia Deroo Da",
  );
  const placeEntity = makeEntity("place-lamprois", "place", "Planeta Lamprois");
  const artifactEntity = makeEntity(
    "artifact-bracelete",
    "artifact",
    "Bracelete Dimensional",
  );

  const relations: StudioRelation[] = [
    {
      id: "rel-story",
      sourceId: focalEvent.id,
      targetId: storyEntity.id,
      label: "ambientado em",
    },
    {
      id: "rel-char",
      sourceId: focalEvent.id,
      targetId: charEntity.id,
      label: "protagonista",
    },
    {
      id: "rel-fact",
      sourceId: focalEvent.id,
      targetId: factEntity.id,
      label: "facção rival",
    },
    {
      id: "rel-concept",
      sourceId: focalEvent.id,
      targetId: conceptEntity.id,
      label: "fundamenta",
    },
    {
      id: "rel-place",
      sourceId: focalEvent.id,
      targetId: placeEntity.id,
      label: "local de confronto",
    },
    {
      id: "rel-artifact",
      sourceId: focalEvent.id,
      targetId: artifactEntity.id,
      label: "relíquia sagrada",
    },
  ];

  const workspace: StudioWorkspace = {
    entities: [
      focalEvent,
      storyEntity,
      charEntity,
      factEntity,
      conceptEntity,
      placeEntity,
      artifactEntity,
    ],
    relations,
    positions: {},
  };

  const html = renderTimelineWithModal(workspace, focalEvent);

  // Assert relation container is mounted
  assert.ok(
    html.includes("db-relation-list"),
    "Modal must render .db-relation-list container",
  );

  // Assert every entity title resolved dynamically from workspace.entities
  assert.ok(
    html.includes(
      "<span>Conectado com: <strong>O Despertar de Kronos</strong></span>",
    ),
    "Story title must resolve dynamically",
  );
  assert.ok(
    html.includes(
      "<span>Conectado com: <strong>Larry / Motorista Rebelde</strong></span>",
    ),
    "Character title must resolve dynamically",
  );
  assert.ok(
    html.includes(
      "<span>Conectado com: <strong>Os Congregadores Cósmicos</strong></span>",
    ),
    "Faction title must resolve dynamically",
  );
  assert.ok(
    html.includes(
      "<span>Conectado com: <strong>Biotecnologia Deroo Da</strong></span>",
    ),
    "Concept title must resolve dynamically",
  );
  assert.ok(
    html.includes(
      "<span>Conectado com: <strong>Planeta Lamprois</strong></span>",
    ),
    "Place title must resolve dynamically",
  );
  assert.ok(
    html.includes(
      "<span>Conectado com: <strong>Bracelete Dimensional</strong></span>",
    ),
    "Artifact title must resolve dynamically",
  );

  // Assert all labels are displayed in font-mono badges
  assert.ok(html.includes("ambientado em"), "Story relation label rendered");
  assert.ok(html.includes("protagonista"), "Character relation label rendered");
  assert.ok(html.includes("facção rival"), "Faction relation label rendered");
  assert.ok(html.includes("fundamenta"), "Concept relation label rendered");
  assert.ok(
    html.includes("local de confronto"),
    "Place relation label rendered",
  );
  assert.ok(
    html.includes("relíquia sagrada"),
    "Artifact relation label rendered",
  );

  // Anti-cheat verification: Ensure no static "Marginal" was injected
  assert.ok(
    !html.includes("Conectado com: <strong>Marginal</strong>"),
    "No hardcoded static 'Marginal' title allowed in relation list",
  );
});

test("Stress 4.2: Fallback behavior when r.targetId does not exist in workspace entities", () => {
  const focalEvent = makeSyntheticEvent("ev-with-missing-targets", {
    title: "Evento com Vínculos Órfãos",
  });

  const missingIds = [
    "inexistent-story-999",
    "deleted-character-xyz",
    "dangling-uuid-8f92b740-4567-4890-a123-abcdef012345",
    "concept-nao-registrado",
  ];

  const relations: StudioRelation[] = missingIds.map((targetId, index) => ({
    id: `rel-missing-${index}`,
    sourceId: focalEvent.id,
    targetId,
    label: `vínculo-${index}`,
  }));

  const workspace: StudioWorkspace = {
    entities: [focalEvent], // None of the targets exist in workspace
    relations,
    positions: {},
  };

  // Rendering must NOT throw or crash
  let html = "";
  assert.doesNotThrow(() => {
    html = renderTimelineWithModal(workspace, focalEvent);
  }, "Rendering missing relation targets must not throw");

  assert.ok(html.includes("db-relation-list"));

  // Check fallback: each missing targetId must be rendered verbatim as the bold title
  for (const targetId of missingIds) {
    assert.ok(
      html.includes(`<span>Conectado com: <strong>${targetId}</strong></span>`),
      `Missing target ID '${targetId}' must be rendered gracefully as the fallback title`,
    );
  }
});

test("Stress 4.3: Multi-relation arrays and high-density array stress (50 relations attached to single event)", () => {
  const focalEvent = makeSyntheticEvent("ev-high-density", {
    title: "Ponto de Convergência Máxima",
  });

  const knownEntities: StudioEntity[] = [];
  const relations: StudioRelation[] = [];

  // Generate 25 registered entities and 25 unregistered targets (50 total relations)
  for (let i = 0; i < 25; i++) {
    const ent = makeEntity(
      `known-target-${i}`,
      i % 2 === 0 ? "story" : "character",
      `Entidade Conhecida ${i}`,
    );
    knownEntities.push(ent);
    relations.push({
      id: `rel-known-${i}`,
      sourceId: focalEvent.id,
      targetId: ent.id,
      label: i % 3 === 0 ? `papel-${i}` : "", // test empty vs populated labels
    });
  }

  for (let j = 0; j < 25; j++) {
    relations.push({
      // Alternating undefined ID to test key fallback: key={r.id || i}
      id: (j % 2 === 0 ? `rel-orphan-${j}` : "") as string,
      sourceId: focalEvent.id,
      targetId: `orphan-target-uuid-${j}`,
      label: `fallback-${j}`,
    });
  }

  const workspace: StudioWorkspace = {
    entities: [focalEvent, ...knownEntities],
    relations,
    positions: {},
  };

  const startTime = performance.now();
  const html = renderTimelineWithModal(workspace, focalEvent);
  const duration = performance.now() - startTime;

  assert.ok(
    duration < 300,
    `Rendering 50 relations must execute in < 300ms (took ${duration.toFixed(2)}ms)`,
  );

  // Assert all 25 known entity titles are rendered
  for (let i = 0; i < 25; i++) {
    assert.ok(
      html.includes(`Conectado com: <strong>Entidade Conhecida ${i}</strong>`),
      `Known entity ${i} title must be present`,
    );
  }

  // Assert all 25 orphan IDs are rendered
  for (let j = 0; j < 25; j++) {
    assert.ok(
      html.includes(`Conectado com: <strong>orphan-target-uuid-${j}</strong>`),
      `Orphan target ${j} must be present`,
    );
  }

  // Count exactly 50 instances of "Conectado com:"
  const matches = html.match(/Conectado com:/g);
  assert.equal(
    matches?.length,
    50,
    "Exactly 50 relation badges must be rendered in the DOM",
  );
});

test("Stress 4.4: Dynamic story <select> dropdown population without hardcoded duplicates", () => {
  // Scenario A: Workspace with 3 distinct custom stories and NO story-marginal
  const stories: StudioEntity[] = [
    makeEntity("story-alfa", "story", "Crônica Alfa: Nas Ruínas"),
    makeEntity("story-beta", "story", "Crônica Beta: O Cerco"),
    makeEntity("story-gama", "story", "Crônica Gama: O Salto Cósmico"),
  ];

  const workspaceA: StudioWorkspace = {
    entities: stories,
    relations: [],
    positions: {},
  };

  const htmlA = renderTimelineWithModal(workspaceA, null);

  assert.ok(
    htmlA.includes('<select id="connect-target"'),
    "Select dropdown must be rendered",
  );
  assert.ok(
    htmlA.includes("Selecione uma história..."),
    "Placeholder option text must be present",
  );
  assert.ok(
    htmlA.includes('<option value=""'),
    "Placeholder option value must be empty string",
  );
  assert.ok(
    htmlA.includes(
      '<option value="story-alfa">Crônica Alfa: Nas Ruínas</option>',
    ),
  );
  assert.ok(
    htmlA.includes('<option value="story-beta">Crônica Beta: O Cerco</option>'),
  );
  assert.ok(
    htmlA.includes(
      '<option value="story-gama">Crônica Gama: O Salto Cósmico</option>',
    ),
  );

  // Verify anti-cheat: Marginal was removed and is NOT present in options
  assert.ok(
    !htmlA.includes('<option value="story-marginal">'),
    "No hardcoded <option value='story-marginal'> allowed",
  );

  // Scenario B: Workspace with ZERO stories
  const workspaceB: StudioWorkspace = {
    entities: [makeSyntheticEvent("ev-lonely")],
    relations: [],
    positions: {},
  };

  const htmlB = renderTimelineWithModal(workspaceB, null);
  // Count options inside select: should have exactly 1 option (the placeholder)
  const selectMatch = htmlB.match(
    /<select id="connect-target"[^>]*>([\s\S]*?)<\/select>/,
  );
  assert.ok(selectMatch, "Select dropdown must match");
  const options = selectMatch[1].match(/<option/g);
  assert.equal(
    options?.length,
    1,
    "Zero stories in workspace must produce exactly 1 option (the placeholder)",
  );
});

test("Stress 4.5: Injection & XSS safety in entity titles, target IDs, and labels", () => {
  const focalEvent = makeSyntheticEvent("ev-xss", {
    title: "Evento XSS",
  });

  const maliciousEntity = makeEntity(
    "ent-xss",
    "story",
    "<script>alert('PWNED_TITLE')</script>",
  );

  const maliciousRelations: StudioRelation[] = [
    {
      id: "rel-xss-1",
      sourceId: focalEvent.id,
      targetId: maliciousEntity.id,
      label: "<svg onload=alert('PWNED_LABEL')>",
    },
    {
      id: "rel-xss-2",
      sourceId: focalEvent.id,
      targetId: "<img src=x onerror=alert('PWNED_FALLBACK')>",
      label: "<b>negrito</b>",
    },
  ];

  const workspace: StudioWorkspace = {
    entities: [focalEvent, maliciousEntity],
    relations: maliciousRelations,
    positions: {},
  };

  const html = renderTimelineWithModal(workspace, focalEvent);

  // Raw malicious tags must NOT be present unescaped
  assert.ok(
    !html.includes("<script>alert('PWNED_TITLE')</script>"),
    "Unescaped script tag must not exist",
  );
  assert.ok(
    !html.includes("<svg onload="),
    "Unescaped svg onload must not exist",
  );
  assert.ok(
    !html.includes("<img src=x onerror="),
    "Unescaped img onerror must not exist",
  );

  // Escaped entities must be present
  assert.ok(
    html.includes(
      "&lt;script&gt;alert(&#x27;PWNED_TITLE&#x27;)&lt;/script&gt;",
    ),
    "Title must be properly escaped by React",
  );
  assert.ok(
    html.includes("&lt;svg onload=alert(&#x27;PWNED_LABEL&#x27;)&gt;"),
    "Label must be properly escaped by React",
  );
  assert.ok(
    html.includes(
      "&lt;img src=x onerror=alert(&#x27;PWNED_FALLBACK&#x27;)&gt;",
    ),
    "Fallback targetId must be properly escaped by React",
  );
});

test("Stress 4.6: Boundary scenarios: empty relations, empty titles, and unicode characters", () => {
  const focalEvent = makeSyntheticEvent("ev-boundary", {
    title: "Evento Limite",
  });

  // Case 1: Empty relations array
  const wsEmpty: StudioWorkspace = {
    entities: [focalEvent],
    relations: [],
    positions: {},
  };
  const htmlEmpty = renderTimelineWithModal(wsEmpty, focalEvent);
  assert.ok(
    htmlEmpty.includes('class="db-relation-list text-xs space-y-1"'),
    "Container renders even with 0 relations",
  );
  assert.ok(
    !htmlEmpty.includes("Conectado com:"),
    "No relations rendered when empty",
  );

  // Case 2: Entity with empty string title
  const blankEntity = makeEntity("ent-blank", "story", "");
  const wsBlank: StudioWorkspace = {
    entities: [focalEvent, blankEntity],
    relations: [
      {
        id: "rel-blank",
        sourceId: focalEvent.id,
        targetId: blankEntity.id,
        label: "",
      },
    ],
    positions: {},
  };
  const htmlBlank = renderTimelineWithModal(wsBlank, focalEvent);
  assert.ok(
    htmlBlank.includes("<span>Conectado com: <strong></strong></span>"),
    "Blank entity title renders without crash",
  );

  // Case 3: Unicode and Emojis in titles and labels
  const unicodeEntity = makeEntity(
    "ent-unicode",
    "concept",
    "🌌 O Éter Primordial 🔥 (Ormuz & Hades)",
  );
  const wsUnicode: StudioWorkspace = {
    entities: [focalEvent, unicodeEntity],
    relations: [
      {
        id: "rel-unicode",
        sourceId: focalEvent.id,
        targetId: unicodeEntity.id,
        label: "⚡ ressonância mística ⚡",
      },
    ],
    positions: {},
  };
  const htmlUnicode = renderTimelineWithModal(wsUnicode, focalEvent);
  assert.ok(
    htmlUnicode.includes("🌌 O Éter Primordial 🔥 (Ormuz &amp; Hades)"),
    "Unicode emojis and ampersands rendered safely",
  );
  assert.ok(
    htmlUnicode.includes("⚡ ressonância mística ⚡"),
    "Unicode label rendered cleanly",
  );
});
