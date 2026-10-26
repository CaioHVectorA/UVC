import { NextResponse } from "next/server";
export const readOnlyHeaders = {
  Allow: "GET, HEAD, OPTIONS",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
export function methodNotAllowed() {
  return NextResponse.json(
    {
      error:
        "Esta API é somente leitura. Alterações são versionadas no Git e publicadas por um novo build.",
      code: "READ_ONLY",
    },
    { status: 405, headers: readOnlyHeaders },
  );
}
export function readOnlyOptions() {
  return new NextResponse(null, { status: 204, headers: readOnlyHeaders });
}
