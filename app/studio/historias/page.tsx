import { StudioCollectionPage } from "@/components/studio-collection-page";
export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  return <StudioCollectionPage kind="story" searchParams={searchParams} />;
}
