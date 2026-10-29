import { getPublicCharacters } from "@/lib/public-knowledge";
import { PublishedCharacters } from "@/components/published-characters";
export const dynamic = "force-dynamic";
export const metadata = { title: "Personagens" };
export default async function Page() {
  return <PublishedCharacters characters={await getPublicCharacters()} />;
}
