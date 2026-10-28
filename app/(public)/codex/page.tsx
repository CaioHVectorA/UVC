import { characters } from "@/lib/content";
import { PublishedCharacters } from "@/components/published-characters";
export const metadata = { title: "Personagens" };
export default function CodexPage() {
  const selected = characters
    .filter((character) => character.statusVisibilidade === "PUBLICO")
    .map(({ id, nome, equipe, desc }) => ({
      id,
      nome,
      equipe,
      desc: desc.split(". ")[0] + (desc.includes(". ") ? "." : ""),
    }));
  return <PublishedCharacters characters={selected} />;
}
