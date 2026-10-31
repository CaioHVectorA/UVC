import test from "node:test";
import assert from "node:assert/strict";
import yauzl from "yauzl";
import JSZip from "jszip";
import { execSync } from "node:child_process";
import { Pool } from "pg";
import {
  exportStoryToEpub,
  packageEpub,
  markdownToXhtml,
  tipTapNodeToXhtml,
  generateStylesCss,
  StoryNotFoundError,
  type EpubPackageData,
} from "../../lib/export-epub";
import {
  wordCount,
  orderedDocuments,
  writingContent,
  documentOrder,
} from "../../lib/writing";
import { inspectEpub } from "../epub-fixture";
import { testDatabaseUrl } from "../studio-fixture";
import { databaseConfigured } from "../../lib/database";

// ============================================================================
// Helper Utilities for Empirical Stress Testing
// ============================================================================

interface ZipEntryDetails {
  fileName: string;
  compressionMethod: number;
  uncompressedSize: number;
  compressedSize: number;
  extraFieldLength: number;
}

function getZipEntries(buffer: Buffer): Promise<ZipEntryDetails[]> {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) return reject(err);
      const entries: ZipEntryDetails[] = [];
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

function extractZipFile(buffer: Buffer, filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) return reject(err);
      zipfile.readEntry();
      zipfile.on("entry", (entry) => {
        if (entry.fileName === filePath) {
          zipfile.openReadStream(entry, (streamErr, readStream) => {
            if (streamErr || !readStream) return reject(streamErr);
            const chunks: Buffer[] = [];
            readStream.on("data", (c) => chunks.push(Buffer.from(c)));
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
        reject(new Error(`File not found in ZIP: ${filePath}`)),
      );
      zipfile.on("error", reject);
    });
  });
}

/**
 * Validates an XML/XHTML string using libxml2 (xmllint --noout -).
 * Throws an error with parser diagnostics if XML is malformed.
 */
function assertValidXml(xml: string, context = "XML Validation"): void {
  try {
    execSync("xmllint --noout -", {
      input: Buffer.from(xml, "utf8"),
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (err: unknown) {
    const errorOutput =
      typeof err === "object" && err !== null && "stderr" in err
        ? String((err as { stderr: Buffer }).stderr)
        : String(err);
    assert.fail(`${context} failed strict xmllint validation:\n${errorOutput}`);
  }
}

/**
 * Validates ALL XML and XHTML files inside an EPUB archive against xmllint.
 */
async function assertAllArchiveXmlValid(
  buffer: Buffer,
  label = "EPUB Archive",
): Promise<void> {
  const zip = await JSZip.loadAsync(buffer);
  for (const [filename, fileObj] of Object.entries(zip.files)) {
    if (fileObj.dir) continue;
    if (
      filename.endsWith(".xml") ||
      filename.endsWith(".xhtml") ||
      filename.endsWith(".opf") ||
      filename.endsWith(".ncx")
    ) {
      const content = await fileObj.async("string");
      assertValidXml(content, `${label} -> ${filename}`);
    }
  }
}

// ============================================================================
// STRESS TEST SUITE
// ============================================================================

test("OCF Spec Conformance: Binary Local Header at Offset 0 (STORE, 20 bytes, no extra field)", async () => {
  // Generate sample package
  const sampleData: EpubPackageData = {
    metadata: {
      id: "urn:uuid:stress-ocf-001",
      title: "Teste OCF Rigoroso",
      author: "Severum QA",
      publisher: "UVC",
      language: "pt-BR",
      date: "2026-10-30",
      modifiedDate: "2026-10-30T23:59:59Z",
    },
    chapters: [
      {
        id: "chapter-00",
        title: "Capítulo Único",
        htmlBody: "<p>Conteúdo de teste.</p>",
        order: 0,
      },
    ],
  };

  const buffer = await packageEpub(sampleData);

  // Exact binary layout of local file header for mimetype (offset 0):
  // Offset 0-3: Local file header signature 0x04034b50 (PK\x03\x04)
  assert.equal(buffer.readUInt32LE(0), 0x04034b50, "Magic PK\\x03\\x04");

  // Offset 8-9: Compression method MUST be 0 (STORE)
  assert.equal(
    buffer.readUInt16LE(8),
    0,
    "Compression method must be STORE (0)",
  );

  // Offset 18-21: Compressed size MUST be 20
  assert.equal(buffer.readUInt32LE(18), 20, "Compressed size must be 20");

  // Offset 22-25: Uncompressed size MUST be 20
  assert.equal(buffer.readUInt32LE(22), 20, "Uncompressed size must be 20");

  // Offset 26-27: Filename length MUST be 8 ("mimetype")
  assert.equal(buffer.readUInt16LE(26), 8, "Filename length must be 8");

  // Offset 28-29: Extra field length MUST be 0 (OCF Section 3.3.1 requirement)
  assert.equal(buffer.readUInt16LE(28), 0, "Extra field length must be 0");

  // Offset 30-37: Filename "mimetype"
  assert.equal(
    buffer.subarray(30, 38).toString("ascii"),
    "mimetype",
    "First entry filename must be 'mimetype'",
  );

  // Offset 38-57: Content "application/epub+zip"
  assert.equal(
    buffer.subarray(38, 58).toString("ascii"),
    "application/epub+zip",
    "Mimetype content must be 'application/epub+zip'",
  );

  // Verification via yauzl parser
  const entries = await getZipEntries(buffer);
  assert.equal(entries[0].fileName, "mimetype");
  assert.equal(entries[0].compressionMethod, 0);
  assert.equal(entries[0].extraFieldLength, 0);
  assert.equal(entries[0].compressedSize, 20);
  assert.equal(entries[0].uncompressedSize, 20);
});

test("Metadata Stress: Extreme Unicode, Emojis, Diacritics, Quotations, and XML Entities", async () => {
  const extremeData: EpubPackageData = {
    metadata: {
      id: "urn:uuid:extreme-unicode-m1",
      title:
        "🚀 Severum & Glênia: \"Ato I — A Origem Cósmica\" <Livro 1> 'Cânone' 🪐",
      subtitle: "Uma Jornada Além do Vazio «Volume Especial» — 🌟💥⚡",
      author: 'Caio Henrique & Equipe "Severum" <Autor Principal>',
      publisher: "UVC & Cia. Editorial <Severum>",
      language: "pt-BR",
      synopsis:
        'Sinopse com tags <script>alert("xss")</script> & aspas "duplas" e \'simples\'.',
      date: "2026-10-30",
      modifiedDate: "2026-10-30T23:59:59Z",
      frontMatter: {
        dedicatoria:
          'Dedicado aos Guardiões: Larry & Kerry <"Heróis">\nNova linha com aspas.',
        epigrafe: "“A ordem cósmica não tolera o caos.” — Hades & Arner",
        fichaCatalografica:
          "Brasil, C. H. O.\nSeverum: UVC & Cia, 2026.\nCDD: 808.83 <Ficção>",
      },
    },
    chapters: [
      {
        id: "chapter-00",
        title: "Capítulo 0: <Início> & \"Fim\" 'Alfa' — 🚀",
        htmlBody:
          "<p>Texto com entidades: &amp;, &lt;, &gt;, &quot;, &apos;.</p>",
        order: 0,
      },
      {
        id: "chapter-01",
        title:
          "Capítulo 1: Acentuação estendida: ã, é, ç, ô, ú, ñ, ü, ï, œ, æ, ß, سلام, שלום",
        htmlBody:
          "<p>Multilingual text: English, Português, العربية, עברית.</p>",
        order: 1,
      },
      {
        id: "chapter-02",
        title: "Capítulo 2: Título Longo " + "A".repeat(400),
        htmlBody: "<p>Capítulo com título muito longo.</p>",
        order: 2,
      },
    ],
  };

  const buffer = await packageEpub(extremeData);
  assert.ok(buffer.length > 1000);

  // Validate ALL XML files in archive using strict xmllint
  await assertAllArchiveXmlValid(buffer, "Extreme Metadata EPUB");

  // Validate OPF contents specifically
  const opfContent = await extractZipFile(buffer, "OEBPS/content.opf");
  assert.ok(opfContent.includes("&amp;"));
  assert.ok(opfContent.includes("&lt;Livro 1&gt;"));
  assert.ok(!opfContent.includes("<script>"));
  assert.ok(opfContent.includes("&lt;script&gt;"));

  // Validate NAV document
  const navContent = await extractZipFile(buffer, "OEBPS/nav.xhtml");
  assert.ok(navContent.includes("&lt;Início&gt;"));

  // Validate NCX document
  const ncxContent = await extractZipFile(buffer, "OEBPS/toc.ncx");
  assert.ok(ncxContent.includes("&lt;Início&gt;"));
});

test("Markdown Ingestion Stress: HTML Injection, Nested Blocks, and Diverse Scene Break Formats", async () => {
  const md = `
# Capítulo 01: Stress Markdown

Primeiro parágrafo com **negrito**, *itálico*, ~~tachado~~ e __negrito alternativo__.

* * *

Segundo bloco após quebra com três asteriscos espaçados.

***

Terceiro bloco após quebra com três asteriscos juntos.

*  *  *

Quarto bloco após quebra com múltiplos espaços.

---

Quinto bloco após quebra com traços.

* * * * *

Sexto bloco após quebra com cinco asteriscos.

> "A gravidade de Severum é absoluta."
> — Arner sobre o planeta blindado.

- Item Alfa & Ômega
- Item Beta com <tag-invalida>
- Item Gama com "aspas"

1. Primeiro passo
2. Segundo passo com <outro-script>

Tentativa de injeção direta de HTML no markdown:
<script>alert("malicioso");</script>
<img src="x" onerror="evil()" />
<div class="unclosed">Texto sem fechamento de div

Fim do capítulo com cálculo matemático: 3 * 4 = 12 e 5 * 6 = 30.
`;

  const xhtml = markdownToXhtml(md);

  // Must not have unescaped raw HTML tags
  assert.ok(!xhtml.includes("<script>"), "Must escape raw <script> tags");
  assert.ok(xhtml.includes("&lt;script&gt;"), "Must convert to &lt;script&gt;");
  assert.ok(!xhtml.includes('<img src="x"'), "Must escape raw <img> tags");

  // Must have scene-break hr elements
  const sceneBreakCount = (xhtml.match(/<hr class="scene-break" \/>/g) || [])
    .length;
  assert.ok(
    sceneBreakCount >= 4,
    `Expected at least 4 scene breaks, found ${sceneBreakCount}`,
  );

  // Must produce well-formed XML when wrapped in chapter template
  const fullChapter = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Test</title></head>
<body>${xhtml}</body>
</html>`;
  assertValidXml(fullChapter, "Markdown Chapter XHTML");
});

test("TipTap AST Stress: Deeply Nested Nodes, Missing Attributes, Dangerous Links, and Clamping", () => {
  const ast = {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 0 }, // Out of bounds -> clamp to 1
        content: [{ type: "text", text: "Título Nível 0 Clamped" }],
      },
      {
        type: "heading",
        attrs: { level: 99 }, // Out of bounds -> clamp to 6
        content: [{ type: "text", text: "Título Nível 99 Clamped" }],
      },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Parágrafo com " },
          { type: "text", text: "negrito", marks: [{ type: "bold" }] },
          { type: "text", text: ", " },
          { type: "text", text: "itálico", marks: [{ type: "italic" }] },
          { type: "text", text: ", " },
          { type: "text", text: "sublinhado", marks: [{ type: "underline" }] },
          { type: "text", text: ", " },
          { type: "text", text: "tachado", marks: [{ type: "strike" }] },
          { type: "text", text: ", " },
          { type: "text", text: "sobrescrito", marks: [{ type: "sup" }] },
          { type: "text", text: ", e " },
          { type: "text", text: "subscrito", marks: [{ type: "sub" }] },
        ],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Link perigoso com aspas e XML",
            marks: [
              {
                type: "link",
                attrs: {
                  href: 'javascript:alert("XSS & Injection")<script>',
                },
              },
            ],
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Link sem href",
            marks: [{ type: "link" }], // Missing attrs
          },
        ],
      },
      {
        type: "paragraph",
        content: [], // Empty paragraph
      },
      { type: "horizontalRule" },
      { type: "hardBreak" },
      {
        type: "orderedList",
        attrs: { start: 15 },
        content: [
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Item 15 da lista ordenada" }],
              },
            ],
          },
        ],
      },
    ],
  };

  const xhtml = tipTapNodeToXhtml(ast);

  assert.ok(xhtml.includes("<h1>Título Nível 0 Clamped</h1>"));
  assert.ok(xhtml.includes("<h6>Título Nível 99 Clamped</h6>"));
  assert.ok(xhtml.includes("<u>sublinhado</u>"));
  assert.ok(xhtml.includes("<s>tachado</s>"));
  assert.ok(xhtml.includes("<sup>sobrescrito</sup>"));
  assert.ok(xhtml.includes("<sub>subscrito</sub>"));
  assert.ok(
    xhtml.includes(
      '<a href="javascript:alert(&quot;XSS &amp; Injection&quot;)&lt;script&gt;">',
    ),
  );
  assert.ok(xhtml.includes("<p><br /></p>"));
  assert.ok(xhtml.includes('<hr class="scene-break" />'));
  assert.ok(xhtml.includes('<ol start="15">'));

  // Must validate with xmllint
  const fullChapter = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Test</title></head>
<body>${xhtml}</body>
</html>`;
  assertValidXml(fullChapter, "TipTap Chapter XHTML");
});

test("Manifest, Spine, and Landmark Link Coherence (EPUB 3 NAV and Kindle <guide>)", async () => {
  const packageData: EpubPackageData = {
    metadata: {
      id: "urn:uuid:coherence-test-001",
      title: "Coerência de Manifest e Landmarks",
      author: "Test Suite",
      publisher: "UVC",
      language: "pt-BR",
      date: "2026-10-30",
      modifiedDate: "2026-10-30T23:59:59Z",
      frontMatter: {
        dedicatoria: "Dedicatória de teste.",
      },
      coverImage: {
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]), // Mock JPEG
        mediaType: "image/jpeg",
      },
    },
    chapters: [
      {
        id: "chapter-00",
        title: "Primeiro Capítulo",
        htmlBody: "<p>Corpo 1</p>",
        order: 0,
      },
      {
        id: "chapter-01",
        title: "Segundo Capítulo",
        htmlBody: "<p>Corpo 2</p>",
        order: 1,
      },
      {
        id: "chapter-02",
        title: "Terceiro Capítulo",
        htmlBody: "<p>Corpo 3</p>",
        order: 2,
      },
    ],
  };

  const buffer = await packageEpub(packageData);
  const zip = await JSZip.loadAsync(buffer);
  const inspection = await inspectEpub(buffer);

  const zipFiles = Object.keys(zip.files).filter((f) => !zip.files[f].dir);

  // 1. All manifest hrefs must exist in zip archive under OEBPS/
  for (const item of inspection.manifestItems) {
    const fullPath = `OEBPS/${item.href}`;
    assert.ok(
      zipFiles.includes(fullPath),
      `Manifest item ${item.id} (${fullPath}) must exist in ZIP archive`,
    );
  }

  // 2. All spine itemrefs must correspond to valid manifest item ids
  const manifestIdMap = new Map(inspection.manifestItems.map((m) => [m.id, m]));
  for (const spineId of inspection.spineItems) {
    assert.ok(
      manifestIdMap.has(spineId),
      `Spine itemref ${spineId} must exist in manifest`,
    );
  }

  // 3. Guide landmarks must resolve to existing files
  for (const landmark of inspection.guideLandmarks) {
    assert.ok(landmark.href, `Guide landmark ${landmark.type} must have href`);
    const fullPath = `OEBPS/${landmark.href}`;
    assert.ok(
      zipFiles.includes(fullPath),
      `Guide landmark ${landmark.type} (${fullPath}) must exist in ZIP`,
    );
  }

  // 4. Guide 'text' landmark MUST point to the first chapter
  const textLandmark = inspection.guideLandmarks.find((g) => g.type === "text");
  assert.ok(
    textLandmark,
    "Must have a 'text' landmark for Start Reading Location",
  );
  assert.equal(textLandmark.href, "chapter-00.xhtml");

  // 5. Nav landmarks MUST also resolve to existing files
  const navXml = await zip.file("OEBPS/nav.xhtml")!.async("string");
  const landmarksMatch = navXml.match(
    /<nav epub:type="landmarks"[^>]*>([\s\S]*?)<\/nav>/i,
  );
  assert.ok(landmarksMatch, "nav.xhtml must contain epub:type='landmarks'");
  const hrefRegex = /href=["']([^"']+)["']/g;
  let match;
  while ((match = hrefRegex.exec(landmarksMatch[1])) !== null) {
    const fullPath = `OEBPS/${match[1]}`;
    assert.ok(
      zipFiles.includes(fullPath),
      `Nav landmark href '${match[1]}' must exist in ZIP`,
    );
  }

  // 6. Navigation doc (nav.xhtml) must have properties="nav"
  const navItem = inspection.manifestItems.find((i) => i.id === "nav");
  assert.ok(navItem);
  assert.ok(navItem.properties?.includes("nav"));

  // 7. Cover image item must have properties="cover-image"
  const coverItem = inspection.manifestItems.find(
    (i) => i.id === "cover-image",
  );
  assert.ok(coverItem);
  assert.ok(coverItem.properties?.includes("cover-image"));
});

test("Cover Image Variations: PNG, WebP, JPEG, and Missing Cover Fallback", async () => {
  const dummyPixel = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]); // PNG signature

  // PNG
  const pngPkg: EpubPackageData = {
    metadata: {
      id: "png-test",
      title: "PNG Cover",
      author: "Author",
      publisher: "Publisher",
      language: "pt-BR",
      date: "2026-10-30",
      modifiedDate: "2026-10-30T23:59:59Z",
      coverImage: { buffer: dummyPixel, mediaType: "image/png" },
    },
    chapters: [{ id: "c1", title: "C1", htmlBody: "<p>Text</p>", order: 0 }],
  };
  const pngBuf = await packageEpub(pngPkg);
  const pngZip = await JSZip.loadAsync(pngBuf);
  assert.ok(pngZip.file("OEBPS/cover.png"), "Must store cover.png");
  const pngOpf = await pngZip.file("OEBPS/content.opf")!.async("string");
  assert.ok(pngOpf.includes('media-type="image/png"'));

  // WebP
  const webpPkg: EpubPackageData = {
    metadata: {
      id: "webp-test",
      title: "WebP Cover",
      author: "Author",
      publisher: "Publisher",
      language: "pt-BR",
      date: "2026-10-30",
      modifiedDate: "2026-10-30T23:59:59Z",
      coverImage: { buffer: dummyPixel, mediaType: "image/webp" },
    },
    chapters: [{ id: "c1", title: "C1", htmlBody: "<p>Text</p>", order: 0 }],
  };
  const webpBuf = await packageEpub(webpPkg);
  const webpZip = await JSZip.loadAsync(webpBuf);
  assert.ok(webpZip.file("OEBPS/cover.webp"), "Must store cover.webp");

  // No cover image: text-based cover.xhtml fallback
  const noCoverPkg: EpubPackageData = {
    metadata: {
      id: "nocover-test",
      title: "No Cover Book",
      author: "Author",
      publisher: "Publisher",
      language: "pt-BR",
      date: "2026-10-30",
      modifiedDate: "2026-10-30T23:59:59Z",
    },
    chapters: [{ id: "c1", title: "C1", htmlBody: "<p>Text</p>", order: 0 }],
  };
  const noCoverBuf = await packageEpub(noCoverPkg);
  const noCoverZip = await JSZip.loadAsync(noCoverBuf);
  assert.ok(!noCoverZip.file("OEBPS/cover.jpg"));
  const coverHtml = await noCoverZip.file("OEBPS/cover.xhtml")!.async("string");
  assert.ok(coverHtml.includes('<h1 class="book-title">No Cover Book</h1>'));
});

test("Stylesheet KDP Guidelines: Typography, Relative Units, and Forbidden CSS Directives", () => {
  const css = generateStylesCss();

  assert.ok(!css.includes("@import"), "Proibido @import para Amazon KDP");
  assert.ok(
    !css.includes("position: fixed"),
    "Proibido position: fixed para Kindle",
  );
  assert.ok(css.includes("font-size: 1rem"), "Uso de rem relativo");
  assert.ok(
    css.includes("text-indent: 1.5em"),
    "Recuo canônico de parágrafo de ficção",
  );
  assert.ok(css.includes("hr.scene-break"), "Divisor de cena estilizado");
  assert.ok(
    css.includes("break-inside: avoid") ||
      css.includes("page-break-inside: avoid"),
  );
});

test("Database-Backed Story Export: PostgreSQL Entities, Custom Ordering, and AST Conversion", async (t) => {
  if (!databaseConfigured()) {
    t.skip(
      "DATABASE_URL not configured at process start; skipping DB export test",
    );
    return;
  }

  // Test connection to PostgreSQL test instance
  let pool: Pool | null = null;
  try {
    pool = new Pool({
      connectionString: testDatabaseUrl,
      connectionTimeoutMillis: 3000,
    });
    await pool.query("SELECT 1");
  } catch {
    t.skip("PostgreSQL test instance not reachable; skipping DB export test");
    return;
  }

  const testStoryId = "story-stress-db-001";

  try {
    // Clean prior test artifacts
    await pool.query(
      "DELETE FROM uvc_entities WHERE id = $1::text OR attributes->>'storyId' = $1::text",
      [testStoryId],
    );

    // Insert story entity
    await pool.query(
      `INSERT INTO uvc_entities (id, kind, title, summary, attributes)
       VALUES ($1::text, 'story', 'Crônicas Cósmicas de Severum', 'Sinopse rica do teste DB.', '{}'::jsonb)`,
      [testStoryId],
    );

    // Insert 3 chapters with specific writingOrder: 30, 10, 20
    // Chapter order must be resolved as: Ch10 (order 10), Ch20 (order 20), Ch30 (order 30)
    await pool.query(
      `INSERT INTO uvc_entities (id, kind, title, body, attributes)
       VALUES 
       ('doc-c30', 'document', 'Capítulo 3: O Desfecho', 'Texto do desfecho.', $1::jsonb),
       ('doc-c10', 'document', 'Capítulo 1: O Prelúdio', 'Primeiro parágrafo do prelúdio.\n\n* * *\n\nSegundo parágrafo.', $2::jsonb),
       ('doc-c20', 'document', 'Capítulo 2: O Meio TipTap', '', $3::jsonb),
       ('doc-ignored', 'document', 'Capítulo Ignorado Arquivo', 'Conteúdo cru', $4::jsonb)`,
      [
        JSON.stringify({ storyId: testStoryId, writingOrder: 30 }),
        JSON.stringify({ storyId: testStoryId, writingOrder: 10 }),
        JSON.stringify({
          storyId: testStoryId,
          writingOrder: 20,
          richText: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "Parágrafo do TipTap com " },
                  { type: "text", text: "marcação", marks: [{ type: "bold" }] },
                ],
              },
            ],
          },
        }),
        JSON.stringify({ storyId: testStoryId, sourceFileId: "raw-file-id" }), // Must be filtered out
      ],
    );

    // Export using the library export function
    // Temporarily set DATABASE_URL if not set
    const prevDbUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = testDatabaseUrl;

    const { buffer, filename } = await exportStoryToEpub(testStoryId);

    // Restore env
    if (prevDbUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = prevDbUrl;

    assert.ok(buffer.length > 3000, "Buffer should contain full EPUB package");
    assert.equal(filename, "cronicas-cosmicas-de-severum.epub");

    // Verify all XML files in archive
    await assertAllArchiveXmlValid(buffer, "Database-backed EPUB");

    // Inspect archive
    const inspection = await inspectEpub(buffer);
    assert.equal(inspection.metadata.title, "Crônicas Cósmicas de Severum");

    // Verify ordering: 3 chapters ordered by writingOrder
    const chapterManifests = inspection.manifestItems.filter((m) =>
      m.id.startsWith("item-chapter-"),
    );
    assert.equal(
      chapterManifests.length,
      3,
      "Must have exactly 3 chapters (raw file filtered)",
    );

    const zip = await JSZip.loadAsync(buffer);
    const ch0Content = await zip
      .file("OEBPS/chapter-00.xhtml")!
      .async("string");
    assert.ok(
      ch0Content.includes("Capítulo 1: O Prelúdio"),
      "First chapter must be Prelúdio",
    );

    const ch1Content = await zip
      .file("OEBPS/chapter-01.xhtml")!
      .async("string");
    assert.ok(
      ch1Content.includes("Capítulo 2: O Meio TipTap"),
      "Second chapter must be TipTap",
    );
    assert.ok(ch1Content.includes("<strong>marcação</strong>"));

    const ch2Content = await zip
      .file("OEBPS/chapter-02.xhtml")!
      .async("string");
    assert.ok(
      ch2Content.includes("Capítulo 3: O Desfecho"),
      "Third chapter must be Desfecho",
    );
  } finally {
    // Clean up
    await pool.query(
      "DELETE FROM uvc_entities WHERE id = $1::text OR attributes->>'storyId' = $1::text",
      [testStoryId],
    );
    await pool.end();
  }
});

test("Failure Modes: Empty IDs, Inexistent Stories, Stories without Chapters", async () => {
  // Empty story ID
  await assert.rejects(
    () => exportStoryToEpub(""),
    (err: unknown) =>
      err instanceof StoryNotFoundError &&
      err.message.includes("Identificador da história não informado"),
  );

  // Whitespace story ID
  await assert.rejects(
    () => exportStoryToEpub("   "),
    (err: unknown) =>
      err instanceof StoryNotFoundError &&
      err.message.includes("Identificador da história não informado"),
  );

  // Non-existent story ID
  await assert.rejects(
    () => exportStoryToEpub("story-fantasma-inexistente-12345"),
    (err: unknown) =>
      err instanceof StoryNotFoundError &&
      err.message.includes("História ou capítulos não encontrados"),
  );
});

// ============================================================================
// ADVERSARIAL HARDENING & DEFENSE VERIFICATION — CHALLENGER M5 ADV 1 & WORKER FIX
// ============================================================================

test("Adversarial Hardening: XML escaping of metadata.id with ampersands and brackets passes xmllint", async () => {
  const pkg: EpubPackageData = {
    metadata: {
      id: "uvc:story-livro & arte <vol-1>",
      title: "Livro & Arte",
      author: "Autor",
      publisher: "Editora",
      language: "pt-BR",
      date: "2026-10-31",
      modifiedDate: "2026-10-31T00:00:00Z",
    },
    chapters: [{ id: "c1", title: "C1", htmlBody: "<p>Text</p>", order: 0 }],
  };

  const buffer = await packageEpub(pkg);
  const zip = await JSZip.loadAsync(buffer);
  const opf = await zip.file("OEBPS/content.opf")!.async("string");
  const ncx = await zip.file("OEBPS/toc.ncx")!.async("string");

  // Verify proper XML escaping
  assert.ok(
    opf.includes(
      '<dc:identifier id="BookId">uvc:story-livro &amp; arte &lt;vol-1&gt;</dc:identifier>',
    ),
    "metadata.id with ampersand and brackets must be XML-escaped in content.opf",
  );
  assert.ok(
    ncx.includes(
      '<meta name="dtb:uid" content="uvc:story-livro &amp; arte &lt;vol-1&gt;"/>',
    ),
    "metadata.id with ampersand and brackets must be XML-escaped in toc.ncx",
  );

  // Validate entire archive against strict xmllint
  await assertAllArchiveXmlValid(
    buffer,
    "Hardened metadata.id with ampersands and brackets",
  );
});

test("Adversarial Hardening: XML escaping of metadata.language prevents attribute injection", async () => {
  const pkg: EpubPackageData = {
    metadata: {
      id: "urn:uuid:valid-id-001",
      title: "Title",
      author: "Author",
      publisher: "Publisher",
      language: 'pt-BR" xml:lang="en',
      date: "2026-10-31",
      modifiedDate: "2026-10-31T00:00:00Z",
    },
    chapters: [{ id: "c1", title: "C1", htmlBody: "<p>Text</p>", order: 0 }],
  };

  const buffer = await packageEpub(pkg);
  const zip = await JSZip.loadAsync(buffer);
  const opf = await zip.file("OEBPS/content.opf")!.async("string");
  const nav = await zip.file("OEBPS/nav.xhtml")!.async("string");
  const ch = await zip.file("OEBPS/c1.xhtml")!.async("string");

  // Verify proper attribute escaping: quotes become &quot;
  assert.ok(
    opf.includes('xml:lang="pt-BR&quot; xml:lang=&quot;en"'),
    "metadata.language with quotes must be escaped in content.opf package element",
  );
  assert.ok(
    opf.includes("<dc:language>pt-BR&quot; xml:lang=&quot;en</dc:language>"),
    "metadata.language must be escaped in dc:language element",
  );
  assert.ok(
    nav.includes('xml:lang="pt-BR&quot; xml:lang=&quot;en"'),
    "metadata.language must be escaped in nav.xhtml root",
  );
  assert.ok(
    ch.includes('xml:lang="pt-BR&quot; xml:lang=&quot;en"'),
    "metadata.language must be escaped in chapter.xhtml root",
  );

  // Validate entire archive against strict xmllint (no duplicate attribute errors)
  await assertAllArchiveXmlValid(
    buffer,
    "Hardened metadata.language with quotes",
  );
});

test("Adversarial Hardening: XML escaping of chapter IDs with quotes preserves attribute syntax", async () => {
  const pkg: EpubPackageData = {
    metadata: {
      id: "urn:uuid:valid-id-002",
      title: "Title",
      author: "Author",
      publisher: "Publisher",
      language: "pt-BR",
      date: "2026-10-31",
      modifiedDate: "2026-10-31T00:00:00Z",
    },
    chapters: [{ id: 'ch"1', title: "C1", htmlBody: "<p>Text</p>", order: 0 }],
  };

  const buffer = await packageEpub(pkg);
  const zip = await JSZip.loadAsync(buffer);
  const opf = await zip.file("OEBPS/content.opf")!.async("string");
  const ncx = await zip.file("OEBPS/toc.ncx")!.async("string");
  const nav = await zip.file("OEBPS/nav.xhtml")!.async("string");

  // Verify proper escaping in content.opf
  assert.ok(
    opf.includes(
      '<item id="item-ch&quot;1" href="ch&quot;1.xhtml" media-type="application/xhtml+xml"/>',
    ),
    "chapter.id with quote must be escaped in manifest item",
  );
  assert.ok(
    opf.includes('<itemref idref="item-ch&quot;1"/>'),
    "chapter.id with quote must be escaped in spine itemref",
  );
  assert.ok(
    opf.includes(
      '<reference type="text" title="Início da Leitura" href="ch&quot;1.xhtml"/>',
    ),
    "firstChapterFilename landmark must be escaped in guide",
  );

  // Verify proper escaping in toc.ncx
  assert.ok(
    ncx.includes('<navPoint id="np-ch&quot;1"'),
    "chapter.id with quote must be escaped in toc.ncx navPoint id",
  );
  assert.ok(
    ncx.includes('<content src="ch&quot;1.xhtml"/>'),
    "chapter.id with quote must be escaped in toc.ncx content src",
  );

  // Verify proper escaping in nav.xhtml
  assert.ok(
    nav.includes('<a href="ch&quot;1.xhtml">C1</a>'),
    "chapter.id with quote must be escaped in nav.xhtml TOC",
  );
  assert.ok(
    nav.includes(
      '<a epub:type="bodymatter" href="ch&quot;1.xhtml">Início da Leitura</a>',
    ),
    "chapter.id with quote must be escaped in nav.xhtml landmarks",
  );

  // Validate entire archive against strict xmllint
  await assertAllArchiveXmlValid(buffer, "Hardened chapter IDs with quotes");
});

test("Adversarial Hardening: Empty chapters array is rejected with StoryNotFoundError", async () => {
  const emptyChaptersPkg: EpubPackageData = {
    metadata: {
      id: "urn:uuid:empty-chapters-001",
      title: "Livro Sem Capítulos",
      author: "Author",
      publisher: "Publisher",
      language: "pt-BR",
      date: "2026-10-31",
      modifiedDate: "2026-10-31T00:00:00Z",
    },
    chapters: [],
  };

  await assert.rejects(
    async () => {
      await packageEpub(emptyChaptersPkg);
    },
    (err: unknown) => {
      assert.ok(err instanceof StoryNotFoundError);
      assert.equal(
        (err as StoryNotFoundError).message,
        "O livro deve conter ao menos um capítulo para exportação.",
      );
      return true;
    },
    "packageEpub must reject empty chapters with explicit StoryNotFoundError",
  );

  // Also verify null/undefined chapters defense if invoked with partial data
  await assert.rejects(
    async () => {
      await packageEpub({
        metadata: emptyChaptersPkg.metadata,
        chapters: null as unknown as [],
      });
    },
    (err: unknown) => {
      assert.ok(err instanceof StoryNotFoundError);
      return true;
    },
  );
});

test("Adversarial Writing Desk Helpers: wordCount boundaries, orderedDocuments cycle resilience, and doc fallback", () => {
  // 1. wordCount edge cases
  assert.equal(wordCount(""), 0, "Empty string has 0 words");
  assert.equal(wordCount("   \t\n  \r "), 0, "Whitespace only has 0 words");
  assert.equal(wordCount("Severum"), 1, "Single word");
  assert.equal(
    wordCount("Severum\u00A0e\u2003Glênia"),
    3,
    "Unicode non-breaking space and em-space count as separators",
  );
  assert.equal(
    wordCount("🪐 🚀 🌌 👨‍👩‍👧"),
    4,
    "Astral plane emojis and ZWJ sequences count as individual tokens",
  );

  // 2. orderedDocuments cycle resilience
  const cyclicEntities = [
    {
      id: "doc-alpha",
      kind: "document" as const,
      title: "Doc Alpha",
      body: "Corpo A",
      summary: "",
      status: "ready" as const,
      published: true,
      tags: [],
      version: 1,
      attributes: { writingParentId: "doc-beta", writingOrder: 1 },
    },
    {
      id: "doc-beta",
      kind: "document" as const,
      title: "Doc Beta",
      body: "Corpo B",
      summary: "",
      status: "ready" as const,
      published: true,
      tags: [],
      version: 1,
      attributes: { writingParentId: "doc-alpha", writingOrder: 2 },
    },
    {
      id: "doc-orphan",
      kind: "document" as const,
      title: "Doc Orphan",
      body: "Corpo Orphan",
      summary: "",
      status: "ready" as const,
      published: true,
      tags: [],
      version: 1,
      attributes: { writingParentId: "doc-non-existent", writingOrder: 3 },
    },
  ];

  const ordered = orderedDocuments(cyclicEntities);
  assert.equal(ordered.length, 3, "No documents lost in cyclical graph");
  assert.ok(
    ordered.every((o) => o.depth === 0),
    "Cyclic documents are cleanly surfaced at depth 0 without infinite recursion",
  );

  // 3. documentOrder tie-breaking
  const entity1 = {
    ...cyclicEntities[0],
    attributes: { writingOrder: "invalid" as unknown as number },
  };
  const entity2 = { ...cyclicEntities[1], attributes: { writingOrder: 10 } };
  assert.doesNotThrow(() => documentOrder(entity1, entity2));

  // 4. writingContent fallback
  const plainDoc = {
    ...cyclicEntities[0],
    body: "Linha 1\nLinha 2\n\nLinha 3",
    attributes: {},
  };
  const ast = writingContent(plainDoc);
  assert.equal(ast.type, "doc");
  assert.equal(ast.content?.length, 4);
});
