import { getChapters } from "@/lib/chapters";
import { renderChapters } from "@/lib/render-chapters";
import { Reader } from "@/components/reader";
import { PageIntro } from "@/components/ui";
export const metadata = { title: "Studio do autor" };
export default async function StudioPage() {
  const chapters = await getChapters();
  return (
    <>
      <PageIntro
        label="Do lado de cá das histórias"
        title="Um espaço para olhar de novo."
      >
        Leia os capítulos de Red Right Hand e consulte o cânone ao lado do
        texto. Um lugar para revisão, com espaço para a história respirar.
      </PageIntro>
      <p className="notice">
        Este espaço de revisão é público. O conteúdo é versionado no Git; esta
        página não salva alterações nem armazena manuscritos privados.
      </p>
      {chapters.length ? (
        <Reader chapters={renderChapters(chapters)} studio />
      ) : (
        <div className="empty-state">
          <h2>Nenhum capítulo compartilhado para revisão.</h2>
          <p>A disponibilidade é definida no manifesto de publicação.</p>
        </div>
      )}
    </>
  );
}
