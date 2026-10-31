import { test, describe } from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import {
  parseDocx,
  previewDocx,
  splitDocx,
  docxPlain,
  DocxImportError,
} from "../../lib/import-docx";

// Helper to build base package files
function createBaseZip() {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`,
  );

  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );

  zip.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="styles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
  );

  return zip;
}

const p = (text: string, style?: string) =>
  `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ""}<w:r><w:t>${text}</w:t></w:r></w:p>`;

describe("Stress Testing DOCX Ingestion — Challenger M1.2", () => {
  test("Microsoft Word XML style names (Título 1, 2, 3, Título, Subtítulo, Citação) map cleanly without unrecognised style warnings", async () => {
    const zip = createBaseZip();

    zip.file(
      "word/styles.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
  <w:style w:type="paragraph" w:styleId="Ttulo"><w:name w:val="Título"/></w:style>
  <w:style w:type="paragraph" w:styleId="Subttulo"><w:name w:val="Subtítulo"/></w:style>
  <w:style w:type="paragraph" w:styleId="Ttulo1"><w:name w:val="Título 1"/></w:style>
  <w:style w:type="paragraph" w:styleId="Ttulo2"><w:name w:val="Título 2"/></w:style>
  <w:style w:type="paragraph" w:styleId="Ttulo3"><w:name w:val="Título 3"/></w:style>
  <w:style w:type="paragraph" w:styleId="Citao"><w:name w:val="Citação"/></w:style>
</w:styles>`,
    );

    let docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>`;
    docXml += p("Severum: A Metodologia Militar", "Ttulo");
    docXml += p("Tratado de Guerra Cósmica", "Subttulo");
    docXml += p("Capítulo 1 — A Fundação da Legião", "Ttulo1");
    docXml += p("Parágrafo narrativo de introdução à legião.");
    docXml += p("Seção 1.1 — Comando Central", "Ttulo2");
    docXml += p("Detalhes do comando central em Severum.");
    docXml += p("Subseção 1.1.1 — Protocolos de Defesa", "Ttulo3");
    docXml += p("Diretrizes táticas de combate.");
    docXml += p("A força do império é a disciplina inflexível.", "Citao");
    docXml += `<w:sectPr/></w:body></w:document>`;

    zip.file("word/document.xml", docXml);
    const bytes = await zip.generateAsync({ type: "nodebuffer" });

    const parsed = await parseDocx({ name: "word-pt-estilos.docx", bytes });

    // 1. Verify no unrecognised style warnings
    assert.ok(
      !parsed.warnings.some((w) => w.includes("estilos próprios")),
      "Não deve conter advertência sobre estilos não reconhecidos para Títulos e Citação",
    );

    // 2. Verify AST nodes
    const content = parsed.richText.content ?? [];
    const h1 = content.find(
      (n) => n.type === "heading" && n.attrs?.level === 1,
    );
    const h2 = content.find(
      (n) => n.type === "heading" && n.attrs?.level === 2,
    );
    const h3 = content.find(
      (n) => n.type === "heading" && n.attrs?.level === 3,
    );
    const quote = content.find((n) => n.type === "blockquote");

    assert.ok(h1, "Deve extrair heading nível 1");
    assert.equal(docxPlain(h1).trim(), "Capítulo 1 — A Fundação da Legião");

    assert.ok(h2, "Deve extrair heading nível 2");
    assert.equal(docxPlain(h2).trim(), "Seção 1.1 — Comando Central");

    assert.ok(h3, "Deve extrair heading nível 3");
    assert.equal(docxPlain(h3).trim(), "Subseção 1.1.1 — Protocolos de Defesa");

    assert.ok(quote, "Deve extrair bloco de citação para Citação");
    assert.ok(docxPlain(quote).includes("disciplina inflexível"));

    // 3. Verify title and subtitle preserved in plain text
    assert.ok(parsed.body.includes("Severum: A Metodologia Militar"));
    assert.ok(parsed.body.includes("Tratado de Guerra Cósmica"));
  });

  test("Google Docs style names (Heading 1, 2, 3, Title, Subtitle, Quote) map cleanly without warnings", async () => {
    const zip = createBaseZip();

    zip.file(
      "word/styles.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/></w:style>
  <w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/></w:style>
  <w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/></w:style>
  <w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/></w:style>
</w:styles>`,
    );

    let docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>`;
    docXml += p("Chronicles of Ormuz and Hades", "Title");
    docXml += p("The Genesis War", "Subtitle");
    docXml += p("Act I: The Primordial Split", "Heading1");
    docXml += p(
      "Before the cosmos took form, the dual divine sparks collided.",
    );
    docXml += p("Part 1: The First Flame", "Heading2");
    docXml += p("Ormuz ignited the seven primordial stars.");
    docXml += p("Subpart 1.A: The Celestial Hearth", "Heading3");
    docXml += p("The stars burned with unyielding cosmic balance.");
    docXml += p("Where there is light, shadow inevitably converges.", "Quote");
    docXml += `<w:sectPr/></w:body></w:document>`;

    zip.file("word/document.xml", docXml);
    const bytes = await zip.generateAsync({ type: "nodebuffer" });

    const parsed = await parseDocx({ name: "gdocs-en-estilos.docx", bytes });

    assert.ok(
      !parsed.warnings.some((w) => w.includes("estilos próprios")),
      "Não deve conter advertência sobre estilos normalizados para títulos do Google Docs",
    );

    const content = parsed.richText.content ?? [];
    const h1 = content.find(
      (n) => n.type === "heading" && n.attrs?.level === 1,
    );
    const h2 = content.find(
      (n) => n.type === "heading" && n.attrs?.level === 2,
    );
    const h3 = content.find(
      (n) => n.type === "heading" && n.attrs?.level === 3,
    );
    const quote = content.find((n) => n.type === "blockquote");

    assert.ok(h1);
    assert.equal(docxPlain(h1).trim(), "Act I: The Primordial Split");
    assert.ok(h2);
    assert.equal(docxPlain(h2).trim(), "Part 1: The First Flame");
    assert.ok(h3);
    assert.equal(docxPlain(h3).trim(), "Subpart 1.A: The Celestial Hearth");
    assert.ok(quote);
    assert.ok(docxPlain(quote).includes("Where there is light"));
  });

  test("Footnotes with multiple paragraphs and links preserve superscript anchors and rich list items", async () => {
    const zip = createBaseZip();

    // Register footnotes content type
    zip.file(
      "[Content_Types].xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/footnotes.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml"/>
</Types>`,
    );

    // Document relationships with footnotes reference
    zip.file(
      "word/_rels/document.xml.rels",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="styles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rfn" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes" Target="footnotes.xml"/>
</Relationships>`,
    );

    // Footnotes relationships with external link
    zip.file(
      "word/_rels/footnotes.xml.rels",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="fnLink1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://uvc.wiki/canon/ormuz" TargetMode="External"/>
</Relationships>`,
    );

    zip.file(
      "word/styles.xml",
      `<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`,
    );

    // Footnotes with multiple paragraphs and external link
    const footnotesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:footnotes xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:footnote w:id="1">
    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t>Primeiro parágrafo: Ormuz é a divindade primordial solar.</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>Segundo parágrafo: Consulte a documentação no </w:t></w:r>
      <w:hyperlink r:id="fnLink1">
        <w:r><w:rPr><w:u/></w:rPr><w:t>Portal Canônico</w:t></w:r>
      </w:hyperlink>
      <w:r><w:t> para maiores detalhes teológicos.</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>Terceiro parágrafo: A dualidade não pode ser violada por mortal algum.</w:t></w:r>
    </w:p>
  </w:footnote>
</w:footnotes>`;
    zip.file("word/footnotes.xml", footnotesXml);

    const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r><w:t>No início dos tempos, antes da fundação de Severum, o Criador</w:t></w:r>
      <w:r><w:rPr><w:vertAlign w:val="superscript"/></w:rPr><w:footnoteReference w:id="1"/></w:r>
      <w:r><w:t> estabeleceu o cosmos em perfeita harmonia.</w:t></w:r>
    </w:p>
    <w:sectPr/>
  </w:body>
</w:document>`;
    zip.file("word/document.xml", docXml);

    const bytes = await zip.generateAsync({ type: "nodebuffer" });
    const parsed = await parseDocx({
      name: "manuscrito-com-notas.docx",
      bytes,
    });

    // 1. Verify warning about footnotes exists
    assert.ok(
      parsed.warnings.some((w) => w.includes("Notas de rodapé")),
      "Deve emitir aviso consultivo de notas de rodapé",
    );

    // 2. Verify anchor in main text has superscript and link mark to #footnote-1
    const p1 = parsed.richText.content?.[0];
    assert.equal(p1?.type, "paragraph");
    const anchor = p1?.content?.find((c) => c.text === "[1]");
    assert.ok(anchor, "Deve conter âncora [1] no texto");
    assert.ok(
      anchor.marks?.some((m) => m.type === "superscript"),
      "Âncora deve conter marca superscript",
    );
    assert.ok(
      anchor.marks?.some(
        (m) => m.type === "link" && m.attrs?.href === "#footnote-1",
      ),
      "Âncora deve conter link para #footnote-1",
    );

    // 3. Verify footnotes rendered as orderedList with multiple paragraphs
    const list = parsed.richText.content?.find((n) => n.type === "orderedList");
    assert.ok(list, "Deve conter orderedList para as notas de rodapé");
    const item = list.content?.[0];
    assert.equal(item?.type, "listItem");
    assert.ok(
      item.content && item.content.length >= 3,
      "ListItem da nota deve conter 3 parágrafos",
    );

    // Verify first paragraph has bold
    const fnP1 = item.content[0];
    assert.ok(
      fnP1.content?.some(
        (t) =>
          t.text?.includes("divindade primordial solar") &&
          t.marks?.some((m) => m.type === "bold"),
      ),
      "Primeiro parágrafo da nota deve reter negrito",
    );

    // Verify second paragraph has external hyperlink
    const fnP2 = item.content[1];
    assert.ok(
      fnP2.content?.some(
        (t) =>
          t.text === "Portal Canônico" &&
          t.marks?.some(
            (m) =>
              m.type === "link" &&
              m.attrs?.href === "https://uvc.wiki/canon/ormuz",
          ),
      ),
      "Segundo parágrafo da nota deve reter link externo válido",
    );

    // Verify all texts are in the body
    assert.ok(parsed.body.includes("Ormuz é a divindade primordial"));
    assert.ok(parsed.body.includes("Portal Canônico"));
    assert.ok(parsed.body.includes("A dualidade não pode ser violada"));
  });

  test("Scene breaks with various syntax (* * *, ***, ---, <hr>, em-dashes) become horizontalRule nodes", async () => {
    const zip = createBaseZip();
    zip.file(
      "word/styles.xml",
      `<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`,
    );

    const pageBreak = `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
    let docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>`;

    docXml += p("Cena 1: Início no laboratório.");
    docXml += p("* * *"); // asterisk space
    docXml += p("Cena 2: Visão do espaço profundo.");
    docXml += p("***"); // 3 asterisks
    docXml += p("Cena 3: Aterrisagem na Terra.");
    docXml += p("---"); // hyphens
    docXml += p("Cena 4: Confronto na ponte.");
    docXml += pageBreak; // page break mapping to hr
    docXml += p("Cena 5: Retirada estratégica.");
    docXml += p("———"); // em dashes
    docXml += p("Cena 6: Diálogo final.");
    docXml += p("— — —"); // spaced em dashes
    docXml += p("Cena 7: Epílogo.");
    docXml += `<w:sectPr/></w:body></w:document>`;

    zip.file("word/document.xml", docXml);
    const bytes = await zip.generateAsync({ type: "nodebuffer" });

    const parsed = await parseDocx({ name: "scene-breaks.docx", bytes });

    const hrs = parsed.richText.content?.filter(
      (n) => n.type === "horizontalRule",
    );
    assert.ok(
      hrs && hrs.length >= 6,
      `Deve gerar nós horizontalRule para todas as variações de cena. Encontrados: ${hrs?.length}`,
    );

    // Verify docxPlain handles horizontalRule by emitting "\n* * *\n"
    const plain = docxPlain(parsed.richText);
    assert.ok(plain.includes("* * *"));
    assert.ok(plain.includes("Cena 1: Início"));
    assert.ok(plain.includes("Cena 7: Epílogo."));
  });

  test("splitDocx partitions correctly by h1 and h2, preserving entire narrative body", async () => {
    const zip = createBaseZip();
    zip.file(
      "word/styles.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="Heading 1"/></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="Heading 2"/></w:style>
</w:styles>`,
    );

    let docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>`;
    docXml += p("Prólogo narrativo da saga.");
    docXml += p("Capítulo 1 — A Chegada dos Guardiões", "Heading1");
    docXml += p("Guardiões se reúnem na base secreta.");
    docXml += p("Seção 1.1 — Plano de Ação", "Heading2");
    docXml += p("Detalhes do plano tático.");
    docXml += p("Capítulo 2 — A Reação de Severum", "Heading1");
    docXml += p("Arner envia a Red Right Hand.");
    docXml += p("Seção 2.1 — O Cerco Inicial", "Heading2");
    docXml += p("As forças se chocam na órbita.");
    docXml += `<w:sectPr/></w:body></w:document>`;

    zip.file("word/document.xml", docXml);
    const bytes = await zip.generateAsync({ type: "nodebuffer" });

    const parsed = await parseDocx({ name: "particionamento.docx", bytes });

    // 1. Split H1
    const sectionsH1 = splitDocx(parsed.richText, parsed.title, "h1");
    assert.equal(
      sectionsH1.length,
      3,
      "Deve gerar 3 seções para split h1 (abertura + 2 capítulos)",
    );
    assert.equal(sectionsH1[0].title, "Texto de abertura");
    assert.equal(sectionsH1[1].title, "Capítulo 1 — A Chegada dos Guardiões");
    assert.equal(sectionsH1[2].title, "Capítulo 2 — A Reação de Severum");

    // Recombined body must equal full body
    assert.equal(
      sectionsH1.map((s) => s.body).join("\n"),
      parsed.body,
      "Corpo concatenado das seções H1 deve coincidir exatamente com o corpo total",
    );

    // 2. Split H2
    const sectionsH2 = splitDocx(parsed.richText, parsed.title, "h2");
    assert.equal(
      sectionsH2.length,
      3,
      "Deve gerar 3 seções para split h2 (abertura com Cap 1 + Seção 1.1 + Seção 2.1 com Cap 2)",
    );
    assert.ok(sectionsH2.some((s) => s.title.includes("Seção 1.1")));
    assert.ok(sectionsH2.some((s) => s.title.includes("Seção 2.1")));

    // 3. previewDocx reflects modes
    const preview = await previewDocx({ name: "particionamento.docx", bytes });
    assert.equal(preview.modes.length, 3); // none, h1, h2
    const h1Mode = preview.modes.find((m) => m.value === "h1");
    assert.equal(h1Mode?.sections.length, 3);
  });

  test("Security bounds: Rejects zip bombs exceeding 24 MB uncompressed cumulative limit", async () => {
    const zip = createBaseZip();
    zip.file(
      "word/styles.xml",
      `<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`,
    );
    zip.file(
      "word/document.xml",
      `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Texto de teste</w:t></w:r></w:p><w:sectPr/></w:body></w:document>`,
    );

    // 3 files of 9 MB each => 27 MB total (> 24 MB maxExpanded)
    const padding = Buffer.alloc(9 * 1024 * 1024, 0);
    zip.file("word/bloat1.xml", padding);
    zip.file("word/bloat2.xml", padding);
    zip.file("word/bloat3.xml", padding);

    const bytes = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
    });

    await assert.rejects(
      () => parseDocx({ name: "zipbomb-27mb.docx", bytes }),
      (err: Error) => {
        assert.ok(err instanceof DocxImportError);
        assert.ok(err.message.includes("24 MB"));
        return true;
      },
      "Deve rejeitar pacote cujo conteúdo descompactado ultrapassa 24 MB",
    );
  });

  test("Security bounds: Rejects files containing macro binaries (vbaProject.bin) in any casing", async () => {
    // 1. Lowercase vbaProject.bin
    {
      const zip = createBaseZip();
      zip.file(
        "word/styles.xml",
        `<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`,
      );
      zip.file(
        "word/document.xml",
        `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Macro test</w:t></w:r></w:p><w:sectPr/></w:body></w:document>`,
      );
      zip.file("word/vbaProject.bin", Buffer.from("VBA_EXPLOIT_BINARY"));

      const bytes = await zip.generateAsync({ type: "nodebuffer" });
      await assert.rejects(
        () => parseDocx({ name: "docm-renamed.docx", bytes }),
        (err: Error) => {
          assert.ok(err instanceof DocxImportError);
          assert.ok(err.message.includes("conteúdo incompatível"));
          return true;
        },
        "Deve rejeitar DOCX contendo word/vbaProject.bin",
      );
    }

    // 2. Uppercase VBAPROJECT.BIN
    {
      const zip = createBaseZip();
      zip.file(
        "word/styles.xml",
        `<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`,
      );
      zip.file(
        "word/document.xml",
        `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Macro test</w:t></w:r></w:p><w:sectPr/></w:body></w:document>`,
      );
      zip.file("word/VBAPROJECT.BIN", Buffer.from("VBA_EXPLOIT_BINARY"));

      const bytes = await zip.generateAsync({ type: "nodebuffer" });
      await assert.rejects(
        () => parseDocx({ name: "docm-upper.docx", bytes }),
        (err: Error) => {
          assert.ok(err instanceof DocxImportError);
          return true;
        },
        "Deve rejeitar DOCX contendo word/VBAPROJECT.BIN com case-insensitivity",
      );
    }
  });

  test("Security bounds: Rejects excessive entry counts (>1000) and oversize individual entries (>12MB)", async () => {
    // 1. >1000 entries
    {
      const zip = createBaseZip();
      zip.file(
        "word/styles.xml",
        `<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`,
      );
      zip.file(
        "word/document.xml",
        `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Many entries</w:t></w:r></w:p><w:sectPr/></w:body></w:document>`,
      );
      for (let i = 0; i < 1005; i++) {
        zip.file(`word/entry_${i}.txt`, "x");
      }
      const bytes = await zip.generateAsync({ type: "nodebuffer" });
      await assert.rejects(
        () => parseDocx({ name: "thousand-files.docx", bytes }),
        DocxImportError,
      );
    }

    // 2. Individual compressed file > 4MB
    {
      const bigFile = Buffer.alloc(4 * 1024 * 1024 + 1024);
      await assert.rejects(
        () => parseDocx({ name: "oversize-archive.docx", bytes: bigFile }),
        (err: Error) => {
          assert.ok(err instanceof DocxImportError);
          assert.ok(err.message.includes("4 MB"));
          return true;
        },
      );
    }
  });

  test("Adversarial Zero Words: Rejects empty document and documents with whitespace-only runs", async () => {
    const zip = createBaseZip();
    zip.file(
      "word/styles.xml",
      `<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`,
    );
    zip.file(
      "word/document.xml",
      `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>     \t\n   \r  </w:t></w:r></w:p><w:sectPr/></w:body></w:document>`,
    );
    const bytes = await zip.generateAsync({ type: "nodebuffer" });
    await assert.rejects(
      () => parseDocx({ name: "whitespace-zero-words.docx", bytes }),
      (err: Error) => {
        assert.ok(err instanceof DocxImportError);
        assert.ok(err.message.includes("não contém texto editável"));
        return true;
      },
    );
  });

  test("Adversarial Corrupt Zip & Streams: Rejects truncated byte stream and missing document.xml", async () => {
    // 1. Truncated byte stream
    const truncated = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
    await assert.rejects(
      () => parseDocx({ name: "truncated.docx", bytes: truncated }),
      (err: Error) => {
        assert.ok(err instanceof DocxImportError);
        assert.ok(err.message.includes("não é um DOCX válido"));
        return true;
      },
    );

    // 2. Missing word/document.xml
    const zip = new JSZip();
    zip.file(
      "[Content_Types].xml",
      `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>`,
    );
    zip.file("word/other.xml", `<root/>`);
    const missingBytes = await zip.generateAsync({ type: "nodebuffer" });
    await assert.rejects(
      () => parseDocx({ name: "missing-doc.docx", bytes: missingBytes }),
      (err: Error) => {
        assert.ok(err instanceof DocxImportError);
        assert.ok(err.message.includes("não contém um documento Word válido"));
        return true;
      },
    );
  });

  test("Adversarial Malformed Footnotes: Gracefully rejects orphan footnote references", async () => {
    const zip = createBaseZip();
    zip.file(
      "[Content_Types].xml",
      `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/footnotes.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml"/></Types>`,
    );
    zip.file(
      "word/_rels/document.xml.rels",
      `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rfn" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes" Target="footnotes.xml"/></Relationships>`,
    );
    zip.file(
      "word/document.xml",
      `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Texto com ref órfã </w:t></w:r><w:r><w:footnoteReference w:id="9999"/></w:r></w:p><w:sectPr/></w:body></w:document>`,
    );
    zip.file(
      "word/footnotes.xml",
      `<?xml version="1.0" encoding="UTF-8"?><w:footnotes xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:footnote w:id="1"><w:p><w:r><w:t>Nota 1</w:t></w:r></w:p></w:footnote></w:footnotes>`,
    );
    const bytes = await zip.generateAsync({ type: "nodebuffer" });
    await assert.rejects(
      () => parseDocx({ name: "orphan-footnote.docx", bytes }),
      (err: Error) => {
        assert.ok(err instanceof DocxImportError);
        assert.ok(err.message.includes("Não foi possível converter o DOCX"));
        return true;
      },
    );
  });

  test("Adversarial Deep DOM Nesting: Rejects block nesting exceeding depth 40", async () => {
    const zip = createBaseZip();
    let inner = "<w:p><w:r><w:t>Deep Content</w:t></w:r></w:p>";
    for (let i = 0; i < 45; i++) {
      inner = `<w:tbl><w:tr><w:tc>${inner}</w:tc></w:tr></w:tbl>`;
    }
    zip.file(
      "word/document.xml",
      `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${inner}<w:sectPr/></w:body></w:document>`,
    );
    const bytes = await zip.generateAsync({ type: "nodebuffer" });
    await assert.rejects(
      () => parseDocx({ name: "deep-nesting.docx", bytes }),
      (err: Error) => {
        assert.ok(err instanceof DocxImportError);
        assert.ok(err.message.includes("estrutura muito profunda"));
        return true;
      },
    );
  });

  test("Adversarial Character Limits: Rejects manuscripts exceeding 500,000 characters limit", async () => {
    const zip = createBaseZip();
    const bigText = "Severum ".repeat(63000); // ~504,000 characters
    zip.file(
      "word/document.xml",
      `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${bigText}</w:t></w:r></w:p><w:sectPr/></w:body></w:document>`,
    );
    const bytes = await zip.generateAsync({ type: "nodebuffer" });
    await assert.rejects(
      () => parseDocx({ name: "oversize-body.docx", bytes }),
      (err: Error) => {
        assert.ok(err instanceof DocxImportError);
        assert.ok(err.message.includes("500 mil caracteres"));
        return true;
      },
    );
  });

  test("Adversarial Unicode & Multi-lingual Scripts: Preserves complex astral plane emojis, RTL scripts, and math symbols", async () => {
    const zip = createBaseZip();
    const docXml = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>🌌 Severum &amp; Glênia: 🪐 ﷽ سلام עברית 𝒳𝒴𝒵 👨‍👩‍👧</w:t></w:r></w:p>
    <w:sectPr/>
  </w:body>
</w:document>`;
    zip.file("word/document.xml", docXml);
    const bytes = await zip.generateAsync({ type: "nodebuffer" });
    const parsed = await parseDocx({
      name: "multilingual-unicode.docx",
      bytes,
    });

    assert.ok(parsed.body.includes("🌌"));
    assert.ok(parsed.body.includes("🪐"));
    assert.ok(parsed.body.includes("سلام"));
    assert.ok(parsed.body.includes("עברית"));
    assert.ok(parsed.body.includes("𝒳𝒴𝒵"));
    assert.ok(parsed.body.includes("👨‍👩‍👧"));
  });
});
