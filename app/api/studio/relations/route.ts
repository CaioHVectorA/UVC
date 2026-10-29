import {
  authorize,
  apiError,
  privateHeaders,
  inputJson,
} from "@/lib/studio-api";
import { saveRelation, db } from "@/lib/database";
import { relationSchema } from "@/lib/workspace";
export async function POST(request: Request) {
  try {
    const auth = await authorize(request, true);
    if (auth.error) return auth.error;
    return Response.json(
      await saveRelation(relationSchema.parse(await inputJson(request))),
      { headers: privateHeaders },
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function DELETE(request: Request) {
  try {
    const auth = await authorize(request, true);
    if (auth.error) return auth.error;
    const value = await inputJson(request);
    if (typeof value.id !== "string")
      return Response.json(
        { error: "Vínculo inválido." },
        { status: 400, headers: privateHeaders },
      );
    await db().query("DELETE FROM uvc_relations WHERE id=$1", [value.id]);
    return Response.json({ ok: true }, { headers: privateHeaders });
  } catch (error) {
    return apiError(error);
  }
}
