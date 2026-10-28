import { NextResponse } from "next/server";
import { getStudioAuthorSession } from "@/lib/studio-auth";
import { timeline } from "@/lib/content";
import {
  methodNotAllowed,
  readOnlyHeaders,
  readOnlyOptions,
} from "@/lib/read-only-api";
export const dynamic = "force-dynamic";
export async function GET() {
  if (!(await getStudioAuthorSession()))
    return NextResponse.json(
      { error: "Acesso restrito.", code: "UNAUTHORIZED" },
      { status: 401, headers: readOnlyHeaders },
    );
  return NextResponse.json(timeline, { headers: readOnlyHeaders });
}
export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = readOnlyOptions;
