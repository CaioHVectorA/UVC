import { getStudioAuthorSession } from "@/lib/studio-auth";
import { loadWorkspace } from "@/lib/database";
import { apiError, privateHeaders } from "@/lib/studio-api";
import { methodNotAllowed, readOnlyOptions } from "@/lib/read-only-api";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    if (!(await getStudioAuthorSession()))
      return Response.json(
        { error: "Acesso restrito.", code: "UNAUTHORIZED" },
        { status: 401, headers: privateHeaders },
      );
    const workspace = await loadWorkspace();
    return Response.json(
      {
        events: workspace.entities.filter((e) => e.kind === "event"),
        relations: workspace.relations,
      },
      { headers: privateHeaders },
    );
  } catch (error) {
    return apiError(error);
  }
}
export const POST = methodNotAllowed,
  PUT = methodNotAllowed,
  PATCH = methodNotAllowed,
  DELETE = methodNotAllowed,
  OPTIONS = readOnlyOptions;
