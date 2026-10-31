import mammoth from "mammoth";
import { parseDocument } from "htmlparser2";
import { isTag, isText, type ChildNode, type Element } from "domhandler";
import yauzl from "yauzl";
import { createHash, randomUUID } from "node:crypto";
import type { JSONContent } from "@tiptap/core";
import {
  ensureDatabase,
  insertEntity,
  transaction,
  InvalidReferenceError,
} from "./database";
import { wordCount } from "./writing";
import type { DocxPreview, DocxSplit } from "./docx-contract";
import type { StudioEntity } from "./workspace";

export class DocxImportError extends Error {}
const fail = (message: string): never => {
  throw new DocxImportError(message);
};
const maxExpanded = 24 * 1024 * 1024;

// Stream every entry before conversion: size metadata alone is not a ZIP limit.
async function checkPackage(bytes: Buffer) {
  return new Promise<{
    comments: boolean;
    changes: boolean;
    headers: boolean;
    images: boolean;
    footnotes: boolean;
  }>((resolve, reject) => {
    yauzl.fromBuffer(
      bytes,
      { lazyEntries: true, validateEntrySizes: true, strictFileNames: true },
      (error, zip) => {
        if (error || !zip) {
          reject(
            new DocxImportError(
              "O arquivo não é um DOCX válido. Exporte novamente como Microsoft Word (.docx).",
            ),
          );
          return;
        }
        let total = 0,
          count = 0,
          done = false,
          main = "";
        const names = new Set<string>();
        const stop = (e: Error) => {
          if (done) return;
          done = true;
          zip.close();
          reject(e);
        };
        zip.on("error", () =>
          stop(
            new DocxImportError(
              "O DOCX está corrompido ou protegido por senha.",
            ),
          ),
        );
        zip.on("end", () => {
          if (done) return;
          done = true;
          if (
            !names.has("word/document.xml") ||
            !names.has("[Content_Types].xml")
          ) {
            reject(
              new DocxImportError(
                "O arquivo não contém um documento Word válido.",
              ),
            );
            return;
          }
          resolve({
            comments: [...names].some((n) => /^word\/comments/.test(n)),
            changes: /<w:(?:ins|del)\b/.test(main),
            images: [...names].some((n) => n.startsWith("word/media/")),
            footnotes:
              names.has("word/footnotes.xml") || names.has("word/endnotes.xml"),
            headers: [...names].some((n) =>
              /^word\/(?:header|footer)\d*\.xml$/.test(n),
            ),
          });
        });
        zip.on("entry", (entry: yauzl.Entry) => {
          if (done) return;
          if (
            ++count > 1000 ||
            entry.uncompressedSize > 12 * 1024 * 1024 ||
            entry.generalPurposeBitFlag & 1 ||
            names.has(entry.fileName) ||
            /vbaProject\.bin$/i.test(entry.fileName)
          ) {
            stop(
              new DocxImportError(
                "O DOCX excede os limites de importação ou contém conteúdo incompatível.",
              ),
            );
            return;
          }
          names.add(entry.fileName);
          if (entry.fileName.endsWith("/")) {
            zip.readEntry();
            return;
          }
          zip.openReadStream(entry, (err, stream) => {
            if (err || !stream) {
              stop(new DocxImportError("Não foi possível ler o DOCX."));
              return;
            }
            let size = 0;
            const chunks: Buffer[] = [];
            stream.on("data", (chunk: Buffer) => {
              size += chunk.length;
              total += chunk.length;
              if (size > 12 * 1024 * 1024 || total > maxExpanded) {
                stream.destroy();
                stop(
                  new DocxImportError(
                    "O conteúdo descompactado ultrapassa o limite de 24 MB.",
                  ),
                );
                return;
              }
              if (/\.(xml|rels)$/i.test(entry.fileName)) chunks.push(chunk);
            });
            stream.on("error", () =>
              stop(
                new DocxImportError(
                  "O DOCX está corrompido ou ultrapassa os limites de importação.",
                ),
              ),
            );
            stream.on("end", () => {
              if (done) return;
              if (chunks.length) {
                const xml = Buffer.concat(chunks).toString("utf8");
                if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(xml)) {
                  stop(
                    new DocxImportError(
                      "O DOCX contém declarações XML incompatíveis.",
                    ),
                  );
                  return;
                }
                if (entry.fileName === "word/document.xml") main = xml;
              }
              zip.readEntry();
            });
          });
        });
        zip.readEntry();
      },
    );
  });
}

type Mark = { type: string; attrs?: Record<string, unknown> };
const paragraph = (content: JSONContent[] = []): JSONContent => ({
  type: "paragraph",
  ...(content.length ? { content } : {}),
});
function isSceneBreakText(text: string): boolean {
  return /^(\*{3,}|\*(\s*\*\s*){2,}|-{3,}|—{3,}|(—\s*){2,}—)$/.test(
    text.trim(),
  );
}
function inline(
  nodes: ChildNode[],
  marks: Mark[] = [],
  depth = 0,
): JSONContent[] {
  if (depth > 50) fail("O documento contém uma estrutura muito profunda.");
  return nodes.flatMap((node) => {
    if (isText(node))
      return node.data
        ? [
            {
              type: "text",
              text: node.data,
              ...(marks.length ? { marks } : {}),
            },
          ]
        : [];
    if (
      !isTag(node) ||
      ["script", "style", "iframe", "object"].includes(node.name)
    )
      return [];
    if (node.name === "br") return [{ type: "hardBreak" }];
    if (node.name === "img") return [];
    const mapped = (
      {
        strong: "bold",
        b: "bold",
        em: "italic",
        i: "italic",
        u: "underline",
        s: "strike",
        del: "strike",
        sup: "superscript",
        sub: "subscript",
      } as Record<string, string>
    )[node.name];
    const next = [...marks];
    if (mapped && !next.some((m) => m.type === mapped))
      next.push({ type: mapped });
    if (
      node.name === "a" &&
      (node.attribs.href?.length ?? 0) <= 4096 &&
      /^(https?:\/\/|mailto:|#)/i.test(node.attribs.href ?? "")
    ) {
      const isInternal = (node.attribs.href ?? "").startsWith("#");
      next.push({
        type: "link",
        attrs: {
          href: node.attribs.href,
          ...(isInternal
            ? {}
            : { target: "_blank", rel: "noopener noreferrer" }),
        },
      });
    }
    return inline(node.children, next, depth + 1);
  });
}
function blocks(
  nodes: ChildNode[],
  warnings: Set<string>,
  depth = 0,
): JSONContent[] {
  if (depth > 40) fail("O documento contém uma estrutura muito profunda.");
  const out: JSONContent[] = [];
  for (const node of nodes) {
    if (isText(node)) {
      if (node.data.trim())
        out.push(paragraph([{ type: "text", text: node.data }]));
      continue;
    }
    if (!isTag(node)) continue;
    if (["script", "style", "iframe", "object"].includes(node.name)) continue;
    if (node.name === "img") {
      warnings.add(
        "Imagens permanecem no DOCX original e não são inseridas no editor nesta importação.",
      );
      continue;
    }
    if (node.name === "hr") {
      out.push({ type: "horizontalRule" });
      continue;
    }
    if (node.name === "p" || /^h[1-6]$/.test(node.name)) {
      if (node.children.some((c) => isTag(c) && c.name === "img"))
        warnings.add(
          "Imagens permanecem no DOCX original e não são inseridas no editor nesta importação.",
        );
      if (
        node.name === "p" &&
        node.children.some((c) => isTag(c) && c.name === "hr")
      ) {
        out.push({ type: "horizontalRule" });
        continue;
      }
      const content = inline(node.children);
      if (
        node.name === "p" &&
        content.length === 1 &&
        content[0].type === "text" &&
        content[0].text &&
        isSceneBreakText(content[0].text)
      ) {
        out.push({ type: "horizontalRule" });
        continue;
      }
      out.push(
        node.name === "p"
          ? paragraph(content)
          : {
              type: "heading",
              attrs: { level: Math.min(3, Number(node.name[1])) },
              ...(content.length ? { content } : {}),
            },
      );
      continue;
    }
    if (node.name === "ul" || node.name === "ol") {
      const items = node.children
        .filter((c): c is Element => isTag(c) && c.name === "li")
        .map((li) => {
          const content = blocks(li.children, warnings, depth + 1);
          if (content[0]?.type !== "paragraph") content.unshift(paragraph());
          return { type: "listItem", content };
        });
      if (items.length)
        out.push({
          type: node.name === "ul" ? "bulletList" : "orderedList",
          ...(node.name === "ol"
            ? { attrs: { start: Number(node.attribs.start) || 1 } }
            : {}),
          content: items,
        });
      continue;
    }
    if (node.name === "blockquote") {
      out.push({
        type: "blockquote",
        content: blocks(node.children, warnings, depth + 1),
      });
      continue;
    }
    if (node.name === "table") {
      warnings.add(
        "Tabelas foram convertidas em parágrafos, preservando o texto das células. O layout da tabela permanece no original.",
      );
      const rows = (children: ChildNode[]): Element[] =>
        children.flatMap((c) =>
          !isTag(c) ? [] : c.name === "tr" ? [c] : rows(c.children),
        );
      for (const row of rows(node.children))
        for (const cell of row.children.filter(
          (c): c is Element => isTag(c) && ["td", "th"].includes(c.name),
        ))
          out.push(...blocks(cell.children, warnings, depth + 1));
      continue;
    }
    out.push(...blocks(node.children, warnings, depth + 1));
  }
  return out;
}
export function docxPlain(node: JSONContent): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  if (node.type === "horizontalRule") return "\n* * *\n";
  return (node.content ?? [])
    .map(docxPlain)
    .join(["paragraph", "heading"].includes(node.type ?? "") ? "" : "\n");
}
export function splitDocx(rich: JSONContent, title: string, split: DocxSplit) {
  if (split === "none")
    return [{ title, richText: rich, body: docxPlain(rich) }];
  const level = split === "h1" ? 1 : 2,
    result: { title: string; richText: JSONContent; body: string }[] = [];
  let chunk: JSONContent[] = [],
    name = "Texto de abertura";
  const flush = () => {
    if (chunk.length && docxPlain({ type: "doc", content: chunk }).trim()) {
      const richText = { type: "doc", content: chunk };
      result.push({ title: name, richText, body: docxPlain(richText) });
    }
    chunk = [];
  };
  for (const node of rich.content ?? []) {
    if (node.type === "heading" && node.attrs?.level === level) {
      flush();
      name = docxPlain(node).trim().slice(0, 200) || "Capítulo sem título";
    }
    chunk.push(node);
  }
  flush();
  return result;
}
export async function parseDocx(file: { name: string; bytes: Uint8Array }) {
  if (
    !/\.docx$/i.test(file.name) ||
    !file.bytes.length ||
    file.bytes.length > 4 * 1024 * 1024
  )
    fail("Selecione um arquivo .docx de até 4 MB.");
  const bytes = Buffer.from(file.bytes),
    info = await checkPackage(bytes),
    warnings = new Set<string>();
  const html = await mammoth
    .convertToHtml(
      { buffer: bytes },
      {
        externalFileAccess: false,
        includeEmbeddedStyleMap: false,
        ignoreEmptyParagraphs: false,
        styleMap: [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='heading 1'] => h1:fresh",
          "p[style-name='Título 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='heading 2'] => h2:fresh",
          "p[style-name='Título 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "p[style-name='heading 3'] => h3:fresh",
          "p[style-name='Título 3'] => h3:fresh",
          "p[style-name='Title'] => p.title:fresh",
          "p[style-name='Título'] => p.title:fresh",
          "p[style-name='Subtitle'] => p.subtitle:fresh",
          "p[style-name='Subtítulo'] => p.subtitle:fresh",
          "p[style-name='Quote'] => blockquote:fresh",
          "p[style-name='Citação'] => blockquote:fresh",
          "br[type='page'] => hr:fresh",
        ],
        convertImage: mammoth.images.imgElement(async () => ({
          src: "",
          alt: "",
        })),
      },
    )
    .catch(() =>
      fail(
        "Não foi possível converter o DOCX. Exporte novamente pelo Docs ou Word.",
      ),
    );
  if (html.value.length > 3_000_000)
    fail("O documento é muito extenso para esta importação.");
  const richText: JSONContent = {
    type: "doc",
    content: blocks(parseDocument(html.value).children, warnings),
  };
  const body = docxPlain(richText);
  if (JSON.stringify(richText).length + body.length > 2_800_000)
    fail(
      "O documento contém formatação demais para esta importação. Divida-o em partes.",
    );
  if (!body.trim())
    fail(
      "O DOCX não contém texto editável. Documentos compostos por imagens precisam de OCR.",
    );
  if (body.length > 500_000)
    fail(
      "O texto ultrapassa 500 mil caracteres. Divida o documento em partes.",
    );
  if (info.comments || info.changes)
    warnings.add(
      "Comentários e marcas de revisão permanecem no arquivo original. O editor recebe o texto convertido, sem o histórico de revisão do Word.",
    );
  if (info.headers)
    warnings.add(
      "Cabeçalhos e rodapés permanecem no original e não entram na redação.",
    );
  if (info.images)
    warnings.add(
      "Imagens permanecem no DOCX original e não são inseridas no editor nesta importação.",
    );
  if (info.footnotes)
    warnings.add(
      "Notas de rodapé e notas finais entram como texto convertido; confira a ordem e as referências após importar.",
    );
  if (html.messages.length)
    warnings.add(
      "Alguns estilos próprios do documento foram normalizados. Confira a prévia e o texto importado.",
    );
  warnings.add(
    "Fontes, margens, paginação e quebras de página podem mudar no editor. O DOCX original permanece disponível.",
  );
  const fileName = file.name.split(/[\\/]/).pop()!.slice(0, 200),
    title =
      fileName
        .replace(/\.docx$/i, "")
        .trim()
        .slice(0, 200) || "Documento importado";
  return {
    fileName,
    title,
    body,
    richText,
    warnings: [...warnings],
    digest: createHash("sha256").update(bytes).digest("hex"),
  };
}
export async function previewDocx(file: {
  name: string;
  bytes: Uint8Array;
}): Promise<DocxPreview> {
  const parsed = await parseDocx(file);
  const modes: DocxPreview["modes"] = [];
  for (const [value, label] of [
    ["none", "Um único texto"],
    ["h1", "Separar por Título 1"],
    ["h2", "Separar por Título 2"],
  ] as const) {
    if (
      value !== "none" &&
      !parsed.richText.content?.some(
        (n) =>
          n.type === "heading" && n.attrs?.level === (value === "h1" ? 1 : 2),
      )
    )
      continue;
    const sections = splitDocx(parsed.richText, parsed.title, value);
    if (sections.length > 200) continue;
    modes.push({
      value,
      label,
      sections: sections.map((s) => ({
        title: s.title,
        words: wordCount(s.body),
      })),
    });
  }
  return {
    importId: randomUUID(),
    digest: parsed.digest,
    fileName: parsed.fileName,
    title: parsed.title,
    words: wordCount(parsed.body),
    warnings: parsed.warnings,
    modes,
  };
}
export async function importDocx(
  file: { name: string; bytes: Uint8Array },
  options: {
    storyId: string;
    split: DocxSplit;
    importId: string;
    digest: string;
  },
) {
  const parsed = await parseDocx(file);
  if (parsed.digest !== options.digest)
    fail("O arquivo mudou desde a prévia. Selecione-o novamente.");
  const sections = splitDocx(parsed.richText, parsed.title, options.split);
  if (!sections.length || sections.length > 200)
    fail(
      "Use até 200 capítulos por importação, ou importe como um único texto.",
    );
  await ensureDatabase();
  const sourceId = `docx-${options.importId}`,
    fileId = randomUUID();
  return transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
      sourceId,
    ]);
    const existing = (
      await client.query("SELECT * FROM uvc_entities WHERE id=$1", [sourceId])
    ).rows[0];
    if (existing) {
      if (
        existing.archived ||
        existing.attributes.importDigest !== parsed.digest ||
        (existing.attributes.storyId ?? "unassigned") !== options.storyId ||
        existing.attributes.importSplit !== options.split
      )
        throw new InvalidReferenceError(
          "Essa importação já foi concluída com outra configuração. Selecione o arquivo novamente.",
        );
      return {
        id: existing.attributes.importedIds[0] as string,
        sourceId,
        chapterIds: existing.attributes.importedIds as string[],
      };
    }
    if (
      options.storyId !== "unassigned" &&
      !(
        await client.query(
          "SELECT id FROM uvc_entities WHERE id=$1 AND kind='story' AND NOT archived",
          [options.storyId],
        )
      ).rowCount
    )
      throw new InvalidReferenceError("Escolha um projeto existente.");
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
      `docx-project:${options.storyId}`,
    ]);
    const previous = (
      await client.query(
        "SELECT attributes FROM uvc_entities WHERE kind='document' AND NOT archived AND (attributes->>'storyId'=$1 OR ($1='unassigned' AND NOT attributes ? 'storyId')) AND NOT attributes ? 'sourceFileId'",
        [options.storyId],
      )
    ).rows;
    const order = Math.max(
      0,
      ...previous
        .map((r) =>
          Number(r.attributes.writingOrder ?? r.attributes.order ?? 0),
        )
        .filter(Number.isFinite),
    );
    const chapterIds = sections.map((_, index) => `${sourceId}-${index + 1}`);
    const base = (
      id: string,
      title: string,
      body: string,
      attributes: Record<string, unknown>,
    ): StudioEntity => ({
      id,
      kind: "document",
      title,
      body,
      summary: "",
      status: "draft",
      published: false,
      tags: [],
      version: 0,
      attributes,
    });
    const storyAttributes =
      options.storyId !== "unassigned" ? { storyId: options.storyId } : {};
    await insertEntity(
      client,
      base(sourceId, parsed.title, parsed.body, {
        ...storyAttributes,
        source: parsed.fileName,
        sourceFileId: fileId,
        richText: parsed.richText,
        importDigest: parsed.digest,
        importSplit: options.split,
        importedIds: chapterIds,
        importWarnings: parsed.warnings,
      }),
    );
    await client.query(
      "INSERT INTO uvc_files(id,entity_id,name,mime,content,sha256) VALUES($1,$2,$3,$4,$5,$6)",
      [
        fileId,
        sourceId,
        parsed.fileName,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        Buffer.from(file.bytes),
        parsed.digest,
      ],
    );
    const imported: StudioEntity[] = [];
    const relations: {
      id: string;
      source_id: string;
      target_id: string;
      label: string;
    }[] = [];
    const relation = (source_id: string, target_id: string, label: string) =>
      relations.push({ id: randomUUID(), source_id, target_id, label });
    if (options.storyId !== "unassigned")
      relation(sourceId, options.storyId, "manuscrito de");
    for (const [index, section] of sections.entries()) {
      const id = chapterIds[index];
      imported.push(
        base(id, section.title, section.body, {
          ...storyAttributes,
          writingType: "chapter",
          writingOrder: order + (index + 1) * 1000,
          richText: section.richText,
          importSourceId: sourceId,
        }),
      );
      relation(id, sourceId, "extraído de");
      if (options.storyId !== "unassigned")
        relation(id, options.storyId, "capítulo de");
    }
    await client.query(
      "INSERT INTO uvc_entities(id,kind,title,body,summary,status,published,tags,attributes) SELECT id,kind,title,body,summary,status,published,tags,attributes FROM jsonb_to_recordset($1::jsonb) AS x(id text,kind text,title text,body text,summary text,status text,published boolean,tags jsonb,attributes jsonb)",
      [JSON.stringify(imported)],
    );
    await client.query(
      "INSERT INTO uvc_relations(id,source_id,target_id,label) SELECT id,source_id,target_id,label FROM jsonb_to_recordset($1::jsonb) AS x(id text,source_id text,target_id text,label text)",
      [JSON.stringify(relations)],
    );
    return { id: chapterIds[0], sourceId, chapterIds };
  });
}
