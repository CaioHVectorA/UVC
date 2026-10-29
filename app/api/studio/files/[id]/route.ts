import { authorize, apiError, privateHeaders } from "@/lib/studio-api";
import { db } from "@/lib/database";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authorize(request);
    if (auth.error) return auth.error;
    const result = await db().query(
      "SELECT name,mime,content FROM uvc_files WHERE id=$1",
      [(await params).id],
    );
    const file = result.rows[0];
    if (!file)
      return new Response(null, { status: 404, headers: privateHeaders });
    return new Response(new Uint8Array(file.content), {
      headers: {
        ...privateHeaders,
        "Content-Type": file.mime,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
