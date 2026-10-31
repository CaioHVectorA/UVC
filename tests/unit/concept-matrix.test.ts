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
  neighbors,
  type StudioEntity,
  type StudioRelation,
} from "../../lib/workspace";
import { seedEntities, seedRelations } from "../../lib/workspace-seed";

test("Validação de atributos de conceitos cósmicos (categorias, regras, escala e asset visual)", () => {
  // 1. Valid concept passes schema
  const valid = {
    category: "cosmologia" as ConceptCategory,
    rules: [
      "A entropia consome estrelas desprotegidas.",
      "O Lampião canaliza o vácuo de mundos devastados.",
    ],
    scale: "UNIVERSAL" as ConceptScale,
    visualAssetId: "asset-cosmic-hades",
  };
  const res = validateConceptAttributes(valid);
  assert.equal(res.success, true);
  assert.equal(conceptAttributesSchema.safeParse(valid).success, true);
  if (res.success) {
    assert.equal(res.data.category, "cosmologia");
    assert.equal(res.data.scale, "UNIVERSAL");
    assert.equal(res.data.rules.length, 2);
    assert.equal(res.data.visualAssetId, "asset-cosmic-hades");
  }

  // 2. All 5 canonical categories are accepted
  for (const cat of conceptCategories) {
    assert.equal(
      validateConceptAttributes({
        category: cat,
        rules: ["Regra canônica"],
        scale: "UNIVERSAL",
      }).success,
      true,
      `Falhou para categoria válida ${cat}`,
    );
  }

  // 3. All 3 canonical scales are accepted
  for (const scale of conceptScales) {
    assert.equal(
      validateConceptAttributes({
        category: "tecnologia",
        rules: ["Regra"],
        scale,
      }).success,
      true,
      `Falhou para escala válida ${scale}`,
    );
  }

  // 4. Rejection of invalid category
  assert.equal(
    validateConceptAttributes({
      category: "magia_aleatoria",
      rules: ["R1"],
      scale: "UNIVERSAL",
    }).success,
    false,
    "Deveria rejeitar categoria fora da taxonomia",
  );

  // 5. Rejection of invalid scale
  assert.equal(
    validateConceptAttributes({
      category: "cosmologia",
      rules: ["R1"],
      scale: "MULTIVERSAL",
    }).success,
    false,
    "Deveria rejeitar escala inválida",
  );

  // 6. Rejection of non-array or empty rules
  assert.equal(
    validateConceptAttributes({
      category: "cosmologia",
      rules: "uma regra em string",
      scale: "UNIVERSAL",
    }).success,
    false,
    "Deveria rejeitar rules que não são array",
  );

  assert.equal(
    validateConceptAttributes({
      category: "cosmologia",
      rules: [""],
      scale: "UNIVERSAL",
    }).success,
    false,
    "Deveria rejeitar string vazia nas regras",
  );

  // 7. Strict rejection of unknown / extra fields
  assert.equal(
    validateConceptAttributes({
      category: "cosmologia",
      rules: ["R1"],
      scale: "UNIVERSAL",
      secretField: "malicious_payload",
    }).success,
    false,
    "Deveria rejeitar campos arbitrários não permitidos",
  );
});

test("Seeding dos 5 conceitos canônicos cósmicos com fidelidade à cosmologia UVC", () => {
  const concepts = seedEntities.filter((e) => e.kind === "concept");
  assert.ok(
    concepts.length >= 5,
    `Esperava pelo menos 5 conceitos no seed, encontrou ${concepts.length}`,
  );

  // 1. Verify Planetas Cegos
  const planetasCegos = concepts.find((c) => c.id === "concept-planetas-cegos");
  assert.ok(planetasCegos, "Planetas Cegos deve estar presente no seed");
  assert.equal(planetasCegos.kind, "concept");
  assert.ok(planetasCegos.title.toLowerCase().includes("planetas cegos"));
  assert.equal(entitySchema.safeParse(planetasCegos).success, true);

  // 2. Verify Dualidade Ormuz e Hades
  const dualidade = concepts.find(
    (c) =>
      c.id === "concept-dualidade-ormuz-hades" ||
      c.id.includes("dualidade") ||
      c.id.includes("ormuz"),
  );
  assert.ok(dualidade, "Conceito de Dualidade Ormuz e Hades deve existir");
  assert.equal(dualidade.attributes.category, "cosmologia");
  assert.equal(dualidade.attributes.scale, "UNIVERSAL");
  assert.ok(
    Array.isArray(dualidade.attributes.rules) &&
      dualidade.attributes.rules.length > 0,
  );
  assert.ok(
    dualidade.body.includes("Ormuz") && dualidade.body.includes("Hades"),
    "Dualidade deve referenciar Ormuz e Hades explicitamente",
  );

  // 3. Verify Metodologia Severum
  const severum = concepts.find(
    (c) => c.id === "concept-metodologia-severum" || c.id.includes("severum"),
  );
  assert.ok(severum, "Conceito de Metodologia Severum deve existir");
  assert.equal(severum.attributes.category, "geopolitica");
  assert.equal(severum.attributes.scale, "SETOR");
  assert.ok(
    Array.isArray(severum.attributes.rules) &&
      severum.attributes.rules.length > 0,
  );

  // 4. Verify Biotecnologia Deroo Da
  const derooDa = concepts.find(
    (c) =>
      c.id === "concept-biotecnologia-deroo-da" || c.id.includes("deroo-da"),
  );
  assert.ok(derooDa, "Conceito de Biotecnologia Deroo Da deve existir");
  assert.ok(
    derooDa.attributes.category === "biologia" ||
      derooDa.attributes.category === "tecnologia",
  );
  assert.equal(derooDa.attributes.scale, "SETOR");
  assert.ok(
    Array.isArray(derooDa.attributes.rules) &&
      derooDa.attributes.rules.length > 0,
  );

  // 5. Verify Maldição Enokití
  const enokiti = concepts.find(
    (c) => c.id === "concept-maldicao-enokiti" || c.id === "concept-enokiti",
  );
  assert.ok(enokiti, "Conceito de Maldição Enokití deve existir");
  assert.equal(enokiti.attributes.category, "misticismo");
  assert.ok(
    Array.isArray(enokiti.attributes.rules) &&
      enokiti.attributes.rules.length > 0,
  );
});

test("Relações bidirecionais conectando conceitos canônicos a personagens, facções e lugares", () => {
  const ids = new Set(seedEntities.map((e) => e.id));

  // Verify all relations referencing concepts have valid sources and targets
  const conceptRelations = seedRelations.filter(
    (r) =>
      ids.has(r.sourceId) &&
      ids.has(r.targetId) &&
      (r.sourceId.startsWith("concept-") || r.targetId.startsWith("concept-")),
  );
  assert.ok(
    conceptRelations.length >= 4,
    "Devem existir relações explícitas ligando conceitos canônicos",
  );

  for (const rel of conceptRelations) {
    assert.notEqual(
      rel.sourceId,
      rel.targetId,
      "Não pode haver autorrelação em conceitos",
    );
    assert.ok(rel.label.trim().length > 0);
  }

  // Test bidirectional graph traversal using neighbors:
  const enokitiId = seedEntities.find((e) => e.id.includes("enokiti"))?.id;
  if (enokitiId) {
    const enokitiNeighbors = neighbors(enokitiId, seedRelations, 1);
    assert.ok(
      enokitiNeighbors.size >= 2,
      "Enokití deve estar ligado a pelo menos um portador (Masin ou Tsuuya)",
    );

    // Traversing back from connected entity to concept
    const portador = [...enokitiNeighbors].find((id) => id !== enokitiId)!;
    const portadorNeighbors = neighbors(portador, seedRelations, 1);
    assert.ok(
      portadorNeighbors.has(enokitiId),
      "Grafo bidirecional deve permitir voltar ao conceito a partir da entidade vinculada",
    );
  }
});

test("Lógica de priorização e filtragem do painel de referências da mesa de escrita (story-specific + universal)", () => {
  const mockConcepts: StudioEntity[] = [
    {
      id: "concept-local-glen",
      kind: "concept",
      title: "Garras Urbanas de Glen",
      summary: "Regras locais das gangues dos Tineros",
      body: "Corrupção local nos becos de Glen.",
      status: "ready",
      published: true,
      tags: [],
      attributes: {
        category: "geopolitica",
        scale: "TERRA",
        rules: ["Controle de esquinas"],
      },
      version: 1,
    },
    {
      id: "concept-metodologia-severum",
      kind: "concept",
      title: "Metodologia Severum",
      summary: "Doutrina corporativo-militar de Arner",
      body: "Eficiência cirúrgica e supremacia industrial.",
      status: "ready",
      published: true,
      tags: [],
      attributes: {
        category: "geopolitica",
        scale: "SETOR",
        rules: ["Subordinação contratual"],
      },
      version: 1,
    },
    {
      id: "concept-dualidade-ormuz-hades",
      kind: "concept",
      title: "Dualidade Ormuz e Hades",
      summary: "Origem do universo e entropia cósmica",
      body: "Ormuz como criação, Hades como ruína primordial.",
      status: "ready",
      published: true,
      tags: [],
      attributes: {
        category: "cosmologia",
        scale: "UNIVERSAL",
        rules: ["O Lampião suga energia estelar"],
      },
      version: 1,
    },
    {
      id: "concept-biotecnologia-deroo-da",
      kind: "concept",
      title: "Biotecnologia Deroo Da",
      summary: "Enxertos cibernéticos de Severum",
      body: "Substituição biológica avançada.",
      status: "ready",
      published: true,
      tags: [],
      attributes: {
        category: "biologia",
        scale: "SETOR",
        rules: ["Compatibilidade de enxerto biomecânico"],
      },
      version: 1,
    },
  ];

  const mockRelations: StudioRelation[] = [
    {
      id: "r1",
      sourceId: "story-red-right-hand",
      targetId: "concept-metodologia-severum",
      label: "fundamenta",
    },
    {
      id: "r2",
      sourceId: "doc-chapter-rrh-1",
      targetId: "concept-biotecnologia-deroo-da",
      label: "referência de escrita",
    },
    {
      id: "r3",
      sourceId: "story-guardioes-glen",
      targetId: "concept-local-glen",
      label: "fundamenta",
    },
  ];

  // 1. Editing Red Right Hand Chapter 1:
  // - Doc-linked: concept-biotecnologia-deroo-da (score 100)
  // - Story-linked: concept-metodologia-severum (score 70)
  // - Universal lore: concept-dualidade-ormuz-hades (score 40)
  // - Other story concept: concept-local-glen (score 0)
  const prioritized = filterReferenceConcepts(mockConcepts, mockRelations, {
    storyId: "story-red-right-hand",
    documentId: "doc-chapter-rrh-1",
  });

  assert.equal(prioritized.length, 4);
  assert.equal(prioritized[0].id, "concept-biotecnologia-deroo-da");
  assert.equal(prioritized[1].id, "concept-metodologia-severum");
  assert.equal(prioritized[2].id, "concept-dualidade-ormuz-hades");
  assert.equal(prioritized[3].id, "concept-local-glen");

  // 2. Search query matches operational rules and titles:
  const searchResult = filterReferenceConcepts(mockConcepts, mockRelations, {
    searchQuery: "Lampião",
  });
  assert.equal(searchResult.length, 1);
  assert.equal(searchResult[0].id, "concept-dualidade-ormuz-hades");

  // 3. Category filtering restricts properly:
  const geoResult = filterReferenceConcepts(mockConcepts, mockRelations, {
    category: "geopolitica",
  });
  assert.equal(geoResult.length, 2);
  assert.ok(geoResult.every((c) => c.attributes.category === "geopolitica"));

  // 4. Citation generator formats correctly:
  const citation = formatConceptCitation(mockConcepts[2]);
  assert.ok(citation.startsWith("« [Conceito: Dualidade Ormuz e Hades]"));
  assert.ok(citation.includes("O Lampião suga energia estelar"));
});
