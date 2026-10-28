import { test } from "node:test";
import assert from "node:assert/strict";
import inventory from "../../data/studio-assets.json";
import {
  emptyGalleryNote,
  parseGalleryWorkspace,
} from "../../lib/gallery-workspace";
const refs = {
  characters: [{ id: "arner", nome: "Arner" }],
  stories: [{ id: "red-right-hand", titulo: "Red Right Hand" }],
  chapters: [{ numero: 0, titulo: "A Reunião" }],
};
const note = {
  ...emptyGalleryNote(inventory[0].id),
  title: "Estudo do autor",
  idea: "Ideia privada",
  text: "Texto de trabalho",
  characterIds: ["arner"],
  storyIds: ["red-right-hand"],
  chapterNumbers: [0],
};
const workspace = {
  format: "uvc-gallery-workspace",
  version: 1,
  notes: [note],
};
test("notas da galeria mantêm vínculos exatos na ida e volta de arquivo", () => {
  assert.deepEqual(
    parseGalleryWorkspace(
      JSON.parse(JSON.stringify(workspace)),
      inventory,
      refs,
    ),
    workspace,
  );
});
test("galeria rejeita conteúdo incompatível, assets desconhecidos e vínculos inválidos", () => {
  for (const invalid of [
    { ...workspace, version: 2 },
    { ...workspace, notes: [note, note] },
    { ...workspace, notes: [{ ...note, assetId: "../../etc/passwd" }] },
    { ...workspace, notes: [{ ...note, assetId: "00000000000000000000" }] },
    { ...workspace, notes: [{ ...note, characterIds: ["nao-existe"] }] },
    { ...workspace, notes: [{ ...note, chapterNumbers: [99] }] },
    { ...workspace, notes: [{ ...note, publish: true }] },
    { ...workspace, notes: [{ ...note, text: "x".repeat(20001) }] },
  ])
    assert.throws(() => parseGalleryWorkspace(invalid, inventory, refs));
});
