// Pure policy shared by server authorization and its regression tests.
export function isStudioAuthor(
  candidate: unknown,
  allowedId: string | undefined,
) {
  return Boolean(
    allowedId &&
    /^[1-9]\d*$/.test(allowedId) &&
    typeof candidate === "string" &&
    candidate === allowedId,
  );
}

export function isStudioConfigured(
  env: Record<string, string | undefined> = process.env,
) {
  if (
    !env.UVC_STUDIO_GITHUB_CLIENT_ID?.trim() ||
    !env.UVC_STUDIO_GITHUB_CLIENT_SECRET?.trim() ||
    !/^[1-9]\d*$/.test(env.UVC_STUDIO_GITHUB_ID ?? "") ||
    (env.NEXTAUTH_SECRET?.trim().length ?? 0) < 32
  )
    return false;
  try {
    const url = new URL(env.NEXTAUTH_URL ?? "");
    return (
      !url.username &&
      !url.password &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash &&
      (url.protocol === "https:" ||
        (env.NODE_ENV !== "production" &&
          url.protocol === "http:" &&
          ["localhost", "127.0.0.1"].includes(url.hostname)))
    );
  } catch {
    return false;
  }
}
