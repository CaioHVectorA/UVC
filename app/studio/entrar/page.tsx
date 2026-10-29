import Link from "next/link";
import { redirect } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { getStudioAuthorSession } from "@/lib/studio-auth";
import { isStudioConfigured } from "@/lib/studio-policy";
import { StudioLoginForm } from "@/components/studio-login";
export default async function StudioLogin() {
  if (await getStudioAuthorSession()) redirect("/studio");
  return (
    <section className="studio-access" aria-labelledby="studio-title">
      <LockKeyhole size={30} aria-hidden />
      <p className="eyebrow">UVC</p>
      <h1 id="studio-title">Studio</h1>
      <p>Seu espaço de criação.</p>
      {isStudioConfigured() ? (
        <StudioLoginForm />
      ) : (
        <p className="notice">
          O Studio precisa de uma conexão PostgreSQL. Configure DATABASE_URL no
          servidor para entrar.
        </p>
      )}
      <Link href="/" className="text-link">
        Voltar ao site →
      </Link>
    </section>
  );
}
