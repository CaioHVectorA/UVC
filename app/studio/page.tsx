import { getChapters } from "@/lib/chapters";
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
      <Reader chapters={chapters} studio />
    </>
  );
}
