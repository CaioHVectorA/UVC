import { NextResponse } from "next/server";
import { book, isPublicChapter } from "@/lib/content";
import { getChapter } from "@/lib/chapters";
import {
  methodNotAllowed,
  readOnlyHeaders,
  readOnlyOptions,
} from "@/lib/read-only-api";
export const dynamic = "force-dynamic";
// Request parameters require runtime evaluation even though content is a Git snapshot.
export const revalidate = false;
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  if (
    [...params.keys()].some((key) => key !== "num") ||
    params.getAll("num").length > 1
  )
    return NextResponse.json(
      { error: "Consulta inválida.", code: "INVALID_QUERY" },
      { status: 400, headers: readOnlyHeaders },
    );
  const value = params.get("num") ?? "0";
  if (!/^(0|[1-9]\d?|0\d)$/.test(value))
    return NextResponse.json(
      {
        error: "Informe um número de capítulo válido.",
        code: "INVALID_CHAPTER",
      },
      { status: 400, headers: readOnlyHeaders },
    );
  const number = Number(value);
  if (
    !book.capitulos.some((c) => c.numero === number) ||
    !isPublicChapter(number)
  )
    return NextResponse.json(
      { error: "Capítulo não encontrado.", code: "NOT_FOUND" },
      { status: 404, headers: readOnlyHeaders },
    );
  try {
    const chapter = await getChapter(number);
    return NextResponse.json(
      {
        chapter: chapter.arquivo.split("/").at(-1),
        content: chapter.text,
        status: chapter.status,
        source: "git-static",
      },
      { headers: readOnlyHeaders },
    );
  } catch {
    console.error("Falha ao carregar capítulo do snapshot publicado.");
    return NextResponse.json(
      {
        error: "Não foi possível carregar o capítulo.",
        code: "CONTENT_UNAVAILABLE",
      },
      { status: 500, headers: readOnlyHeaders },
    );
  }
}
export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = readOnlyOptions;
