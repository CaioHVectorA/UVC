import {
  authorize,
  apiError,
  privateHeaders,
  inputJson,
} from "@/lib/studio-api";
import { saveEntity, archiveEntity, db, ensureDatabase } from "@/lib/database";
import { entitySchema } from "@/lib/workspace";
export async function PUT(request: Request) {
  try {
    const auth = await authorize(request, true);
    if (auth.error) return auth.error;
    const entity = entitySchema.parse(await inputJson(request));
    return Response.json(
      await saveEntity(entity, auth.session.studioAuthorId),
      { headers: privateHeaders },
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function GET(request: Request) {
  try {
    const auth = await authorize(request);
    if (auth.error) return auth.error;
    await ensureDatabase();
    const id = new URL(request.url).searchParams.get("id");
    const result = await db().query(
      "SELECT id,version,snapshot,created_at FROM uvc_revisions WHERE entity_id=$1 ORDER BY id DESC LIMIT 30",
      [id],
    );
    return Response.json(result.rows, { headers: privateHeaders });
  } catch (error) {
    return apiError(error);
  }
}
export async function DELETE(request: Request) {
  try {
    const auth = await authorize(request, true);
    if (auth.error) return auth.error;
    const data = await inputJson(request);
    if (typeof data.id !== "string" || !Number.isInteger(data.version))
      return Response.json(
        { error: "Ficha inválida." },
        { status: 400, headers: privateHeaders },
      );
    await archiveEntity(data.id, data.version, auth.session.studioAuthorId);
    return Response.json({ ok: true }, { headers: privateHeaders });
  } catch (error) {
    return apiError(error);
  }
}
