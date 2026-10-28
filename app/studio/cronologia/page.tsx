import { getStudioTimeline } from "@/lib/studio-content";
import { StudioTimeline } from "@/components/studio-timeline";
import { StudioNavigation } from "@/components/studio-navigation";
export const metadata = { title: "Cronologia — Studio" };
export default async function StudioTimelinePage() {
  const { timeline } = await getStudioTimeline();
  return (
    <>
      <StudioNavigation />
      <StudioTimeline timeline={timeline} />
    </>
  );
}
