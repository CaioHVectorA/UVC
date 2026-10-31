import test from "node:test";
import assert from "node:assert/strict";
import yauzl from "yauzl";
import {
  exportStoryToEpub,
  packageEpub,
  escapeXml,
  markdownToXhtml,
  tipTapNodeToXhtml,
  slugify,
  StoryNotFoundError,
  type EpubPackageData,
} from "../../lib/export-epub";

// ============================================================================
// Low-Level ZIP Inspection Utilities
// ============================================================================

interface ZipEntryInfo {
  fileName: string;
  compressionMethod: number;
  uncompressedSize: number;
  compressedSize: number;
  extraFieldLength: number;
}

function readZipEntries(buffer: Buffer): Promise<ZipEntryInfo[]> {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) return reject(err);
      const entries: ZipEntryInfo[] = [];
      zipfile.readEntry();
      zipfile.on("entry", (entry) => {
        entries.push({
          fileName: entry.fileName,
          compressionMethod: entry.compressionMethod,
          uncompressedSize: entry.uncompressedSize,
          compressedSize: entry.compressedSize,
          extraFieldLength: entry.extraFieldLength,
        });
        zipfile.readEntry();
      });
      zipfile.on("end", () => resolve(entries));
      zipfile.on("error", reject);
    });
  });
}

function extractZipFile(buffer: Buffer, targetPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) return reject(err);
      zipfile.readEntry();
      zipfile.on("entry", (entry) => {
        if (entry.fileName === targetPath) {
          zipfile.openReadStream(entry, (streamErr, readStream) => {
            if (streamErr || !readStream) return reject(streamErr);
            const chunks: Buffer[] = [];
            readStream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
            readStream.on("end", () =>
              resolve(Buffer.concat(chunks).toString("utf8")),
            );
            readStream.on("error", reject);
          });
        } else {
          zipfile.readEntry();
        }
      });
      zipfile.on("end", () =>
        reject(new Error(`Arquivo ${targetPath} não encontrado no ZIP`)),
      );
      zipfile.on("error", reject);
    });
  });
}

// ============================================================================
// Unit Tests
// ============================================================================

test("escapeXml sanitiza caracteres reservados do XML sem corromper diacríticos", () => {
  assert.equal(
    escapeXml("Livro \"Severum & Glênia\" <Volume 1> 'Cânone'"),
    "Livro &quot;Severum &amp; Glênia&quot; &lt;Volume 1&gt; &apos;Cânone&apos;",
  );
  assert.equal(escapeXml(""), "");
  assert.equal(
    escapeXml("Texto com acentos: ã, é, ç, ô, ú"),
    "Texto com acentos: ã, é, ç, ô, ú",
  );
});

test("slugify normaliza títulos em português para nomes de arquivos e IDs seguros", () => {
  assert.equal(
    slugify("Red Right Hand: Ato I: Primeiros Passos"),
    "red-right-hand-ato-i-primeiros-passos",
  );
  assert.equal(
    slugify("Ficção Científica Cósmica"),
    "ficcao-cientifica-cosmica",
  );
  assert.equal(slugify("   Espaços & Símbolos!   "), "espacos-simbolos");
});

test("markdownToXhtml converte títulos, itálico, negrito, citações e quebras de cena", () => {
  const md = `# Capítulo 01: O Início\n\nTexto de abertura com **negrito** e *itálico*.\n\n* * *\n\n> "Somos a autoridade, a ordem." — Arner\n\n- Item um\n- Item dois`;
  const xhtml = markdownToXhtml(md);
  assert.ok(xhtml.includes("<h1>Capítulo 01: O Início</h1>"));
  assert.ok(xhtml.includes("<strong>negrito</strong>"));
  assert.ok(xhtml.includes("<em>itálico</em>"));
  assert.ok(xhtml.includes('<hr class="scene-break" />'));
  assert.ok(xhtml.includes("<blockquote>"));
  assert.ok(xhtml.includes("&quot;Somos a autoridade, a ordem.&quot;"));
  assert.ok(xhtml.includes("<ul>"));
  assert.ok(xhtml.includes("<li>Item um</li>"));
});

test("tipTapNodeToXhtml serializa AST ProseMirror/TipTap para XHTML válido", () => {
  const ast = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Parágrafo com " },
          { type: "text", text: "negrito", marks: [{ type: "bold" }] },
          { type: "text", text: " e " },
          {
            type: "text",
            text: "link externo",
            marks: [{ type: "link", attrs: { href: "https://uvc.test" } }],
          },
        ],
      },
      { type: "horizontalRule" },
      {
        type: "blockquote",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Citação em bloco" }],
          },
        ],
      },
    ],
  };
  const xhtml = tipTapNodeToXhtml(ast);
  assert.ok(xhtml.includes("<p>Parágrafo com <strong>negrito</strong> e "));
  assert.ok(xhtml.includes('<a href="https://uvc.test">link externo</a>'));
  assert.ok(xhtml.includes('<hr class="scene-break" />'));
  assert.ok(xhtml.includes("<blockquote><p>Citação em bloco</p></blockquote>"));
});

test("packageEpub gera arquivo ZIP em conformidade estrita com EPUB 3 OCF e Kindle Create", async () => {
  const sampleData: EpubPackageData = {
    metadata: {
      id: "urn:uuid:test-sample-m1",
      title: "Red Right Hand",
      subtitle: "Ato I: Primeiros Passos",
      author: "Caio Henrique Oliveira Brasil",
      publisher: "UVC Publicações",
      language: "pt-BR",
      date: "2026-10-30",
      modifiedDate: "2026-10-30T23:00:00Z",
      frontMatter: {
        dedicatoria:
          "Dedicado a todos que constroem impérios a partir da poeira.",
        epigrafe: "“Somos mais que uma equipe. Somos a ordem.” — Arner",
        fichaCatalografica:
          "Brasil, Caio Henrique Oliveira. Red Right Hand. 1. ed. Severum: UVC, 2026.",
      },
    },
    chapters: [
      {
        id: "chapter-00",
        title: "Capítulo 0: A Reunião",
        htmlBody: "<p>Arner desperta nas coordenadas de Severum.</p>",
        order: 0,
      },
      {
        id: "chapter-01",
        title: "Capítulo 1: Recrutamento e Fundação",
        htmlBody: "<p>O recrutamento dos primeiros soldados da corporação.</p>",
        order: 1,
      },
    ],
  };

  const buffer = await packageEpub(sampleData);
  assert.ok(buffer.length > 500, "Buffer deve conter dados válidos");

  // Regra 1: Validação do cabeçalho binário (offset 0)
  assert.equal(
    buffer.subarray(0, 4).toString("hex"),
    "504b0304",
    "Magic PK\\x03\\x04",
  );
  assert.equal(
    buffer.readUInt16LE(8),
    0,
    "Compression method no offset 8 DEVE ser 0 (STORE)",
  );
  assert.equal(
    buffer.subarray(30, 38).toString("utf8"),
    "mimetype",
    "Nome da primeira entrada deve ser 'mimetype'",
  );
  assert.equal(
    buffer.subarray(38, 58).toString("utf8"),
    "application/epub+zip",
    "Conteúdo exato do mimetype (20 bytes)",
  );

  // Regra 2: Validação via yauzl
  const entries = await readZipEntries(buffer);
  assert.equal(entries[0].fileName, "mimetype");
  assert.equal(entries[0].compressionMethod, 0);
  assert.equal(entries[0].uncompressedSize, 20);
  assert.equal(entries[0].extraFieldLength, 0);

  // Regra 3: Existência de todos os arquivos canônicos
  const fileNames = entries.map((e) => e.fileName);
  assert.ok(fileNames.includes("META-INF/container.xml"));
  assert.ok(fileNames.includes("OEBPS/content.opf"));
  assert.ok(fileNames.includes("OEBPS/nav.xhtml"));
  assert.ok(fileNames.includes("OEBPS/toc.ncx"));
  assert.ok(fileNames.includes("OEBPS/styles.css"));
  assert.ok(fileNames.includes("OEBPS/cover.xhtml"));
  assert.ok(fileNames.includes("OEBPS/titlepage.xhtml"));
  assert.ok(fileNames.includes("OEBPS/frontmatter.xhtml"));
  assert.ok(fileNames.includes("OEBPS/chapter-00.xhtml"));
  assert.ok(fileNames.includes("OEBPS/chapter-01.xhtml"));

  // Regra 4: Validação do container.xml
  const containerXml = await extractZipFile(buffer, "META-INF/container.xml");
  assert.ok(containerXml.includes('full-path="OEBPS/content.opf"'));
  assert.ok(
    containerXml.includes('media-type="application/oebps-package+xml"'),
  );

  // Regra 5: Validação do content.opf (Dublin Core, Manifest, Spine, Guide)
  const opfContent = await extractZipFile(buffer, "OEBPS/content.opf");
  assert.ok(
    opfContent.includes(
      '<package xmlns="http://www.idpf.org/2007/opf" version="3.0"',
    ),
  );
  assert.ok(
    opfContent.includes(
      '<dc:identifier id="BookId">urn:uuid:test-sample-m1</dc:identifier>',
    ),
  );
  assert.ok(opfContent.includes("<dc:title>Red Right Hand</dc:title>"));
  assert.ok(opfContent.includes("<dc:language>pt-BR</dc:language>"));
  assert.ok(
    opfContent.includes(
      '<dc:creator id="creator">Caio Henrique Oliveira Brasil</dc:creator>',
    ),
  );
  assert.ok(
    opfContent.includes(
      '<meta property="dcterms:modified">2026-10-30T23:00:00Z</meta>',
    ),
  );
  assert.ok(
    opfContent.includes(
      '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
    ),
  );
  assert.ok(
    opfContent.includes(
      '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>',
    ),
  );
  assert.ok(opfContent.includes('<spine toc="ncx">'));
  assert.ok(opfContent.includes('<itemref idref="cover-page"/>'));
  assert.ok(opfContent.includes('<itemref idref="item-chapter-00"/>'));
  assert.ok(opfContent.includes("<guide>"));
  assert.ok(
    opfContent.includes(
      '<reference type="cover" title="Capa" href="cover.xhtml"/>',
    ),
  );
  assert.ok(
    opfContent.includes(
      '<reference type="toc" title="Sumário" href="nav.xhtml"/>',
    ),
  );
  assert.ok(
    opfContent.includes(
      '<reference type="text" title="Início da Leitura" href="chapter-00.xhtml"/>',
    ),
  );

  // Regra 6: Validação do nav.xhtml (EPUB 3 NAV + Landmarks)
  const navContent = await extractZipFile(buffer, "OEBPS/nav.xhtml");
  assert.ok(navContent.includes('epub:type="toc"'));
  assert.ok(navContent.includes('href="chapter-00.xhtml"'));
  assert.ok(navContent.includes('href="chapter-01.xhtml"'));
  assert.ok(navContent.includes('epub:type="landmarks"'));
  assert.ok(navContent.includes('epub:type="bodymatter"'));

  // Regra 7: Validação do toc.ncx (EPUB 2 / Kindle Create Auto-Detection)
  const ncxContent = await extractZipFile(buffer, "OEBPS/toc.ncx");
  assert.ok(
    ncxContent.includes(
      '<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">',
    ),
  );
  assert.ok(ncxContent.includes("<docTitle>"));
  assert.ok(ncxContent.includes("<text>Red Right Hand</text>"));
  assert.ok(ncxContent.includes('<navPoint id="np-chapter-00"'));
  assert.ok(ncxContent.includes('<navPoint id="np-chapter-01"'));

  // Regra 8: Validação dos capítulos XHTML
  const ch0 = await extractZipFile(buffer, "OEBPS/chapter-00.xhtml");
  assert.ok(ch0.includes("<!DOCTYPE html>"));
  assert.ok(ch0.includes('<section epub:type="chapter" role="doc-chapter">'));
  assert.ok(
    ch0.includes('<h1 class="chapter-title">Capítulo 0: A Reunião</h1>'),
  );
  assert.ok(ch0.includes("<p>Arner desperta nas coordenadas de Severum.</p>"));

  // Regra 9: Validação do styles.css (regras KDP)
  const cssContent = await extractZipFile(buffer, "OEBPS/styles.css");
  assert.ok(!cssContent.includes("@import"), "Proibido @import para KDP");
  assert.ok(
    !cssContent.includes("position: fixed"),
    "Proibido position: fixed para KDP",
  );
  assert.ok(
    cssContent.includes("text-indent: 1.5em"),
    "Recuo canônico de parágrafos",
  );
  assert.ok(cssContent.includes("hr.scene-break"), "Divisor de cena formatado");
});

test("exportStoryToEpub exporta o livro canônico Red Right Hand com capa e capítulos", async () => {
  const result = await exportStoryToEpub("red-right-hand");
  assert.ok(
    result.buffer.length > 5000,
    "EPUB com capa real deve ter tamanho razoável",
  );
  assert.ok(result.filename.startsWith("red-right-hand"));
  assert.ok(result.filename.endsWith(".epub"));

  const entries = await readZipEntries(result.buffer);
  const fileNames = entries.map((e) => e.fileName);
  assert.ok(
    fileNames.includes("OEBPS/cover.jpg"),
    "Deve embutir imagem de capa rrh-ascensao.jpg",
  );
  assert.ok(fileNames.includes("OEBPS/chapter-00.xhtml"));
  assert.ok(fileNames.includes("OEBPS/chapter-01.xhtml"));
});

test("exportStoryToEpub lança StoryNotFoundError para identificador de história inexistente", async () => {
  await assert.rejects(
    () => exportStoryToEpub("historia-completamente-inexistente-xyz"),
    (err: unknown) => err instanceof StoryNotFoundError,
  );
});
