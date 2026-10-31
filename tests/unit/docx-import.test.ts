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

test("DOCX com estilos em português (Título 1, Título 2, Citação) é mapeado sem erros ou perdas", async () => {
  const parsed = await parseDocx({
    name: "Manuscrito Word Brasil.docx",
    bytes: await docxFixture({ portugueseHeadings: true }),
  });

  const json = JSON.stringify(parsed.richText);

  assert.ok(json.includes('"heading"'), "Deve conter nós de título");
  assert.ok(
    json.includes('"level":1'),
    "Deve conter título nível 1 (Título 1)",
  );
  assert.ok(
    json.includes('"level":2'),
    "Deve conter título nível 2 (Título 2)",
  );
  assert.ok(
    json.includes('"blockquote"'),
    "Deve conter bloco de citação (Citação)",
  );

  assert.ok(parsed.body.includes("Capítulo 1 — A Fundação"));
  assert.ok(parsed.body.includes("Seção Secundária"));
  assert.ok(parsed.body.includes("Citação de Severum"));

  assert.ok(
    !parsed.warnings.some(
      (w) => w.includes("Título 1") || w.includes("Título 2"),
    ),
    "Não deve haver advertências de estilos Título 1 ou Título 2 não reconhecidos",
  );

  const sectionsH1 = splitDocx(parsed.richText, parsed.title, "h1");
  assert.equal(sectionsH1.length >= 2, true, "Deve particionar por Título 1");
  assert.equal(sectionsH1[1].title, "Capítulo 1 — A Fundação");

  const sectionsH2 = splitDocx(parsed.richText, parsed.title, "h2");
  assert.equal(sectionsH2.length >= 2, true, "Deve particionar por Título 2");
  assert.ok(sectionsH2.some((s) => s.title.includes("Seção Secundária")));

  const preview = await previewDocx({
    name: "Manuscrito Word Brasil.docx",
    bytes: await docxFixture({ portugueseHeadings: true }),
  });
  const h1Mode = preview.modes.find((m) => m.value === "h1");
  assert.ok(
    h1Mode?.sections.some((s) => s.title.includes("Capítulo 1 — A Fundação")),
  );
});

test("DOCX com notas de rodapé preserva expoentes e âncoras internas no texto", async () => {
  const parsed = await parseDocx({
    name: "Com notas.docx",
    bytes: await docxFixture({ footnotes: true }),
  });

  assert.ok(
    parsed.body.includes("Severum é a capital do império"),
    "Texto da nota de rodapé deve estar presente no corpo",
  );

  const json = JSON.stringify(parsed.richText);
  assert.ok(
    json.includes("#footnote-1") || json.includes("footnote"),
    "AST deve reter âncora de referência à nota de rodapé",
  );
  assert.ok(
    json.includes('"superscript"'),
    "AST deve preservar marca superscript na nota",
  );

  assert.ok(
    parsed.warnings.some((w) => w.includes("Notas de rodapé")),
    "Deve conter aviso consultivo sobre notas de rodapé convertidas",
  );
});

test("DOCX com quebra de cena (* * * ou ---) é convertido para nó horizontalRule no TipTap", async () => {
  const parsed = await parseDocx({
    name: "Com cenas.docx",
    bytes: await docxFixture({ sceneBreaks: true }),
  });

  const json = JSON.stringify(parsed.richText);
  assert.ok(
    json.includes('"horizontalRule"'),
    "Deve gerar nó do tipo horizontalRule para quebras de cena",
  );

  assert.ok(parsed.body.includes("Cena anterior à quebra."));
  assert.ok(parsed.body.includes("Cena posterior à quebra."));
});
