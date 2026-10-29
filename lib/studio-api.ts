import "server-only";
import { ZodError } from "zod";
import { getStudioAuthorSession, sameOrigin } from "./studio-auth";
import { ConflictError, InvalidReferenceError } from "./database";
export const privateHeaders = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};
export async function authorize(request: Request, write = false) {
  const session = await getStudioAuthorSession();
  if (!session)
    return {
      error: Response.json(
        { error: "Entre no Studio para continuar." },
        { status: 401, headers: privateHeaders },
      ),
    };
  if (write && !sameOrigin(request))
    return {
      error: Response.json(
        { error: "Origem inválida." },
        { status: 403, headers: privateHeaders },
      ),
    };
  return { session };
}
export function apiError(error: unknown) {
  const duplicate =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505";
  const status =
    error instanceof ConflictError || duplicate
      ? 409
      : error instanceof ZodError || error instanceof InvalidReferenceError
        ? 400
        : 503;
  const message =
    error instanceof ConflictError || error instanceof InvalidReferenceError
      ? error.message
      : duplicate
        ? "Essa ficha ou ligação já existe."
        : status === 400
          ? "Revise os campos enviados."
          : "O banco está indisponível. Suas alterações não foram salvas.";
  return Response.json({ error: message }, { status, headers: privateHeaders });
}
export async function inputJson(request: Request) {
  const text = await request.text();
  if (text.length > 3000000) throw new ZodError([]);
  try {
    return JSON.parse(text);
  } catch {
    throw new ZodError([]);
  }
}
