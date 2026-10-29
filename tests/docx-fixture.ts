import JSZip from "jszip";
export async function docxFixture(
  options: {
    plain?: boolean;
    unsafeLink?: boolean;
    extras?: boolean;
    doctype?: boolean;
  } = {},
) {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/></Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
  );
  zip.file(
    "word/_rels/document.xml.rels",
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="styles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="numbering" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/><Relationship Id="link" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${options.unsafeLink ? "javascript:alert(1)" : "https://example.com/referencia"}" TargetMode="External"/></Relationships>`,
  );
  zip.file(
    "word/styles.xml",
    `<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/></w:style></w:styles>`,
  );
  zip.file(
    "word/numbering.xml",
    `<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>`,
  );
  const p = (text: string, style?: string) =>
    `<w:p>${style && !options.plain ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ""}<w:r><w:t>${text}</w:t></w:r></w:p>`;
  const list = (text: string) =>
    `<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>${text}</w:t></w:r></w:p>`;
  const body =
    p("Manuscrito de validação", "Title") +
    p("Abertura do documento.") +
    p("Capítulo Um", "Heading1") +
    `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Trecho em negrito.</w:t></w:r><w:r><w:t xml:space="preserve"> </w:t></w:r><w:r><w:rPr><w:i/></w:rPr><w:t>Trecho em itálico.</w:t></w:r></w:p>` +
    p("Uma seção", "Heading2") +
    `<w:p><w:r><w:t>Primeira linha.</w:t><w:br/><w:t>Segunda linha.</w:t></w:r><w:hyperlink r:id="link"><w:r><w:t> Referência externa.</w:t></w:r></w:hyperlink></w:p>` +
    p("Capítulo Dois", "Heading1") +
    list("Primeiro item.") +
    list("Segundo item.") +
    (options.extras
      ? `<w:tbl><w:tr><w:tc>${p("Célula A")}</w:tc><w:tc>${p("Célula B")}</w:tc></w:tr></w:tbl>`
      : "");
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8"?>${options.doctype ? '<!DOCTYPE doc [<!ENTITY x "forbidden">]>' : ""}<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body}<w:sectPr/></w:body></w:document>`,
  );
  if (options.extras) {
    zip.file("word/media/image.png", Buffer.from([137, 80, 78, 71]));
    zip.file(
      "word/comments.xml",
      `<w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>`,
    );
  }
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
