import { getPublicKnowledge } from "@/lib/public-knowledge";
import { PublicGallery } from "@/components/public-gallery";
export const dynamic = "force-dynamic";
export default async function Page() {
  const entities = await getPublicKnowledge("visual");
  return (
    <PublicGallery
      items={entities.map((e) => ({
        id: e.id,
        title: e.title,
        description: e.body,
        category: String(e.attributes.category ?? "Artes"),
      }))}
    />
  );
}
