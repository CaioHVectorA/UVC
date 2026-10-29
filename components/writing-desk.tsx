"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import type { Editor, JSONContent } from "@tiptap/core";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Check,
  ChevronRight,
  Download,
  FileText,
  Focus,
  History,
  Link2,
  NotebookPen,
  PanelLeft,
  PanelRight,
  Plus,
  Save,
  Search,
  Upload,
  X,
} from "lucide-react";
import {
  blankEntity,
  kindLabels,
  type StudioEntity,
  type StudioRelation,
  type StudioWorkspace,
} from "@/lib/workspace";
import {
  documentOrder,
  documentStory,
  documentType,
  orderedDocuments,
  wordCount,
  writingContent,
} from "@/lib/writing";
import { useWritingDocument } from "./use-writing-document";
const WritingEditor = dynamic(
  () => import("./writing-editor").then((m) => m.WritingEditor),
  {
    ssr: false,
    loading: () => <p className="writing-loading">Preparando seu texto…</p>,
  },
);
async function api<T>(url: string, method = "GET", body?: unknown): Promise<T> {
  const r = await fetch(url, {
    method,
    cache: "no-store",
    ...(body
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Não foi possível concluir.");
  return data;
}
function rememberDocument(id: string) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set("id", id);
  else url.searchParams.delete("id");
  window.history.replaceState(null, "", url);
}
function downloadText(entity: StudioEntity) {
  const url = URL.createObjectURL(
    new Blob([entity.body], { type: "text/plain;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `${entity.title || "manuscrito"}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
const statusLabels = {
  draft: "Rascunho",
  review: "Em revisão",
  ready: "Pronto",
  done: "Concluído",
};
type FlushRef = React.RefObject<() => Promise<boolean>>;

export function WritingDesk({
  initial,
  initialId,
}: {
  initial: StudioWorkspace;
  initialId?: string;
}) {
  const [workspace, setWorkspace] = useState(initial);
  const documents = workspace.entities.filter((e) => e.kind === "document");
  const initialDocument =
    initial.entities.find((e) => e.kind === "document" && e.id === initialId) ??
    documents
      .filter(
        (e) =>
          documentStory(e, initial) === "story-marginal" &&
          documentType(e) !== "source",
      )
      .sort(
        (a, b) =>
          new Date(b.updatedAt ?? 0).getTime() -
          new Date(a.updatedAt ?? 0).getTime(),
      )[0] ??
    initial.entities.find((e) => e.id === "document-marginal-ptp-2025-2") ??
    documents[0];
  const [storyId, setStoryId] = useState(
    initialDocument
      ? documentStory(initialDocument, initial)
      : "story-marginal",
  );
  const [activeId, setActiveId] = useState<string | undefined>(
      initialDocument?.id,
    ),
    [binder, setBinder] = useState(true),
    [inspector, setInspector] = useState(true),
    [focus, setFocus] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [search, setSearch] = useState("");
  const flush = useRef<() => Promise<boolean>>(async () => true),
    fileInput = useRef<HTMLInputElement>(null);
  const active = workspace.entities.find((e) => e.id === activeId);
  const story = workspace.entities.find((e) => e.id === storyId);
  const projectDocuments = documents.filter(
    (e) => documentStory(e, workspace) === storyId,
  );
  const manuscript = projectDocuments.filter(
      (d) => documentType(d) !== "source",
    ),
    sources = projectDocuments.filter((d) => documentType(d) === "source");
  const outline = orderedDocuments([...manuscript]);
  const projectWords = manuscript.reduce((n, d) => n + wordCount(d.body), 0);
  const onSaved = useCallback(
    (saved: StudioEntity) =>
      setWorkspace((w) => ({
        ...w,
        entities: [...w.entities.filter((e) => e.id !== saved.id), saved],
      })),
    [],
  );
  const onRelation = useCallback(
    (relation: StudioRelation) =>
      setWorkspace((w) => ({ ...w, relations: [...w.relations, relation] })),
    [],
  );
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFocus(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 700px)");
    const adapt = () => {
      setBinder(!mobile.matches);
      setInspector(!mobile.matches);
    };
    adapt();
    mobile.addEventListener("change", adapt);
    return () => mobile.removeEventListener("change", adapt);
  }, []);
  async function navigate(id: string, project = storyId) {
    if (busy) return;
    setBusy(true);
    try {
      if (!(await flush.current())) return;
      setStoryId(project);
      setActiveId(id || undefined);
      rememberDocument(id);
      setSearch("");
      setMessage("");
    } finally {
      setBusy(false);
    }
  }
  async function create(type: "chapter" | "scene") {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      if (!(await flush.current())) return;
      const parent =
        type === "scene" && active && documentType(active) !== "source"
          ? documentType(active) === "chapter"
            ? active.id
            : active.attributes.writingParentId
          : undefined;
      const siblings = manuscript.filter(
        (d) => d.attributes.writingParentId === parent,
      );
      const number =
        manuscript.filter((d) => documentType(d) === type).length + 1;
      const entity = {
        ...blankEntity("document"),
        title: `${type === "chapter" ? "Capítulo" : "Cena"} ${number}`,
        attributes: {
          ...(storyId !== "unassigned" ? { storyId } : {}),
          writingType: type,
          ...(parent ? { writingParentId: parent } : {}),
          writingOrder:
            Math.max(
              0,
              ...siblings.map((e) =>
                Number(e.attributes.writingOrder ?? e.attributes.order ?? 0),
              ),
            ) + 1000,
        },
      };
      const saved = await api<StudioEntity>(
        "/api/studio/entities",
        "PUT",
        entity,
      );
      onSaved(saved);
      setActiveId(saved.id);
      rememberDocument(saved.id);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function importFile(file: File) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      if (!(await flush.current())) return;
      const form = new FormData();
      form.set("file", file);
      form.set(
        "storyId",
        storyId === "unassigned" ? "story-marginal" : storyId,
      );
      const response = await fetch("/api/studio/import", {
          method: "POST",
          body: form,
        }),
        data = await response.json();
      if (!response.ok) throw new Error(data.error);
      const fresh = await api<StudioWorkspace>("/api/studio/workspace");
      setWorkspace(fresh);
      setActiveId(data.id);
      rememberDocument(data.id);
      setStoryId(
        documentStory(
          fresh.entities.find((e) => e.id === data.id)!,
          fresh,
        ),
      );
      setMessage(
        "Manuscrito importado no PostgreSQL. O original está preservado.",
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const query = search.trim().toLocaleLowerCase("pt-BR");
  return (
    <section
      className={`writing-desk ${focus ? "is-focused" : ""} ${binder ? "has-binder" : ""} ${inspector ? "has-inspector" : ""}`}
      aria-label="Mesa de escrita"
    >
      <header className="writing-topbar">
        <div className="writing-identity">
          <NotebookPen size={22} aria-hidden />
          <div>
            <h1>Escrita</h1>
            <span>Seu manuscrito, cena a cena.</span>
          </div>
        </div>
        <label className="writing-project">
          <span>Projeto</span>
          <select
            value={storyId}
            disabled={busy}
            onChange={(e) => {
              const id = e.target.value;
              const first = documents
                .filter((d) => documentStory(d, workspace) === id)
                .sort(documentOrder)[0];
              void navigate(first?.id ?? "", id);
            }}
          >
            {workspace.entities
              .filter((e) => e.kind === "story")
              .sort((a, b) =>
                a.id === "story-marginal"
                  ? -1
                  : b.id === "story-marginal"
                    ? 1
                    : a.title.localeCompare(b.title),
              )
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            <option value="unassigned">Sem projeto</option>
          </select>
        </label>
        <div className="writing-view-buttons">
          <button
            type="button"
            aria-label="Estrutura do manuscrito"
            aria-expanded={binder && !focus}
            aria-controls={binder && !focus ? "writing-binder" : undefined}
            onClick={() => {
              setBinder(focus || !binder);
              setFocus(false);
            }}
          >
            <PanelLeft size={18} />
            <span>Estrutura</span>
          </button>
          <button
            type="button"
            aria-label="Notas e referências"
            aria-expanded={inspector && !focus}
            aria-controls={
              inspector && !focus ? "writing-inspector" : undefined
            }
            onClick={() => {
              setInspector(focus || !inspector);
              setFocus(false);
            }}
          >
            <PanelRight size={18} />
            <span>Referências</span>
          </button>
          <button
            type="button"
            aria-pressed={focus}
            onClick={() => setFocus(!focus)}
          >
            <Focus size={18} />
            {focus ? "Sair do foco" : "Foco"}
          </button>
        </div>
      </header>
      {message && (
        <p className="writing-message" role="status">
          {message}
        </p>
      )}
      <div className="writing-grid">
        {binder && !focus && (
          <aside
            className="writing-binder"
            id="writing-binder"
            aria-label="Estrutura do manuscrito"
          >
            <div className="writing-binder-title">
              <BookOpen size={18} />
              <strong>{story?.title ?? "Textos avulsos"}</strong>
            </div>
            <label className="writing-search">
              <Search size={15} aria-hidden />
              <input
                aria-label="Buscar no manuscrito"
                placeholder="Buscar título ou texto"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <div className="writing-create">
              <button
                type="button"
                disabled={busy}
                onClick={() => void create("chapter")}
              >
                <Plus size={15} />
                Capítulo
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void create("scene")}
              >
                <Plus size={15} />
                Cena
              </button>
            </div>
            <h2>
              Manuscrito <span>{manuscript.length}</span>
            </h2>
            <nav aria-label="Capítulos e cenas">
              {outline
                .filter(({ entity }) =>
                  `${entity.title} ${entity.body}`
                    .toLocaleLowerCase("pt-BR")
                    .includes(query),
                )
                .map(({ entity, depth }) => (
                  <button
                    type="button"
                    key={entity.id}
                    className="writing-binder-item"
                    style={{ paddingLeft: 12 + Math.min(depth, 4) * 16 }}
                    aria-current={entity.id === activeId ? "true" : undefined}
                    disabled={busy}
                    onClick={() => void navigate(entity.id)}
                  >
                    <FileText size={15} aria-hidden />
                    <span>
                      {entity.title}
                      <small>
                        {wordCount(entity.body).toLocaleString("pt-BR")}{" "}
                        palavras
                      </small>
                    </span>
                    <i
                      className={`writing-state state-${entity.status}`}
                      title={statusLabels[entity.status]}
                    />
                  </button>
                ))}
            </nav>
            {!manuscript.length && (
              <div className="writing-binder-empty">
                <p>
                  Comece com um capítulo. Depois, divida o trabalho em cenas.
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void create("chapter")}
                >
                  Criar primeiro capítulo
                </button>
              </div>
            )}
            <h2>
              Material de origem <span>{sources.length}</span>
            </h2>
            {sources
              .filter((e) =>
                `${e.title} ${e.body}`
                  .toLocaleLowerCase("pt-BR")
                  .includes(query),
              )
              .map((e) => (
                <button
                  type="button"
                  key={e.id}
                  className="writing-binder-item"
                  aria-current={e.id === activeId ? "true" : undefined}
                  disabled={busy}
                  onClick={() => void navigate(e.id)}
                >
                  <Upload size={15} aria-hidden />
                  <span>
                    {e.title}
                    <small>Original preservado</small>
                  </span>
                </button>
              ))}
            <button
              type="button"
              className="writing-import"
              disabled={busy}
              onClick={() => fileInput.current?.click()}
            >
              <Upload size={15} />
              Importar texto
            </button>
            <input
              ref={fileInput}
              className="sr-only"
              type="file"
              accept=".pdf,.txt,.md"
              aria-label="Importar manuscrito PDF ou texto"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void importFile(file);
                e.target.value = "";
              }}
            />
            <footer>
              <strong>{projectWords.toLocaleString("pt-BR")}</strong> palavras
              no projeto
              <br />
              <span>
                {sources.length ? "Originais preservados · " : ""}Textos
                privados
              </span>
            </footer>
          </aside>
        )}
        {active?.kind === "document" ? (
          <WritingSession
            key={active.id}
            initial={active}
            workspace={workspace}
            storyId={storyId}
            inspector={inspector && !focus}
            flush={flush}
            onSaved={onSaved}
            onRelation={onRelation}
          />
        ) : (
          <div className="writing-empty">
            <NotebookPen size={36} />
            <h2>Um espaço para a próxima história.</h2>
            <p>Crie um capítulo ou importe um manuscrito para começar.</p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void create("chapter")}
            >
              Criar capítulo
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function WritingSession({
  initial,
  workspace,
  storyId,
  inspector,
  flush,
  onSaved,
  onRelation,
}: {
  initial: StudioEntity;
  workspace: StudioWorkspace;
  storyId: string;
  inspector: boolean;
  flush: FlushRef;
  onSaved: (e: StudioEntity) => void;
  onRelation: (r: StudioRelation) => void;
}) {
  const { draft, update, attr, save, dirty, status, error } =
    useWritingDocument(initial, onSaved);
  const editor = useRef<Editor | null>(null);
  const initialContent = useMemo(() => writingContent(initial), [initial]);
  const initialWords = useRef(wordCount(initial.body));
  const [tab, setTab] = useState<"notes" | "references" | "history">("notes"),
    [referenceSearch, setReferenceSearch] = useState(""),
    [referenceId, setReferenceId] = useState<string>(),
    [referenceError, setReferenceError] = useState(""),
    [linkPending, setLinkPending] = useState(false);
  const [history, setHistory] = useState<
      {
        id: number;
        version: number;
        snapshot: StudioEntity;
        created_at: string;
      }[]
    >([]),
    [historyError, setHistoryError] = useState("");
  const [fontSize, setFontSize] = useState(19);
  useEffect(() => {
    flush.current = () => save(true);
    return () => {
      flush.current = async () => true;
    };
  }, [flush, save]);
  const words = wordCount(draft.body),
    goal = Number(draft.attributes.wordGoal ?? 0);
  const sourceId =
    typeof draft.attributes.sourceFileId === "string"
      ? draft.attributes.sourceFileId
      : null;
  const { refIds, references } = useMemo(() => {
    const refIds = new Set(
      workspace.relations
        .filter(
          (r) =>
            [draft.id, storyId].includes(r.sourceId) ||
            [draft.id, storyId].includes(r.targetId),
        )
        .flatMap((r) => [r.sourceId, r.targetId]),
    );
    const references = workspace.entities
      .filter(
        (e) =>
          !["document", "story", "task"].includes(e.kind) &&
          `${e.title} ${e.summary}`
            .toLocaleLowerCase("pt-BR")
            .includes(referenceSearch.toLocaleLowerCase("pt-BR")),
      )
      .sort(
        (a, b) =>
          Number(refIds.has(b.id)) - Number(refIds.has(a.id)) ||
          a.title.localeCompare(b.title),
      );
    return { refIds, references };
  }, [workspace, draft.id, storyId, referenceSearch]);
  const reference = workspace.entities.find((e) => e.id === referenceId);
  async function historyTab() {
    setTab("history");
    setHistoryError("");
    try {
      setHistory(
        await api(`/api/studio/entities?id=${encodeURIComponent(draft.id)}`),
      );
    } catch (e) {
      setHistoryError((e as Error).message);
    }
  }
  async function link() {
    if (!reference || linkPending) return;
    setLinkPending(true);
    setReferenceError("");
    try {
      if (!(await save(true))) return;
      const relation = await api<StudioRelation>(
        "/api/studio/relations",
        "POST",
        {
          id: crypto.randomUUID(),
          sourceId: draft.id,
          targetId: reference.id,
          label: "referência de escrita",
        },
      );
      onRelation(relation);
    } catch (e) {
      setReferenceError((e as Error).message);
    } finally {
      setLinkPending(false);
    }
  }
  async function restore(snapshot: StudioEntity) {
    if (
      !window.confirm(
        "Restaurar este texto como uma nova versão? A versão atual continuará no histórico.",
      )
    )
      return;
    if (!(await save(true))) return;
    const content = writingContent(snapshot);
    editor.current?.commands.setContent(content, { emitUpdate: false });
    update({
      title: snapshot.title,
      body: snapshot.body,
      summary: snapshot.summary,
      attributes: {
        ...draft.attributes,
        richText: content,
        privateNotes: snapshot.attributes.privateNotes ?? "",
      },
    });
    setTab("notes");
  }
  async function move(direction: -1 | 1) {
    if (!(await save(true))) return;
    const siblings = workspace.entities
      .filter(
        (e) =>
          e.kind === "document" &&
          documentType(e) !== "source" &&
          documentStory(e, workspace) === storyId &&
          e.attributes.writingParentId === draft.attributes.writingParentId,
      )
      .sort(documentOrder);
    const index = siblings.findIndex((e) => e.id === draft.id),
      target = index + direction;
    if (target < 0 || target >= siblings.length) return;
    const without = siblings.filter((e) => e.id !== draft.id),
      before = without[target - 1],
      after = without[target];
    const order = (e: StudioEntity) =>
      Number(e.attributes.writingOrder ?? e.attributes.order ?? 0);
    attr(
      "writingOrder",
      !before
        ? order(after) - 1000
        : !after
          ? order(before) + 1000
          : (order(before) + order(after)) / 2,
    );
  }
  return (
    <>
      <section className="writing-document" aria-label="Editor do manuscrito">
        <header className="writing-document-header">
          <span>
            {documentType(draft) === "source"
              ? "Material de origem"
              : documentType(draft) === "scene"
                ? "Cena"
                : "Capítulo"}
            <ChevronRight size={14} />
            {draft.title}
          </span>
          <div className={`writing-save-state ${status}`} role="status">
            {status === "saving" ? (
              "Salvando…"
            ) : status === "conflict" ? (
              "Conflito de versões"
            ) : status === "error" ? (
              "Não salvo"
            ) : dirty ? (
              "Alterações pendentes"
            ) : (
              <>
                <Check size={14} />
                Salvo na nuvem
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => void save(true)}
            disabled={status === "saving"}
            aria-label="Salvar manuscrito"
          >
            <Save size={16} />
            <span>Salvar</span>
          </button>
        </header>
        {error && (
          <div role="alert" className="writing-error">
            <p>{error}</p>
            <button type="button" onClick={() => downloadText(draft)}>
              <Download size={15} />
              Baixar meu texto
            </button>
            {status === "conflict" ? (
              <Link
                href={`/studio/manuscritos?id=${encodeURIComponent(draft.id)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Comparar com o banco em outra aba
              </Link>
            ) : (
              <button type="button" onClick={() => void save(true)}>
                Tentar salvar novamente
              </button>
            )}
          </div>
        )}
        <div
          className="writing-paper-scroll"
          style={
            { "--writing-font-size": `${fontSize}px` } as React.CSSProperties
          }
        >
          <div className="writing-paper">
            <label className="writing-title-label" htmlFor="writing-title">
              Título do texto
            </label>
            <input
              id="writing-title"
              className="writing-title"
              value={draft.title}
              maxLength={200}
              onChange={(e) => update({ title: e.target.value })}
            />
            <WritingEditor
              content={initialContent}
              editorRef={editor}
              onChange={(body: string, richText: JSONContent) =>
                update({ body, attributes: { ...draft.attributes, richText } })
              }
            />
          </div>
        </div>
        <footer className="writing-document-footer">
          <span>
            {words.toLocaleString("pt-BR")} palavras
            {goal > 0 ? ` / ${goal.toLocaleString("pt-BR")}` : ""}{" "}
            <span className="writing-session-count">
              · {words - initialWords.current >= 0 ? "+" : ""}
              {words - initialWords.current} nesta sessão
            </span>
          </span>
          <label>
            Tamanho{" "}
            <select
              aria-label="Tamanho do texto na tela"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
            >
              <option value="17">17</option>
              <option value="19">19</option>
              <option value="22">22</option>
              <option value="25">25</option>
            </select>
          </label>
          <button
            type="button"
            aria-label="Baixar cópia do texto"
            onClick={() => downloadText(draft)}
          >
            <Download size={16} />
          </button>
        </footer>
      </section>
      {inspector && (
        <aside
          className="writing-inspector"
          id="writing-inspector"
          aria-label="Notas e referências"
        >
          <div
            className="writing-inspector-tabs"
            role="tablist"
            aria-label="Apoio à escrita"
            onKeyDown={(event) => {
              const tabs = ["notes", "references", "history"] as const;
              const index = tabs.indexOf(tab);
              const next =
                event.key === "ArrowRight"
                  ? (index + 1) % 3
                  : event.key === "ArrowLeft"
                    ? (index + 2) % 3
                    : event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? 2
                        : -1;
              if (next < 0) return;
              event.preventDefault();
              if (tabs[next] === "history") void historyTab();
              else setTab(tabs[next]);
              event.currentTarget
                .querySelectorAll<HTMLButtonElement>('[role="tab"]')
                [next].focus();
            }}
          >
            <button
              type="button"
              role="tab"
              id="writing-tab-notes"
              aria-controls={
                tab === "notes" ? "writing-notes-panel" : undefined
              }
              aria-selected={tab === "notes"}
              tabIndex={tab === "notes" ? 0 : -1}
              onClick={() => setTab("notes")}
            >
              Notas
            </button>
            <button
              type="button"
              role="tab"
              id="writing-tab-references"
              aria-controls={
                tab === "references" ? "writing-references-panel" : undefined
              }
              aria-selected={tab === "references"}
              tabIndex={tab === "references" ? 0 : -1}
              onClick={() => setTab("references")}
            >
              Referências
            </button>
            <button
              type="button"
              role="tab"
              id="writing-tab-history"
              aria-controls={
                tab === "history" ? "writing-history-panel" : undefined
              }
              aria-selected={tab === "history"}
              tabIndex={tab === "history" ? 0 : -1}
              onClick={() => void historyTab()}
              aria-label="Histórico do manuscrito"
            >
              <History size={16} />
            </button>
          </div>
          {tab === "notes" && (
            <div
              role="tabpanel"
              id="writing-notes-panel"
              aria-labelledby="writing-tab-notes"
              className="writing-inspector-content"
            >
              <label>
                Estado
                <select
                  value={draft.status}
                  onChange={(e) =>
                    update({ status: e.target.value as StudioEntity["status"] })
                  }
                >
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Sinopse
                <textarea
                  rows={5}
                  value={draft.summary}
                  maxLength={2000}
                  placeholder="O que acontece aqui?"
                  onChange={(e) => update({ summary: e.target.value })}
                />
              </label>
              <label>
                Notas de escrita
                <textarea
                  rows={8}
                  value={String(draft.attributes.privateNotes ?? "")}
                  placeholder="Intenção, conflito, pontas soltas…"
                  onChange={(e) => attr("privateNotes", e.target.value)}
                />
              </label>
              <label>
                Meta de palavras
                <input
                  type="number"
                  min="0"
                  max="500000"
                  value={goal || ""}
                  placeholder="Sem meta"
                  onChange={(e) =>
                    attr(
                      "wordGoal",
                      Math.max(0, Math.min(500000, Number(e.target.value))),
                    )
                  }
                />
              </label>
              {goal > 0 && (
                <>
                  <progress
                    max={goal}
                    value={Math.min(words, goal)}
                    aria-label="Progresso da meta de palavras"
                  />
                  <small>{Math.round((words / goal) * 100)}% da meta</small>
                </>
              )}
              {documentType(draft) !== "source" && (
                <details>
                  <summary>Organização do texto</summary>
                  {documentType(draft) === "scene" && (
                    <label>
                      Dentro do capítulo
                      <select
                        aria-label="Capítulo da cena"
                        value={String(draft.attributes.writingParentId ?? "")}
                        onChange={(e) =>
                          attr("writingParentId", e.target.value || undefined)
                        }
                      >
                        <option value="">Solta no manuscrito</option>
                        {workspace.entities
                          .filter(
                            (e) =>
                              e.kind === "document" &&
                              e.id !== draft.id &&
                              documentType(e) === "chapter" &&
                              documentStory(e, workspace) === storyId,
                          )
                          .map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.title}
                            </option>
                          ))}
                      </select>
                    </label>
                  )}
                  <div className="writing-create">
                    <button type="button" onClick={() => void move(-1)}>
                      <ArrowUp size={14} />
                      Subir
                    </button>
                    <button type="button" onClick={() => void move(1)}>
                      <ArrowDown size={14} />
                      Descer
                    </button>
                  </div>
                </details>
              )}
              {sourceId && (
                <a
                  className="writing-original"
                  href={`/api/studio/files/${encodeURIComponent(sourceId)}`}
                  download
                >
                  <Download size={15} />
                  Baixar documento original
                </a>
              )}
              <small>
                Versão {draft.version} · Ctrl/Cmd + S<br />O texto e as notas
                são privados.
              </small>
            </div>
          )}
          {tab === "references" && (
            <div
              role="tabpanel"
              id="writing-references-panel"
              aria-labelledby="writing-tab-references"
              className="writing-inspector-content"
            >
              <label className="writing-search">
                <Search size={15} />
                <input
                  aria-label="Buscar referência"
                  placeholder="Personagem, conceito, lugar…"
                  value={referenceSearch}
                  onChange={(e) => setReferenceSearch(e.target.value)}
                />
              </label>
              {reference ? (
                <article className="writing-reference">
                  <button
                    type="button"
                    className="writing-reference-back"
                    onClick={() => setReferenceId(undefined)}
                  >
                    <X size={14} />
                    Voltar às referências
                  </button>
                  <small>{kindLabels[reference.kind]}</small>
                  <h2>{reference.title}</h2>
                  <p>{reference.body}</p>
                  {reference.kind === "visual" &&
                    typeof reference.attributes.assetId === "string" && (
                      <Image
                        width={300}
                        height={300}
                        unoptimized
                        src={`/api/studio/assets/${encodeURIComponent(reference.attributes.assetId)}`}
                        alt={reference.title}
                        loading="lazy"
                      />
                    )}
                  <Link
                    href={`/studio/${({ character: "personagens", concept: "conceitos", place: "lugares", artifact: "objetos", visual: "galeria", event: "cronologia", faction: "mapa" } as Record<string, string>)[reference.kind] ?? "mapa"}?id=${encodeURIComponent(reference.id)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Abrir ficha completa ↗
                  </Link>
                  {workspace.relations.some(
                    (r) =>
                      r.sourceId === draft.id && r.targetId === reference.id,
                  ) ? (
                    <small>
                      <Check size={14} />
                      Ligada a este texto
                    </small>
                  ) : (
                    <button
                      type="button"
                      disabled={linkPending}
                      onClick={() => void link()}
                    >
                      <Link2 size={14} />
                      Vincular ao texto
                    </button>
                  )}
                  {referenceError && <p role="alert">{referenceError}</p>}
                </article>
              ) : (
                references.map((e) => (
                  <button
                    type="button"
                    className="writing-reference-item"
                    key={e.id}
                    onClick={() => {
                      setReferenceId(e.id);
                      setReferenceError("");
                    }}
                  >
                    <span>
                      <small>
                        {kindLabels[e.kind]}
                        {refIds.has(e.id) ? " · vinculada" : ""}
                      </small>
                      {e.title}
                    </span>
                    <ChevronRight size={14} />
                  </button>
                ))
              )}
              {!reference && !references.length && (
                <p>Nenhuma referência encontrada.</p>
              )}
            </div>
          )}
          {tab === "history" && (
            <div
              role="tabpanel"
              id="writing-history-panel"
              aria-labelledby="writing-tab-history"
              className="writing-inspector-content"
            >
              <h2>Versões anteriores</h2>
              <p>O salvamento mantém o texto anterior no histórico.</p>
              {historyError && <p role="alert">{historyError}</p>}
              {!history.length && !historyError && (
                <p>As versões aparecem depois da primeira edição salva.</p>
              )}
              {history.map((item) => (
                <details key={item.id}>
                  <summary>
                    Versão {item.version} ·{" "}
                    {new Date(item.created_at).toLocaleDateString("pt-BR")}
                  </summary>
                  <p className="writing-history-preview">
                    {item.snapshot.body.slice(0, 1800) || "Texto vazio"}
                  </p>
                  <button
                    type="button"
                    onClick={() => void restore(item.snapshot)}
                  >
                    Restaurar versão {item.version}
                  </button>
                </details>
              ))}
            </div>
          )}
        </aside>
      )}
    </>
  );
}
