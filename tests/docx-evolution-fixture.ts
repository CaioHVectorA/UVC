import JSZip from "jszip";

export interface DocxEvolutionOptions {
  locale?: "pt-BR" | "en-US";
  includeFootnotes?: boolean;
  includeSceneBreaks?: boolean;
  wordCountTarget?: number;
  chapterCount?: number;
  emptyDocument?: boolean;
  extremeUnicode?: boolean;
}

/**
 * Builds synthetic DOCX files testing MS Word / Google Docs variations,
 * Portuguese localized style names, footnotes, scene breaks, and edge cases.
 */
export async function docxEvolutionFixture(
  options: DocxEvolutionOptions = {},
): Promise<Buffer> {
  const zip = new JSZip();
  const isPt = options.locale !== "en-US";
  const h1Style = isPt ? "Ttulo1" : "Heading1";
  const h1Name = isPt ? "Título 1" : "heading 1";
  const h2Style = isPt ? "Ttulo2" : "Heading2";
  const h2Name = isPt ? "Título 2" : "heading 2";

  // 1. [Content_Types].xml
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  ${options.includeFootnotes ? '<Override PartName="/word/footnotes.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml"/>' : ""}
</Types>`,
  );

  // 2. _rels/.rels
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );

  // 3. word/_rels/document.xml.rels
  zip.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="styles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  ${options.includeFootnotes ? '<Relationship Id="footnotes" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes" Target="footnotes.xml"/>' : ""}
</Relationships>`,
  );

  // 4. word/styles.xml with Portuguese and English style declarations
  zip.file(
    "word/styles.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Normal" w:default="1">
    <w:name w:val="Normal"/>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:aliases w:val="Título"/>
  </w:style>
  <w:style w:type="paragraph" w:styleId="${h1Style}">
    <w:name w:val="${h1Name}"/>
    <w:aliases w:val="Título 1,Heading 1"/>
  </w:style>
  <w:style w:type="paragraph" w:styleId="${h2Style}">
    <w:name w:val="${h2Name}"/>
    <w:aliases w:val="Título 2,Heading 2"/>
  </w:style>
</w:styles>`,
  );

  // 5. word/footnotes.xml if requested
  if (options.includeFootnotes) {
    zip.file(
      "word/footnotes.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:footnotes xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:footnote w:id="1">
    <w:p><w:r><w:t>Nota histórica canônica: Ormuz estabeleceu as Sete Leis no Pré-Universal.</w:t></w:r></w:p>
  </w:footnote>
</w:footnotes>`,
    );
  }

  // 6. Construct body
  let bodyXml = "";

  if (options.emptyDocument) {
    bodyXml = `<w:p/>`;
  } else {
    // Title (only if chapterCount is not explicitly requested)
    if (!options.chapterCount) {
      const titleText = options.extremeUnicode
        ? "Crônicas Cósmicas de Severum 🌌 ⚔️ [ᛟᚱᛗᚢᛉ]"
        : "Manuscrito de Red Right Hand";
      bodyXml += `<w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:t>${titleText}</w:t></w:r></w:p>`;
    }

    const chapterCount = options.chapterCount ?? 2;
    for (let c = 1; c <= chapterCount; c++) {
      const chapterTitle = isPt
        ? `Capítulo ${c} · O Cerco de Glen`
        : `Chapter ${c} · The Siege of Glen`;
      bodyXml += `<w:p><w:pPr><w:pStyle w:val="${h1Style}"/></w:pPr><w:r><w:t>${chapterTitle}</w:t></w:r></w:p>`;

      const sectionTitle = isPt
        ? `Seção ${c}.1 · Incursão Tática`
        : `Section ${c}.1 · Tactical Incursion`;
      bodyXml += `<w:p><w:pPr><w:pStyle w:val="${h2Style}"/></w:pPr><w:r><w:t>${sectionTitle}</w:t></w:r></w:p>`;

      let paragraph = `No coração de Glen, os Guardiões liderados por Beenie preparavam as defesas contra a investida de Arner.`;
      if (options.extremeUnicode) {
        paragraph += ` Símbolos primordiais ⚡️✨ translúcidos ecoavam no ar.`;
      }
      bodyXml += `<w:p><w:r><w:t>${paragraph}</w:t></w:r>`;

      if (options.includeFootnotes && c === 1) {
        bodyXml += `<w:r><w:rPr><w:vertAlign w:val="superscript"/></w:rPr><w:footnoteReference w:id="1"/></w:r>`;
      }
      bodyXml += `</w:p>`;

      if (options.includeSceneBreaks) {
        // Asterisk scene break
        bodyXml += `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>* * *</w:t></w:r></w:p>`;
        bodyXml += `<w:p><w:r><w:t>A noite caiu sobre o setor residencial de Severum enquanto o Lampião brilhava fracamente.</w:t></w:r></w:p>`;
      }

      if (options.wordCountTarget && options.wordCountTarget > 50) {
        const wordsToAdd = Math.floor(options.wordCountTarget / chapterCount);
        const repeatSentence =
          " A batalha cósmica ressoa através das eras de formação e redenção.";
        const repeats = Math.max(1, Math.floor(wordsToAdd / 10));
        bodyXml += `<w:p><w:r><w:t>${repeatSentence.repeat(repeats)}</w:t></w:r></w:p>`;
      }
    }
  }

  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${bodyXml}<w:sectPr/></w:body>
</w:document>`,
  );

  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
