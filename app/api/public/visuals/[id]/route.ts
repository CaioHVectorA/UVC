import { getPublicKnowledge } from "@/lib/public-knowledge";
import { readStudioAsset } from "@/lib/studio-assets";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = (await params).id;
  const entity = (await getPublicKnowledge("visual")).find((e) => e.id === id);
  if (!entity || typeof entity.attributes.assetId !== "string")
    return new Response(null, { status: 404 });
  const image = await readStudioAsset(entity.attributes.assetId);
  if (!image) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(image), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
