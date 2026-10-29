import test from "node:test";
import assert from "node:assert/strict";
import {
  entitySchema,
  relationSchema,
  neighbors,
  blankEntity,
} from "../../lib/workspace";
import { seedEntities, seedRelations } from "../../lib/workspace-seed";
test("seed do universo preserva IDs e relações válidas sem inventar a definição de planetas cegos", () => {
  const ids = new Set(seedEntities.map((e) => e.id));
  assert.equal(ids.size, seedEntities.length);
  for (const relation of seedRelations) {
    assert.ok(ids.has(relation.sourceId));
    assert.ok(ids.has(relation.targetId));
  }
  const pending = seedEntities.find((e) => e.id === "concept-planetas-cegos")!;
  assert.equal(pending.published, false);
  assert.equal(pending.attributes.definitionPending, true);
  assert.ok(seedEntities.filter((e) => e.kind === "character").length >= 31);
});
test("mapa expande vizinhos por direção de ligação e alcance sem perder o foco", () => {
  const relations = [
    { id: "a", sourceId: "x", targetId: "y", label: "conhece" },
    { id: "b", sourceId: "z", targetId: "y", label: "habita" },
  ];
  assert.deepEqual([...neighbors("x", relations, 1)].sort(), ["x", "y"]);
  assert.deepEqual([...neighbors("x", relations, 2)].sort(), ["x", "y", "z"]);
});
test("fichas novas são privadas e os contratos recusam campos inesperados e autorrelações", () => {
  const draft = blankEntity("concept");
  assert.equal(draft.published, false);
  assert.equal(
    entitySchema.safeParse({ ...draft, title: "Ideia" }).success,
    true,
  );
  assert.equal(
    entitySchema.safeParse({ ...draft, title: "Ideia", hiddenGrant: true })
      .success,
    false,
  );
  assert.equal(
    relationSchema.safeParse({
      id: "r",
      sourceId: "x",
      targetId: "x",
      label: "duplica",
    }).success,
    false,
  );
});
