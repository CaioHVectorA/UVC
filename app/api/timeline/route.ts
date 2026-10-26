import { NextResponse } from "next/server";
import { timeline } from "@/lib/content";
import {
  methodNotAllowed,
  readOnlyHeaders,
  readOnlyOptions,
} from "@/lib/read-only-api";
export async function GET() {
  return NextResponse.json(timeline, { headers: readOnlyHeaders });
}
export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = readOnlyOptions;
