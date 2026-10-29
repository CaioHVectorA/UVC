import { requireStudioAuthor } from "@/lib/studio-auth";
import { loadWorkspace } from "@/lib/database";
import { WritingDesk } from "@/components/writing-desk";
import { StudioNavigation } from "@/components/studio-navigation";
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
      <WritingDesk initial={initial} initialId={id} />
    </>
  );
}
