import { requireStudioAuthor } from "@/lib/studio-auth";
import { loadWorkspace } from "@/lib/database";
import { StudioNavigation } from "@/components/studio-navigation";
import { ConceptMatrix } from "@/components/concept-matrix";
import { StudioWorkbench } from "@/components/studio-workbench";
import { StudioSessionControl } from "@/components/studio-session-controls";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Matriz de Conceitos Cósmicos · UVC Studio",
  description:
    "Engenharia de conceitos ontológicos, leis cósmicas invioláveis e conexões bidirecionais de worldbuilding.",
  robots: { index: false, follow: false, noarchive: true },
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  await requireStudioAuthor();
  const initial = await loadWorkspace();
  const { id } = await searchParams;

  return (
    <>
      <StudioNavigation />
      <div className="flex justify-end px-4 pt-2">
        <StudioSessionControl action="signout" />
      </div>
      <ConceptMatrix initial={initial} />
      <div className="mt-12 border-t border-[#303c49]/60 pt-8">
        <StudioWorkbench
          initial={initial}
          initialKind="concept"
          initialId={id}
        />
      </div>
    </>
  );
}
