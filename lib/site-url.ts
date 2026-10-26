// An explicit public origin avoids inventing canonical URLs for an unknown deploy.
export function getSiteUrl(value = process.env.UVC_SITE_URL): URL | undefined {
  if (!value) return undefined;
  const url = new URL(value);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error(
      "UVC_SITE_URL deve conter somente a origem pública HTTP(S), sem caminho, credenciais ou parâmetros.",
    );
  if (
    url.protocol === "http:" &&
    !["localhost", "127.0.0.1"].includes(url.hostname)
  )
    throw new Error("UVC_SITE_URL deve usar HTTPS em produção.");
  return url;
}
