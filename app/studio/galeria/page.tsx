import { getStudioGalleryData } from "@/lib/studio-content";
import { GalleryWorkshop } from "@/components/gallery-workshop";
import { StudioNavigation } from "@/components/studio-navigation";
import { StudioSessionControl } from "@/components/studio-session-controls";
export const metadata = { title: "Galeria — Studio" };
export default async function StudioGalleryPage() {
  const data = await getStudioGalleryData();
  return (
    <>
      <StudioNavigation />
      <div className="workshop-heading">
        <div>
          <p className="eyebrow">Arquivo de criação</p>
          <h1>Galeria de ideias</h1>
          <p>Conecte suas imagens aos personagens, livros e cenas.</p>
        </div>
        <StudioSessionControl action="signout" />
      </div>
      <GalleryWorkshop {...data} />
    </>
  );
}
