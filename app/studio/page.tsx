import { renderChapters } from "@/lib/render-chapters";
import { Reader } from "@/components/reader";
import { PageIntro } from "@/components/ui";
import { getStudioContent } from "@/lib/studio-content";
import { StudioSessionControl } from "@/components/studio-session-controls";
import { StudioNavigation } from "@/components/studio-navigation";
export const metadata = { title: "Studio do autor" };
export default async function StudioPage() {
  const { chapters, characters } = await getStudioContent();
  return (
    <>
      <StudioNavigation />
      <PageIntro
        label="Do lado de cá das histórias"
        title="Um espaço para olhar de novo."
      >
        Leia os capítulos de Red Right Hand e consulte o cânone ao lado do
        texto. Um lugar para revisão, com espaço para a história respirar.
      </PageIntro>
      <div className="studio-session-bar">
        <p>Sessão do autor · Consulta e revisão</p>
        <StudioSessionControl action="signout" />
      </div>
      <p className="notice">
        As alterações são feitas nos arquivos do projeto. Esta tela é de
        consulta e não salva edições. Os capítulos compartilhados no portal
        seguem a seleção de publicação.
      </p>
      {chapters.length ? (
        <Reader
          chapters={renderChapters(chapters)}
          referenceCharacters={characters}
          studio
        />
      ) : (
        <div className="empty-state">
          <h2>Nenhum capítulo compartilhado para revisão.</h2>
          <p>A disponibilidade é definida no manifesto de publicação.</p>
        </div>
      )}
    </>
  );
}
