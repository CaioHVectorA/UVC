import { authorize, apiError, privateHeaders } from "@/lib/studio-api";
import { importDocument } from "@/lib/import-document";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const auth = await authorize(request, true);
    if (auth.error) return auth.error;
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size > 4 * 1024 * 1024)
      return Response.json(
        { error: "Selecione um PDF, TXT ou Markdown de até 4 MB." },
        { status: 400, headers: privateHeaders },
      );
    try {
      const id = await importDocument(
        { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) },
        String(form.get("storyId") ?? "story-marginal"),
      );
      return Response.json({ id }, { headers: privateHeaders });
    } catch {
      return Response.json(
        {
          error:
            "Não foi possível importar. Use um PDF com texto selecionável, TXT ou Markdown, até 4 MB e 500 páginas.",
        },
        { status: 400, headers: privateHeaders },
      );
    }
  } catch (error) {
    return apiError(error);
  }
}
