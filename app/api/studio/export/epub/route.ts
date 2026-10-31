import { authorize, apiError, privateHeaders } from "@/lib/studio-api";
import { exportStoryToEpub, StoryNotFoundError } from "@/lib/export-epub";

export const dynamic = "force-dynamic";
export const revalidate = false;

export async function GET(request: Request) {
  try {
    const auth = await authorize(request);
    if (auth.error) return auth.error;

    const url = new URL(request.url);
    const storyId = url.searchParams.get("storyId")?.trim();

    if (!storyId) {
      return Response.json(
        { error: "Parâmetro storyId é obrigatório." },
        { status: 400, headers: privateHeaders },
      );
    }

    const { buffer, filename } = await exportStoryToEpub(storyId);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        ...privateHeaders,
        "Content-Type": "application/epub+zip",
        "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Content-Length": String(buffer.byteLength),
      },
    });
  } catch (error) {
    if (error instanceof StoryNotFoundError) {
      return Response.json(
        { error: error.message },
        { status: 404, headers: privateHeaders },
      );
    }
    return apiError(error);
  }
}
