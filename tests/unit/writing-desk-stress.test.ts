import test from "node:test";
import assert from "node:assert/strict";
import { getSchema, type JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import {
  type ConceptCategory,
  type ConceptScale,
} from "../../lib/concept-matrix";
import {
  neighbors,
  relationSchema,
  type StudioEntity,
  type StudioRelation,
  type StudioWorkspace,
} from "../../lib/workspace";

// Helper to construct mock entities with attributes
function makeEntity(
  id: string,
  kind: StudioEntity["kind"],
  title: string,
  summary: string,
  body: string,
  attributes: Record<string, unknown> = {},
): StudioEntity {
  return {
    id,
    kind,
    title,
    summary,
    body,
    status: "ready",
    published: true,
    tags: [],
    attributes,
    version: 1,
  };
}

function makeConcept(
  id: string,
  title: string,
  options: {
    category?: ConceptCategory;
    scale?: ConceptScale | string;
    rules?: string[];
    summary?: string;
    body?: string;
  } = {},
): StudioEntity {
  return makeEntity(
    id,
    "concept",
    title,
    options.summary ?? `Resumo de ${title}`,
    options.body ?? `Corpo descritivo detalhado de ${title}`,
    {
      category: options.category ?? "cosmologia",
      scale: options.scale ?? "UNIVERSAL",
      rules: options.rules ?? ["Regra fundamental de teste."],
    },
  );
}

// Emulate the exact useMemo scoring and filtering from components/writing-desk.tsx
function computeWritingDeskReferences(
  workspace: StudioWorkspace,
  draftId: string,
  storyId: string | undefined,
  referenceSearch: string,
  referenceFilter: "all" | "concept" | "character" | "place" | "faction",
  conceptCategoryFilter: string,
) {
  const refIds = new Set(
    workspace.relations
      .filter(
        (r) =>
          [draftId, storyId].includes(r.sourceId) ||
          [draftId, storyId].includes(r.targetId),
      )
      .flatMap((r) => [r.sourceId, r.targetId]),
  );

  const q = referenceSearch.trim().toLocaleLowerCase("pt-BR");

  const filtered = workspace.entities.filter((e) => {
    if (["document", "story", "task"].includes(e.kind)) return false;

    if (referenceFilter !== "all" && e.kind !== referenceFilter) return false;

    if (referenceFilter === "concept" && conceptCategoryFilter !== "all") {
      if (e.attributes.category !== conceptCategoryFilter) return false;
    }

    if (!q) return true;

    const rules = Array.isArray(e.attributes.rules)
      ? (e.attributes.rules as string[]).join(" ")
      : "";
    const text =
      `${e.title} ${e.summary} ${e.body.slice(0, 500)} ${rules}`.toLocaleLowerCase(
        "pt-BR",
      );
    return text.includes(q);
  });

  const score = (e: StudioEntity) => {
    let pts = 0;
    const isDocLinked = workspace.relations.some(
      (r) =>
        (r.sourceId === draftId && r.targetId === e.id) ||
        (r.targetId === draftId && r.sourceId === e.id),
    );
    const isStoryLinked = workspace.relations.some(
      (r) =>
        (r.sourceId === storyId && r.targetId === e.id) ||
        (r.targetId === storyId && r.sourceId === e.id),
    );
    const isUniversalConcept =
      e.kind === "concept" &&
      String(e.attributes.scale).toUpperCase() === "UNIVERSAL";

    if (isDocLinked) pts += 100;
    else if (isStoryLinked) pts += 70;

    if (isUniversalConcept) pts += 40;

    return pts;
  };

  const sorted = [...filtered].sort((a, b) => {
    const diff = score(b) - score(a);
    if (diff !== 0) return diff;
    return a.title.localeCompare(b.title, "pt-BR");
  });

  return {
    refIds,
    references: sorted,
    scoreMap: new Map(sorted.map((e) => [e.id, score(e)])),
  };
}

// Emulate insertConceptQuote content generator from components/writing-desk.tsx
function buildConceptQuoteNodes(concept: StudioEntity): JSONContent[] {
  const title = concept.title;
  const summary = concept.summary || concept.body.slice(0, 200);
  const rules = Array.isArray(concept.attributes.rules)
    ? (concept.attributes.rules as string[])
    : [];

  const quoteParagraphs: JSONContent[] = [
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "italic" }],
          text: `« [${title}] ${summary} »`,
        },
      ],
    },
  ];

  if (rules.length > 0) {
    quoteParagraphs.push({
      type: "paragraph",
      content: [
        {
          type: "text",
          marks: [{ type: "italic" }],
          text: `Regra Canônica: ${rules[0]}`,
        },
      ],
    });
  }

  return [
    {
      type: "blockquote",
      content: quoteParagraphs,
    },
    {
      type: "paragraph",
      content: [],
    },
  ];
}

// ---------------------------------------------------------------------------
// SUITE 1: Reference Panel Filtering Algorithm Under Varied Conditions
// ---------------------------------------------------------------------------

test("Writing Desk Stress 1.1: Document with no story linked (storyId undefined)", () => {
  const docId = "doc-standalone-1";
  const universalConcept = makeConcept("c-univ-1", "Dualidade Ormuz e Hades", {
    scale: "UNIVERSAL",
    rules: ["A criação balanceia a destruição."],
  });
  const sectorConcept = makeConcept("c-sector-1", "Metodologia Severum", {
    scale: "SETOR",
    category: "geopolitica",
    rules: ["Doutrina militar de Arner."],
  });
  const docLinkedSectorConcept = makeConcept(
    "c-sector-doc-linked",
    "Enxertos Deroo Da",
    {
      scale: "SETOR",
      category: "biologia",
      rules: ["Enxerto cibernético."],
    },
  );

  const workspace: StudioWorkspace = {
    entities: [universalConcept, sectorConcept, docLinkedSectorConcept],
    relations: [
      {
        id: "rel-doc-1",
        sourceId: docId,
        targetId: docLinkedSectorConcept.id,
        label: "referência de escrita",
      },
    ],
  };

  const result = computeWritingDeskReferences(
    workspace,
    docId,
    undefined, // storyId is undefined
    "",
    "concept",
    "all",
  );

  assert.equal(result.references.length, 3);
  // Doc-linked sector gets 100 pts
  assert.equal(result.scoreMap.get(docLinkedSectorConcept.id), 100);
  // Universal gets 40 pts
  assert.equal(result.scoreMap.get(universalConcept.id), 40);
  // Unlinked sector gets 0 pts
  assert.equal(result.scoreMap.get(sectorConcept.id), 0);

  // Exact order: docLinked (100) -> universal (40) -> unlinked sector (0)
  assert.equal(result.references[0].id, docLinkedSectorConcept.id);
  assert.equal(result.references[1].id, universalConcept.id);
  assert.equal(result.references[2].id, sectorConcept.id);

  // refIds must contain the doc-linked concept and not crash on undefined storyId
  assert.ok(result.refIds.has(docLinkedSectorConcept.id));
  assert.ok(!result.refIds.has(universalConcept.id));
});

test("Writing Desk Stress 1.2: Document with story linked to 10 concepts", () => {
  const docId = "doc-chapter-1";
  const storyId = "story-red-right-hand";

  // Create 10 concepts linked to the story
  const storyConcepts: StudioEntity[] = [];
  const relations: StudioRelation[] = [];

  for (let i = 1; i <= 10; i++) {
    const isUniv = i <= 3; // 3 universal, 7 sector
    const c = makeConcept(
      `c-story-${i}`,
      `Conceito da História ${String(i).padStart(2, "0")}`,
      {
        scale: isUniv ? "UNIVERSAL" : "SETOR",
        category: isUniv ? "cosmologia" : "geopolitica",
        rules: [`Regra da história ${i}`],
      },
    );
    storyConcepts.push(c);
    relations.push({
      id: `rel-story-${i}`,
      sourceId: storyId,
      targetId: c.id,
      label: "fundamenta",
    });
  }

  // 1 concept linked directly to the chapter document (sector scale)
  const docConcept = makeConcept("c-doc-direct", "Conceito do Capítulo", {
    scale: "SETOR",
  });
  storyConcepts.push(docConcept);
  relations.push({
    id: "rel-doc-direct",
    sourceId: docId,
    targetId: docConcept.id,
    label: "referência de escrita",
  });

  // 5 unlinked universal concepts
  const unlinkedUniversal: StudioEntity[] = [];
  for (let i = 1; i <= 5; i++) {
    const c = makeConcept(`c-unlinked-univ-${i}`, `Universal Avulso ${i}`, {
      scale: "UNIVERSAL",
    });
    unlinkedUniversal.push(c);
  }

  // 5 unlinked sector concepts
  const unlinkedSector: StudioEntity[] = [];
  for (let i = 1; i <= 5; i++) {
    const c = makeConcept(`c-unlinked-sec-${i}`, `Setor Avulso ${i}`, {
      scale: "SETOR",
    });
    unlinkedSector.push(c);
  }

  const workspace: StudioWorkspace = {
    entities: [...storyConcepts, ...unlinkedUniversal, ...unlinkedSector],
    relations,
  };

  const result = computeWritingDeskReferences(
    workspace,
    docId,
    storyId,
    "",
    "concept",
    "all",
  );

  assert.equal(result.references.length, 21);

  // Scores verification:
  // - Story + Universal: 70 + 40 = 110 pts
  // - Doc direct (sector): 100 pts
  // - Story + Sector: 70 pts
  // - Unlinked Universal: 40 pts
  // - Unlinked Sector: 0 pts

  const firstThree = result.references.slice(0, 3);
  for (const c of firstThree) {
    assert.equal(
      result.scoreMap.get(c.id),
      110,
      `${c.title} should have score 110`,
    );
  }

  const fourth = result.references[3];
  assert.equal(fourth.id, "c-doc-direct");
  assert.equal(result.scoreMap.get(fourth.id), 100);

  const nextSeven = result.references.slice(4, 11);
  for (const c of nextSeven) {
    assert.equal(
      result.scoreMap.get(c.id),
      70,
      `${c.title} should have score 70`,
    );
  }

  const nextFive = result.references.slice(11, 16);
  for (const c of nextFive) {
    assert.equal(
      result.scoreMap.get(c.id),
      40,
      `${c.title} should have score 40`,
    );
  }

  const lastFive = result.references.slice(16, 21);
  for (const c of lastFive) {
    assert.equal(
      result.scoreMap.get(c.id),
      0,
      `${c.title} should have score 0`,
    );
  }
});

test("Writing Desk Stress 1.3: Document with 0 concepts in workspace", () => {
  const workspace: StudioWorkspace = {
    entities: [
      makeEntity(
        "char-1",
        "character",
        "Larry",
        "Guardião",
        "História de Larry",
      ),
      makeEntity(
        "fac-1",
        "faction",
        "Red Right Hand",
        "Facção de Severum",
        "Elite de Arner",
      ),
      makeEntity(
        "doc-1",
        "document",
        "Capítulo 1",
        "Texto",
        "Conteúdo do capítulo",
      ),
    ],
    relations: [],
  };

  // Filter by concept
  const resultConcept = computeWritingDeskReferences(
    workspace,
    "doc-1",
    "story-1",
    "",
    "concept",
    "all",
  );
  assert.equal(resultConcept.references.length, 0);
  assert.equal(resultConcept.refIds.size, 0);

  // Filter all kinds
  const resultAll = computeWritingDeskReferences(
    workspace,
    "doc-1",
    "story-1",
    "",
    "all",
    "all",
  );
  // document is excluded from references by design
  assert.equal(resultAll.references.length, 2);
  assert.deepEqual(
    resultAll.references.map((e) => e.kind),
    ["character", "faction"],
  );
});

test("Writing Desk Stress 1.4: Universal concepts always surface above unrelated sector lore", () => {
  // Test with 50 concepts of alternating scales
  const concepts: StudioEntity[] = [];
  for (let i = 0; i < 50; i++) {
    const isUniv = i % 2 === 0;
    // Mix scales and case variations: "UNIVERSAL", "universal", "Universal"
    const scale = isUniv
      ? i % 4 === 0
        ? "UNIVERSAL"
        : i % 4 === 2
          ? "universal"
          : "Universal"
      : "SETOR";
    concepts.push(
      makeConcept(`c-scale-${i}`, `Conceito ${String(i).padStart(2, "0")}`, {
        scale,
        category: "cosmologia",
      }),
    );
  }

  const workspace: StudioWorkspace = {
    entities: concepts,
    relations: [],
  };

  const result = computeWritingDeskReferences(
    workspace,
    "doc-test",
    undefined,
    "",
    "concept",
    "all",
  );

  assert.equal(result.references.length, 50);

  // All 25 universal concepts must appear in positions 0..24
  for (let i = 0; i < 25; i++) {
    const c = result.references[i];
    assert.equal(result.scoreMap.get(c.id), 40);
    assert.equal(String(c.attributes.scale).toUpperCase(), "UNIVERSAL");
  }

  // All 25 sector concepts must appear in positions 25..49
  for (let i = 25; i < 50; i++) {
    const c = result.references[i];
    assert.equal(result.scoreMap.get(c.id), 0);
    assert.notEqual(String(c.attributes.scale).toUpperCase(), "UNIVERSAL");
  }
});

test("Writing Desk Stress 1.5: Search query matches across titles, body summaries, and rules", () => {
  const c1 = makeConcept("c-1", "Dualidade Cósmica", {
    summary: "Equilíbrio primordial de luz e trevas.",
    body: "Corpo neutro sem termos chave.",
    rules: ["A entropia consome estrelas desprotegidas."],
  });
  const c2 = makeConcept("c-2", "Metodologia Severum", {
    summary: "Resumo corporativo padrão.",
    body: "Aqui no início do corpo mencionamos Arner e seus contratos.",
    rules: ["Subordinação estrita aos contratos."],
  });
  const c3 = makeConcept("c-3", "Biotecnologia Deroo Da", {
    summary: "Enxertos mecânicos para soldados.",
    body: "Descritivo geral de biomecânica.",
    rules: [
      "Regra 1: compatibilidade biológica.",
      "Regra 2: Rejeição neural de Severum.",
    ],
  });

  const workspace: StudioWorkspace = {
    entities: [c1, c2, c3],
    relations: [],
  };

  // 1. Search by title (case and accent insensitive)
  const resTitle = computeWritingDeskReferences(
    workspace,
    "doc-1",
    undefined,
    "dualidade",
    "concept",
    "all",
  );
  assert.equal(resTitle.references.length, 1);
  assert.equal(resTitle.references[0].id, "c-1");

  // 2. Search by summary term
  const resSummary = computeWritingDeskReferences(
    workspace,
    "doc-1",
    undefined,
    "luz e trevas",
    "concept",
    "all",
  );
  assert.equal(resSummary.references.length, 1);
  assert.equal(resSummary.references[0].id, "c-1");

  // 3. Search by body term (within first 500 chars)
  const resBody = computeWritingDeskReferences(
    workspace,
    "doc-1",
    undefined,
    "Arner",
    "concept",
    "all",
  );
  assert.equal(resBody.references.length, 1);
  assert.equal(resBody.references[0].id, "c-2");

  // 4. Search by second rule (§2) term
  const resRule = computeWritingDeskReferences(
    workspace,
    "doc-1",
    undefined,
    "rejeição neural",
    "concept",
    "all",
  );
  assert.equal(resRule.references.length, 1);
  assert.equal(resRule.references[0].id, "c-3");

  // 5. Special characters and Portuguese accents
  const resAccent = computeWritingDeskReferences(
    workspace,
    "doc-1",
    undefined,
    "ENTROPIA",
    "concept",
    "all",
  );
  assert.equal(resAccent.references.length, 1);
  assert.equal(resAccent.references[0].id, "c-1");

  // 6. Non-matching query returns 0
  const resNone = computeWritingDeskReferences(
    workspace,
    "doc-1",
    undefined,
    "palavra_inexistente_xyz_123",
    "concept",
    "all",
  );
  assert.equal(resNone.references.length, 0);
});

// ---------------------------------------------------------------------------
// SUITE 2: Citation Injection & ProseMirror AST Stress Testing
// ---------------------------------------------------------------------------

test("Writing Desk Stress 2.1: Citation injection produces valid ProseMirror blockquote structure", () => {
  const schema = getSchema([
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: { openOnClick: false, autolink: false },
      codeBlock: false,
      code: false,
      trailingNode: false,
    }),
  ]);

  // Test vector of concepts with varied structures
  const conceptsToTest: StudioEntity[] = [
    // Full concept with multiple rules
    makeConcept("c-full", "Planetas Cegos", {
      summary: "Mundos sem sol consumidos pelo vácuo de Hades.",
      rules: [
        "A gravidade residual distorce transmissões quânticas.",
        "Nenhum ser vivo sobrevive sem traje de Severum.",
      ],
    }),
    // Concept with zero rules
    makeConcept("c-no-rules", "Artefato Misterioso", {
      summary: "Objeto de origem desconhecida.",
      rules: [],
    }),
    // Concept with empty summary (falls back to body.slice(0, 200))
    makeConcept("c-no-summary", "Conceito Sem Resumo", {
      summary: "",
      body: "Este é o corpo principal que deve ser utilizado como fallback quando o resumo estiver vazio.",
      rules: ["Regra isolada."],
    }),
    // Concept with empty summary and empty body
    makeConcept("c-empty", "Vazio Total", {
      summary: "",
      body: "",
      rules: [],
    }),
    // Concept with special characters, quotes, HTML-like tags, and symbols
    makeConcept("c-special", 'Conceito «Especial» & "Citações" <Script>', {
      summary: "Símbolos cósmicos: 🪐 ⚡ — travessão e aspas duplas.",
      rules: ["Regra com <tags> e 'aspas simples'."],
    }),
  ];

  for (const concept of conceptsToTest) {
    const injectedNodes = buildConceptQuoteNodes(concept);

    // 1. Structure check: must return [blockquote, paragraph]
    assert.equal(injectedNodes.length, 2, `Expected 2 nodes for ${concept.id}`);
    assert.equal(injectedNodes[0].type, "blockquote");
    assert.equal(injectedNodes[1].type, "paragraph");

    // 2. Validate blockquote content
    const bqContent = injectedNodes[0].content as JSONContent[];
    assert.ok(bqContent.length >= 1 && bqContent.length <= 2);

    const firstP = bqContent[0];
    assert.equal(firstP.type, "paragraph");
    assert.ok(Array.isArray(firstP.content));
    assert.equal(firstP.content![0].type, "text");
    assert.deepEqual(firstP.content![0].marks, [{ type: "italic" }]);

    const rules = Array.isArray(concept.attributes.rules)
      ? (concept.attributes.rules as string[])
      : [];
    if (rules.length > 0) {
      assert.equal(bqContent.length, 2);
      const secondP = bqContent[1];
      assert.equal(secondP.type, "paragraph");
      assert.equal(secondP.content![0].type, "text");
      assert.deepEqual(secondP.content![0].marks, [{ type: "italic" }]);
      assert.ok(secondP.content![0].text!.startsWith("Regra Canônica: "));
    } else {
      assert.equal(bqContent.length, 1);
    }

    // 3. Assemble complete ProseMirror document and run schema validation
    const docJSON: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Parágrafo anterior ao conceito." }],
        },
        ...injectedNodes,
        {
          type: "paragraph",
          content: [{ type: "text", text: "Parágrafo posterior ao conceito." }],
        },
      ],
    };

    // Strict ProseMirror validation: throws if invalid schema
    const pmDoc = ProseMirrorNode.fromJSON(schema, docJSON);
    assert.doesNotThrow(
      () => pmDoc.check(),
      `ProseMirror schema check failed for ${concept.id}`,
    );

    // Verify document contains both existing paragraphs and the blockquote
    assert.equal(pmDoc.childCount, 4);
    assert.equal(pmDoc.child(0).type.name, "paragraph");
    assert.equal(pmDoc.child(1).type.name, "blockquote");
    assert.equal(pmDoc.child(2).type.name, "paragraph");
    assert.equal(pmDoc.child(3).type.name, "paragraph");
    assert.equal(pmDoc.child(0).textContent, "Parágrafo anterior ao conceito.");
    assert.equal(
      pmDoc.child(3).textContent,
      "Parágrafo posterior ao conceito.",
    );
  }
});

test("Writing Desk Stress 2.2: Multiple sequential citation injections preserve editor state", () => {
  const schema = getSchema([StarterKit]);

  let currentDocJSON: JSONContent = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "Texto de abertura do manuscrito." }],
      },
    ],
  };

  // Inject 5 citations sequentially
  for (let i = 1; i <= 5; i++) {
    const concept = makeConcept(`c-seq-${i}`, `Conceito Cósmico ${i}`, {
      summary: `Resumo do conceito ${i}`,
      rules: [`Regra mandatória ${i}`],
    });

    const quoteNodes = buildConceptQuoteNodes(concept);
    currentDocJSON = {
      type: "doc",
      content: [...currentDocJSON.content!, ...quoteNodes],
    };

    const pmNode = ProseMirrorNode.fromJSON(schema, currentDocJSON);
    assert.doesNotThrow(() => pmNode.check(), `Failed on iteration ${i}`);
  }

  const finalDoc = ProseMirrorNode.fromJSON(schema, currentDocJSON);
  finalDoc.check();

  // Initial paragraph + 5 * (blockquote + empty paragraph) = 1 + 10 = 11 children
  assert.equal(finalDoc.childCount, 11);
  assert.equal(
    finalDoc.child(0).textContent,
    "Texto de abertura do manuscrito.",
  );
  for (let i = 1; i <= 5; i++) {
    const bq = finalDoc.child(2 * i - 1);
    assert.equal(bq.type.name, "blockquote");
    assert.ok(bq.textContent.includes(`Conceito Cósmico ${i}`));
    assert.ok(bq.textContent.includes(`Regra mandatória ${i}`));
  }
});

// ---------------------------------------------------------------------------
// SUITE 3: Bidirectional Relation Linking & State Reactivity
// ---------------------------------------------------------------------------

test("Writing Desk Stress 3.1: Relation linking creates valid bidirectional relations and updates UI state", () => {
  const draftId = "doc-chapter-intro";
  const concept = makeConcept("c-planetas-cegos", "Planetas Cegos", {
    scale: "UNIVERSAL",
    category: "cosmologia",
  });

  // Initial state: no relations
  let workspace: StudioWorkspace = {
    entities: [
      makeEntity(draftId, "document", "Capítulo 1", "Início", "Era uma vez..."),
      concept,
    ],
    relations: [],
  };

  // Step 1: Initial references query
  const initialDesk = computeWritingDeskReferences(
    workspace,
    draftId,
    undefined,
    "",
    "concept",
    "all",
  );

  assert.equal(initialDesk.refIds.has(concept.id), false);
  // Universal concept has score 40
  assert.equal(initialDesk.scoreMap.get(concept.id), 40);

  // Initial neighbors check
  const draftNeighborsBefore = neighbors(draftId, workspace.relations);
  const conceptNeighborsBefore = neighbors(concept.id, workspace.relations);
  assert.equal(draftNeighborsBefore.has(concept.id), false);
  assert.equal(conceptNeighborsBefore.has(draftId), false);

  // Step 2: Simulate link() action by creating relation
  const newRelation: StudioRelation = {
    id: "rel-desk-12345",
    sourceId: draftId,
    targetId: concept.id,
    label: "referência de escrita",
  };

  // Validate relation schema
  const parseResult = relationSchema.safeParse(newRelation);
  assert.equal(parseResult.success, true);

  // Simulate onRelation(newRelation) without page reload
  workspace = {
    ...workspace,
    relations: [...workspace.relations, newRelation],
  };

  // Step 3: Recompute references immediately from updated workspace
  const updatedDesk = computeWritingDeskReferences(
    workspace,
    draftId,
    undefined,
    "",
    "concept",
    "all",
  );

  // Immediate UI reflection:
  // 1. refIds now includes concept.id
  assert.equal(updatedDesk.refIds.has(concept.id), true);

  // 2. Score boosted by +100 (100 doc-linked + 40 universal = 140)
  assert.equal(updatedDesk.scoreMap.get(concept.id), 140);

  // 3. Concept is at the top of the reference list
  assert.equal(updatedDesk.references[0].id, concept.id);

  // 4. Bidirectional neighbors graph test
  const draftNeighborsAfter = neighbors(draftId, workspace.relations);
  const conceptNeighborsAfter = neighbors(concept.id, workspace.relations);

  assert.equal(
    draftNeighborsAfter.has(concept.id),
    true,
    "Draft must see concept in neighbors",
  );
  assert.equal(
    conceptNeighborsAfter.has(draftId),
    true,
    "Concept must see draft in neighbors",
  );

  // Step 4: Symmetrical relation test (if targetId and sourceId are swapped)
  const inverseRelation: StudioRelation = {
    id: "rel-inverse-54321",
    sourceId: concept.id,
    targetId: draftId,
    label: "referência de escrita",
  };
  const inverseWorkspace: StudioWorkspace = {
    ...workspace,
    relations: [inverseRelation],
  };
  const inverseDesk = computeWritingDeskReferences(
    inverseWorkspace,
    draftId,
    undefined,
    "",
    "concept",
    "all",
  );
  assert.equal(inverseDesk.refIds.has(concept.id), true);
  assert.equal(inverseDesk.scoreMap.get(concept.id), 140);
  assert.equal(
    neighbors(draftId, inverseWorkspace.relations).has(concept.id),
    true,
  );
  assert.equal(
    neighbors(concept.id, inverseWorkspace.relations).has(draftId),
    true,
  );
});

test("Writing Desk Stress 3.2: Self-referential relations are rejected by relationSchema", () => {
  const invalidSelfRelation = {
    id: "rel-invalid-self",
    sourceId: "concept-1",
    targetId: "concept-1",
    label: "auto-referência inválida",
  };

  const res = relationSchema.safeParse(invalidSelfRelation);
  assert.equal(res.success, false);
  if (!res.success) {
    assert.ok(
      res.error.issues.some((i) =>
        i.message.includes("duas fichas diferentes"),
      ),
    );
  }
});
