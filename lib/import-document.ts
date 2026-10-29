import { randomUUID, createHash } from "node:crypto";
import { getDocumentProxy, extractText } from "unpdf";
import { ensureDatabase, transaction, insertEntity } from "./database";
import type { StudioEntity } from "./workspace";
export async function importDocument(
  file: { name: string; bytes: Uint8Array },
  storyId = "story-marginal",
  fixedId?: string,
) {
  file.name = file.name.slice(0, 200);
  if (!file.bytes.length || file.bytes.length > 4 * 1024 * 1024)
    throw new Error("Envie um arquivo de até 4 MB.");
  let body: string;
  let pages: number | undefined;
  const pdf = /\.pdf$/i.test(file.name);
  if (pdf) {
    const document = await getDocumentProxy(new Uint8Array(file.bytes), {
      maxImageSize: 16777216,
      useSystemFonts: false,
    });
    try {
      if (document.numPages > 500)
        throw new Error("O PDF ultrapassa 500 páginas.");
      const result = await extractText(document, { mergePages: true });
      body = result.text;
      pages = result.totalPages;
    } finally {
      await document.loadingTask.destroy();
    }
  } else if (/\.(txt|md)$/i.test(file.name))
    body = new TextDecoder().decode(file.bytes);
  else throw new Error("Use PDF, TXT ou Markdown.");
  if (!body.trim())
    throw new Error(
      "O arquivo não contém texto extraível. PDFs digitalizados precisam de OCR antes da importação.",
    );
  if (body.length > 500000)
    throw new Error(
      "O texto ultrapassa 500 mil caracteres. Divida o manuscrito em partes.",
    );
  await ensureDatabase();
  const id = fixedId ?? randomUUID(),
    fileId = randomUUID();
  await transaction(async (client) => {
    const entity: StudioEntity = {
      id,
      kind: "document",
      title: file.name.replace(/\.(pdf|txt|md)$/i, ""),
      summary:
        "Manuscrito importado pelo autor. Texto extraído, sem reescrita; o original foi preservado.",
      body,
      status: "draft",
      published: false,
      tags: [],
      attributes: { source: file.name, pages, sourceFileId: fileId },
      version: 0,
    };
    await insertEntity(client, entity);
    await client.query(
      "INSERT INTO uvc_files(id,entity_id,name,mime,content,sha256) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(entity_id) DO NOTHING",
      [
        fileId,
        id,
        file.name,
        pdf ? "application/pdf" : "text/plain",
        Buffer.from(file.bytes),
        createHash("sha256").update(file.bytes).digest("hex"),
      ],
    );
    const original = await client.query(
      "SELECT id FROM uvc_files WHERE entity_id=$1",
      [id],
    );
    await client.query(
      "UPDATE uvc_entities SET attributes=jsonb_set(attributes,'{sourceFileId}',to_jsonb($2::text)) WHERE id=$1",
      [id, original.rows[0].id],
    );
    const target = await client.query(
      "SELECT id FROM uvc_entities WHERE id=$1 AND kind='story' AND NOT archived",
      [storyId],
    );
    if (target.rows.length)
      await client.query(
        "INSERT INTO uvc_relations(id,source_id,target_id,label) VALUES($1,$2,$3,'manuscrito de') ON CONFLICT DO NOTHING",
        [`import-${id}`, id, storyId],
      );
  });
  return id;
}
