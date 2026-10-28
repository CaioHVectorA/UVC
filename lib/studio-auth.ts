import "server-only";
import { getServerSession, type NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { redirect } from "next/navigation";
import { isStudioAuthor, isStudioConfigured } from "./studio-policy";

export const studioAuthOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GitHubProvider({
      clientId: process.env.UVC_STUDIO_GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.UVC_STUDIO_GITHUB_CLIENT_SECRET ?? "",
      authorization: { params: { scope: "read:user" } },
      checks: ["pkce", "state"],
      userinfo: {
        url: "https://api.github.com/user",
        async request({ client, tokens }) {
          return client.userinfo(tokens.access_token!);
        },
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  jwt: { maxAge: 60 * 60 * 8 },
  pages: { signIn: "/studio/entrar", error: "/studio/entrar" },
  callbacks: {
    async signIn({ account }) {
      return (
        isStudioConfigured() &&
        account?.provider === "github" &&
        isStudioAuthor(
          account.providerAccountId,
          process.env.UVC_STUDIO_GITHUB_ID,
        )
      );
    },
    async jwt({ token, account }) {
      if (account)
        token.studioAuthorId =
          account.provider === "github" ? account.providerAccountId : undefined;
      // Re-evaluate the allowlist for existing sessions on every request.
      if (
        !isStudioAuthor(token.studioAuthorId, process.env.UVC_STUDIO_GITHUB_ID)
      )
        delete token.studioAuthorId;
      return token;
    },
    async session({ session, token }) {
      session.studioAuthorId = isStudioAuthor(
        token.studioAuthorId,
        process.env.UVC_STUDIO_GITHUB_ID,
      )
        ? String(token.studioAuthorId)
        : undefined;
      return session;
    },
    async redirect({ baseUrl }) {
      // Never accept a caller-controlled post-login destination.
      return new URL("/studio", baseUrl).href;
    },
  },
};

export async function getStudioAuthorSession() {
  if (!isStudioConfigured()) return null;
  const session = await getServerSession(studioAuthOptions);
  return isStudioAuthor(
    session?.studioAuthorId,
    process.env.UVC_STUDIO_GITHUB_ID,
  )
    ? session
    : null;
}
export async function requireStudioAuthor() {
  const session = await getStudioAuthorSession();
  if (!session) redirect("/studio/entrar");
  return session;
}
