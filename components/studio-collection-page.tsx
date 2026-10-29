import { requireStudioAuthor } from "@/lib/studio-auth";
import { loadWorkspace } from "@/lib/database";
import { StudioWorkbench } from "@/components/studio-workbench";
import { StudioNavigation } from "@/components/studio-navigation";
import { StudioSessionControl } from "@/components/studio-session-controls";
import { kindLabels, type EntityKind } from "@/lib/workspace";
import Link from "next/link";
export async function StudioCollectionPage({
  kind = "all",
  searchParams,
}: {
  kind?: EntityKind | "all";
  searchParams?: Promise<{ id?: string }>;
}) {
  await requireStudioAuthor();
  const initial = await loadWorkspace();
  const id = (await searchParams)?.id;
  return (
    <>
      <StudioNavigation />
      <div className="workshop-heading">
        <div>
          <p className="eyebrow">Seu universo, conectado</p>
          <h1>{kind === "all" ? "Studio" : kindLabels[kind]}</h1>
          <p>
            Escreva, organize e conecte suas fichas. As alterações são salvas no
            PostgreSQL.
          </p>
        </div>
        <StudioSessionControl action="signout" />
      </div>
      {kind === "all" && (
        <Link href="/studio/manuscritos" className="studio-writing-entry">
          <span>Seu próximo capítulo</span>
          <strong>Continuar escrevendo →</strong>
          <small>Capítulos, cenas e referências na mesma mesa.</small>
        </Link>
      )}
      <div className="db-stats">
        <span>
          {initial.entities.filter((e) => e.kind === "character").length}{" "}
          personagens
        </span>
        <span>
          {initial.entities.filter((e) => e.kind === "document").length} textos
        </span>
        <span>{initial.relations.length} ligações</span>
        <span>
          {
            initial.entities.filter(
              (e) => e.kind === "task" && e.status !== "done",
            ).length
          }{" "}
          tarefas abertas
        </span>
      </div>
      <StudioWorkbench initial={initial} initialKind={kind} initialId={id} />
    </>
  );
}
