export function GET() {
  return Response.json(
    { error: "Use o login do Studio.", code: "PASSWORD_LOGIN" },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
export const POST = GET;
