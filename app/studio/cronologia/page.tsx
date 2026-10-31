import { requireStudioAuthor } from "@/lib/studio-auth";
import { loadWorkspace } from "@/lib/database";
import { StudioNavigation } from "@/components/studio-navigation";
import { StudioParallelTimeline } from "@/components/studio-parallel-timeline";
import { timeline as canonicalTimeline } from "@/lib/content";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Cronologia em Raias Paralelas · UVC Studio",
  description:
    "Linha do tempo interativa confrontando simultaneamente eventos da Terra/Glen e Severum/Espaço Profundo ao longo das 5 Eras Cósmicas.",
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
      <StudioParallelTimeline
        initial={initial}
        initialId={id}
        timelineData={canonicalTimeline}
      />
    </>
  );
}
