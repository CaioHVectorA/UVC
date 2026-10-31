import JSZip from "jszip";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import type { JSONContent } from "@tiptap/core";
import { databaseConfigured, db } from "./database";
import type { StudioEntity } from "./workspace";
import bookJson from "@/books/red-right-hand/book.json";

// ============================================================================
// Types & Contracts
// ============================================================================

export interface FrontMatterData {
  dedicatoria?: string;
  epigrafe?: string;
  fichaCatalografica?: string;
}

export interface EpubMetadata {
  id: string;
  title: string;
  subtitle?: string;
  author: string;
  publisher: string;
  language: string;
  synopsis?: string;
  genre?: string;
  isbn?: string;
  asin?: string;
  date: string;
  modifiedDate: string;
  frontMatter?: FrontMatterData;
  coverImage?: {
    buffer: Buffer;
    mediaType: "image/jpeg" | "image/png" | "image/webp";
  };
}

export interface EpubChapter {
  id: string;
  title: string;
  htmlBody: string;
  order: number;
}

export interface EpubPackageData {
  metadata: EpubMetadata;
  chapters: EpubChapter[];
}

export class StoryNotFoundError extends Error {
  constructor(message = "História ou capítulos não encontrados.") {
    super(message);
    this.name = "StoryNotFoundError";
  }
}

// ============================================================================
// Utility & Formatting Helpers
// ============================================================================

export function escapeXml(unsafe: string): string {
  if (!unsafe) return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function slugify(text: string): string {
  return (
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "livro"
  );
}

// ============================================================================
// TipTap & Markdown XHTML Converters
// ============================================================================

export function tipTapNodeToXhtml(node: JSONContent): string {
  if (!node) return "";
  if (node.type === "text") {
    let text = escapeXml(node.text ?? "");
    if (node.marks) {
      for (const mark of node.marks) {
        if (mark.type === "bold") text = `<strong>${text}</strong>`;
        else if (mark.type === "italic") text = `<em>${text}</em>`;
        else if (mark.type === "underline") text = `<u>${text}</u>`;
        else if (mark.type === "strike") text = `<s>${text}</s>`;
        else if (mark.type === "link" && mark.attrs?.href) {
          const href = escapeXml(String(mark.attrs.href));
          text = `<a href="${href}">${text}</a>`;
        } else if (mark.type === "sup" || mark.type === "superscript") {
          text = `<sup>${text}</sup>`;
        } else if (mark.type === "sub" || mark.type === "subscript") {
          text = `<sub>${text}</sub>`;
        }
      }
    }
    return text;
  }
  if (node.type === "hardBreak") return "<br />";
  if (node.type === "horizontalRule") return '<hr class="scene-break" />';

  const inner = (node.content ?? []).map(tipTapNodeToXhtml).join("");

  switch (node.type) {
    case "paragraph":
      return inner.trim() ? `<p>${inner}</p>` : "<p><br /></p>";
    case "heading": {
      const level = Math.min(Math.max(Number(node.attrs?.level) || 1, 1), 6);
      return `<h${level}>${inner}</h${level}>`;
    }
    case "blockquote":
      return `<blockquote>${inner}</blockquote>`;
    case "bulletList":
      return `<ul>${inner}</ul>`;
    case "orderedList": {
      const start = Number(node.attrs?.start);
      return `<ol${start && start > 1 ? ` start="${start}"` : ""}>${inner}</ol>`;
    }
    case "listItem":
      return `<li>${inner}</li>`;
    case "doc":
      return inner;
    default:
      return inner;
  }
}

export function markdownToXhtml(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  const out: string[] = [];
  let inList: "ul" | "ol" | null = null;
  let inBlockquote = false;
  let quoteBuffer: string[] = [];

  const flushQuote = () => {
    if (inBlockquote) {
      out.push(`<blockquote><p>${quoteBuffer.join(" ")}</p></blockquote>`);
      quoteBuffer = [];
      inBlockquote = false;
    }
  };

  const flushList = () => {
    if (inList) {
      out.push(inList === "ul" ? "</ul>" : "</ol>");
      inList = null;
    }
  };

  const formatInline = (text: string): string => {
    let s = escapeXml(text);
    s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/__(.+?)__/g, "<strong>$1</strong>");
    s = s.replace(/\*(.+?)\*/g, "<em>$1</em>");
    s = s.replace(/_(.+?)_/g, "<em>$1</em>");
    s = s.replace(/~~(.+?)~~/g, "<s>$1</s>");
    return s;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushQuote();
      flushList();
      continue;
    }

    if (/^(\*{3,}|-{3,}|(\*\s*){3,})$/.test(line)) {
      flushQuote();
      flushList();
      out.push('<hr class="scene-break" />');
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushQuote();
      flushList();
      const level = headingMatch[1].length;
      out.push(`<h${level}>${formatInline(headingMatch[2])}</h${level}>`);
      continue;
    }

    if (line.startsWith(">")) {
      flushList();
      inBlockquote = true;
      quoteBuffer.push(formatInline(line.replace(/^>\s*/, "")));
      continue;
    } else {
      flushQuote();
    }

    const ulMatch = line.match(/^[-*]\s+(.*)$/);
    if (ulMatch) {
      if (inList !== "ul") {
        flushList();
        inList = "ul";
        out.push("<ul>");
      }
      out.push(`<li>${formatInline(ulMatch[1])}</li>`);
      continue;
    }

    const olMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (olMatch) {
      if (inList !== "ol") {
        flushList();
        inList = "ol";
        out.push("<ol>");
      }
      out.push(`<li>${formatInline(olMatch[2])}</li>`);
      continue;
    }

    flushList();
    out.push(`<p>${formatInline(line)}</p>`);
  }

  flushQuote();
  flushList();
  return out.join("\n");
}

export function entityToXhtmlBody(entity: StudioEntity): string {
  const rich = entity.attributes?.richText as JSONContent | undefined;
  if (
    rich &&
    typeof rich === "object" &&
    rich.type === "doc" &&
    Array.isArray(rich.content)
  ) {
    return tipTapNodeToXhtml(rich);
  }
  if (entity.body && entity.body.trim()) {
    return markdownToXhtml(entity.body);
  }
  return "<p></p>";
}

// ============================================================================
// Stylesheet Generator (Kindle Create / KDP Compliant)
// ============================================================================

export function generateStylesCss(): string {
  return `@charset "utf-8";

/* ==========================================================================
   UVC Studio Publishing Engine — KDP & Kindle Create Compliant Stylesheet
   Rules: Relative typography (rem/em), no imports, no position:fixed.
   ========================================================================== */

html, body {
  margin: 0;
  padding: 0;
  font-family: serif;
  font-size: 1rem;
  line-height: 1.6;
  color: #1a1a1a;
  background-color: #ffffff;
}

body {
  padding: 0 5%;
}

h1, h2, h3, h4, h5, h6 {
  font-family: sans-serif;
  line-height: 1.25;
  color: #111111;
  page-break-after: avoid;
  break-after: avoid;
}

h1.chapter-title {
  font-size: 1.85em;
  text-align: center;
  margin-top: 3em;
  margin-bottom: 2em;
  page-break-before: always;
  break-before: page;
}

h2 {
  font-size: 1.4em;
  margin-top: 1.5em;
  margin-bottom: 0.75em;
}

h3 {
  font-size: 1.15em;
  margin-top: 1.2em;
  margin-bottom: 0.5em;
}

p {
  margin: 0;
  padding: 0;
  text-indent: 1.5em;
  text-align: justify;
}

h1 + p,
h2 + p,
h3 + p,
h4 + p,
hr + p,
.scene-break + p,
p.no-indent,
section > p:first-of-type {
  text-indent: 0;
}

blockquote {
  margin: 1.25em 2em;
  padding: 0.25em 0.75em;
  border-left: 2px solid #555555;
  font-style: italic;
}

blockquote p {
  text-indent: 0;
}

ul, ol {
  margin: 1em 0;
  padding-left: 2em;
}

li {
  margin-bottom: 0.35em;
}

hr.scene-break {
  border: 0;
  height: 1px;
  text-align: center;
  margin: 2em auto;
  page-break-inside: avoid;
  break-inside: avoid;
}

hr.scene-break:before {
  content: "*  *  *";
  display: inline-block;
  font-size: 1.1em;
  letter-spacing: 0.3em;
  color: #444444;
}

.cover-body {
  margin: 0;
  padding: 0;
  text-align: center;
}

.cover-image {
  max-width: 100%;
  height: auto;
  margin: 0 auto;
  display: block;
}

.title-page-container {
  text-align: center;
  margin-top: 4em;
}

.book-title {
  font-size: 2.2em;
  margin-bottom: 0.3em;
}

.book-subtitle {
  font-size: 1.3em;
  font-weight: normal;
  color: #444444;
  margin-bottom: 2em;
}

.book-author {
  font-size: 1.2em;
  font-style: italic;
  margin-bottom: 3em;
}

.book-publisher {
  font-size: 0.95em;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #666666;
  margin-top: 5em;
}

.frontmatter-container {
  margin-top: 3em;
}

.dedication-text {
  font-style: italic;
  text-align: center;
  margin-top: 4em;
  margin-bottom: 4em;
  text-indent: 0;
}

.epigraph-box {
  margin-top: 4em;
  margin-bottom: 4em;
  text-align: center;
}

.epigraph-text {
  font-style: italic;
  text-indent: 0;
  margin-bottom: 0.5em;
}

.catalog-box {
  border: 1px solid #777777;
  padding: 1em;
  margin-top: 5em;
  font-size: 0.8em;
  line-height: 1.4;
  font-family: monospace, serif;
  text-indent: 0;
}

.catalog-title {
  font-weight: bold;
  margin-bottom: 0.5em;
  text-indent: 0;
}

nav ol {
  list-style-type: none;
  padding-left: 0;
}

nav li {
  margin-bottom: 0.6em;
}

nav a {
  text-decoration: none;
  color: inherit;
}
`;
}

// ============================================================================
// OCF Packaging Core (JSZip Assembly)
// ============================================================================

export async function packageEpub(data: EpubPackageData): Promise<Buffer> {
  const { metadata, chapters } = data;
  if (!chapters || chapters.length === 0) {
    throw new StoryNotFoundError(
      "O livro deve conter ao menos um capítulo para exportação.",
    );
  }
  const zip = new JSZip();

  // 1. Mandatory mimetype entry at offset 0, uncompressed (STORE)
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

  // 2. META-INF/container.xml
  const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
  zip.file("META-INF/container.xml", containerXml);

  // 3. OEBPS/styles.css
  zip.file("OEBPS/styles.css", generateStylesCss());

  // 4. Cover Image (if available)
  const hasCoverImage = Boolean(metadata.coverImage?.buffer);
  const coverExt =
    metadata.coverImage?.mediaType === "image/png"
      ? "png"
      : metadata.coverImage?.mediaType === "image/webp"
        ? "webp"
        : "jpg";
  const coverImageFilename = `cover.${coverExt}`;

  if (hasCoverImage && metadata.coverImage) {
    zip.file(`OEBPS/${coverImageFilename}`, metadata.coverImage.buffer);
  }

  // 5. OEBPS/cover.xhtml
  const coverXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${escapeXml(metadata.language)}" lang="${escapeXml(metadata.language)}">
<head>
  <meta charset="utf-8"/>
  <title>Capa</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body class="cover-body">
  <section epub:type="cover" class="cover-container">
    ${
      hasCoverImage
        ? `<img src="${coverImageFilename}" alt="Capa: ${escapeXml(metadata.title)}" class="cover-image"/>`
        : `<div class="title-page-container">
      <h1 class="book-title">${escapeXml(metadata.title)}</h1>
      ${metadata.subtitle ? `<h2 class="book-subtitle">${escapeXml(metadata.subtitle)}</h2>` : ""}
      <p class="book-author">${escapeXml(metadata.author)}</p>
      <p class="book-publisher">${escapeXml(metadata.publisher)}</p>
    </div>`
    }
  </section>
</body>
</html>`;
  zip.file("OEBPS/cover.xhtml", coverXhtml);

  // 6. OEBPS/titlepage.xhtml
  const titlepageXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${escapeXml(metadata.language)}" lang="${escapeXml(metadata.language)}">
<head>
  <meta charset="utf-8"/>
  <title>Folha de Rosto</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <section epub:type="titlepage" class="title-page-container">
    <h1 class="book-title">${escapeXml(metadata.title)}</h1>
    ${metadata.subtitle ? `<h2 class="book-subtitle">${escapeXml(metadata.subtitle)}</h2>` : ""}
    <p class="book-author">${escapeXml(metadata.author)}</p>
    <div class="book-publisher">
      <p>${escapeXml(metadata.publisher)}</p>
      <p>${metadata.date.slice(0, 4)}</p>
    </div>
  </section>
</body>
</html>`;
  zip.file("OEBPS/titlepage.xhtml", titlepageXhtml);

  // 7. OEBPS/frontmatter.xhtml (Optional)
  const hasFrontMatter = Boolean(
    metadata.frontMatter?.dedicatoria ||
    metadata.frontMatter?.epigrafe ||
    metadata.frontMatter?.fichaCatalografica,
  );
  if (hasFrontMatter) {
    const fm = metadata.frontMatter!;
    const frontmatterXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${escapeXml(metadata.language)}" lang="${escapeXml(metadata.language)}">
<head>
  <meta charset="utf-8"/>
  <title>Abertura</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <section epub:type="frontmatter" class="frontmatter-container">
    ${
      fm.dedicatoria
        ? `<div class="dedication-block"><p class="dedication-text">${escapeXml(fm.dedicatoria)}</p></div>`
        : ""
    }
    ${
      fm.epigrafe
        ? `<div class="epigraph-box"><p class="epigraph-text">${escapeXml(fm.epigrafe)}</p></div>`
        : ""
    }
    ${
      fm.fichaCatalografica
        ? `<div class="catalog-box"><p class="catalog-title">Dados Internacionais de Catalogação na Publicação (CIP)</p><p>${escapeXml(fm.fichaCatalografica).replace(/\n/g, "<br />")}</p></div>`
        : ""
    }
  </section>
</body>
</html>`;
    zip.file("OEBPS/frontmatter.xhtml", frontmatterXhtml);
  }

  // 8. OEBPS Chapter Files
  for (const ch of chapters) {
    const filename = `${ch.id}.xhtml`;
    const chapterXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${escapeXml(metadata.language)}" lang="${escapeXml(metadata.language)}">
<head>
  <meta charset="utf-8"/>
  <title>${escapeXml(ch.title)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body class="chapter-body">
  <section epub:type="chapter" role="doc-chapter">
    <h1 class="chapter-title">${escapeXml(ch.title)}</h1>
    ${ch.htmlBody}
  </section>
</body>
</html>`;
    zip.file(`OEBPS/${filename}`, chapterXhtml);
  }

  // 9. OEBPS/nav.xhtml (EPUB 3 Navigation Document)
  const firstChapterFilename = `${escapeXml(chapters[0].id)}.xhtml`;
  const navXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${escapeXml(metadata.language)}" lang="${escapeXml(metadata.language)}">
<head>
  <meta charset="utf-8"/>
  <title>Sumário</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body class="nav-document">
  <nav epub:type="toc" id="toc">
    <h1>Sumário</h1>
    <ol>
      <li><a href="titlepage.xhtml">Folha de Rosto</a></li>
      ${hasFrontMatter ? `<li><a href="frontmatter.xhtml">Abertura</a></li>` : ""}
      ${chapters.map((c) => `<li><a href="${escapeXml(c.id)}.xhtml">${escapeXml(c.title)}</a></li>`).join("\n      ")}
    </ol>
  </nav>
  <nav epub:type="landmarks" id="landmarks" hidden="hidden">
    <h2>Marcos</h2>
    <ol>
      <li><a epub:type="cover" href="cover.xhtml">Capa</a></li>
      <li><a epub:type="toc" href="nav.xhtml">Sumário</a></li>
      <li><a epub:type="bodymatter" href="${firstChapterFilename}">Início da Leitura</a></li>
    </ol>
  </nav>
</body>
</html>`;
  zip.file("OEBPS/nav.xhtml", navXhtml);

  // 10. OEBPS/toc.ncx (EPUB 2 NCX Fallback for Kindle Create Auto-Detection)
  let playOrder = 1;
  const navPoints: string[] = [];
  navPoints.push(`    <navPoint id="np-cover" playOrder="${playOrder++}">
      <navLabel><text>Capa</text></navLabel>
      <content src="cover.xhtml"/>
    </navPoint>`);
  navPoints.push(`    <navPoint id="np-title" playOrder="${playOrder++}">
      <navLabel><text>Folha de Rosto</text></navLabel>
      <content src="titlepage.xhtml"/>
    </navPoint>`);
  if (hasFrontMatter) {
    navPoints.push(`    <navPoint id="np-frontmatter" playOrder="${playOrder++}">
      <navLabel><text>Abertura</text></navLabel>
      <content src="frontmatter.xhtml"/>
    </navPoint>`);
  }
  navPoints.push(`    <navPoint id="np-nav" playOrder="${playOrder++}">
      <navLabel><text>Sumário</text></navLabel>
      <content src="nav.xhtml"/>
    </navPoint>`);
  for (const ch of chapters) {
    navPoints.push(`    <navPoint id="np-${escapeXml(ch.id)}" playOrder="${playOrder++}">
      <navLabel><text>${escapeXml(ch.title)}</text></navLabel>
      <content src="${escapeXml(ch.id)}.xhtml"/>
    </navPoint>`);
  }

  const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${escapeXml(metadata.id)}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle>
    <text>${escapeXml(metadata.title)}</text>
  </docTitle>
  <docAuthor>
    <text>${escapeXml(metadata.author)}</text>
  </docAuthor>
  <navMap>
${navPoints.join("\n")}
  </navMap>
</ncx>`;
  zip.file("OEBPS/toc.ncx", tocNcx);

  // 11. OEBPS/content.opf (Package Document with Dublin Core & Amazon Guide)
  const manifestItems: string[] = [
    `<item id="styles" href="styles.css" media-type="text/css"/>`,
    `<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`,
    `<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>`,
    `<item id="cover-page" href="cover.xhtml" media-type="application/xhtml+xml"/>`,
    `<item id="title-page" href="titlepage.xhtml" media-type="application/xhtml+xml"/>`,
  ];

  if (hasFrontMatter) {
    manifestItems.push(
      `<item id="front-matter" href="frontmatter.xhtml" media-type="application/xhtml+xml"/>`,
    );
  }

  if (hasCoverImage) {
    manifestItems.push(
      `<item id="cover-image" href="${coverImageFilename}" media-type="${metadata.coverImage!.mediaType}" properties="cover-image"/>`,
    );
  }

  for (const ch of chapters) {
    manifestItems.push(
      `<item id="item-${escapeXml(ch.id)}" href="${escapeXml(ch.id)}.xhtml" media-type="application/xhtml+xml"/>`,
    );
  }

  const spineItems: string[] = [
    `<itemref idref="cover-page"/>`,
    `<itemref idref="title-page"/>`,
  ];

  if (hasFrontMatter) {
    spineItems.push(`<itemref idref="front-matter"/>`);
  }

  spineItems.push(`<itemref idref="nav"/>`);

  for (const ch of chapters) {
    spineItems.push(`<itemref idref="item-${escapeXml(ch.id)}"/>`);
  }

  const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookId" xml:lang="${escapeXml(metadata.language)}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="BookId">${escapeXml(metadata.id)}</dc:identifier>
    <dc:title>${escapeXml(metadata.title)}</dc:title>
    <dc:language>${escapeXml(metadata.language)}</dc:language>
    <dc:creator id="creator">${escapeXml(metadata.author)}</dc:creator>
    <meta refines="#creator" property="role" scheme="marc:relators">aut</meta>
    <dc:publisher>${escapeXml(metadata.publisher)}</dc:publisher>
    <dc:date>${metadata.date}</dc:date>
    <meta property="dcterms:modified">${metadata.modifiedDate}</meta>
    ${hasCoverImage ? `<meta name="cover" content="cover-image"/>` : ""}
    ${metadata.synopsis ? `<dc:description>${escapeXml(metadata.synopsis)}</dc:description>` : ""}
  </metadata>
  <manifest>
    ${manifestItems.join("\n    ")}
  </manifest>
  <spine toc="ncx">
    ${spineItems.join("\n    ")}
  </spine>
  <guide>
    <reference type="cover" title="Capa" href="cover.xhtml"/>
    <reference type="toc" title="Sumário" href="nav.xhtml"/>
    <reference type="text" title="Início da Leitura" href="${firstChapterFilename}"/>
  </guide>
</package>`;
  zip.file("OEBPS/content.opf", contentOpf);

  // 12. Generate Buffer with DEFLATE for all entries except uncompressed mimetype
  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
  });
}

// ============================================================================
// Story Resolution & Export API
// ============================================================================

export async function resolveStoryForExport(
  storyId: string,
): Promise<EpubPackageData> {
  const normId = storyId.trim().toLowerCase();
  const isCanonRedRightHand =
    normId === "rrh-1" ||
    normId === "red-right-hand" ||
    normId === "story-red-right-hand";

  let coverImageBuffer: Buffer | undefined;
  const coverPath = path.resolve(
    process.cwd(),
    "public/covers/rrh-ascensao.jpg",
  );
  if (isCanonRedRightHand && existsSync(coverPath)) {
    try {
      coverImageBuffer = await readFile(coverPath);
    } catch {
      // Graceful fallback
    }
  }

  // Check database first if configured
  if (databaseConfigured()) {
    try {
      const storyRes = await db().query(
        "SELECT * FROM uvc_entities WHERE (id = $1 OR id = $2) AND kind = 'story' AND NOT archived",
        [storyId, `story-${storyId}`],
      );
      const storyRow = storyRes.rows[0];

      const chapterRes = await db().query(
        `SELECT * FROM uvc_entities 
         WHERE kind = 'document' 
           AND NOT archived 
           AND (attributes->>'storyId' = $1 OR attributes->>'storyId' = $2)
         ORDER BY COALESCE((attributes->>'writingOrder')::numeric, (attributes->>'order')::numeric, 0) ASC, title ASC`,
        [storyId, `story-${storyId}`],
      );

      const dbChapters = chapterRes.rows.filter(
        (r) => !r.attributes?.sourceFileId,
      );

      if (dbChapters.length > 0) {
        const title =
          storyRow?.title ||
          (isCanonRedRightHand ? bookJson.titulo : "Manuscrito UVC");
        const subtitle = isCanonRedRightHand ? bookJson.subtitulo : "";
        const author = isCanonRedRightHand
          ? bookJson.autor
          : "Autor do Universo Virtual de Caio";

        const chapters: EpubChapter[] = dbChapters.map((row, idx) => ({
          id: `chapter-${String(idx).padStart(2, "0")}`,
          title: row.title || `Capítulo ${idx + 1}`,
          htmlBody: entityToXhtmlBody(row),
          order: idx,
        }));

        return {
          metadata: {
            id: `uvc:story-${storyRow?.id || normId}`,
            title,
            subtitle,
            author,
            publisher: "UVC Publicações",
            language: "pt-BR",
            synopsis: storyRow?.summary || "",
            date: new Date().toISOString().slice(0, 10),
            modifiedDate: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
            coverImage: coverImageBuffer
              ? { buffer: coverImageBuffer, mediaType: "image/jpeg" }
              : undefined,
            frontMatter: isCanonRedRightHand ? bookJson.frontMatter : undefined,
          },
          chapters,
        };
      }
    } catch {
      // Continue to filesystem fallback
    }
  }

  // Canonical Filesystem Fallback
  if (isCanonRedRightHand) {
    const chapters: EpubChapter[] = [];
    const root = path.resolve(process.cwd(), "books/red-right-hand");

    for (const ch of bookJson.capitulos) {
      const fullPath = path.resolve(root, ch.arquivo);
      if (!fullPath.startsWith(root + path.sep)) continue;
      if (existsSync(fullPath)) {
        const markdown = await readFile(fullPath, "utf8");
        chapters.push({
          id: `chapter-${String(ch.numero).padStart(2, "0")}`,
          title: `Capítulo ${String(ch.numero).padStart(2, "0")}: ${ch.titulo}`,
          htmlBody: markdownToXhtml(markdown),
          order: ch.numero,
        });
      }
    }

    if (chapters.length > 0) {
      return {
        metadata: {
          id: `uvc:book-${bookJson.id}`,
          title: bookJson.titulo,
          subtitle: bookJson.subtitulo,
          author: bookJson.autor,
          publisher: bookJson.editora,
          language: bookJson.idioma,
          synopsis: bookJson.sinopse,
          genre: bookJson.genero,
          isbn: bookJson.isbn,
          asin: bookJson.asin,
          date: new Date().toISOString().slice(0, 10),
          modifiedDate: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
          coverImage: coverImageBuffer
            ? { buffer: coverImageBuffer, mediaType: "image/jpeg" }
            : undefined,
          frontMatter: bookJson.frontMatter,
        },
        chapters,
      };
    }
  }

  throw new StoryNotFoundError(
    `História ou capítulos não encontrados para '${storyId}'.`,
  );
}

export async function exportStoryToEpub(
  storyId: string,
): Promise<{ buffer: Buffer; filename: string }> {
  if (!storyId || !storyId.trim()) {
    throw new StoryNotFoundError("Identificador da história não informado.");
  }
  const data = await resolveStoryForExport(storyId);
  const buffer = await packageEpub(data);
  const filename = `${slugify(data.metadata.title)}${data.metadata.subtitle ? `-${slugify(data.metadata.subtitle)}` : ""}.epub`;
  return { buffer, filename };
}
