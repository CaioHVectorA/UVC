"use client";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Save,
  Plus,
  Search,
  Link2,
  History,
  Download,
  Database,
  Map,
  Eye,
  FileText,
  BookOpen,
  Users,
} from "lucide-react";
import {
  narrativeRoles,
  type NarrativeRole,
  isNarrativeRole,
  getRoleBadgeStyle,
  getCharacterParticipations,
  getStoryCast,
} from "@/lib/narrative-roles";
import {
  kindLabels,
  kinds,
  blankEntity,
  type StudioEntity,
  type StudioRelation,
  type StudioWorkspace,
  type EntityKind,
} from "@/lib/workspace";
import { useUnsavedWork } from "@/components/use-unsaved-work";
import { DocxImportDialog } from "@/components/docx-import-dialog";
import assets from "@/data/studio-assets.json";
const KnowledgeMap = dynamic(() => import("@/components/knowledge-map"), {
  ssr: false,
  loading: () => <div className="map-loading">Preparando o mapa…</div>,
});
const labels = {
  draft: "Rascunho",
  review: "Em revisão",
  ready: "Pronto",
  done: "Concluído",
};
async function api<T>(url: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const value = await response.json();
  if (!response.ok)
    throw new Error(value.error || "Não foi possível concluir.");
  return value;
}
export function StudioWorkbench({
  initial,
  initialKind = "all",
  initialId,
}: {
  initial: StudioWorkspace;
  initialKind?: EntityKind | "all";
  initialId?: string;
}) {
  const first =
    initial.entities.find((e) => e.id === initialId) ??
    initial.entities.find((e) =>
      initialKind === "all"
        ? e.id === "story-marginal"
        : e.kind === initialKind,
    ) ??
    initial.entities[0];
  const [workspace, setWorkspace] = useState(initial),
    [draft, setDraft] = useState<StudioEntity | undefined>(first),
    [filter, setFilter] = useState<EntityKind | "all">(initialKind),
    [search, setSearch] = useState(""),
    [dirty, setDirty] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [feedback, setFeedback] = useState(""),
    [showMap, setShowMap] = useState(
      initialKind !== "document" && initialKind !== "visual",
    ),
    [depth, setDepth] = useState(1),
    [allMap, setAllMap] = useState(false),
    [mapWide, setMapWide] = useState(false),
    [preview, setPreview] = useState(false),
    [target, setTarget] = useState(""),
    [relationSearch, setRelationSearch] = useState(""),
    [relationLabel, setRelationLabel] = useState("relacionado a"),
    [history, setHistory] = useState<
      | {
          id: number;
          version: number;
          snapshot: StudioEntity;
          created_at: string;
        }[]
      | null
    >(null);
  const saveRef = useRef<() => void>(() => {});
  const importRef = useRef<HTMLInputElement>(null);
  const [docxFile, setDocxFile] = useState<File>();
  const [tagText, setTagText] = useState(first?.tags.join(", ") ?? "");
  const selectedTags = draft?.tags.join(", ") ?? "";
  useEffect(() => {
    setTagText(selectedTags);
  }, [draft?.id, selectedTags]);
  useUnsavedWork(dirty);
  const [selectedStoryId, setSelectedStoryId] = useState("");
  const [selectedRole, setSelectedRole] =
    useState<NarrativeRole>("Protagonista");
  const [rolePending, setRolePending] = useState(false);
  const [newCastCharId, setNewCastCharId] = useState("");
  const [newCastRole, setNewCastRole] = useState<NarrativeRole>("Protagonista");

  const characterParticipations = useMemo(() => {
    if (!draft || draft.kind !== "character") return [];
    return getCharacterParticipations(
      draft.id,
      workspace.relations,
      workspace.entities,
    );
  }, [draft, workspace.relations, workspace.entities]);

  const storyCast = useMemo(() => {
    if (!draft || draft.kind !== "story") return null;
    return getStoryCast(draft.id, workspace.relations, workspace.entities);
  }, [draft, workspace.relations, workspace.entities]);

  const allStories = useMemo(
    () =>
      workspace.entities
        .filter((e) => e.kind === "story")
        .sort((a, b) => a.title.localeCompare(b.title, "pt-BR")),
    [workspace.entities],
  );

  const allCharacters = useMemo(
    () =>
      workspace.entities
        .filter((e) => e.kind === "character")
        .sort((a, b) => a.title.localeCompare(b.title, "pt-BR")),
    [workspace.entities],
  );

  const query = search.toLocaleLowerCase("pt-BR").trim();
  const filtered = workspace.entities
    .filter(
      (e) =>
        (filter === "all" || e.kind === filter) &&
        `${e.title} ${e.summary} ${e.tags.join(" ")}`
          .toLocaleLowerCase("pt-BR")
          .includes(query),
    )
    .sort((a, b) =>
      filter === "all"
        ? a.id === draft?.id
          ? -1
          : b.id === draft?.id
            ? 1
            : [
                "story",
                "task",
                "document",
                "character",
                "concept",
                "place",
                "artifact",
                "faction",
                "event",
                "visual",
              ].indexOf(a.kind) -
                [
                  "story",
                  "task",
                  "document",
                  "character",
                  "concept",
                  "place",
                  "artifact",
                  "faction",
                  "event",
                  "visual",
                ].indexOf(b.kind) || a.title.localeCompare(b.title, "pt-BR")
        : filter === "event"
          ? Number(a.attributes.order ?? 0) - Number(b.attributes.order ?? 0)
          : a.title.localeCompare(b.title, "pt-BR"),
    );
  const connections = workspace.relations.filter(
    (r) => r.sourceId === draft?.id || r.targetId === draft?.id,
  );
  function select(id: string) {
    if (pending) return;
    if (id === draft?.id) return;
    if (
      dirty &&
      !window.confirm(
        "Há alterações sem salvar. Trocar de ficha e descartá-las?",
      )
    )
      return;
    const entity = workspace.entities.find((e) => e.id === id);
    if (entity) {
      setDraft(entity);
      setFilter(entity.kind);
      setDirty(false);
      setError("");
      setFeedback("");
      setHistory(null);
      setPreview(false);
      setTarget("");
    }
  }
  function update(patch: Partial<StudioEntity>) {
    if (!draft) return;
    setDraft({ ...draft, ...patch });
    setDirty(true);
    setFeedback("");
  }
  function attr(key: string, value: unknown) {
    if (draft) update({ attributes: { ...draft.attributes, [key]: value } });
  }
  async function save() {
    if (!draft || pending) return;
    setPending(true);
    setError("");
    try {
      const payload = Object.fromEntries(
        Object.entries(draft).filter(([key]) => key !== "updatedAt"),
      );
      const saved = await api<StudioEntity>(
        "/api/studio/entities",
        "PUT",
        payload,
      );
      setWorkspace((w) => ({
        ...w,
        entities: [...w.entities.filter((e) => e.id !== saved.id), saved],
      }));
      setDraft(saved);
      setDirty(false);
      setFeedback("Salvo no PostgreSQL.");
      setHistory(null);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setPending(false);
    }
  }
  useEffect(() => {
    saveRef.current = () => {
      void save();
    };
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  function create(kind: EntityKind) {
    if (pending) return;
    if (
      dirty &&
      !window.confirm("Descartar as alterações atuais e criar outra ficha?")
    )
      return;
    const entity = blankEntity(kind);
    if (kind === "visual") entity.attributes = { assetId: assets[0].id };
    setDraft(entity);
    setFilter(kind);
    setDirty(true);
    setHistory(null);
    setError("");
    setFeedback("");
    setPreview(false);
  }
  function download() {
    if (!draft) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `uvc-${draft.id}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setFeedback(
      "Cópia da ficha baixada. O botão Salvar grava a versão no banco.",
    );
  }
  async function reload() {
    if (pending) return;
    if (
      dirty &&
      !window.confirm(
        "Recarregar a versão do banco e descartar as alterações atuais? Baixe uma cópia antes se precisar.",
      )
    )
      return;
    try {
      const fresh = await api<StudioWorkspace>("/api/studio/workspace");
      setWorkspace(fresh);
      setDraft(
        fresh.entities.find((e) => e.id === draft?.id) ?? fresh.entities[0],
      );
      setDirty(false);
      setError("");
      setFeedback("Versão do banco recarregada.");
    } catch (error) {
      setError((error as Error).message);
    }
  }
  async function connect(sourceId = draft?.id, targetId = target) {
    if (!sourceId || !targetId) return;
    if (!workspace.entities.some((e) => e.id === sourceId)) {
      setError("Salve a ficha antes de criar vínculos.");
      return;
    }
    try {
      const relation = await api<StudioRelation>(
        "/api/studio/relations",
        "POST",
        { id: crypto.randomUUID(), sourceId, targetId, label: relationLabel },
      );
      setWorkspace((w) => ({ ...w, relations: [...w.relations, relation] }));
      setFeedback("Vínculo salvo no banco.");
      setTarget("");
    } catch (error) {
      setError((error as Error).message);
    }
  }
  async function removeRelation(relation: StudioRelation) {
    if (
      !window.confirm("Remover este vínculo? As duas fichas serão preservadas.")
    )
      return;
    try {
      await api("/api/studio/relations", "DELETE", { id: relation.id });
      setWorkspace((w) => ({
        ...w,
        relations: w.relations.filter((r) => r.id !== relation.id),
      }));
      setFeedback("Vínculo removido.");
    } catch (error) {
      setError((error as Error).message);
    }
  }

  async function handleAssignRole(storyId: string, role: NarrativeRole) {
    if (!draft || draft.kind !== "character" || !storyId) return;
    if (!workspace.entities.some((e) => e.id === draft.id) || !draft.version) {
      setError(
        "Salve o personagem no banco antes de atribuir papéis narrativos.",
      );
      return;
    }
    setRolePending(true);
    setError("");
    try {
      const existing = workspace.relations.filter(
        (r) =>
          ((r.sourceId === draft.id && r.targetId === storyId) ||
            (r.targetId === draft.id && r.sourceId === storyId)) &&
          isNarrativeRole(r.label),
      );

      if (
        existing.some(
          (r) =>
            r.sourceId === draft.id &&
            r.targetId === storyId &&
            r.label === role,
        )
      ) {
        setFeedback(
          `Este personagem já está atribuído como ${role} nesta história.`,
        );
        return;
      }

      for (const oldRel of existing) {
        await api("/api/studio/relations", "DELETE", { id: oldRel.id });
      }

      const newRelation = await api<StudioRelation>(
        "/api/studio/relations",
        "POST",
        {
          id: crypto.randomUUID(),
          sourceId: draft.id,
          targetId: storyId,
          label: role,
        },
      );

      const existingIds = new Set(existing.map((r) => r.id));
      setWorkspace((w) => ({
        ...w,
        relations: [
          ...w.relations.filter((r) => !existingIds.has(r.id)),
          newRelation,
        ],
      }));
      setFeedback(`Papel de ${role} salvo no PostgreSQL.`);
      setSelectedStoryId("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRolePending(false);
    }
  }

  async function handleRemoveRole(relationId: string) {
    try {
      await api("/api/studio/relations", "DELETE", { id: relationId });
      setWorkspace((w) => ({
        ...w,
        relations: w.relations.filter((r) => r.id !== relationId),
      }));
      setFeedback("Papel narrativo removido.");
      setError("");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleAddStoryCast(characterId: string, role: NarrativeRole) {
    if (!draft || draft.kind !== "story" || !characterId) return;
    if (!workspace.entities.some((e) => e.id === draft.id) || !draft.version) {
      setError("Salve a história antes de escalar personagens.");
      return;
    }
    setRolePending(true);
    setError("");
    try {
      const existing = workspace.relations.filter(
        (r) =>
          ((r.sourceId === characterId && r.targetId === draft.id) ||
            (r.targetId === characterId && r.sourceId === draft.id)) &&
          isNarrativeRole(r.label),
      );

      for (const oldRel of existing) {
        await api("/api/studio/relations", "DELETE", { id: oldRel.id });
      }

      const newRelation = await api<StudioRelation>(
        "/api/studio/relations",
        "POST",
        {
          id: crypto.randomUUID(),
          sourceId: characterId,
          targetId: draft.id,
          label: role,
        },
      );

      const existingIds = new Set(existing.map((r) => r.id));
      setWorkspace((w) => ({
        ...w,
        relations: [
          ...w.relations.filter((r) => !existingIds.has(r.id)),
          newRelation,
        ],
      }));
      setFeedback(`Personagem escalado como ${role}.`);
      setNewCastCharId("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRolePending(false);
    }
  }

  async function importFile(file: File) {
    if (
      dirty &&
      !window.confirm(
        "Importar outro manuscrito e descartar as alterações desta ficha? Baixe ou salve antes se precisar.",
      )
    )
      return;
    if (/\.docx$/i.test(file.name)) {
      setDocxFile(file);
      return;
    }
    setPending(true);
    setError("");
    try {
      const data = new FormData();
      data.set("file", file);
      data.set("storyId", "story-marginal");
      const response = await fetch("/api/studio/import", {
        method: "POST",
        body: data,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      const fresh = await api<StudioWorkspace>("/api/studio/workspace");
      setWorkspace(fresh);
      setDraft(fresh.entities.find((e) => e.id === result.id));
      setFilter("document");
      setShowMap(false);
      setDirty(false);
      setFeedback(
        "Manuscrito importado no PostgreSQL. O original está preservado e privado.",
      );
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setPending(false);
      if (importRef.current) importRef.current.value = "";
    }
  }
  const wordCount = draft?.body.trim().split(/\s+/).filter(Boolean).length ?? 0;
  return (
    <div className={`db-workbench ${mapWide ? "map-wide" : ""}`}>
      {docxFile && (
        <DocxImportDialog
          file={docxFile}
          storyId="story-marginal"
          projectTitle="Marginal"
          onCancel={() => setDocxFile(undefined)}
          onComplete={(fresh, id) => {
            setWorkspace(fresh);
            setDraft(fresh.entities.find((e) => e.id === id));
            setFilter("document");
            setDirty(false);
            setHistory(null);
            setPreview(false);
            setSearch("");
            setError("");
            setDocxFile(undefined);
            setFeedback(
              "DOCX importado no PostgreSQL. Abra Escrita para continuar.",
            );
          }}
        />
      )}
      <div className="db-commandbar">
        <div>
          <Database size={18} aria-hidden />
          <span>
            PostgreSQL{" "}
            <small>{dirty ? "Alterações não salvas" : "Versão salva"}</small>
          </span>
        </div>
        <div className="workshop-actions">
          <button
            className="button button-secondary"
            disabled={pending}
            onClick={() => importRef.current?.click()}
          >
            Importar manuscrito
          </button>
          <input
            className="sr-only"
            aria-label="Importar manuscrito PDF, DOCX ou texto"
            ref={importRef}
            type="file"
            accept=".pdf,.txt,.md,.docx,application/pdf,text/plain"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importFile(file);
            }}
          />
          <button
            className="button button-primary"
            disabled={!draft || pending || !draft.title.trim()}
            onClick={() => void save()}
          >
            <Save size={16} aria-hidden />
            {pending ? "Salvando…" : "Salvar"}
          </button>
          <button
            className="button button-secondary"
            onClick={download}
            disabled={!draft}
          >
            <Download size={16} aria-hidden />
            Baixar ficha
          </button>
          <button
            className="button button-secondary"
            onClick={() => void reload()}
          >
            Recarregar banco
          </button>
        </div>
      </div>
      <p className="workshop-feedback" role="status">
        {feedback}
      </p>
      {error && (
        <p role="alert" className="workshop-error">
          {error} Seu texto permanece nesta tela.
        </p>
      )}
      <div
        className={`db-workspace-grid ${showMap ? "with-map" : "without-map"}`}
      >
        <aside className="db-library" aria-label="Biblioteca do Studio">
          <label className="search-field">
            <Search size={17} aria-hidden />
            <span className="sr-only">Buscar no Studio</span>
            <input
              type="search"
              value={search}
              placeholder="Buscar fichas, textos e tags"
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label htmlFor="db-kind">Coleção</label>
          <select
            id="db-kind"
            value={filter}
            onChange={(e) => setFilter(e.target.value as EntityKind | "all")}
          >
            <option value="all">Todo o universo</option>
            {kinds.map((kind) => (
              <option key={kind} value={kind}>
                {kindLabels[kind]}
              </option>
            ))}
          </select>
          <button
            className="button button-secondary"
            onClick={() => create(filter === "all" ? "concept" : filter)}
          >
            <Plus size={16} aria-hidden />
            Nova ficha
          </button>
          <p className="results-label" role="status">
            {filtered.length} fichas
          </p>
          <div className="db-entity-list">
            {filtered.map((entity) => (
              <button
                key={entity.id}
                disabled={pending}
                aria-pressed={draft?.id === entity.id}
                onClick={() => select(entity.id)}
              >
                <small>{kindLabels[entity.kind]}</small>
                <strong>{entity.title}</strong>
                <span>{labels[entity.status]}</span>
              </button>
            ))}
          </div>
          {!filtered.length && (
            <p className="empty-state">Nenhuma ficha nesta busca.</p>
          )}
        </aside>
        <div className="db-main">
          <div className="db-view-controls">
            <button
              className="button button-secondary"
              aria-pressed={showMap}
              onClick={() => setShowMap((v) => !v)}
            >
              <Map size={16} aria-hidden />
              {showMap ? "Recolher mapa" : "Abrir mapa"}
            </button>
            {showMap && (
              <button
                className="button button-secondary"
                onClick={() => setMapWide((value) => !value)}
              >
                {mapWide ? "Voltar ao editor" : "Expandir mapa"}
              </button>
            )}
            <span>
              Conexões{" "}
              {draft ? `de ${draft.title || "nova ficha"}` : "do universo"}
            </span>
            {showMap && (
              <>
                <label>
                  Alcance
                  <select
                    aria-label="Alcance das conexões"
                    value={depth}
                    onChange={(e) => setDepth(Number(e.target.value))}
                  >
                    <option value={1}>Diretas</option>
                    <option value={2}>Dois passos</option>
                  </select>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={allMap}
                    onChange={(e) => setAllMap(e.target.checked)}
                  />
                  Todo o universo
                </label>
              </>
            )}
          </div>
          {filter === "event" && (
            <details className="db-timeline" open>
              <summary>Percurso temporal · {filtered.length} eventos</summary>
              <ol>
                {filtered.map((event) => (
                  <li key={event.id}>
                    <button
                      aria-pressed={draft?.id === event.id}
                      onClick={() => select(event.id)}
                    >
                      <small>
                        {String(
                          event.attributes.dateLabel ??
                            (event.attributes.era
                              ? "Era"
                              : (workspace.entities.find(
                                  (entity) =>
                                    entity.id ===
                                    `era-${event.attributes.eraId}`,
                                )?.title ?? "Sem data definida")),
                        )}
                      </small>
                      <strong>{event.title}</strong>
                      <span>{event.summary}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </details>
          )}
          {showMap && (
            <KnowledgeMap
              workspace={workspace}
              focusId={draft?.id ?? "story-marginal"}
              depth={depth}
              all={allMap}
              onSelect={select}
              onConnect={(connection) => {
                if (connection.source && connection.target)
                  void connect(connection.source, connection.target);
              }}
              onSaveLayout={(positions) => {
                void api("/api/studio/layout", "POST", positions)
                  .then(() => {
                    setWorkspace((w) => ({
                      ...w,
                      positions: {
                        ...w.positions,
                        ...Object.fromEntries(
                          positions.map((p) => [p.id, { x: p.x, y: p.y }]),
                        ),
                      },
                    }));
                    setFeedback("Layout do mapa salvo no PostgreSQL.");
                  })
                  .catch((error) => setError(error.message));
              }}
            />
          )}
          {draft && (
            <section
              className="db-editor"
              aria-label="Editor da ficha"
              aria-busy={pending}
            >
              <div className="db-editor-heading">
                <span className="eyebrow">{kindLabels[draft.kind]}</span>
                <div>
                  <button
                    className="text-link"
                    disabled={draft.version === 0}
                    onClick={() => {
                      void api<typeof history>(
                        `/api/studio/entities?id=${encodeURIComponent(draft.id)}`,
                      )
                        .then(setHistory)
                        .catch((error) => setError(error.message));
                    }}
                  >
                    <History size={16} aria-hidden />
                    Histórico
                  </button>
                  <button
                    className="text-link"
                    aria-pressed={preview}
                    onClick={() => setPreview((v) => !v)}
                  >
                    {preview ? (
                      <FileText size={16} aria-hidden />
                    ) : (
                      <Eye size={16} aria-hidden />
                    )}
                    {preview ? "Editar" : "Leitura"}
                  </button>
                </div>
              </div>
              <fieldset className="db-editor-fields" disabled={pending}>
                <legend className="sr-only">Campos da ficha</legend>
                <label htmlFor="entity-title">Nome ou título</label>
                <input
                  id="entity-title"
                  value={draft.title}
                  maxLength={200}
                  onChange={(e) => update({ title: e.target.value })}
                />
                <div className="db-field-row">
                  <div>
                    <label htmlFor="entity-status">Estado</label>
                    <select
                      id="entity-status"
                      value={draft.status}
                      onChange={(e) =>
                        update({
                          status: e.target.value as StudioEntity["status"],
                        })
                      }
                    >
                      {Object.entries(labels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="entity-tags">Tags</label>
                    <input
                      id="entity-tags"
                      value={tagText}
                      onChange={(e) => {
                        setTagText(e.target.value);
                        update({
                          tags: e.target.value
                            .split(",")
                            .map((t) => t.trim())
                            .filter(Boolean)
                            .slice(0, 30),
                        });
                      }}
                    />
                  </div>
                </div>
                {draft.kind === "visual" && (
                  <>
                    <label htmlFor="entity-visual-category">
                      Categoria visual
                    </label>
                    <select
                      id="entity-visual-category"
                      value={String(draft.attributes.category ?? "Artes")}
                      onChange={(e) => attr("category", e.target.value)}
                    >
                      {["Artes", "Estudos", "Cenários", "Símbolos"].map(
                        (category) => (
                          <option key={category}>{category}</option>
                        ),
                      )}
                    </select>
                    <label htmlFor="entity-asset">Imagem da codebase</label>
                    <select
                      id="entity-asset"
                      value={String(draft.attributes.assetId ?? "")}
                      onChange={(e) => attr("assetId", e.target.value)}
                    >
                      {assets.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.source}
                        </option>
                      ))}
                    </select>
                    {typeof draft.attributes.assetId === "string" && (
                      <div className="db-visual-preview">
                        <Image
                          src={`/api/studio/assets/${draft.attributes.assetId}`}
                          alt={draft.title || "Referência visual"}
                          width={800}
                          height={600}
                          unoptimized
                        />
                      </div>
                    )}
                  </>
                )}
                {draft.kind === "character" && (
                  <>
                    <div className="db-field-row">
                      <div>
                        <label htmlFor="entity-group">Afiliação</label>
                        <input
                          id="entity-group"
                          value={String(draft.attributes.equipe ?? "")}
                          onChange={(e) => attr("equipe", e.target.value)}
                        />
                      </div>
                      <div>
                        <label htmlFor="entity-alignment">Alinhamento</label>
                        <input
                          id="entity-alignment"
                          value={String(draft.attributes.alinhamento ?? "")}
                          onChange={(e) => attr("alinhamento", e.target.value)}
                        />
                      </div>
                    </div>
                    <label htmlFor="entity-scale">Escala</label>
                    <select
                      id="entity-scale"
                      value={String(draft.attributes.escala ?? "TERRA")}
                      onChange={(event) => attr("escala", event.target.value)}
                    >
                      <option value="TERRA">Terra</option>
                      <option value="UNIVERSAL">Universal</option>
                      <option value="UNIVERSAL / TERRA">
                        Universal / Terra
                      </option>
                    </select>
                    <label htmlFor="entity-powers">
                      Habilidades e poderes — um por linha
                    </label>
                    <textarea
                      id="entity-powers"
                      rows={4}
                      value={
                        Array.isArray(draft.attributes.poderes)
                          ? draft.attributes.poderes.join("\n")
                          : ""
                      }
                      onChange={(e) =>
                        attr("poderes", e.target.value.split("\n"))
                      }
                    />
                    <label htmlFor="entity-appearances">
                      Aparições — uma por linha
                    </label>
                    <textarea
                      id="entity-appearances"
                      rows={2}
                      value={
                        Array.isArray(draft.attributes.aparicoes)
                          ? draft.attributes.aparicoes.join("\n")
                          : ""
                      }
                      onChange={(e) =>
                        attr("aparicoes", e.target.value.split("\n"))
                      }
                    />

                    {/* Bloco: Histórias em que participa e Papéis Narrativos */}
                    <div className="mt-6 pt-5 border-t border-[#303c49]/80 space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-[#f5f1e8] flex items-center gap-2">
                          <BookOpen
                            size={16}
                            className="text-[#91e3dc]"
                            aria-hidden="true"
                          />
                          <span>Histórias em que participa</span>
                        </h2>
                        <span className="text-[11px] text-[#b0b8bf]">
                          {characterParticipations.length}{" "}
                          {characterParticipations.length === 1
                            ? "história"
                            : "histórias"}
                        </span>
                      </div>

                      {/* Lista de participações ativas */}
                      <div className="space-y-2">
                        {characterParticipations.map((p) => {
                          const style = getRoleBadgeStyle(p.role);
                          return (
                            <div
                              key={p.relationId}
                              className="flex items-center justify-between p-2.5 rounded-xl bg-[#10151c] border border-[#303c49] hover:border-[#91e3dc]/40 transition"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span
                                  className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border shrink-0 ${style.badgeClass}`}
                                >
                                  {p.role}
                                </span>
                                <button
                                  type="button"
                                  className="text-xs font-medium text-[#f5f1e8] hover:text-[#91e3dc] truncate transition text-left cursor-pointer"
                                  onClick={() => select(p.storyId)}
                                  title={`Abrir história: ${p.storyTitle}`}
                                >
                                  {p.storyTitle}
                                </button>
                              </div>
                              <button
                                type="button"
                                className="text-xs text-[#ff746a] hover:text-[#ff948b] transition px-2 py-1 shrink-0 cursor-pointer"
                                aria-label={`Remover papel ${p.role} de ${draft.title} em ${p.storyTitle}`}
                                onClick={() =>
                                  void handleRemoveRole(p.relationId)
                                }
                              >
                                Remover
                              </button>
                            </div>
                          );
                        })}

                        {characterParticipations.length === 0 && (
                          <p className="text-xs text-[#b0b8bf] italic py-2">
                            Nenhuma participação atribuída ainda. Escolha uma
                            história abaixo.
                          </p>
                        )}
                      </div>

                      {/* Card para vincular a uma história */}
                      <div className="p-3.5 rounded-xl bg-[#10151c]/60 border border-[#303c49] space-y-3">
                        <div className="space-y-1">
                          <label
                            htmlFor="character-assign-story"
                            className="text-xs font-semibold text-[#f5f1e8] block"
                          >
                            Vincular a uma História
                          </label>
                          <select
                            id="character-assign-story"
                            value={selectedStoryId}
                            onChange={(e) => setSelectedStoryId(e.target.value)}
                            className="w-full text-xs p-2 rounded-lg bg-[#18202a] border border-[#303c49] text-[#f5f1e8] focus:border-[#91e3dc] outline-none"
                          >
                            <option value="">Selecione uma história</option>
                            {allStories.map((story) => (
                              <option key={story.id} value={story.id}>
                                {story.title}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <span className="text-[11px] font-semibold text-[#b0b8bf] uppercase tracking-wider block">
                            Papel Narrativo
                          </span>
                          <div
                            className="flex flex-wrap gap-1.5"
                            role="radiogroup"
                            aria-label="Papel Narrativo do Personagem"
                          >
                            {narrativeRoles.map((role) => {
                              const isSelected = selectedRole === role;
                              const style = getRoleBadgeStyle(role);
                              return (
                                <label
                                  key={role}
                                  className={`relative overflow-hidden text-xs px-2.5 py-1 rounded-full border transition cursor-pointer flex items-center gap-1.5 ${
                                    isSelected
                                      ? `${style.badgeClass} ring-1 ring-offset-1 ring-offset-[#10151c] ring-current font-bold`
                                      : "bg-[#18202a] text-[#b0b8bf] border-[#303c49] hover:border-[#b0b8bf]/40"
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name="character-narrative-role"
                                    value={role}
                                    checked={isSelected}
                                    onChange={() => setSelectedRole(role)}
                                    className="sr-only"
                                    style={{
                                      position: "absolute",
                                      width: 1,
                                      height: 1,
                                      padding: 0,
                                      margin: -1,
                                      overflow: "hidden",
                                      clip: "rect(0, 0, 0, 0)",
                                      border: 0,
                                    }}
                                  />
                                  <span>{role}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        <button
                          type="button"
                          className="button button-secondary w-full justify-center text-xs py-2 cursor-pointer"
                          disabled={
                            !selectedStoryId || !draft.version || rolePending
                          }
                          onClick={() =>
                            void handleAssignRole(selectedStoryId, selectedRole)
                          }
                        >
                          <Plus size={14} aria-hidden="true" />
                          <span>Atribuir Papel à História</span>
                        </button>
                        {!draft.version && (
                          <p className="text-[11px] text-[#edc993] italic">
                            Salve o personagem antes de vincular papéis.
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}
                {draft.kind === "story" && storyCast && (
                  <div className="mt-6 pt-5 border-t border-[#303c49]/80 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-[#f5f1e8] flex items-center gap-2">
                        <Users
                          size={16}
                          className="text-[#edc993]"
                          aria-hidden="true"
                        />
                        <span>Elenco da História por Papel Narrativo</span>
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {narrativeRoles.map((role) => {
                        const members = storyCast[role] || [];
                        const style = getRoleBadgeStyle(role);
                        return (
                          <div
                            key={role}
                            className="p-3 rounded-xl bg-[#10151c] border border-[#303c49] space-y-2"
                          >
                            <div className="flex items-center justify-between border-b border-[#303c49]/60 pb-1.5">
                              <span
                                className={`text-[11px] font-bold uppercase tracking-wider ${style.badgeClass} px-2 py-0.5 rounded border`}
                              >
                                {role}s ({members.length})
                              </span>
                            </div>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {members.map(({ character, relationId }) => (
                                <div
                                  key={character.id}
                                  className="flex items-center justify-between text-xs py-1 px-1.5 rounded hover:bg-[#18202a] transition"
                                >
                                  <button
                                    type="button"
                                    className="text-[#f5f1e8] hover:text-[#91e3dc] truncate text-left cursor-pointer font-medium"
                                    onClick={() => select(character.id)}
                                  >
                                    {character.title}
                                  </button>
                                  <button
                                    type="button"
                                    className="text-[#ff746a] hover:text-[#ff948b] text-[11px] px-1 cursor-pointer"
                                    aria-label={`Remover ${character.title} do elenco`}
                                    onClick={() =>
                                      void handleRemoveRole(relationId)
                                    }
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                              {members.length === 0 && (
                                <span className="text-[11px] text-[#b0b8bf] italic block py-1">
                                  Nenhum personagem atribuído.
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Escalar novo personagem para a história */}
                    <div className="p-3 rounded-xl bg-[#10151c]/60 border border-[#303c49] flex flex-wrap items-end gap-2.5">
                      <div className="flex-1 min-w-[180px] space-y-1">
                        <label
                          htmlFor="story-add-cast-char"
                          className="text-xs font-semibold text-[#f5f1e8] block"
                        >
                          Escalar Personagem
                        </label>
                        <select
                          id="story-add-cast-char"
                          value={newCastCharId}
                          onChange={(e) => setNewCastCharId(e.target.value)}
                          className="w-full text-xs p-2 rounded-lg bg-[#18202a] border border-[#303c49] text-[#f5f1e8] outline-none"
                        >
                          <option value="">Selecione um personagem</option>
                          {allCharacters.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-[140px] space-y-1">
                        <label
                          htmlFor="story-add-cast-role"
                          className="text-xs font-semibold text-[#f5f1e8] block"
                        >
                          Papel
                        </label>
                        <select
                          id="story-add-cast-role"
                          value={newCastRole}
                          onChange={(e) =>
                            setNewCastRole(e.target.value as NarrativeRole)
                          }
                          className="w-full text-xs p-2 rounded-lg bg-[#18202a] border border-[#303c49] text-[#f5f1e8] outline-none"
                        >
                          {narrativeRoles.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        className="button button-secondary text-xs py-2 px-3 shrink-0 cursor-pointer"
                        disabled={
                          !newCastCharId || !draft.version || rolePending
                        }
                        onClick={() =>
                          void handleAddStoryCast(newCastCharId, newCastRole)
                        }
                      >
                        <Plus size={14} aria-hidden="true" />
                        <span>Escalar</span>
                      </button>
                    </div>
                  </div>
                )}
                {draft.kind === "event" && (
                  <div className="db-field-row">
                    <div>
                      <label htmlFor="entity-time">
                        Data, era ou referência temporal
                      </label>
                      <input
                        id="entity-time"
                        value={String(
                          draft.attributes.dateLabel ??
                            draft.attributes.eraId ??
                            "",
                        )}
                        onChange={(e) => attr("dateLabel", e.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor="entity-order">Ordem na cronologia</label>
                      <input
                        id="entity-order"
                        type="number"
                        value={Number(draft.attributes.order ?? 0)}
                        onChange={(e) => attr("order", Number(e.target.value))}
                      />
                    </div>
                  </div>
                )}
                {draft.kind === "task" && (
                  <div className="db-field-row">
                    <div>
                      <label htmlFor="entity-due">Prazo</label>
                      <input
                        id="entity-due"
                        type="date"
                        value={String(draft.attributes.dueDate ?? "")}
                        onChange={(e) => attr("dueDate", e.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor="entity-priority">Prioridade</label>
                      <select
                        id="entity-priority"
                        value={String(draft.attributes.priority ?? "normal")}
                        onChange={(e) => attr("priority", e.target.value)}
                      >
                        <option value="low">Baixa</option>
                        <option value="normal">Normal</option>
                        <option value="high">Alta</option>
                      </select>
                    </div>
                  </div>
                )}
                <label htmlFor="entity-summary">Resumo</label>
                <textarea
                  id="entity-summary"
                  rows={2}
                  maxLength={2000}
                  value={draft.summary}
                  onChange={(e) => update({ summary: e.target.value })}
                />
                <label htmlFor="entity-body">
                  {draft.kind === "visual"
                    ? "Descrição visual"
                    : draft.kind === "document"
                      ? "Texto do manuscrito"
                      : draft.kind === "concept"
                        ? "Definição, regras e exemplos"
                        : "Descrição e conteúdo"}
                </label>
                {preview ? (
                  <div className="db-reading-preview" tabIndex={0}>
                    {draft.body || "Esta ficha ainda não tem texto."}
                  </div>
                ) : (
                  <textarea
                    id="entity-body"
                    className={
                      draft.kind === "document" ? "manuscript-editor" : ""
                    }
                    rows={draft.kind === "document" ? 30 : 8}
                    maxLength={500000}
                    value={draft.body}
                    onChange={(e) => update({ body: e.target.value })}
                  />
                )}
                {typeof draft.attributes.sourceFileId === "string" && (
                  <a
                    className="text-link"
                    href={`/api/studio/files/${draft.attributes.sourceFileId}`}
                    download
                  >
                    Baixar documento original
                  </a>
                )}
                <p className="db-word-count">
                  {wordCount.toLocaleString("pt-BR")} palavras · Versão{" "}
                  {draft.version} · Ctrl/Cmd + S para salvar
                </p>
                {draft.kind === "character" && (
                  <details className="db-character-development">
                    <summary>Construção do personagem · privado</summary>
                    {[
                      { key: "papel", label: "Papel na história" },
                      { key: "desejo", label: "O que ele quer?" },
                      { key: "conflito", label: "O que o impede?" },
                      { key: "limites", label: "Limites e vulnerabilidades" },
                      { key: "arco", label: "Arco do personagem" },
                    ].map((field) => (
                      <div key={field.key}>
                        <label htmlFor={`character-${field.key}`}>
                          {field.label}
                        </label>
                        <textarea
                          id={`character-${field.key}`}
                          rows={3}
                          maxLength={5000}
                          value={String(draft.attributes[field.key] ?? "")}
                          onChange={(event) =>
                            attr(field.key, event.target.value)
                          }
                        />
                      </div>
                    ))}
                  </details>
                )}
                <label htmlFor="entity-private-notes">
                  Notas privadas de trabalho
                </label>
                <textarea
                  id="entity-private-notes"
                  rows={3}
                  value={String(draft.attributes.privateNotes ?? "")}
                  onChange={(e) => attr("privateNotes", e.target.value)}
                />
                {[
                  "character",
                  "concept",
                  "place",
                  "artifact",
                  "visual",
                ].includes(draft.kind) && (
                  <label className="db-publish-option">
                    <input
                      type="checkbox"
                      checked={draft.published}
                      onChange={(e) => update({ published: e.target.checked })}
                    />
                    Mostrar esta ficha no site público após salvar
                  </label>
                )}
                <div className="db-editor-footer">
                  <span>
                    Fonte:{" "}
                    {String(draft.attributes.source ?? "Criado no Studio")}
                  </span>
                  <button
                    className="button button-primary"
                    disabled={pending || !draft.title.trim()}
                    onClick={() => void save()}
                  >
                    <Save size={16} aria-hidden />
                    Salvar ficha
                  </button>
                </div>
              </fieldset>
              {history && (
                <div className="db-history">
                  <h2>Histórico da ficha</h2>
                  {!history.length ? (
                    <p>
                      As versões anteriores aparecerão após a primeira edição
                      salva.
                    </p>
                  ) : (
                    history.map((revision) => (
                      <button
                        key={revision.id}
                        onClick={() => {
                          if (
                            dirty &&
                            !window.confirm(
                              "Substituir as alterações pela versão do histórico?",
                            )
                          )
                            return;
                          setDraft({
                            ...revision.snapshot,
                            version: draft.version,
                            updatedAt: draft.updatedAt,
                          });
                          setDirty(true);
                          setFeedback(
                            "Versão anterior carregada para revisão. Salve para criar uma nova versão.",
                          );
                        }}
                      >
                        Versão {revision.version} ·{" "}
                        {new Date(revision.created_at).toLocaleString("pt-BR")}
                      </button>
                    ))
                  )}
                </div>
              )}
            </section>
          )}
        </div>
        <aside className="db-connections" aria-label="Conexões da ficha">
          <h2>
            <Link2 size={18} aria-hidden />
            Conexões
          </h2>
          <p>Os vínculos aparecem também no mapa e nas outras fichas.</p>
          <div className="db-relation-list">
            {connections.map((relation) => {
              const other = workspace.entities.find(
                (e) =>
                  e.id ===
                  (relation.sourceId === draft?.id
                    ? relation.targetId
                    : relation.sourceId),
              );
              return (
                <div key={relation.id}>
                  <span>
                    {relation.sourceId === draft?.id ? "→" : "←"}{" "}
                    {relation.label}
                  </span>
                  <button
                    className="db-connected-title"
                    onClick={() => other && select(other.id)}
                  >
                    {other?.title ?? "Ficha indisponível"}
                  </button>
                  <button
                    className="text-link"
                    aria-label={`Remover vínculo ${relation.label} com ${other?.title}`}
                    onClick={() => void removeRelation(relation)}
                  >
                    Remover
                  </button>
                </div>
              );
            })}
          </div>
          {!connections.length && <p>Nenhuma ligação ainda.</p>}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void connect();
            }}
          >
            <label htmlFor="relation-search">Buscar ficha para ligar</label>
            <input
              id="relation-search"
              type="search"
              value={relationSearch}
              onChange={(event) => setRelationSearch(event.target.value)}
              placeholder="Nome da ficha"
            />
            <label htmlFor="relation-target">Conectar com</label>
            <select
              id="relation-target"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            >
              <option value="">Escolha uma ficha</option>
              {workspace.entities
                .filter(
                  (e) =>
                    e.id !== draft?.id &&
                    (e.id === target ||
                      e.title
                        .toLocaleLowerCase("pt-BR")
                        .includes(relationSearch.toLocaleLowerCase("pt-BR"))),
                )
                .map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.title} · {kindLabels[entity.kind]}
                  </option>
                ))}
            </select>
            <label htmlFor="relation-label">Relação</label>
            <input
              id="relation-label"
              maxLength={120}
              value={relationLabel}
              onChange={(e) => setRelationLabel(e.target.value)}
              placeholder="governa, acontece em, inspira…"
            />
            <button
              className="button button-secondary"
              disabled={!target || !relationLabel.trim() || !draft?.version}
            >
              <Plus size={16} aria-hidden />
              Criar vínculo
            </button>
          </form>
          <details className="db-quick-create">
            <summary>Criar outro tipo de ficha</summary>
            {kinds.map((kind) => (
              <button key={kind} onClick={() => create(kind)}>
                {kindLabels[kind]}
              </button>
            ))}
          </details>
        </aside>
      </div>
    </div>
  );
}
