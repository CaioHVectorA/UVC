import { cookies } from "next/headers";
import {
  createStudioSession,
  revokeStudioSession,
  sessionCookie,
  sameOrigin,
  getStudioAuthorSession,
} from "@/lib/studio-auth";
import { isStudioConfigured } from "@/lib/studio-policy";
const headers = { "Cache-Control": "private, no-store" };
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json(
      { error: "Origem inválida." },
      { status: 403, headers },
    );
  if (!isStudioConfigured())
    return Response.json(
      { error: "Conecte o PostgreSQL para abrir o Studio." },
      { status: 503, headers },
    );
  try {
    const input = await request.json();
    if (
      typeof input.username !== "string" ||
      typeof input.password !== "string" ||
      input.username.length > 100 ||
      input.password.length > 300
    )
      return Response.json(
        { error: "Credenciais inválidas." },
        { status: 400, headers },
      );
    const token = await createStudioSession(input.username, input.password);
    if (!token)
      return Response.json(
        {
          error:
            "Usuário ou senha inválidos. Tente novamente mais tarde se houver muitas tentativas.",
        },
        { status: 401, headers },
      );
    (await cookies()).set(sessionCookie, token, {
      httpOnly: true,
      secure:
        process.env.NODE_ENV === "production" &&
        !/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(
          request.headers.get("host") ?? new URL(request.url).host,
        ),
      sameSite: "lax",
      path: "/",
      maxAge: 8 * 3600,
    });
    return Response.json({ ok: true }, { headers });
  } catch {
    return Response.json(
      {
        error: "Não foi possível conectar ao banco. Nenhuma sessão foi criada.",
      },
      { status: 503, headers },
    );
  }
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request))
    return Response.json(
      { error: "Origem inválida." },
      { status: 403, headers },
    );
  await revokeStudioSession();
  (await cookies()).delete(sessionCookie);
  return Response.json({ ok: true }, { headers });
}
export async function GET() {
  return Response.json(
    { authenticated: Boolean(await getStudioAuthorSession()) },
    { headers },
  );
}
