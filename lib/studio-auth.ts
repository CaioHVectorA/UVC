import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { db, ensureDatabase, databaseConfigured } from "./database";
export const sessionCookie = "uvc-studio-session";
const digest = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export async function createStudioSession(username: string, password: string) {
  await ensureDatabase();
  const result = await db().query(
    "SELECT * FROM uvc_users WHERE username=$1 AND id='admin'",
    [username],
  );
  const user = result.rows[0];
  const [salt, stored] = (user?.password_hash ?? "missing:00").split(":");
  const computed = scryptSync(password, salt, 64);
  const expected = Buffer.from(stored, "hex");
  if (
    !user ||
    (user.locked_until && new Date(user.locked_until) > new Date()) ||
    expected.length !== computed.length ||
    !timingSafeEqual(expected, computed)
  ) {
    if (user)
      await db().query(
        "UPDATE uvc_users SET failed_attempts=failed_attempts+1,locked_until=CASE WHEN failed_attempts >= 9 THEN now()+interval '15 minutes' ELSE locked_until END WHERE id=$1",
        [user.id],
      );
    return null;
  }
  await db().query(
    "UPDATE uvc_users SET failed_attempts=0,locked_until=NULL WHERE id=$1",
    [user.id],
  );
  await db().query("DELETE FROM uvc_sessions WHERE expires_at < now()");
  const token = randomBytes(32).toString("base64url");
  await db().query(
    "INSERT INTO uvc_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '8 hours')",
    [digest(token), user.id],
  );
  return token;
}
export async function getStudioAuthorSession() {
  if (!databaseConfigured()) return null;
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  await ensureDatabase();
  const result = await db().query(
    "SELECT user_id FROM uvc_sessions WHERE token_hash=$1 AND expires_at>now()",
    [digest(token)],
  );
  return result.rows[0]?.user_id === "admin"
    ? { studioAuthorId: result.rows[0].user_id as string }
    : null;
}
export async function requireStudioAuthor() {
  const session = await getStudioAuthorSession();
  if (!session) redirect("/studio/entrar");
  return session;
}
export async function revokeStudioSession() {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (token && databaseConfigured()) {
    await ensureDatabase();
    await db().query("DELETE FROM uvc_sessions WHERE token_hash=$1", [
      digest(token),
    ]);
  }
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const url = new URL(origin);
    const host = request.headers.get("host") ?? new URL(request.url).host;
    const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(url.host);
    if (url.protocol !== "https:" && !(local && url.protocol === "http:"))
      return false;
    return url.host === host || origin === process.env.UVC_SITE_URL;
  } catch {
    return false;
  }
}
