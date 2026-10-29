import Link from "next/link";
import { getPublicKnowledge } from "@/lib/public-knowledge";
import { PageIntro } from "@/components/ui";
import { kindLabels } from "@/lib/workspace";
export const dynamic = "force-dynamic";
export const metadata = { title: "Conceitos e lugares" };
export default async function Page() {
  const entries = (await getPublicKnowledge()).filter((e) =>
    ["concept", "place", "artifact"].includes(e.kind),
  );
  return (
    <>
      <PageIntro label="Conheça o universo" title="Conceitos e lugares">
        As ideias, lugares e objetos que fazem parte das histórias.
      </PageIntro>
      <div className="published-characters">
        {entries.map((e) => (
          <article className="character-card" key={e.id}>
            <p className="eyebrow">{kindLabels[e.kind]}</p>
            <h2>
              <Link href={`/conceitos/${e.id}`}>{e.title} ↗</Link>
            </h2>
            <p>{e.summary}</p>
          </article>
        ))}
      </div>
    </>
  );
}
