import { z } from "zod";
import {
  authorize,
  apiError,
  privateHeaders,
  inputJson,
} from "@/lib/studio-api";
import { transaction } from "@/lib/database";
const schema = z
  .array(
    z
      .object({
        id: z.string().max(120),
        x: z.number().finite().min(-1000000).max(1000000),
        y: z.number().finite().min(-1000000).max(1000000),
      })
      .strict(),
  )
  .max(1000);
export async function POST(request: Request) {
  try {
    const auth = await authorize(request, true);
    if (auth.error) return auth.error;
    const positions = schema.parse(await inputJson(request));
    await transaction(async (client) => {
      for (const p of positions)
        await client.query(
          "INSERT INTO uvc_layout(user_id,entity_id,x,y) VALUES($1,$2,$3,$4) ON CONFLICT(user_id,entity_id) DO UPDATE SET x=excluded.x,y=excluded.y",
          [auth.session.studioAuthorId, p.id, p.x, p.y],
        );
    });
    return Response.json({ ok: true }, { headers: privateHeaders });
  } catch (error) {
    return apiError(error);
  }
}
