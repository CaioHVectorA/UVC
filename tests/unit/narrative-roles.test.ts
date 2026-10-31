import test from "node:test";
import assert from "node:assert/strict";
import {
  narrativeRoles,
  isNarrativeRole,
  getRoleBadgeStyle,
  getCharacterParticipations,
  getCharacterRoleInStory,
  getStoryCast,
  getStoryCastCount,
} from "../../lib/narrative-roles";
import type { StudioEntity, StudioRelation } from "../../lib/workspace";

test("Narrative Roles: Taxonomy adheres strictly to 5 canonical roles", () => {
  assert.equal(narrativeRoles.length, 5);
  assert.deepEqual(
    [...narrativeRoles],
    ["Protagonista", "Antagonista", "Coadjuvante", "Mentor", "Aliado"],
  );

  for (const role of narrativeRoles) {
    const style = getRoleBadgeStyle(role);
    assert.ok(style.badgeClass.includes("text-"));
    assert.ok(style.borderHex.startsWith("#"));
    assert.ok(style.textHex.startsWith("#"));
  }
});

test("Narrative Roles: isNarrativeRole type guard rejects invalid values", () => {
  assert.equal(isNarrativeRole("Protagonista"), true);
  assert.equal(isNarrativeRole("Antagonista"), true);
  assert.equal(isNarrativeRole("Coadjuvante"), true);
  assert.equal(isNarrativeRole("Mentor"), true);
  assert.equal(isNarrativeRole("Aliado"), true);

  assert.equal(isNarrativeRole("Vilão"), false);
  assert.equal(isNarrativeRole("Herói"), false);
  assert.equal(isNarrativeRole(null), false);
  assert.equal(isNarrativeRole(undefined), false);
  assert.equal(isNarrativeRole(""), false);
});

test("Narrative Roles: getCharacterParticipations maps character to stories accurately", () => {
  const entities: StudioEntity[] = [
    {
      id: "beenie",
      kind: "character",
      title: "Beenie",
      body: "",
      summary: "",
      status: "ready",
      published: true,
      tags: [],
      attributes: {},
      version: 1,
    },
    {
      id: "story-guardioes",
      kind: "story",
      title: "Guardiões",
      body: "",
      summary: "",
      status: "ready",
      published: true,
      tags: [],
      attributes: {},
      version: 1,
    },
    {
      id: "story-red-right-hand",
      kind: "story",
      title: "Red Right Hand",
      body: "",
      summary: "",
      status: "ready",
      published: true,
      tags: [],
      attributes: {},
      version: 1,
    },
  ];

  const relations: StudioRelation[] = [
    {
      id: "rel-1",
      sourceId: "beenie",
      targetId: "story-guardioes",
      label: "Protagonista",
    },
    {
      id: "rel-2",
      sourceId: "beenie",
      targetId: "story-red-right-hand",
      label: "Aliado",
    },
    {
      id: "rel-3",
      sourceId: "beenie",
      targetId: "place-glen",
      label: "habita",
    },
  ];

  const participations = getCharacterParticipations(
    "beenie",
    relations,
    entities,
  );
  assert.equal(participations.length, 2);
  assert.equal(participations[0].storyTitle, "Guardiões");
  assert.equal(participations[0].role, "Protagonista");
  assert.equal(participations[1].storyTitle, "Red Right Hand");
  assert.equal(participations[1].role, "Aliado");
});

test("Narrative Roles: getCharacterRoleInStory returns correct role and handles bidirectional lookup", () => {
  const relations: StudioRelation[] = [
    {
      id: "rel-forward",
      sourceId: "kerry",
      targetId: "story-guardioes",
      label: "Aliado",
    },
    {
      id: "rel-backward",
      sourceId: "story-rrh",
      targetId: "arner",
      label: "Protagonista",
    },
  ];

  assert.equal(
    getCharacterRoleInStory("kerry", "story-guardioes", relations),
    "Aliado",
  );
  assert.equal(
    getCharacterRoleInStory("arner", "story-rrh", relations),
    "Protagonista",
  );
  assert.equal(
    getCharacterRoleInStory("larry", "story-guardioes", relations),
    null,
  );
});

test("Narrative Roles: getStoryCast groups cast into 5 canonical buckets", () => {
  const entities: StudioEntity[] = [
    {
      id: "beenie",
      kind: "character",
      title: "Beenie",
      body: "",
      summary: "",
      status: "ready",
      published: true,
      tags: [],
      attributes: {},
      version: 1,
    },
    {
      id: "hades",
      kind: "character",
      title: "Hades",
      body: "",
      summary: "",
      status: "ready",
      published: true,
      tags: [],
      attributes: {},
      version: 1,
    },
    {
      id: "kerry",
      kind: "character",
      title: "Kerry",
      body: "",
      summary: "",
      status: "ready",
      published: true,
      tags: [],
      attributes: {},
      version: 1,
    },
    {
      id: "dizz",
      kind: "character",
      title: "Dizz",
      body: "",
      summary: "",
      status: "ready",
      published: true,
      tags: [],
      attributes: {},
      version: 1,
    },
    {
      id: "clara",
      kind: "character",
      title: "Clara",
      body: "",
      summary: "",
      status: "ready",
      published: true,
      tags: [],
      attributes: {},
      version: 1,
    },
    {
      id: "story-epic",
      kind: "story",
      title: "Saga Épica",
      body: "",
      summary: "",
      status: "ready",
      published: true,
      tags: [],
      attributes: {},
      version: 1,
    },
  ];

  const relations: StudioRelation[] = [
    {
      id: "r1",
      sourceId: "beenie",
      targetId: "story-epic",
      label: "Protagonista",
    },
    {
      id: "r2",
      sourceId: "hades",
      targetId: "story-epic",
      label: "Antagonista",
    },
    { id: "r3", sourceId: "kerry", targetId: "story-epic", label: "Aliado" },
    { id: "r4", sourceId: "dizz", targetId: "story-epic", label: "Mentor" },
    {
      id: "r5",
      sourceId: "clara",
      targetId: "story-epic",
      label: "Coadjuvante",
    },
  ];

  const cast = getStoryCast("story-epic", relations, entities);
  assert.equal(cast.Protagonista.length, 1);
  assert.equal(cast.Protagonista[0].character.title, "Beenie");
  assert.equal(cast.Antagonista.length, 1);
  assert.equal(cast.Antagonista[0].character.title, "Hades");
  assert.equal(cast.Aliado.length, 1);
  assert.equal(cast.Aliado[0].character.title, "Kerry");
  assert.equal(cast.Mentor.length, 1);
  assert.equal(cast.Mentor[0].character.title, "Dizz");
  assert.equal(cast.Coadjuvante.length, 1);
  assert.equal(cast.Coadjuvante[0].character.title, "Clara");

  assert.equal(getStoryCastCount("story-epic", relations, entities), 5);
});

test("Narrative Roles: Resilience against orphaned entities and malformed relations", () => {
  const emptyEntities: StudioEntity[] = [];
  const corruptRelations: StudioRelation[] = [
    {
      id: "bad-1",
      sourceId: "missing-1",
      targetId: "missing-2",
      label: "Protagonista",
    },
    { id: "bad-2", sourceId: "", targetId: "", label: "Antagonista" },
  ];

  assert.doesNotThrow(() => {
    const participations = getCharacterParticipations(
      "missing-1",
      corruptRelations,
      emptyEntities,
    );
    assert.equal(participations.length, 0);

    const cast = getStoryCast("missing-2", corruptRelations, emptyEntities);
    assert.equal(cast.Protagonista.length, 0);
  });
});
