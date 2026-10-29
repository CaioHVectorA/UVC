import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicKnowledge } from "@/lib/public-knowledge";
import { kindLabels } from "@/lib/workspace";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = (await params).id;
  const entity = (await getPublicKnowledge()).find(
    (e) => e.id === id && ["concept", "place", "artifact"].includes(e.kind),
  );
  if (!entity) notFound();
  return (
    <article className="character-profile">
      <Link href="/conceitos" className="breadcrumb">
        ← Conceitos e lugares
      </Link>
      <header>
        <p className="eyebrow">{kindLabels[entity.kind]}</p>
        <h1>{entity.title}</h1>
        <div className="character-profile-description db-public-text">
          {entity.body}
        </div>
      </header>
    </article>
  );
}
