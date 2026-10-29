import { test } from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import {
  parseDocx,
  previewDocx,
  splitDocx,
  DocxImportError,
} from "../../lib/import-docx";
import { docxFixture } from "../docx-fixture";
test("DOCX de autoria vira texto estruturado com títulos, marcas, listas e links", async () => {
  const parsed = await parseDocx({
    name: "Do Docs.docx",
    bytes: await docxFixture(),
  });
  const json = JSON.stringify(parsed.richText);
  for (const type of [
    "heading",
    "bold",
    "italic",
    "bulletList",
    "hardBreak",
    "link",
  ])
    assert.ok(json.includes('"' + type + '"'), type);
  assert.ok(parsed.body.includes("Capítulo Um"));
  assert.ok(parsed.body.includes("Primeiro item."));
  assert.equal(
    splitDocx(parsed.richText, parsed.title, "h1")
      .map((s) => s.body)
      .join("\n"),
    parsed.body,
  );
  const preview = await previewDocx({
    name: "Do Docs.docx",
    bytes: await docxFixture(),
  });
  assert.deepEqual(
    preview.modes.find((m) => m.value === "h1")?.sections.map((s) => s.title),
    ["Texto de abertura", "Capítulo Um", "Capítulo Dois"],
  );
});
test("prévia avisa sobre perdas e mantém o texto de tabelas; não produz links ativos javascript", async () => {
  const parsed = await parseDocx({
    name: "Com extras.docx",
    bytes: await docxFixture({ extras: true, unsafeLink: true }),
  });
  assert.ok(parsed.body.includes("Célula A"));
  assert.ok(parsed.body.includes("Célula B"));
  assert.ok(parsed.warnings.some((w) => w.includes("Tabelas")));
  assert.ok(parsed.warnings.some((w) => w.includes("Imagens")));
  assert.ok(parsed.warnings.some((w) => w.includes("Comentários")));
  assert.ok(!JSON.stringify(parsed.richText).includes("javascript:"));
});
test("documento sem estilos de títulos pode ser importado inteiro", async () => {
  const preview = await previewDocx({
    name: "Texto contínuo.docx",
    bytes: await docxFixture({ plain: true }),
  });
  assert.equal(preview.modes.length, 1);
  assert.equal(preview.modes[0].value, "none");
  assert.equal(preview.modes[0].sections.length, 1);
});
test("rejeita Word antigo, DOCX inválido, XML com entidades e conteúdo expandido excessivo", async () => {
  await assert.rejects(
    () => parseDocx({ name: "antigo.doc", bytes: Buffer.from("Word") }),
    DocxImportError,
  );
  await assert.rejects(
    () => parseDocx({ name: "falso.docx", bytes: Buffer.from("não é ZIP") }),
    DocxImportError,
  );
  await assert.rejects(
    async () =>
      parseDocx({
        name: "entidades.docx",
        bytes: await docxFixture({ doctype: true }),
      }),
    DocxImportError,
  );
  const zip = await JSZip.loadAsync(await docxFixture());
  zip.file("word/large.xml", "a".repeat(13 * 1024 * 1024));
  const bytes = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
  await assert.rejects(
    () => parseDocx({ name: "grande.docx", bytes }),
    DocxImportError,
  );
});
