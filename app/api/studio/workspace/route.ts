import { authorize, apiError, privateHeaders } from "@/lib/studio-api";
import { loadWorkspace } from "@/lib/database";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const auth = await authorize(request);
    if (auth.error) return auth.error;
    return Response.json(await loadWorkspace(), { headers: privateHeaders });
  } catch (error) {
    return apiError(error);
  }
}
