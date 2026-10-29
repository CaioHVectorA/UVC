import { z } from "zod";
import { authorize, apiError, privateHeaders } from "@/lib/studio-api";
import { DocxImportError, previewDocx, importDocx } from "@/lib/import-docx";
export const runtime = "nodejs";
export const maxDuration = 60;
const options = z.object({
  storyId: z.string().min(1).max(120),
  split: z.enum(["none", "h1", "h2"]),
  importId: z.uuid(),
  digest: z.string().regex(/^[a-f0-9]{64}$/),
});
export async function POST(request: Request) {
  try {
    const auth = await authorize(request, true);
    if (auth.error) return auth.error;
    const form = await request.formData(),
      file = form.get("file"),
      action = form.get("action");
    if (!(file instanceof File) || file.size > 4 * 1024 * 1024 || !file.size)
      return Response.json(
        { error: "Selecione um DOCX de até 4 MB." },
        { status: 400, headers: privateHeaders },
      );
    const input = {
      name: file.name,
      bytes: new Uint8Array(await file.arrayBuffer()),
    };
    if (action === "preview")
      return Response.json(await previewDocx(input), {
        headers: privateHeaders,
      });
    if (action !== "import")
      return Response.json(
        { error: "Confira a prévia antes de importar." },
        { status: 400, headers: privateHeaders },
      );
    const value = options.parse({
      storyId: form.get("storyId"),
      split: form.get("split"),
      importId: form.get("importId"),
      digest: form.get("digest"),
    });
    return Response.json(await importDocx(input, value), {
      headers: privateHeaders,
    });
  } catch (error) {
    if (error instanceof DocxImportError)
      return Response.json(
        { error: error.message },
        { status: 400, headers: privateHeaders },
      );
    return apiError(error);
  }
}
