import "next-auth";
import "next-auth/jwt";
declare module "next-auth" {
  interface Session {
    studioAuthorId?: string;
  }
}
declare module "next-auth/jwt" {
  interface JWT {
    studioAuthorId?: string;
  }
}
