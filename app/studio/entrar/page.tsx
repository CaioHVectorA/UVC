import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { studioAuthOptions } from "@/lib/studio-auth";
import { isStudioAuthor, isStudioConfigured } from "@/lib/studio-policy";
import { StudioSessionControl } from "@/components/studio-session-controls";

export default async function StudioLogin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const configured = isStudioConfigured();
  if (configured) {
    const session = await getServerSession(studioAuthOptions);
    if (
      isStudioAuthor(session?.studioAuthorId, process.env.UVC_STUDIO_GITHUB_ID)
    )
      redirect("/studio");
  }
  const { error } = await searchParams;
  return (
    <section className="studio-access" aria-labelledby="studio-title">
      <LockKeyhole size={30} aria-hidden />
      <p className="eyebrow">UVC</p>
      <h1 id="studio-title">Studio</h1>
      <p>Área do autor.</p>
      {configured ? (
        <>
          <StudioSessionControl action="signin" />
          {error && (
            <p role="alert" className="notice">
              Não foi possível autorizar o acesso. Entre com a conta do autor ou
              tente novamente.
            </p>
          )}
          <p className="studio-access-note">
            Acesso exclusivo à conta autorizada do autor.
          </p>
        </>
      ) : (
        <p className="notice">O acesso ao Studio ainda não foi configurado.</p>
      )}
      <Link href="/historias/red-right-hand" className="text-link">
        Conhecer Red Right Hand →
      </Link>
    </section>
  );
}
