import { requireStudioAuthor } from "@/lib/studio-auth";
import { loadWorkspace } from "@/lib/database";
import { StudioNavigation } from "@/components/studio-navigation";
import { StudioCockpit } from "@/components/studio-cockpit";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Cockpit do Autor · UVC Studio",
  description:
    "Painel de comando central para escrita contínua, worldbuilding e acompanhamento do cânone do Universo Virtual de Caio (UVC).",
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
      <StudioCockpit initial={initial} initialId={id} />
    </>
  );
}
