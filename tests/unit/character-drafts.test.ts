import test from "node:test";
import assert from "node:assert/strict";
import {
  characterWorkspaceSchema,
  draftChecklist,
  emptyCharacterDraft,
  hasDraftContent,
  serializeCharacterDrafts,
} from "../../lib/character-drafts";

test("rascunhos incompletos fazem ida e volta sem virar conteúdo publicado", () => {
  const draft = {
    ...emptyCharacterDraft("first"),
    nome: "Ficha de teste",
    notas: "Texto ainda em construção.",
  };
  const workspace = characterWorkspaceSchema.parse(
    JSON.parse(serializeCharacterDrafts([draft])),
  );
  assert.deepEqual(workspace.drafts[0], draft);
  assert.equal(workspace.status, "RASCUNHO");
  assert.equal("statusVisibilidade" in workspace.drafts[0], false);
  assert.equal(hasDraftContent(emptyCharacterDraft("empty")), false);
  assert.equal(hasDraftContent(draft), true);
  assert.equal(draftChecklist(draft).filter((item) => item.done).length, 0);
});

test("importação recusa arquivos de outro tipo, publicação, campos extras e IDs duplicados", () => {
  const workspace = JSON.parse(
    serializeCharacterDrafts([emptyCharacterDraft("first")]),
  );
  for (const invalid of [
    { ...workspace, status: "PUBLICO" },
    { ...workspace, version: 2 },
    { ...workspace, publish: true },
    {
      ...workspace,
      drafts: [{ ...workspace.drafts[0], statusVisibilidade: "PUBLICO" }],
    },
    { ...workspace, drafts: [workspace.drafts[0], workspace.drafts[0]] },
    { ...workspace, drafts: [] },
    {
      ...workspace,
      drafts: [{ ...workspace.drafts[0], escala: "inexistente" }],
    },
  ])
    assert.equal(characterWorkspaceSchema.safeParse(invalid).success, false);
});

test("importação limita quantidade e tamanho das fichas", () => {
  assert.throws(() =>
    serializeCharacterDrafts(
      Array.from({ length: 51 }, (_, index) =>
        emptyCharacterDraft(String(index)),
      ),
    ),
  );
  assert.throws(() =>
    serializeCharacterDrafts([
      { ...emptyCharacterDraft("first"), nome: "x".repeat(161) },
    ]),
  );
  assert.throws(() =>
    serializeCharacterDrafts([
      { ...emptyCharacterDraft("first"), notas: "x".repeat(10001) },
    ]),
  );
});
