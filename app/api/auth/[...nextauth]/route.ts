import NextAuth from "next-auth";
import type { NextRequest } from "next/server";
import { studioAuthOptions } from "@/lib/studio-auth";
import { isStudioConfigured } from "@/lib/studio-policy";

const handler = NextAuth(studioAuthOptions);
async function auth(
  request: NextRequest,
  context: { params: Promise<{ nextauth: string[] }> },
) {
  if (!isStudioConfigured())
    return Response.json(
      { error: "Acesso ao Studio indisponível.", code: "STUDIO_UNAVAILABLE" },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  return handler(request, context);
}
export { auth as GET, auth as POST };
