import { getStudioCharacterData } from "@/lib/studio-content";
import { CharacterWorkshop } from "@/components/character-workshop";
import { StudioNavigation } from "@/components/studio-navigation";
import { StudioSessionControl } from "@/components/studio-session-controls";

export const metadata = { title: "Personagens — Studio" };
export default async function StudioCharactersPage() {
  const { characters, factions, stories } = await getStudioCharacterData();
  return (
    <>
      <StudioNavigation />
      <div className="workshop-heading">
        <div>
          <p className="eyebrow">Oficina de criação</p>
          <h1>Personagens</h1>
          <p>Da primeira ideia à ficha de personagem. O cânone fica ao lado.</p>
        </div>
        <StudioSessionControl action="signout" />
      </div>
      <CharacterWorkshop
        characters={characters}
        factions={factions}
        stories={stories}
      />
    </>
  );
}
