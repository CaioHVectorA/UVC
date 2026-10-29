import { test } from "node:test";
import assert from "node:assert/strict";
import { blankEntity, type StudioEntity } from "../../lib/workspace";
import {
  documentStory,
  orderedDocuments,
  writingContent,
  wordCount,
} from "../../lib/writing";
function doc(
  id: string,
  attributes: Record<string, unknown> = {},
): StudioEntity {
  return { ...blankEntity("document"), id, title: id, attributes };
}
test("textos legados preservam cada linha ao abrir no editor", () => {
  const entity = {
    ...doc("original"),
    body: 'Linha <sem HTML>\n\n"Diálogo" — sim.\n',
  };
  const json = writingContent(entity);
  assert.deepEqual(
    json.content?.map((p) => p.content?.[0]?.text ?? ""),
    entity.body.split("\n"),
  );
  assert.equal(entity.body, 'Linha <sem HTML>\n\n"Diálogo" — sim.\n');
});
test("o projeto de um original importado é resolvido pelo vínculo existente", () => {
  const d = doc("original");
  const story = { ...blankEntity("story"), id: "story" };
  assert.equal(
    documentStory(d, {
      entities: [d, story],
      relations: [
        {
          id: "edge",
          sourceId: d.id,
          targetId: story.id,
          label: "manuscrito de",
        },
      ],
    }),
    "story",
  );
});
test("a árvore respeita a ordem e não perde textos órfãos ou cíclicos", () => {
  const a = doc("A", { writingOrder: 20 }),
    b = doc("B", { writingOrder: 10 }),
    s = doc("cena", { writingParentId: "B" }),
    x = doc("X", { writingParentId: "Y" }),
    y = doc("Y", { writingParentId: "X" });
  const result = orderedDocuments([a, s, b, x, y]);
  assert.deepEqual(
    result.slice(0, 3).map((e) => [e.entity.id, e.depth]),
    [
      ["B", 0],
      ["cena", 1],
      ["A", 0],
    ],
  );
  assert.equal(new Set(result.map((e) => e.entity.id)).size, 5);
  assert.equal(wordCount("   "), 0);
  assert.equal(wordCount("Uma\n nova cena."), 3);
});
