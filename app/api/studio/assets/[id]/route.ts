import { getStudioAuthorSession } from "@/lib/studio-auth";
import { readStudioAsset } from "@/lib/studio-assets";
export const dynamic = "force-dynamic";
const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await getStudioAuthorSession()))
    return Response.json(
      { error: "Acesso restrito." },
      { status: 401, headers },
    );
  try {
    const image = await readStudioAsset((await params).id);
    if (!image)
      return Response.json(
        { error: "Asset não encontrado." },
        { status: 404, headers },
      );
    return new Response(new Uint8Array(image), {
      headers: { ...headers, "Content-Type": "image/webp" },
    });
  } catch {
    return Response.json(
      { error: "Não foi possível abrir o asset." },
      { status: 500, headers },
    );
  }
}
