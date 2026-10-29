export function isStudioConfigured(
  env: Record<string, string | undefined> = process.env,
) {
  return Boolean(env.DATABASE_URL?.trim() || env.POSTGRES_URL?.trim());
}
export function isStudioAuthor(candidate: unknown) {
  return candidate === "admin";
}
