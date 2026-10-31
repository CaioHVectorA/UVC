import test from "node:test";
import assert from "node:assert/strict";
import {
  conceptCategories,
  conceptScales,
  conceptAttributesSchema,
  validateConceptAttributes,
  filterReferenceConcepts,
  formatConceptCitation,
  type ConceptCategory,
  type ConceptScale,
} from "../../lib/concept-matrix";
import {
  entitySchema,
  relationSchema,
  neighbors,
  blankConcept,
  normalizeConceptCategory,
  parseConceptAttributes,
  type StudioEntity,
  type StudioRelation,
} from "../../lib/workspace";
import { seedEntities, seedRelations } from "../../lib/workspace-seed";

/* =========================================================================
   Adversarial Stress Testing Suite — Concept Matrix (Challenger M2.1)
   ========================================================================= */

test("Empirical Stress 1: Extreme concept inputs & boundary conditions", () => {
  // 1.1 Boundary: Concept with exactly 0 rules is schema-valid
  assert.equal(
    conceptCategories.length,
    5,
    "Must have exactly 5 canonical concept categories",
  );
  assert.equal(
    conceptScales.length,
    3,
    "Must have exactly 3 canonical concept scales",
  );

  const zeroRules = {
    category: "cosmologia" as ConceptCategory,
    rules: [] as string[],
    scale: "UNIVERSAL" as ConceptScale,
  };
  const zeroRes = validateConceptAttributes(zeroRules);
  assert.equal(
    zeroRes.success,
    true,
    "0 rules must be accepted by conceptAttributesSchema",
  );
  assert.equal(conceptAttributesSchema.safeParse(zeroRules).success, true);
  if (zeroRes.success) {
    assert.deepEqual(zeroRes.data.rules, []);
  }

  // 1.2 Boundary: Concept with 50 rules
  const fiftyRules = {
    category: "tecnologia" as ConceptCategory,
    rules: Array.from(
      { length: 50 },
      (_, i) => `Regra operacional ${i + 1}: Diretriz de dobra estelar.`,
    ),
    scale: "SETOR" as ConceptScale,
  };
  const fiftyRes = validateConceptAttributes(fiftyRules);
  assert.equal(
    fiftyRes.success,
    true,
    "50 rules must be accepted without truncation",
  );
  if (fiftyRes.success) {
    assert.equal(fiftyRes.data.rules.length, 50);
  }

  // 1.3 Boundary: Rule description length limits (min 1, max 500)
  // Exact 500 characters -> PASS
  const rule500Chars = "A".repeat(500);
  const validLengthRes = validateConceptAttributes({
    category: "misticismo",
    rules: [rule500Chars],
    scale: "TERRA",
  });
  assert.equal(
    validLengthRes.success,
    true,
    "Exactly 500 chars in a rule must pass",
  );

  // 501 characters -> FAIL
  const rule501Chars = "A".repeat(501);
  const invalidLengthRes = validateConceptAttributes({
    category: "misticismo",
    rules: [rule501Chars],
    scale: "TERRA",
  });
  assert.equal(
    invalidLengthRes.success,
    false,
    "501 chars in a rule must fail schema validation",
  );

  // Rule with only whitespace -> FAIL
  const whitespaceRuleRes = validateConceptAttributes({
    category: "geopolitica",
    rules: ["   \t   \n  "],
    scale: "SETOR",
  });
  assert.equal(
    whitespaceRuleRes.success,
    false,
    "Whitespace-only rule must be rejected by min(1).trim()",
  );

  // 1.4 Extreme Unicode, emojis, brackets, quotes, and HTML/XML injection strings
  const unicodeConcept = {
    category: "cosmologia" as ConceptCategory,
    rules: [
      "⚔️ Lâmina de plasma 🌌 em Órion: «100% letal» & inviolável!",
      "<script>alert('xss')</script> & <b>ênfase cósmica</b>",
      "Quebra de linha \r\n com aspas duplas \" e simples ' e crases `",
      "Caracteres matemáticos: ∑ ∫ ∂ ∇ ∞ ≈ ≠ ≤ ≥ e gregos: Ω Ψ Φ",
    ],
    scale: "UNIVERSAL" as ConceptScale,
    visualAssetId: "asset-🪐-cosmic-123",
  };
  const unicodeRes = validateConceptAttributes(unicodeConcept);
  assert.equal(
    unicodeRes.success,
    true,
    "Unicode, emojis and injection strings must pass without corruption",
  );
  if (unicodeRes.success) {
    assert.equal(unicodeRes.data.rules.length, 4);
    assert.ok(unicodeRes.data.rules[0].includes("⚔️"));
    assert.ok(unicodeRes.data.rules[1].includes("<script>"));
  }
});

test("Empirical Stress 2: Category and scale normalization to defaults", () => {
  // 2.1 normalizeConceptCategory handles various non-standard, accented, and garbage strings
  assert.equal(normalizeConceptCategory(null), "cosmologia");
  assert.equal(normalizeConceptCategory(undefined), "cosmologia");
  assert.equal(normalizeConceptCategory(""), "cosmologia");
  assert.equal(normalizeConceptCategory("   "), "cosmologia");
  assert.equal(
    normalizeConceptCategory("CATEGORIA_INVENTADA_XYZ"),
    "cosmologia",
  );

  // Keyword matches
  assert.equal(normalizeConceptCategory("Engenharia de Dobra"), "tecnologia");
  assert.equal(normalizeConceptCategory("TECNOLOGIA AVANÇADA"), "tecnologia");
  assert.equal(
    normalizeConceptCategory("Geopolítica Draconiana"),
    "geopolitica",
  );
  assert.equal(
    normalizeConceptCategory("Doutrina Militar de Severum"),
    "geopolitica",
  );
  assert.equal(normalizeConceptCategory("Biologia Molecular"), "biologia");
  assert.equal(normalizeConceptCategory("Genética Experimental"), "biologia");
  assert.equal(normalizeConceptCategory("Enxertos Cibernéticos"), "biologia");
  assert.equal(normalizeConceptCategory("Misticismo Oculto"), "misticismo");
  assert.equal(
    normalizeConceptCategory("Maldição Espiritual Yaa"),
    "misticismo",
  );
  assert.equal(normalizeConceptCategory("Magia Transcendente"), "misticismo");

  // Fixed precedence: "bio" is evaluated before "tec"/"eng" in normalizeConceptCategory,
  // ensuring compound biology terms normalize to "biologia".
  assert.equal(normalizeConceptCategory("Biotecnologia"), "biologia");
  assert.equal(normalizeConceptCategory("Bioengenharia"), "biologia");
  assert.equal(normalizeConceptCategory("Bioengenharia Molecular"), "biologia");
  assert.equal(normalizeConceptCategory("Biomédica"), "biologia");
  assert.equal(normalizeConceptCategory("Cibernética"), "tecnologia");
  assert.equal(normalizeConceptCategory("Engenharia Bélica"), "tecnologia");
  assert.equal(normalizeConceptCategory("Cosmologia Quântica"), "cosmologia");

  // 2.2 parseConceptAttributes recovers malformed input into clean ConceptAttributes
  // Case: Empty raw object
  const emptyParsed = parseConceptAttributes({});
  assert.equal(emptyParsed.category, "cosmologia");
  assert.equal(emptyParsed.scale, "UNIVERSAL");
  assert.deepEqual(emptyParsed.rules, []);

  // Case: Unknown scale and malformed rules array with nulls, numbers, empty strings
  const malformedInput = {
    category: "Militarismo Cósmico",
    scale: "MULTIVERSAL_SCALE_UNKNOWN",
    rules: ["Regra 1 válida", null, 12345, "   ", "", "Regra 2 válida"],
    source: "docs/lore/secret.md",
  };
  const recovered = parseConceptAttributes(
    malformedInput as unknown as Record<string, unknown>,
  );
  assert.equal(recovered.category, "geopolitica");
  assert.equal(recovered.scale, "UNIVERSAL");
  assert.deepEqual(recovered.rules, ["Regra 1 válida", "Regra 2 válida"]);
  assert.equal(recovered.source, "docs/lore/secret.md");

  // Verify that recovered output passes validateConceptAttributes
  const validRecovered = validateConceptAttributes(recovered);
  assert.equal(
    validRecovered.success,
    true,
    "Recovered attributes must strictly pass conceptAttributesSchema",
  );

  // 2.3 blankConcept helper produces valid StudioEntity
  const blank = blankConcept("Conceito de Teste");
  assert.equal(blank.kind, "concept");
  assert.equal(blank.title, "Conceito de Teste");
  assert.equal(entitySchema.safeParse(blank).success, true);
  assert.equal(validateConceptAttributes(blank.attributes).success, true);
});

test("Empirical Stress 3: Relational graph scaling, circularity, and self-linking prevention", () => {
  // 3.1 Self-linking prevention at relationSchema level
  const selfRelation = {
    id: "rel-self",
    sourceId: "concept-dualidade",
    targetId: "concept-dualidade",
    label: "fundamenta",
  };
  const selfRes = relationSchema.safeParse(selfRelation);
  assert.equal(
    selfRes.success,
    false,
    "Self-linking relations must be rejected",
  );
  if (!selfRes.success) {
    assert.ok(
      selfRes.error.issues.some((i) =>
        i.message.includes("Escolha duas fichas diferentes"),
      ),
      "Must throw exact self-relation error message",
    );
  }

  // 3.2 Relation label boundaries: empty string, whitespace, max length 120
  assert.equal(
    relationSchema.safeParse({
      id: "r1",
      sourceId: "a",
      targetId: "b",
      label: "",
    }).success,
    false,
    "Empty relation label must be rejected",
  );
  assert.equal(
    relationSchema.safeParse({
      id: "r2",
      sourceId: "a",
      targetId: "b",
      label: "   ",
    }).success,
    false,
    "Whitespace relation label must be rejected",
  );
  assert.equal(
    relationSchema.safeParse({
      id: "r3",
      sourceId: "a",
      targetId: "b",
      label: "x".repeat(121),
    }).success,
    false,
    "Label > 120 characters must be rejected",
  );

  // 3.3 Large scale graph: Concept connected to 200 distinct entities
  const largeRelations: StudioRelation[] = Array.from(
    { length: 200 },
    (_, i) => ({
      id: `rel-${i}`,
      sourceId: "concept-central",
      targetId: `entity-${i}`,
      label: i % 2 === 0 ? "fundamenta" : "relacionado",
    }),
  );

  const startNeighbors = performance.now();
  const centralNeighbors = neighbors("concept-central", largeRelations, 1);
  const elapsedNeighbors = performance.now() - startNeighbors;

  assert.equal(
    centralNeighbors.size,
    201,
    "Concept + 200 connected neighbors = 201 nodes",
  );
  assert.ok(
    elapsedNeighbors < 50,
    `neighbors() with 200 edges took ${elapsedNeighbors}ms, must be < 50ms`,
  );

  // 3.4 Circular relations graph resilience
  // Create cycle: C1 -> C2 -> C3 -> C4 -> C5 -> C1
  const circularRelations: StudioRelation[] = [
    { id: "rc-1", sourceId: "node-1", targetId: "node-2", label: "rege" },
    { id: "rc-2", sourceId: "node-2", targetId: "node-3", label: "rege" },
    { id: "rc-3", sourceId: "node-3", targetId: "node-4", label: "rege" },
    { id: "rc-4", sourceId: "node-4", targetId: "node-5", label: "rege" },
    { id: "rc-5", sourceId: "node-5", targetId: "node-1", label: "rege" },
  ];

  // Traversing circular graph at various depths must not loop infinitely
  for (const depth of [1, 2, 3, 5, 10]) {
    const reachable = neighbors("node-1", circularRelations, depth);
    assert.ok(
      reachable.size <= 5,
      "Circular traversal must be bounded by distinct node count",
    );
    assert.ok(reachable.has("node-1"));
  }
});

test("Empirical Stress 4: Canon fidelity and cosmology integrity verification", () => {
  const concepts = seedEntities.filter((e) => e.kind === "concept");
  const conceptMap = new Map(concepts.map((c) => [c.id, c]));

  // 4.1 Check all 5 required canonical concepts are present
  const requiredConceptIds = [
    "concept-planetas-cegos",
    "concept-dualidade-ormuz-hades",
    "concept-metodologia-severum",
    "concept-biotecnologia-deroo-da",
    "concept-enokiti",
  ];

  for (const cid of requiredConceptIds) {
    const c = conceptMap.get(cid);
    assert.ok(c, `Missing canonical concept ${cid} in seedEntities`);
    assert.equal(c.kind, "concept");
    assert.equal(entitySchema.safeParse(c).success, true);
    assert.equal(validateConceptAttributes(c.attributes).success, true);
  }

  // 4.2 Validate Planetas Cegos contract
  const planetasCegos = conceptMap.get("concept-planetas-cegos")!;
  assert.equal(
    planetasCegos.published,
    false,
    "Planetas Cegos must be published: false",
  );
  assert.equal(
    planetasCegos.attributes.definitionPending,
    true,
    "Planetas Cegos must have definitionPending: true",
  );
  assert.equal(planetasCegos.attributes.scale, "UNIVERSAL");
  assert.equal(planetasCegos.attributes.category, "cosmologia");
  assert.ok(
    Array.isArray(planetasCegos.attributes.rules) &&
      planetasCegos.attributes.rules.length >= 3,
  );

  // 4.3 Validate Dualidade Ormuz e Hades
  const dualidade = conceptMap.get("concept-dualidade-ormuz-hades")!;
  assert.equal(dualidade.published, true);
  assert.equal(dualidade.attributes.scale, "UNIVERSAL");
  assert.equal(dualidade.attributes.category, "cosmologia");
  assert.ok(dualidade.body.includes("Ormuz"), "Must mention Ormuz");
  assert.ok(dualidade.body.includes("Hades"), "Must mention Hades");
  assert.ok(dualidade.body.includes("Lampião"), "Must mention O Lampião");
  assert.ok(
    dualidade.body.includes("Bracelete Divino"),
    "Must mention Bracelete Divino",
  );

  // 4.4 Validate Metodologia Severum
  const severum = conceptMap.get("concept-metodologia-severum")!;
  assert.equal(severum.published, true);
  assert.equal(severum.attributes.scale, "SETOR");
  assert.equal(severum.attributes.category, "geopolitica");
  assert.ok(severum.body.includes("Arner"), "Must mention Arner");
  assert.ok(severum.body.includes("Severum"), "Must mention Severum");
  assert.ok(
    severum.body.includes("Red Right Hand"),
    "Must mention Red Right Hand",
  );

  // 4.5 Validate Biotecnologia Deroo Da
  const derooDa = conceptMap.get("concept-biotecnologia-deroo-da")!;
  assert.equal(derooDa.published, true);
  assert.equal(derooDa.attributes.scale, "SETOR");
  assert.equal(derooDa.attributes.category, "biologia");
  assert.ok(derooDa.body.includes("Deroo Da"), "Must mention Deroo Da");
  assert.ok(
    derooDa.body.includes("enxertos biomecânicos") ||
      derooDa.body.includes("cibernética"),
  );

  // 4.6 Validate Maldição Enokití
  const enokiti = conceptMap.get("concept-enokiti")!;
  assert.equal(enokiti.published, true);
  assert.equal(enokiti.attributes.scale, "TERRA");
  assert.equal(enokiti.attributes.category, "misticismo");
  assert.ok(
    enokiti.body.includes("Irmãos Yaa") || enokiti.body.includes("Masin"),
  );

  // 4.7 Integrity of concept relations in seedRelations
  const seedIds = new Set(seedEntities.map((e) => e.id));
  const conceptEdges = seedRelations.filter(
    (r) =>
      r.sourceId.startsWith("concept-") || r.targetId.startsWith("concept-"),
  );

  assert.ok(
    conceptEdges.length >= 20,
    `Expected at least 20 concept relations, found ${conceptEdges.length}`,
  );

  for (const rel of conceptEdges) {
    assert.ok(
      seedIds.has(rel.sourceId),
      `Relation sourceId ${rel.sourceId} does not exist in seedEntities`,
    );
    assert.ok(
      seedIds.has(rel.targetId),
      `Relation targetId ${rel.targetId} does not exist in seedEntities`,
    );
    assert.notEqual(rel.sourceId, rel.targetId, "No self-relations allowed");
    assert.equal(relationSchema.safeParse(rel).success, true);
  }
});

test("Empirical Stress 5: UI invariants and writing desk reference filter resilience", () => {
  const concepts: StudioEntity[] = [
    {
      id: "concept-universal-1",
      kind: "concept",
      title: "Universal B",
      summary: "Cosmic rule",
      body: "Deep lore body",
      status: "ready",
      published: true,
      tags: [],
      attributes: {
        category: "cosmologia",
        scale: "UNIVERSAL",
        rules: ["Regra 1"],
      },
      version: 1,
    },
    {
      id: "concept-universal-2",
      kind: "concept",
      title: "Universal A",
      summary: "Cosmic rule",
      body: "Deep lore body",
      status: "ready",
      published: true,
      tags: [],
      attributes: {
        category: "cosmologia",
        scale: "UNIVERSAL",
        rules: ["Regra 2"],
      },
      version: 1,
    },
    {
      id: "concept-story-linked",
      kind: "concept",
      title: "Story Linked Concept",
      summary: "Local lore",
      body: "Deep lore body",
      status: "ready",
      published: true,
      tags: [],
      attributes: {
        category: "geopolitica",
        scale: "SETOR",
        rules: ["Regra 3"],
      },
      version: 1,
    },
    {
      id: "concept-doc-linked",
      kind: "concept",
      title: "Doc Linked Concept",
      summary: "Specific chapter lore",
      body: "Deep lore body",
      status: "ready",
      published: true,
      tags: [],
      attributes: { category: "biologia", scale: "TERRA", rules: ["Regra 4"] },
      version: 1,
    },
    {
      id: "concept-unrelated",
      kind: "concept",
      title: "Unrelated Concept",
      summary: "Other lore",
      body: "Deep lore body",
      status: "ready",
      published: true,
      tags: [],
      attributes: {
        category: "misticismo",
        scale: "TERRA",
        rules: ["Regra 5"],
      },
      version: 1,
    },
  ];

  const relations: StudioRelation[] = [
    {
      id: "r-doc",
      sourceId: "doc-123",
      targetId: "concept-doc-linked",
      label: "fundamenta",
    },
    {
      id: "r-story",
      sourceId: "story-456",
      targetId: "concept-story-linked",
      label: "fundamenta",
    },
  ];

  // 5.1 Strict prioritization hierarchy:
  // Doc-linked (100) > Story-linked (70) > Universal unlinked (40) > Unrelated (0)
  const sorted = filterReferenceConcepts(concepts, relations, {
    storyId: "story-456",
    documentId: "doc-123",
  });

  assert.equal(sorted.length, 5);
  assert.equal(
    sorted[0].id,
    "concept-doc-linked",
    "Doc-linked must be 1st (100 pts)",
  );
  assert.equal(
    sorted[1].id,
    "concept-story-linked",
    "Story-linked must be 2nd (70 pts)",
  );
  // Between the two universal concepts with score 40, tie-breaker is title localeCompare ("Universal A" before "Universal B")
  assert.equal(
    sorted[2].id,
    "concept-universal-2",
    "Tie-breaker must place Universal A before Universal B",
  );
  assert.equal(
    sorted[3].id,
    "concept-universal-1",
    "Universal B follows Universal A",
  );
  assert.equal(
    sorted[4].id,
    "concept-unrelated",
    "Unrelated Terra concept is last (0 pts)",
  );

  // 5.2 Search with special regex characters must NOT throw
  const specialQueries = [
    "[bracket]",
    "(parentheses)",
    "*asterisk*",
    "+plus+",
    "?question?",
    "^caret$",
    "\\backslash",
    "«aspas»",
    "🪐",
  ];

  for (const q of specialQueries) {
    assert.doesNotThrow(() => {
      filterReferenceConcepts(concepts, relations, { searchQuery: q });
    }, `Search query "${q}" must not throw regex syntax errors`);
  }

  // 5.3 formatConceptCitation edge cases
  // Concept with 0 rules
  const noRulesConcept: StudioEntity = {
    ...blankConcept("Conceito Sem Regras"),
    summary: "Apenas um resumo sem regras adicionais.",
  };
  const citationNoRules = formatConceptCitation(noRulesConcept);
  assert.ok(citationNoRules.includes("« [Conceito: Conceito Sem Regras]"));
  assert.ok(
    !citationNoRules.includes("Regra fundamental"),
    "Must omit rule excerpt when rules are empty",
  );

  // Concept with rules
  const citationWithRule = formatConceptCitation(concepts[0]);
  assert.ok(citationWithRule.includes("Regra fundamental: Regra 1"));
});

test("Empirical Stress 6: Cyclic relation topologies, deep graph traversals, and multi-branch DAGs", () => {
  // 6.1 Dense cyclical mesh graph (100 nodes, 300 cross-edges)
  const nodeCount = 100;
  const meshRelations: StudioRelation[] = [];

  for (let i = 0; i < nodeCount; i++) {
    // Ring cycle: i -> (i + 1) % 100
    meshRelations.push({
      id: `mesh-rel-ring-${i}`,
      sourceId: `node-${i}`,
      targetId: `node-${(i + 1) % nodeCount}`,
      label: "fundamenta",
    });
    // Cross chord 1: i -> (i + 7) % 100
    meshRelations.push({
      id: `mesh-rel-chord1-${i}`,
      sourceId: `node-${i}`,
      targetId: `node-${(i + 7) % nodeCount}`,
      label: "relacionado",
    });
    // Reverse cross chord: i -> (i + 23) % 100
    meshRelations.push({
      id: `mesh-rel-chord2-${i}`,
      sourceId: `node-${(i + 23) % nodeCount}`,
      targetId: `node-${i}`,
      label: "influencia",
    });
  }

  assert.equal(meshRelations.length, 300);

  // Deep traversal (up to 50 hops) must terminate safely within milliseconds
  const tStart = performance.now();
  const reached = neighbors("node-0", meshRelations, 50);
  const tElapsed = performance.now() - tStart;

  assert.equal(
    reached.size,
    100,
    "Traversing interconnected 100-node mesh must reach all 100 nodes",
  );
  assert.ok(
    tElapsed < 50,
    `50-hop traversal took ${tElapsed.toFixed(2)}ms, must be < 50ms`,
  );

  // 6.2 Figure-8 dual-loop cycle: Loop A (10 nodes) and Loop B (10 nodes) sharing central pivot Node 0
  const figure8Relations: StudioRelation[] = [];
  // Loop A
  for (let i = 0; i < 9; i++) {
    figure8Relations.push({
      id: `f8-a-${i}`,
      sourceId: i === 0 ? "pivot-0" : `loopA-${i}`,
      targetId: `loopA-${i + 1}`,
      label: "vinculo",
    });
  }
  figure8Relations.push({
    id: "f8-a-close",
    sourceId: "loopA-9",
    targetId: "pivot-0",
    label: "vinculo",
  });

  // Loop B
  for (let i = 0; i < 9; i++) {
    figure8Relations.push({
      id: `f8-b-${i}`,
      sourceId: i === 0 ? "pivot-0" : `loopB-${i}`,
      targetId: `loopB-${i + 1}`,
      label: "vinculo",
    });
  }
  figure8Relations.push({
    id: "f8-b-close",
    sourceId: "loopB-9",
    targetId: "pivot-0",
    label: "vinculo",
  });

  const f8All = neighbors("pivot-0", figure8Relations, 25);
  // pivot (1) + loopA (9) + loopB (9) = 19 distinct nodes
  assert.equal(f8All.size, 19);
  assert.ok(f8All.has("pivot-0"));
  assert.ok(f8All.has("loopA-5"));
  assert.ok(f8All.has("loopB-7"));

  // 6.3 Disconnected graph: node in component A must not reach component B
  const componentBRel: StudioRelation[] = [
    { id: "compB-1", sourceId: "b-1", targetId: "b-2", label: "rege" },
    { id: "compB-2", sourceId: "b-2", targetId: "b-3", label: "rege" },
  ];
  const combinedRels = [...figure8Relations, ...componentBRel];
  const reachableFromPivot = neighbors("pivot-0", combinedRels, 20);
  assert.equal(reachableFromPivot.size, 19);
  assert.ok(!reachableFromPivot.has("b-1"));
  assert.ok(!reachableFromPivot.has("b-2"));
  assert.ok(!reachableFromPivot.has("b-3"));
});

test("Empirical Stress 7: Hostile attribute parsing, prototype pollution defense, and strict schema bounds", () => {
  // 7.1 Strict schema rejection of prototype pollution attempts & unrecognized attributes
  const hostilePayload = {
    category: "cosmologia",
    rules: ["Regra legítima"],
    scale: "UNIVERSAL",
    __proto__: { isAdmin: true },
    constructor: { name: "FakeClass" },
    injectedKey: "MALICIOUS_FIELD",
  };
  const parseRes = conceptAttributesSchema.safeParse(hostilePayload);
  assert.equal(
    parseRes.success,
    false,
    "Strict schema must reject unrecognized keys (__proto__, constructor, injectedKey)",
  );

  // 7.2 parseConceptAttributes hostile array inputs
  const hostileAttributes = {
    category: "Categoria Que Não Existe",
    scale: "ESCALA_INVENTADA",
    rules: [
      null,
      undefined,
      "",
      "   \t\n  ",
      12345,
      true,
      { text: "not a string" },
      ["nested array"],
      "Regra legítima 1",
      "Regra legítima 2",
    ],
  };

  const sanitized = parseConceptAttributes(
    hostileAttributes as unknown as Record<string, unknown>,
  );
  assert.equal(sanitized.category, "cosmologia", "Falls back to cosmologia");
  assert.equal(sanitized.scale, "UNIVERSAL", "Falls back to UNIVERSAL");
  assert.deepEqual(
    sanitized.rules,
    ["Regra legítima 1", "Regra legítima 2"],
    "Strips non-string, whitespace, and null elements",
  );

  // 7.3 Validating boundary limits on rule length: exactly 500 characters passes, 501 fails
  const rule500 = "X".repeat(500);
  const pass500 = validateConceptAttributes({
    category: "tecnologia",
    scale: "SETOR",
    rules: [rule500],
  });
  assert.equal(pass500.success, true);

  const rule501 = "X".repeat(501);
  const fail501 = validateConceptAttributes({
    category: "tecnologia",
    scale: "SETOR",
    rules: [rule501],
  });
  assert.equal(fail501.success, false);
});

test("Empirical Stress 8: Reference concept ranking under high volume and linguistic corner cases", () => {
  // 8.1 300 synthetic concepts with mixed scales, categories, and titles
  const conceptsCount = 300;
  const categories: ConceptCategory[] = [
    "cosmologia",
    "tecnologia",
    "geopolitica",
    "biologia",
    "misticismo",
  ];
  const scales: ConceptScale[] = ["UNIVERSAL", "TERRA", "SETOR"];

  const largeConcepts: StudioEntity[] = Array.from(
    { length: conceptsCount },
    (_, i) => ({
      id: `concept-bench-${i}`,
      kind: "concept",
      title: `Conceito Cósmico ${String(i).padStart(3, "0")} — ${categories[i % 5]}`,
      summary: `Resumo do conceito ${i} sobre leis do universo e tecnologia.`,
      body: `Corpo expandido do conceito ${i} contendo diretrizes ontológicas.`,
      status: "ready",
      published: true,
      tags: ["benchmark", categories[i % 5]],
      attributes: {
        category: categories[i % 5],
        scale: scales[i % 3],
        rules: [`Regra primária do conceito ${i}`],
      },
      version: 1,
    }),
  );

  // Specific document and story links
  const testRelations: StudioRelation[] = [
    {
      id: "r-doc-link",
      sourceId: "doc-target-1",
      targetId: "concept-bench-42",
      label: "fundamenta",
    },
    {
      id: "r-story-link",
      sourceId: "story-target-1",
      targetId: "concept-bench-99",
      label: "fundamenta",
    },
  ];

  const tStart = performance.now();
  const sorted = filterReferenceConcepts(largeConcepts, testRelations, {
    storyId: "story-target-1",
    documentId: "doc-target-1",
    category: "all",
  });
  const tElapsed = performance.now() - tStart;

  assert.equal(sorted.length, 300);
  // concept-bench-42 is doc linked (100) -> 1st
  assert.equal(
    sorted[0].id,
    "concept-bench-42",
    "Doc-linked concept must rank 1st",
  );
  // concept-bench-99 is story linked (70) -> 2nd
  assert.equal(
    sorted[1].id,
    "concept-bench-99",
    "Story-linked concept must rank 2nd",
  );
  assert.ok(
    tElapsed < 40,
    `Filtering 300 reference concepts took ${tElapsed.toFixed(2)}ms (< 40ms)`,
  );

  // 8.2 Portuguese diacritics and case-folding in search query
  const diacriticConcepts: StudioEntity[] = [
    {
      id: "c-enokití",
      kind: "concept",
      title: "Maldição Enokití dos Irmãos Yaa",
      summary: "Restrição cármica biológica e espiritual.",
      body: "Corpo do texto.",
      status: "ready",
      published: true,
      tags: [],
      attributes: {
        category: "misticismo",
        scale: "TERRA",
        rules: ["Sacrifício contínuo"],
      },
      version: 1,
    },
    {
      id: "c-severum",
      kind: "concept",
      title: "Metodologia Corporativo-Militar de Severum",
      summary: "Doutrina de ferro e expansão bélica.",
      body: "Corpo do texto.",
      status: "ready",
      published: true,
      tags: [],
      attributes: {
        category: "geopolitica",
        scale: "SETOR",
        rules: ["Eficiência absoluta"],
      },
      version: 1,
    },
  ];

  // Case-insensitive search with Portuguese locale
  const m1 = filterReferenceConcepts(diacriticConcepts, [], {
    searchQuery: "ENOKITÍ",
  });
  assert.equal(m1.length, 1);
  assert.equal(m1[0].id, "c-enokití");

  // Search "militar" matches "Corporativo-Militar"
  const m2 = filterReferenceConcepts(diacriticConcepts, [], {
    searchQuery: "MILITAR",
  });
  assert.equal(m2.length, 1);
  assert.equal(m2[0].id, "c-severum");

  // Note on diacritic normalization: filterReferenceConcepts uses toLocaleLowerCase("pt-BR")
  // without NFD accent stripping; unaccented query "enokiti" will not match accented "Enokití"
  const mUnaccented = filterReferenceConcepts(diacriticConcepts, [], {
    searchQuery: "enokiti",
  });
  assert.equal(
    mUnaccented.length,
    0,
    "Without NFD accent stripping, unaccented query does not match accented text",
  );
});
