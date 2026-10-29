import type { JSONContent } from "@tiptap/core";
import type { StudioEntity, StudioWorkspace } from "./workspace";

export function documentStory(
  document: StudioEntity,
  workspace: StudioWorkspace,
) {
  if (typeof document.attributes.storyId === "string")
    return document.attributes.storyId;
  const edge = workspace.relations.find(
    (r) =>
      r.sourceId === document.id &&
      workspace.entities.some((e) => e.id === r.targetId && e.kind === "story"),
  );
  return edge?.targetId ?? "unassigned";
}
export function documentType(document: StudioEntity) {
  return document.attributes.sourceFileId
    ? "source"
    : document.attributes.writingType === "scene"
      ? "scene"
      : "chapter";
}
export function documentOrder(a: StudioEntity, b: StudioEntity) {
  return (
    Number(a.attributes.writingOrder ?? a.attributes.order ?? 0) -
      Number(b.attributes.writingOrder ?? b.attributes.order ?? 0) ||
    a.title.localeCompare(b.title, "pt-BR")
  );
}
export function orderedDocuments(
  documents: StudioEntity[],
): { entity: StudioEntity; depth: number }[] {
  const ids = new Set(documents.map((d) => d.id)),
    seen = new Set<string>();
  const result: { entity: StudioEntity; depth: number }[] = [];
  function visit(parent?: string, depth = 0) {
    for (const entity of documents
      .filter((d) =>
        parent
          ? d.attributes.writingParentId === parent
          : !ids.has(String(d.attributes.writingParentId)),
      )
      .sort(documentOrder)) {
      if (seen.has(entity.id)) continue;
      seen.add(entity.id);
      result.push({ entity, depth });
      visit(entity.id, depth + 1);
    }
  }
  visit();
  for (const entity of [...documents].sort(documentOrder))
    if (!seen.has(entity.id)) result.push({ entity, depth: 0 });
  return result;
}
export function writingContent(entity: StudioEntity): JSONContent {
  const rich = entity.attributes.richText;
  if (rich && typeof rich === "object" && "type" in rich && rich.type === "doc")
    return rich as JSONContent;
  return {
    type: "doc",
    content: entity.body.split("\n").map((line) => ({
      type: "paragraph",
      ...(line ? { content: [{ type: "text", text: line }] } : {}),
    })),
  };
}
export function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/u).length : 0;
}
export function writingPayload(entity: StudioEntity) {
  return Object.fromEntries(
    Object.entries(entity).filter(([key]) => key !== "updatedAt"),
  );
}
