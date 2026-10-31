import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { getSchema, type JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import {
  conceptCategoryLabels,
  conceptScaleLabels,
  type ConceptCategory,
  type ConceptScale,
} from "../../lib/concept-matrix";
import {
  blankEntity,
  kindLabels,
  neighbors,
  relationSchema,
  type StudioEntity,
  type StudioRelation,
  type StudioWorkspace,
} from "../../lib/workspace";
import { WritingDesk } from "../../components/writing-desk";

// Ensure React is on global scope for SSR jsx evaluation in test runner
(globalThis as unknown as { React: typeof React }).React = React;

/* =========================================================================
   Adversarial Stress Testing — Writing Desk Concept Sidebar (Challenger M2.2)
   ========================================================================= */

// Helper to construct entities with arbitrary raw/corrupted attributes
function createTestEntity(
  id: string,
  kind: StudioEntity["kind"],
  title: string,
  summary: string,
  body: string,
  attributes: unknown,
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
    attributes: attributes as Record<string, unknown>,
    version: 1,
  };
}

// Emulate reference computation strictly reflecting components/writing-desk.tsx:671-744
function computeReferences(
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
      if (e.attributes?.category !== conceptCategoryFilter) return false;
    }

    if (!q) return true;

    const rules = Array.isArray(e.attributes?.rules)
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
      String(e.attributes?.scale ?? "").toUpperCase() === "UNIVERSAL";

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

// Emulate insertConceptQuote strictly reflecting components/writing-desk.tsx:763-810
function buildConceptQuoteNodes(concept: StudioEntity): JSONContent[] {
  const title = concept.title;
  const summary =
    concept.summary || (concept.body ? concept.body.slice(0, 200) : "");
  const rules = Array.isArray(concept.attributes?.rules)
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
// SUITE 1: Reference Calculation Under Null, Undefined & Corrupted Attributes
// ---------------------------------------------------------------------------

test("Writing Desk Adversarial 1.1: References calculate with null, undefined, and empty attributes", () => {
  const cNull = createTestEntity(
    "c-null",
    "concept",
    "Conceito Null",
    "Resumo Null",
    "Corpo Null",
    null,
  );
  const cUndef = createTestEntity(
    "c-undef",
    "concept",
    "Conceito Undef",
    "Resumo Undef",
    "Corpo Undef",
    undefined,
  );
  const cEmpty = createTestEntity(
    "c-empty",
    "concept",
    "Conceito Empty",
    "Resumo Empty",
    "Corpo Empty",
    {},
  );
  const cClean = createTestEntity(
    "c-clean",
    "concept",
    "Conceito Universal Limpo",
    "Resumo Limpo",
    "Corpo Limpo",
    {
      category: "cosmologia",
      scale: "UNIVERSAL",
      rules: ["Regra canônica"],
    },
  );

  const workspace: StudioWorkspace = {
    entities: [cNull, cUndef, cEmpty, cClean],
    relations: [],
  };

  // Compute references: must never throw TypeError
  const res = computeReferences(
    workspace,
    "doc-1",
    undefined,
    "",
    "concept",
    "all",
  );
  assert.equal(res.references.length, 4);

  // Clean universal concept gets 40 pts and ranks first
  assert.equal(res.references[0].id, "c-clean");
  assert.equal(res.scoreMap.get("c-clean"), 40);

  // Entities with null/undefined/empty attributes get 0 pts and do not throw
  assert.equal(res.scoreMap.get("c-null"), 0);
  assert.equal(res.scoreMap.get("c-undef"), 0);
  assert.equal(res.scoreMap.get("c-empty"), 0);

  // Category filter: filtering by "cosmologia" matches c-clean and safely excludes null/undefined
  const resFiltered = computeReferences(
    workspace,
    "doc-1",
    undefined,
    "",
    "concept",
    "cosmologia",
  );
  assert.equal(resFiltered.references.length, 1);
  assert.equal(resFiltered.references[0].id, "c-clean");
});

test("Writing Desk Adversarial 1.2: Corrupted primitive attribute types do not crash filtering or scoring", () => {
  const corruptedConcepts: StudioEntity[] = [
    createTestEntity(
      "c-str",
      "concept",
      "String Attr",
      "Resumo",
      "Corpo",
      "corrupted string",
    ),
    createTestEntity("c-num", "concept", "Number Attr", "Resumo", "Corpo", 999),
    createTestEntity(
      "c-bool",
      "concept",
      "Boolean Attr",
      "Resumo",
      "Corpo",
      true,
    ),
    createTestEntity("c-arr", "concept", "Array Attr", "Resumo", "Corpo", [
      "not an object",
    ]),
    createTestEntity(
      "c-null-fields",
      "concept",
      "Null Fields",
      "Resumo",
      "Corpo",
      {
        category: null,
        scale: null,
        rules: null,
      },
    ),
    createTestEntity(
      "c-corrupt-fields",
      "concept",
      "Corrupt Fields",
      "Resumo",
      "Corpo",
      {
        category: 12345,
        scale: false,
        rules: "single string instead of array",
      },
    ),
    createTestEntity(
      "c-mixed-rules",
      "concept",
      "Mixed Rules",
      "Resumo",
      "Corpo",
      {
        category: "tecnologia",
        scale: "SETOR",
        rules: [null, undefined, 42, "Regra Válida 1"],
      },
    ),
  ];

  const workspace: StudioWorkspace = {
    entities: corruptedConcepts,
    relations: [],
  };

  // Check all combinations of search and category filter
  const categories = [
    "all",
    "cosmologia",
    "tecnologia",
    "geopolitica",
    "biologia",
    "misticismo",
  ];
  for (const cat of categories) {
    assert.doesNotThrow(() => {
      const res = computeReferences(
        workspace,
        "doc-1",
        undefined,
        "",
        "concept",
        cat,
      );
      assert.ok(Array.isArray(res.references));
    }, `Filtering by category '${cat}' should not throw on corrupted attributes`);
  }

  // Search query matches rules even when rules array contains mixed primitive types
  const searchRes = computeReferences(
    workspace,
    "doc-1",
    undefined,
    "Regra Válida",
    "concept",
    "all",
  );
  assert.equal(searchRes.references.length, 1);
  assert.equal(searchRes.references[0].id, "c-mixed-rules");
});

// ---------------------------------------------------------------------------
// SUITE 2: Full React WritingDesk Component Render with Corrupted References
// ---------------------------------------------------------------------------

test("Writing Desk Adversarial 2.1: WritingDesk renders cleanly with corrupted reference panel entities", () => {
  const cleanDoc: StudioEntity = {
    ...blankEntity("document"),
    id: "doc-clean",
    title: "Documento Canônico",
    body: "Conteúdo do documento",
    attributes: { storyId: "story-marginal", writingType: "chapter" },
  };

  const emptyAttrsDoc: StudioEntity = {
    ...blankEntity("document"),
    id: "doc-empty",
    title: "Documento com Atributos Vazios",
    body: "Conteúdo do documento vazio",
    attributes: {},
  };

  const cNull = createTestEntity(
    "c-1",
    "concept",
    "Planetas Cegos",
    "Resumo",
    "Corpo",
    null,
  );
  const cUndef = createTestEntity(
    "c-2",
    "concept",
    "Biotecnologia Deroo Da",
    "Resumo",
    "Corpo",
    undefined,
  );
  const cEmpty = createTestEntity(
    "c-3",
    "concept",
    "Metodologia Severum",
    "Resumo",
    "Corpo",
    {},
  );
  const cCorrupt = createTestEntity(
    "c-4",
    "concept",
    "Dualidade Ormuz e Hades",
    "Resumo",
    "Corpo",
    {
      category: 9999,
      scale: false,
      rules: "not an array",
    },
  );
  const charNull = createTestEntity(
    "char-1",
    "character",
    "Larry",
    "Guardião",
    "",
    null,
  );

  const workspace: StudioWorkspace = {
    entities: [
      cleanDoc,
      emptyAttrsDoc,
      cNull,
      cUndef,
      cEmpty,
      cCorrupt,
      charNull,
    ],
    relations: [
      {
        id: "rel-1",
        sourceId: "doc-clean",
        targetId: "c-1",
        label: "referência",
      },
    ],
  };

  for (const targetId of ["doc-clean", "doc-empty"]) {
    assert.doesNotThrow(() => {
      const html = renderToString(
        React.createElement(WritingDesk, {
          initial: workspace,
          initialId: targetId,
        }),
      );
      assert.ok(html.length > 500);
      assert.ok(html.includes("Mesa de escrita"));
    }, `WritingDesk SSR render failed with initialId '${targetId}'`);
  }
});

test("Writing Desk Adversarial 2.2: Document boundary condition in lib/writing.ts vs components/writing-desk.tsx", () => {
  // Documents with empty attributes {} pass cleanly through writing desk & documentStory
  const docEmptyAttrs: StudioEntity = {
    ...blankEntity("document"),
    id: "doc-empty",
    title: "Documento Empty",
    body: "Corpo",
    attributes: {},
  };
  const workspace: StudioWorkspace = {
    entities: [docEmptyAttrs],
    relations: [],
  };
  assert.doesNotThrow(() => {
    const html = renderToString(
      React.createElement(WritingDesk, {
        initial: workspace,
        initialId: "doc-empty",
      }),
    );
    assert.ok(html.length > 0);
  });

  // Empirical confirmation: if a document itself has attributes: null, lib/writing.ts:8 throws TypeError
  const docNullAttrs: StudioEntity = {
    ...blankEntity("document"),
    id: "doc-null",
    title: "Documento Null",
    body: "Corpo",
    attributes: null as unknown as Record<string, unknown>,
  };
  const nullWorkspace: StudioWorkspace = {
    entities: [docNullAttrs],
    relations: [],
  };
  assert.throws(
    () => {
      renderToString(
        React.createElement(WritingDesk, {
          initial: nullWorkspace,
          initialId: "doc-null",
        }),
      );
    },
    /Cannot read properties of null/,
    "documentStory in lib/writing.ts expects document.attributes to not be null",
  );
});

// ---------------------------------------------------------------------------
// SUITE 3: Reference Sidebar List & Detail Article JSX Rendering
// ---------------------------------------------------------------------------

test("Writing Desk Adversarial 3.1: Reference list item JSX renders without error on all corrupted entities", () => {
  const entities: StudioEntity[] = [
    createTestEntity(
      "c-null",
      "concept",
      "Conceito Null",
      "Resumo Null",
      "",
      null,
    ),
    createTestEntity(
      "c-undef",
      "concept",
      "Conceito Undef",
      "Resumo Undef",
      "",
      undefined,
    ),
    createTestEntity("c-empty", "concept", "Conceito Empty", "", "", {}),
    createTestEntity(
      "c-corrupt",
      "concept",
      "Conceito Corrupt",
      "Resumo",
      "",
      "string attr",
    ),
    createTestEntity(
      "char-null",
      "character",
      "Personagem Null",
      "Resumo Char",
      "",
      null,
    ),
    createTestEntity(
      "place-undef",
      "place",
      "Lugar Undef",
      "Resumo Lugar",
      "",
      undefined,
    ),
    createTestEntity(
      "fac-corrupt",
      "faction",
      "Facção Corrupt",
      "Resumo Fac",
      "",
      42,
    ),
  ];

  const refIds = new Set(["c-null"]);

  for (const e of entities) {
    assert.doesNotThrow(() => {
      const itemJSX = React.createElement(
        "button",
        { type: "button", className: "writing-reference-item", key: e.id },
        React.createElement(
          "span",
          { className: "flex-1 min-w-0" },
          React.createElement(
            "small",
            { className: "flex items-center gap-1.5 flex-wrap" },
            React.createElement("span", null, kindLabels[e.kind]),
            e.kind === "concept" && typeof e.attributes?.category === "string"
              ? React.createElement(
                  "span",
                  { className: "text-[#91e3dc]" },
                  "· ",
                  conceptCategoryLabels[
                    e.attributes.category as ConceptCategory
                  ] ?? String(e.attributes.category),
                )
              : null,
            refIds.has(e.id) ? " · vinculada" : "",
          ),
          React.createElement(
            "strong",
            { className: "block truncate font-semibold" },
            e.title,
          ),
          e.summary ? React.createElement("p", null, e.summary) : null,
        ),
      );
      const html = renderToString(itemJSX);
      assert.ok(html.includes(e.title));
    }, `List item JSX failed for entity ${e.id}`);
  }
});

test("Writing Desk Adversarial 3.2: Reference detail article JSX renders defensively for all corrupted entities", () => {
  const referencesToTest: StudioEntity[] = [
    createTestEntity(
      "c-null",
      "concept",
      "Conceito Null",
      "Resumo Null",
      "Corpo Null",
      null,
    ),
    createTestEntity(
      "c-undef",
      "concept",
      "Conceito Undef",
      "Resumo Undef",
      "Corpo Undef",
      undefined,
    ),
    createTestEntity(
      "c-empty",
      "concept",
      "Conceito Empty",
      "",
      "Corpo Empty",
      {},
    ),
    createTestEntity(
      "c-corrupt",
      "concept",
      "Conceito Corrupt",
      "Resumo",
      "Corpo",
      {
        category: 12345,
        scale: true,
        rules: "single string",
      },
    ),
    createTestEntity(
      "c-rules-primitives",
      "concept",
      "Conceito Regras Mistas",
      "Resumo",
      "Corpo",
      {
        category: "cosmologia",
        scale: "UNIVERSAL",
        rules: ["Regra 1", "Regra 2"],
      },
    ),
    createTestEntity(
      "vis-null-asset",
      "visual",
      "Visual Null Asset",
      "Resumo",
      "",
      { assetId: null },
    ),
    createTestEntity(
      "vis-valid-asset",
      "visual",
      "Visual Valido",
      "Resumo",
      "",
      { assetId: "asset-123" },
    ),
  ];

  const relations: StudioRelation[] = [
    {
      id: "rel-1",
      sourceId: "doc-1",
      targetId: "c-null",
      label: "referência de escrita",
    },
  ];

  for (const ref of referencesToTest) {
    assert.doesNotThrow(() => {
      const detailJSX = React.createElement(
        "article",
        { className: "writing-reference" },
        React.createElement(
          "div",
          { className: "flex items-center gap-2 flex-wrap" },
          React.createElement("small", null, kindLabels[ref.kind]),
          ref.kind === "concept" && typeof ref.attributes?.category === "string"
            ? React.createElement(
                "span",
                null,
                conceptCategoryLabels[
                  ref.attributes.category as ConceptCategory
                ] ?? String(ref.attributes.category),
              )
            : null,
          ref.kind === "concept" && typeof ref.attributes?.scale === "string"
            ? React.createElement(
                "span",
                null,
                conceptScaleLabels[ref.attributes.scale as ConceptScale] ??
                  String(ref.attributes.scale),
              )
            : null,
        ),
        React.createElement("h2", null, ref.title),
        ref.summary ? React.createElement("p", null, ref.summary) : null,
        ref.body ? React.createElement("p", null, ref.body) : null,
        ref.kind === "concept" &&
          Array.isArray(ref.attributes?.rules) &&
          ref.attributes.rules.length > 0
          ? React.createElement(
              "div",
              null,
              React.createElement(
                "h4",
                null,
                `Regras Canônicas (${ref.attributes.rules.length})`,
              ),
              React.createElement(
                "ul",
                null,
                (ref.attributes.rules as string[]).map((rule, idx) =>
                  React.createElement(
                    "li",
                    { key: idx },
                    React.createElement("span", null, `§${idx + 1}`),
                    React.createElement("span", null, String(rule)),
                  ),
                ),
              ),
            )
          : null,
        ref.kind === "visual" && typeof ref.attributes?.assetId === "string"
          ? React.createElement("img", {
              src: `/api/studio/assets/${encodeURIComponent(ref.attributes.assetId)}`,
              alt: ref.title,
            })
          : null,
        ref.kind === "concept"
          ? React.createElement(
              "button",
              { type: "button" },
              "Inserir citação do conceito",
            )
          : null,
        relations.some(
          (r) =>
            (r.sourceId === "doc-1" && r.targetId === ref.id) ||
            (r.targetId === "doc-1" && r.sourceId === ref.id),
        )
          ? React.createElement("small", null, "Ligada a este texto")
          : React.createElement(
              "button",
              { type: "button" },
              "Vincular ao texto",
            ),
      );

      const html = renderToString(detailJSX);
      assert.ok(html.includes(ref.title));
    }, `Detail article JSX failed for entity ${ref.id}`);
  }
});

// ---------------------------------------------------------------------------
// SUITE 4: Citation Injection AST & ProseMirror Schema Validation
// ---------------------------------------------------------------------------

test("Writing Desk Adversarial 4.1: insertConceptQuote generates valid ProseMirror AST across all edge cases", () => {
  const schema = getSchema([StarterKit]);

  const testConcepts: StudioEntity[] = [
    createTestEntity(
      "c-null-attrs",
      "concept",
      "Conceito Sem Atributos",
      "Resumo Válido",
      "Corpo descritivo",
      null,
    ),
    createTestEntity(
      "c-undef-attrs",
      "concept",
      "Conceito Undef",
      "Resumo Válido",
      "Corpo descritivo",
      undefined,
    ),
    createTestEntity(
      "c-empty-attrs",
      "concept",
      "Conceito Empty",
      "Resumo Válido",
      "Corpo descritivo",
      {},
    ),
    createTestEntity(
      "c-corrupt-rules",
      "concept",
      "Conceito Corrupt Rules",
      "Resumo",
      "Corpo",
      { rules: "not an array" },
    ),
    createTestEntity(
      "c-empty-summary",
      "concept",
      "Conceito Sem Resumo",
      "",
      "Corpo que deve ser fatiado até 200 caracteres para virar resumo fallback.",
      { rules: ["Regra 1"] },
    ),
    createTestEntity("c-empty-both", "concept", "Vazio Total", "", "", {
      rules: [],
    }),
    createTestEntity(
      "c-special-symbols",
      "concept",
      "Conceito «Especial» & 'Quotes' <Script>",
      "Resumo com símbolos: 🪐 ⚡ — travessão e aspas duplas.",
      "Corpo",
      { rules: ["Regra com <tags> e 'aspas simples'."] },
    ),
  ];

  for (const concept of testConcepts) {
    const nodes = buildConceptQuoteNodes(concept);

    assert.equal(nodes.length, 2);
    assert.equal(nodes[0].type, "blockquote");
    assert.equal(nodes[1].type, "paragraph");

    const fullDoc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Texto antes da citação." }],
        },
        ...nodes,
        {
          type: "paragraph",
          content: [{ type: "text", text: "Texto após a citação." }],
        },
      ],
    };

    const pmDoc = ProseMirrorNode.fromJSON(schema, fullDoc);
    assert.doesNotThrow(() => {
      pmDoc.check();
    }, `ProseMirror schema validation failed for concept ${concept.id}`);

    assert.equal(pmDoc.childCount, 4);
    assert.equal(pmDoc.child(1).type.name, "blockquote");
    assert.ok(pmDoc.child(1).textContent.includes(concept.title));
  }
});

// ---------------------------------------------------------------------------
// SUITE 5: Bidirectional Relation Linking & State Reactivity
// ---------------------------------------------------------------------------

test("Writing Desk Adversarial 5.1: Relation linking to concepts with malformed attributes succeeds cleanly", () => {
  const draftId = "doc-chapter-1";
  const corruptedConcept = createTestEntity(
    "c-malformed",
    "concept",
    "Conceito Malformado",
    "Resumo",
    "Corpo",
    null,
  );

  let workspace: StudioWorkspace = {
    entities: [
      createTestEntity(
        draftId,
        "document",
        "Capítulo 1",
        "Resumo Doc",
        "Texto",
        {},
      ),
      corruptedConcept,
    ],
    relations: [],
  };

  // 1. Initial score before link
  const initialRes = computeReferences(
    workspace,
    draftId,
    undefined,
    "",
    "concept",
    "all",
  );
  assert.equal(initialRes.scoreMap.get(corruptedConcept.id), 0);
  assert.equal(initialRes.refIds.has(corruptedConcept.id), false);

  // 2. Create link relation
  const newRelation: StudioRelation = {
    id: "rel-link-test-1",
    sourceId: draftId,
    targetId: corruptedConcept.id,
    label: "referência de escrita",
  };

  const parsed = relationSchema.safeParse(newRelation);
  assert.equal(parsed.success, true);

  // 3. Update workspace
  workspace = {
    ...workspace,
    relations: [...workspace.relations, newRelation],
  };

  // 4. Score immediately boosted by +100
  const updatedRes = computeReferences(
    workspace,
    draftId,
    undefined,
    "",
    "concept",
    "all",
  );
  assert.equal(updatedRes.scoreMap.get(corruptedConcept.id), 100);
  assert.equal(updatedRes.refIds.has(corruptedConcept.id), true);

  // 5. Neighbors graph includes both entities
  assert.ok(neighbors(draftId, workspace.relations).has(corruptedConcept.id));
  assert.ok(neighbors(corruptedConcept.id, workspace.relations).has(draftId));
});
