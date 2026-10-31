"use client";

import { useMemo, useState, useId } from "react";
import Link from "next/link";
import {
  Globe2,
  Flame,
  Clock,
  Search,
  Plus,
  X,
  ChevronRight,
  Copy,
  RotateCcw,
  Zap,
  Users,
  BookOpen,
  SlidersHorizontal,
} from "lucide-react";
import type {
  StudioEntity,
  StudioRelation,
  StudioWorkspace,
} from "@/lib/workspace";
import type { Timeline } from "@/lib/schemas";
import { PageIntro } from "@/components/ui";
import { SegmentedControl } from "@/components/segmented-control";
import { StatusBadge } from "@/components/status-badge";
import { StudioWorkbench } from "@/components/studio-workbench";
import {
  cosmicEras,
  canonicalSyncAnchors,
  normalizeTimelineEvents,
  type CosmicEraId,
  type SwimlaneId,
  type EventCanonStatus,
  type EventScale,
} from "@/lib/timeline-swimlanes";

/* =========================================================================
   Types & Domain Models
   ========================================================================= */

export interface ParallelTimelineEvent {
  id: string;
  title: string;
  summary: string;
  eraId: CosmicEraId;
  swimlane: SwimlaneId;
  scale: EventScale;
  cycleOrYear?: string;
  status: EventCanonStatus;
  pov?: string;
  location?: string;
  characters: string[];
  storyId?: string;
  storyTitle?: string;
  chapterNumber?: number;
  documentId?: string;
  syncEventId?: string;
  syncLabel?: string;
  notas?: string;
  isCanon?: boolean;
  order: number;
  rawEntity?: StudioEntity;
}

export const COSMIC_ERAS = cosmicEras;

export const SWIMLANES_CONFIG: Record<
  SwimlaneId,
  {
    id: SwimlaneId;
    title: string;
    subtitle: string;
    color: string;
    accentColor: string;
    borderClass: string;
    bgClass: string;
    icon: typeof Globe2;
    scope: string;
  }
> = {
  earth: {
    id: "earth",
    title: "Raia 1: Terra / Glen",
    subtitle:
      "Guardiões, Menino Resiliente, Kerry, Marginal, Conflitos de Glen & Tineros",
    color: "#3B82F6",
    accentColor: "#91e3dc",
    borderClass: "border-[#3B82F6]/40",
    bgClass: "bg-[#3B82F6]/5",
    icon: Globe2,
    scope: "TERRA",
  },
  severum: {
    id: "severum",
    title: "Raia 2: Severum / Cósmico / Espaço Profundo",
    subtitle:
      "Red Right Hand, Arner, Deroo Da, Naok, Congregadores, Hades & Aliança Demoníaca",
    color: "#FF2A54",
    accentColor: "#ff746a",
    borderClass: "border-[#FF2A54]/40",
    bgClass: "bg-[#FF2A54]/5",
    icon: Flame,
    scope: "UNIVERSAL",
  },
};

/* =========================================================================
   Normalização Unificada dos Eventos
   ========================================================================= */

function transformEvents(
  workspace: StudioWorkspace,
  timelineData?: Timeline,
): ParallelTimelineEvent[] {
  const canonBeats = timelineData?.livros
    ? timelineData.livros.flatMap((b) =>
        b.beats.map((beat) => ({
          ...beat,
          serieId: b.serieId,
          livroId: b.id,
        })),
      )
    : undefined;

  const domainEvents = normalizeTimelineEvents(workspace.entities, canonBeats);

  const anchorMap = new Map<string, { counterpartId: string; label: string }>();
  for (const anchor of canonicalSyncAnchors) {
    anchorMap.set(anchor.earthEventId, {
      counterpartId: anchor.severumEventId,
      label: `${anchor.title}: ${anchor.description}`,
    });
    anchorMap.set(anchor.severumEventId, {
      counterpartId: anchor.earthEventId,
      label: `${anchor.title}: ${anchor.description}`,
    });
  }

  const eraMap = new Map<string, string>(cosmicEras.map((e) => [e.id, e.nome]));

  return domainEvents.map((ev) => {
    const syncInfo = anchorMap.get(ev.id);
    const syncEventId = ev.syncTargetEventId || syncInfo?.counterpartId;
    const syncLabel = syncInfo?.label;

    const eraName = eraMap.get(ev.eraId) || ev.eraId;
    const cycleOrYear =
      ev.capitulo !== undefined
        ? `Capítulo ${ev.capitulo} · ${eraName}`
        : `${eraName}`;

    return {
      id: ev.id,
      title: ev.titulo,
      summary: ev.resumo,
      eraId: ev.eraId,
      swimlane: ev.swimlane,
      scale: ev.scale,
      cycleOrYear,
      status: ev.status,
      pov: ev.pov,
      location: ev.local,
      characters: ev.personagens,
      storyId: ev.sagaId,
      storyTitle: ev.sagaId,
      chapterNumber: ev.capitulo,
      documentId: ev.capitulo ? `document-rrh-${ev.capitulo}` : undefined,
      syncEventId,
      syncLabel,
      notas: ev.notas,
      isCanon:
        ev.source === "data/timeline.json" ||
        ev.id.startsWith("event-cosmic-") ||
        ev.id.startsWith("event-earth-"),
      order: ev.order,
      rawEntity: workspace.entities.find((e) => e.id === ev.id),
    };
  });
}

/* =========================================================================
   Component: StudioParallelTimeline
   ========================================================================= */

interface StudioParallelTimelineProps {
  initial: StudioWorkspace;
  initialId?: string;
  timelineData?: Timeline;
}

export function StudioParallelTimeline({
  initial,
  initialId,
  timelineData,
}: StudioParallelTimelineProps) {
  const [workspace, setWorkspace] = useState<StudioWorkspace>(initial);
  const [viewMode, setViewMode] = useState<
    "swimlanes" | "eras" | "beats-rrh" | "workbench"
  >("swimlanes");

  // Filtros
  const [scaleFilter, setScaleFilter] = useState<"ALL" | SwimlaneId>("ALL");
  const [eraFilter, setEraFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("TODOS");
  const [povFilter, setPovFilter] = useState<string>("TODOS");
  const [sagaFilter, setSagaFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Visualização e Interação
  const [zoomLevel, setZoomLevel] = useState<"1x" | "1.5x" | "2x">("1x");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(
    initialId || null,
  );
  const [highlightedSyncId, setHighlightedSyncId] = useState<string | null>(
    null,
  );
  const [mobileActiveTab, setMobileActiveTab] = useState<
    "all" | "earth" | "severum" | "sync"
  >("all");

  // Criação e Edição de Fichas
  const [isCreatingEvent, setIsCreatingEvent] = useState<boolean>(false);
  const [editingEvent, setEditingEvent] = useState<StudioEntity | null>(null);
  const [feedback, setFeedback] = useState<string>("");

  const searchInputId = useId();

  // Lista normalizada de todos os eventos
  const allEvents = useMemo(
    () => transformEvents(workspace, timelineData),
    [workspace, timelineData],
  );

  // Valores únicos para dropdowns
  const availablePOVs = useMemo(() => {
    const povs = new Set<string>();
    for (const e of allEvents) if (e.pov) povs.add(e.pov);
    return Array.from(povs).sort();
  }, [allEvents]);

  const availableStories = useMemo(() => {
    const stories = new Set<string>();
    for (const e of allEvents) if (e.storyTitle) stories.add(e.storyTitle);
    return Array.from(stories).sort();
  }, [allEvents]);

  // Eventos Filtrados
  const filteredEvents = useMemo(() => {
    return allEvents.filter((event) => {
      if (scaleFilter !== "ALL" && event.swimlane !== scaleFilter) return false;
      if (eraFilter !== "ALL" && event.eraId !== eraFilter) return false;
      if (statusFilter !== "TODOS" && event.status !== statusFilter)
        return false;
      if (povFilter !== "TODOS" && event.pov !== povFilter) return false;
      if (sagaFilter !== "ALL" && event.storyTitle !== sagaFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = event.title.toLowerCase().includes(q);
        const matchSummary = event.summary.toLowerCase().includes(q);
        const matchCharacters = event.characters.some((c) =>
          c.toLowerCase().includes(q),
        );
        const matchLocation = event.location?.toLowerCase().includes(q);
        if (
          !matchTitle &&
          !matchSummary &&
          !matchCharacters &&
          !matchLocation
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    allEvents,
    scaleFilter,
    eraFilter,
    statusFilter,
    povFilter,
    sagaFilter,
    searchQuery,
  ]);

  // Evento Selecionado para Drawer
  const selectedEvent = useMemo(
    () => allEvents.find((e) => e.id === selectedEventId) || null,
    [allEvents, selectedEventId],
  );

  // Par Sincronizado para Drawer
  const syncCounterpart = useMemo(() => {
    if (!selectedEvent?.syncEventId) return null;
    return allEvents.find((e) => e.id === selectedEvent.syncEventId) || null;
  }, [allEvents, selectedEvent]);

  function handleResetFilters() {
    setScaleFilter("ALL");
    setEraFilter("ALL");
    setStatusFilter("TODOS");
    setPovFilter("TODOS");
    setSagaFilter("ALL");
    setSearchQuery("");
  }

  async function copyPrompt(event: ParallelTimelineEvent) {
    try {
      await navigator.clipboard.writeText(
        `Audite a consistência canônica deste evento do Universo Virtual de Caio (UVC):\n` +
          `Título: ${event.title}\n` +
          `Era Cósmica: ${event.eraId} | Raia: ${event.swimlane === "earth" ? "Terra / Glen" : "Severum / Cósmico"}\n` +
          `Resumo: ${event.summary}\n` +
          `Ponto de Vista: ${event.pov || "Geral"} | Local: ${event.location || "N/A"}\n` +
          `Personagens: ${event.characters.join(", ") || "N/A"}\n` +
          `Considere as 35 Teses de Severum, a dicotomia Ormuz/Hades e a cronologia paralela. Não invente contradições com o cânone.`,
      );
      setFeedback(`Prompt de “${event.title}” copiado.`);
    } catch {
      setFeedback("Não foi possível copiar o prompt.");
    }
  }

  return (
    <div className="chronology-page studio-parallel-timeline pb-16 max-w-full overflow-x-hidden">
      {/* Page Header */}
      <PageIntro
        label="Oficina de Worldbuilding"
        title="Cronologia em Raias Paralelas"
      >
        Confronte simultaneamente os conflitos da Terra/Glen e a geopolítica
        cósmica de Severum ao longo das 5 Eras Cósmicas.
      </PageIntro>

      {/* View Mode Navigation */}
      <div className="mb-6">
        <SegmentedControl
          label="Modo de visualização da cronologia"
          value={viewMode}
          options={[
            {
              value: "swimlanes",
              label: "Raias Paralelas (Terra vs. Severum)",
            },
            { value: "eras", label: "5 Eras Cósmicas" },
            { value: "beats-rrh", label: "Cenas Canônicas (RRH)" },
            { value: "workbench", label: "Fichas & Grafo" },
          ]}
          onChange={(v) =>
            setViewMode(v as "swimlanes" | "eras" | "beats-rrh" | "workbench")
          }
        />
      </div>

      {/* VIEW: WORKBENCH FALLBACK */}
      {viewMode === "workbench" && (
        <div className="mt-4">
          <StudioWorkbench
            initial={workspace}
            initialKind="event"
            initialId={initialId}
          />
        </div>
      )}

      {/* VIEW: 5 ERAS GRID */}
      {viewMode === "eras" && (
        <div className="era-grid">
          {COSMIC_ERAS.map((era) => (
            <article
              key={era.id}
              className="era-card"
              style={{ "--era-color": era.cor } as React.CSSProperties}
            >
              <p className="eyebrow">
                Era {String(era.ordem).padStart(2, "0")}
              </p>
              <h2>{era.nome}</h2>
              <p>{era.resumo}</p>
              <details>
                <summary>Explorar esta era</summary>
                <p>{era.descricao}</p>
              </details>
            </article>
          ))}
        </div>
      )}

      {/* VIEW: BEATS RRH LIST */}
      {viewMode === "beats-rrh" && (
        <div className="rrh-scene-view space-y-4">
          <div className="toolbar flex flex-wrap gap-4 items-center mb-4">
            <label className="filter-label text-sm text-[var(--muted)]">
              Estado da cena
              <select
                className="ml-2 bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] rounded px-3 py-1.5"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="TODOS">Todos os estados</option>
                <option value="CANONE_TRAVADO">Cânone consolidado</option>
                <option value="EM_REVISAO">Em revisão</option>
                <option value="RASCUNHO">Rascunho</option>
              </select>
            </label>
            <label className="filter-label text-sm text-[var(--muted)]">
              Ponto de vista
              <select
                className="ml-2 bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] rounded px-3 py-1.5"
                value={povFilter}
                onChange={(e) => setPovFilter(e.target.value)}
              >
                <option value="TODOS">Todos os personagens</option>
                {availablePOVs.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <p
            className="results-label text-sm text-[var(--muted)]"
            role="status"
          >
            {
              filteredEvents.filter((e) =>
                (e.storyId || "").includes("red-right-hand"),
              ).length
            }{" "}
            cenas de Red Right Hand exibidas
          </p>

          <div className="scene-list grid gap-4">
            {filteredEvents
              .filter((e) => (e.storyId || "").includes("red-right-hand"))
              .map((beat) => (
                <article key={beat.id} className="scene-card">
                  <div className="scene-meta flex justify-between items-center mb-2">
                    <span className="text-xs text-[var(--muted)]">
                      Cena · Capítulo {beat.chapterNumber ?? 0}
                    </span>
                    <StatusBadge status={beat.status} />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">{beat.title}</h2>
                  <p className="text-sm text-[var(--muted)] mb-3">
                    {beat.summary}
                  </p>
                  <div className="scene-context text-xs flex gap-4 text-[var(--muted)]">
                    <span>
                      POV: <strong>{beat.pov || "Arner"}</strong>
                    </span>
                    <span>
                      Local: <strong>{beat.location || "Severum"}</strong>
                    </span>
                  </div>
                  <div className="scene-footer mt-4 pt-4 border-t border-[var(--border)] flex justify-between items-center">
                    <ul className="flex gap-2" aria-label="Personagens da cena">
                      {beat.characters.map((name) => (
                        <li
                          key={name}
                          className="bg-[var(--background)] text-[var(--muted)] text-xs px-2 py-1 rounded"
                        >
                          {name}
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      className="button button-secondary text-xs flex items-center gap-2"
                      onClick={() => copyPrompt(beat)}
                    >
                      <Copy size={14} aria-hidden="true" />
                      Copiar prompt de revisão
                    </button>
                  </div>
                </article>
              ))}
          </div>
        </div>
      )}

      {/* VIEW: PARALLEL SWIMLANES (MAIN COCKPIT) */}
      {viewMode === "swimlanes" && (
        <div className="swimlanes-container space-y-6" data-timeline="parallel">
          {/* Quick Era Navigation Badges */}
          <div
            className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none"
            role="group"
            aria-label="Navegação rápida por Eras Cósmicas"
          >
            {COSMIC_ERAS.map((era) => (
              <button
                key={era.id}
                type="button"
                onClick={() =>
                  setEraFilter(eraFilter === era.id ? "ALL" : era.id)
                }
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  eraFilter === era.id
                    ? "bg-[var(--surface-raised)] text-[var(--accent)] border-[var(--accent)]"
                    : "bg-[var(--surface)] text-[var(--foreground)] border-[var(--border)] hover:border-[var(--accent)]/50"
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: era.cor }}
                  aria-hidden="true"
                />
                <span>{era.nome}</span>
              </button>
            ))}
          </div>

          {/* Dynamic Filter Toolbar */}
          <div
            className="toolbar bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg"
            role="toolbar"
            aria-label="Filtros da cronologia em raias"
          >
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative min-w-[200px]">
                <label htmlFor={searchInputId} className="sr-only">
                  Buscar eventos
                </label>
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                  size={15}
                  aria-hidden="true"
                />
                <input
                  id={searchInputId}
                  type="text"
                  placeholder="Buscar eventos, personagens, locais..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              {/* Raia / Escala Filter */}
              <label className="filter-label text-xs flex items-center gap-1.5 text-[var(--muted)]">
                <SlidersHorizontal size={13} aria-hidden="true" />
                Raia
                <select
                  aria-label="Filtrar por Raia"
                  value={scaleFilter}
                  onChange={(e) =>
                    setScaleFilter(e.target.value as "ALL" | SwimlaneId)
                  }
                  className="bg-[var(--background)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--foreground)]"
                >
                  <option value="ALL">Ambas as Raias</option>
                  <option value="earth">Raia 1 (Terra / Glen)</option>
                  <option value="severum">Raia 2 (Severum / Cósmico)</option>
                </select>
              </label>

              {/* Era Filter */}
              <label className="filter-label text-xs flex items-center gap-1.5 text-[var(--muted)]">
                <Clock size={13} aria-hidden="true" />
                Era Cósmica
                <select
                  aria-label="Filtrar por Era Cósmica"
                  value={eraFilter}
                  onChange={(e) => setEraFilter(e.target.value)}
                  className="bg-[var(--background)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--foreground)]"
                >
                  <option value="ALL">Todas as 5 Eras</option>
                  {COSMIC_ERAS.map((era) => (
                    <option key={era.id} value={era.id}>
                      Era 0{era.ordem}: {era.nome}
                    </option>
                  ))}
                </select>
              </label>

              {/* Status Filter */}
              <label className="filter-label text-xs flex items-center gap-1.5 text-[var(--muted)]">
                Estado
                <select
                  aria-label="Filtrar por Estado do Cânone"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-[var(--background)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--foreground)]"
                >
                  <option value="TODOS">Todos os estados</option>
                  <option value="CANONE_TRAVADO">Cânone consolidado</option>
                  <option value="EM_REVISAO">Em revisão</option>
                  <option value="RASCUNHO">Rascunho</option>
                </select>
              </label>

              {/* Saga Filter */}
              <label className="filter-label text-xs flex items-center gap-1.5 text-[var(--muted)]">
                <BookOpen size={13} aria-hidden="true" />
                Saga
                <select
                  aria-label="Filtrar por Saga"
                  value={sagaFilter}
                  onChange={(e) => setSagaFilter(e.target.value)}
                  className="bg-[var(--background)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--foreground)]"
                >
                  <option value="ALL">Todas as Sagas</option>
                  {availableStories.map((story) => (
                    <option key={story} value={story}>
                      {story}
                    </option>
                  ))}
                </select>
              </label>

              {/* Reset button */}
              {(scaleFilter !== "ALL" ||
                eraFilter !== "ALL" ||
                statusFilter !== "TODOS" ||
                sagaFilter !== "ALL" ||
                searchQuery) && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1 ml-1"
                >
                  <RotateCcw size={12} aria-hidden="true" />
                  Limpar filtros
                </button>
              )}
            </div>

            {/* Actions: Zoom & Nova Ficha */}
            <div className="flex items-center gap-2">
              <div
                className="hidden md:flex items-center border border-[var(--border)] rounded-lg bg-[var(--background)] p-0.5 text-xs"
                role="group"
                aria-label="Controle de zoom temporal"
              >
                <button
                  type="button"
                  onClick={() => setZoomLevel("1x")}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    zoomLevel === "1x"
                      ? "bg-[var(--surface-raised)] text-[var(--accent)] font-semibold"
                      : "text-[var(--muted)] hover:text-white"
                  }`}
                  aria-pressed={zoomLevel === "1x"}
                >
                  1x
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel("1.5x")}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    zoomLevel === "1.5x"
                      ? "bg-[var(--surface-raised)] text-[var(--accent)] font-semibold"
                      : "text-[var(--muted)] hover:text-white"
                  }`}
                  aria-pressed={zoomLevel === "1.5x"}
                >
                  1.5x
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel("2x")}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    zoomLevel === "2x"
                      ? "bg-[var(--surface-raised)] text-[var(--accent)] font-semibold"
                      : "text-[var(--muted)] hover:text-white"
                  }`}
                  aria-pressed={zoomLevel === "2x"}
                >
                  2x
                </button>
              </div>

              {/* "Nova ficha" button for test compatibility */}
              <button
                type="button"
                onClick={() => {
                  setEditingEvent(null);
                  setIsCreatingEvent(true);
                }}
                className="button button-primary bg-[var(--accent)] text-[#10151c] px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:brightness-110 shadow-sm"
              >
                <Plus size={15} aria-hidden="true" />
                Nova ficha
              </button>
            </div>
          </div>

          {/* Results Summary Bar */}
          <div className="flex justify-between items-center px-1 text-xs text-[var(--muted)]">
            <span role="status" aria-live="polite">
              Exibindo <strong>{filteredEvents.length}</strong> de{" "}
              {allEvents.length} eventos ·{" "}
              {filteredEvents.filter((e) => e.syncEventId).length} com
              confluência temporal
            </span>
            {feedback && (
              <span className="clipboard-feedback text-[var(--accent)] animate-fade-in font-medium">
                {feedback}
              </span>
            )}
          </div>

          {/* Mobile Tabs Switcher (visible <= 767px) */}
          <div
            role="tablist"
            aria-label="Filtro de raias para dispositivos móveis"
            className="flex md:hidden border-b border-[var(--border)] gap-2 pb-2 overflow-x-auto"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mobileActiveTab === "all"}
              onClick={() => setMobileActiveTab("all")}
              className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap ${
                mobileActiveTab === "all"
                  ? "bg-[var(--surface-raised)] text-[var(--accent)] border border-[var(--accent)]"
                  : "text-[var(--muted)]"
              }`}
            >
              Todas as Raias
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mobileActiveTab === "earth"}
              onClick={() => setMobileActiveTab("earth")}
              className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 whitespace-nowrap ${
                mobileActiveTab === "earth"
                  ? "bg-[#3B82F6]/20 text-[#91e3dc] border border-[#3B82F6]"
                  : "text-[var(--muted)]"
              }`}
            >
              <Globe2 size={13} aria-hidden="true" />
              🌍 Raia 1 (Terra)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mobileActiveTab === "severum"}
              onClick={() => setMobileActiveTab("severum")}
              className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 whitespace-nowrap ${
                mobileActiveTab === "severum"
                  ? "bg-[#FF2A54]/20 text-[#ff746a] border border-[#FF2A54]"
                  : "text-[var(--muted)]"
              }`}
            >
              <Flame size={13} aria-hidden="true" />
              🪐 Raia 2 (Severum)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mobileActiveTab === "sync"}
              onClick={() => setMobileActiveTab("sync")}
              className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 whitespace-nowrap ${
                mobileActiveTab === "sync"
                  ? "bg-[var(--gold)]/20 text-[var(--gold)] border border-[var(--gold)]"
                  : "text-[var(--muted)]"
              }`}
            >
              <Zap size={13} aria-hidden="true" />⚡ Sincronizados
            </button>
          </div>

          <h2 className="sr-only">Navegação e Raias da Cronologia</h2>

          {/* =========================================================================
             HORIZONTAL PARALLEL TIMELINE BOARD (Desktop & Tablet)
             ========================================================================= */}
          <div
            tabIndex={0}
            role="region"
            aria-label="Cronologia em Raias Paralelas"
            className="timeline-horizontal-board hidden md:block overflow-x-auto rounded-xl border border-[var(--border)] bg-[#10151c] max-w-full shadow-2xl relative scroll-smooth focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <div
              className={`timeline-canvas transition-all duration-300 min-w-[1440px] p-6 space-y-6 ${
                zoomLevel === "1.5x"
                  ? "min-w-[1900px]"
                  : zoomLevel === "2x"
                    ? "min-w-[2400px]"
                    : "min-w-[1440px]"
              }`}
            >
              {/* Sticky Cosmic Eras Axis Header */}
              <div
                className="eras-sticky-header sticky top-0 z-20 bg-[#10151c]/95 backdrop-blur-md pb-4 pt-2 border-b border-[var(--border)]"
                role="region"
                aria-label="Eixo das 5 Eras Cósmicas"
              >
                <div className="grid grid-cols-5 gap-4">
                  {COSMIC_ERAS.map((era) => {
                    const eraEventsCount = filteredEvents.filter(
                      (e) => e.eraId === era.id,
                    ).length;
                    return (
                      <div
                        key={era.id}
                        className="era-axis-cell border-t-4 rounded-b-lg p-3 bg-[var(--surface)]/80 hover:bg-[var(--surface)] transition-colors shadow-sm"
                        style={{ borderTopColor: era.cor }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: `${era.cor}25`,
                              color: era.cor,
                            }}
                          >
                            Era 0{era.ordem}
                          </span>
                          <span className="text-[11px] text-[var(--muted)] font-mono">
                            {eraEventsCount}{" "}
                            {eraEventsCount === 1 ? "evento" : "eventos"}
                          </span>
                        </div>
                        <h3 className="font-bold text-sm tracking-tight text-[var(--foreground)]">
                          {era.nome}
                        </h3>
                        <p className="text-[11px] text-[var(--muted)] line-clamp-1 mt-0.5">
                          {era.resumo}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* RAIA 1: TERRA / GLEN */}
              {(scaleFilter === "ALL" || scaleFilter === "earth") && (
                <section
                  className="swimlane-row swimlane-earth border border-[#3B82F6]/30 bg-[#3B82F6]/5 rounded-xl p-4 transition-all"
                  aria-label="Raia 1: Terra e Glen"
                >
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#3B82F6]/20">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-[#3B82F6]/20 text-[#91e3dc]">
                        <Globe2 size={20} aria-hidden="true" />
                      </div>
                      <div>
                        <h4 className="font-bold text-base text-[#91e3dc] flex items-center gap-2">
                          Raia 1 · Terra / Glen
                          <span className="text-xs font-normal text-[var(--muted)] px-2 py-0.5 rounded bg-[var(--surface)] border border-[#3B82F6]/30">
                            Escala Planetária
                          </span>
                        </h4>
                        <p className="text-xs text-[var(--muted)]">
                          Guardiões, Menino Resiliente, Kerry, Conflitos de Glen
                          & Tineros
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-[var(--muted)] font-mono">
                      {
                        filteredEvents.filter((e) => e.swimlane === "earth")
                          .length
                      }{" "}
                      marcos
                    </span>
                  </div>

                  {/* 5-Column Grid for Raia 1 */}
                  <div className="grid grid-cols-5 gap-4">
                    {COSMIC_ERAS.map((era) => {
                      const eventsInEra = filteredEvents.filter(
                        (e) => e.swimlane === "earth" && e.eraId === era.id,
                      );
                      return (
                        <div
                          key={`earth-${era.id}`}
                          className="era-lane-column space-y-3 min-h-[160px] p-2 rounded-lg bg-[#18202a]/40 border border-[#3B82F6]/10"
                        >
                          {eventsInEra.length === 0 ? (
                            <div className="h-full flex items-center justify-center p-4 text-center">
                              <span className="text-[11px] text-[var(--muted)]/50 italic">
                                Sem eventos terrestres
                              </span>
                            </div>
                          ) : (
                            eventsInEra.map((event) => (
                              <TimelineNodeCard
                                key={event.id}
                                event={event}
                                isSelected={selectedEventId === event.id}
                                isDrawerOpen={Boolean(selectedEventId)}
                                selectedEventId={selectedEventId}
                                isSyncHighlighted={
                                  highlightedSyncId === event.id ||
                                  (!!highlightedSyncId &&
                                    event.syncEventId === highlightedSyncId)
                                }
                                onSelect={() => setSelectedEventId(event.id)}
                                onSyncHover={(active) =>
                                  setHighlightedSyncId(active ? event.id : null)
                                }
                              />
                            ))
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* SYNCHRONICITY CONNECTOR BRIDGE */}
              {scaleFilter === "ALL" && (
                <div
                  className="sync-bridge-track py-2 px-4 rounded-lg bg-[var(--surface)]/40 border border-dashed border-[var(--border)] flex items-center justify-between"
                  aria-label="Conexão de sincronicidade cósmica"
                >
                  <div className="flex items-center gap-2 text-xs text-[var(--gold)]">
                    <Zap
                      size={14}
                      className="animate-pulse"
                      aria-hidden="true"
                    />
                    <span className="font-semibold uppercase tracking-wider text-[10px]">
                      Ponto de Sincronia Cósmica:
                    </span>
                    <span className="text-[var(--muted)]">
                      Eventos simultâneos entre a escala da Terra e a expansão
                      de Severum
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--muted)] font-mono">
                    Conexão Bidirecional Ativa (6 Âncoras Canônicas)
                  </span>
                </div>
              )}

              {/* RAIA 2: SEVERUM / CÓSMICO */}
              {(scaleFilter === "ALL" || scaleFilter === "severum") && (
                <section
                  className="swimlane-row swimlane-severum border border-[#FF2A54]/30 bg-[#FF2A54]/5 rounded-xl p-4 transition-all"
                  aria-label="Raia 2: Severum e Espaço Profundo"
                >
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#FF2A54]/20">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-[#FF2A54]/20 text-[#ff746a]">
                        <Flame size={20} aria-hidden="true" />
                      </div>
                      <div>
                        <h4 className="font-bold text-base text-[#ff746a] flex items-center gap-2">
                          Raia 2 · Severum / Cósmico
                          <span className="text-xs font-normal text-[var(--muted)] px-2 py-0.5 rounded bg-[var(--surface)] border border-[#FF2A54]/30">
                            Escala Universal
                          </span>
                        </h4>
                        <p className="text-xs text-[var(--muted)]">
                          Red Right Hand, Arner, Deroo Da, Naok, Congregadores &
                          Hades
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-[var(--muted)] font-mono">
                      {
                        filteredEvents.filter((e) => e.swimlane === "severum")
                          .length
                      }{" "}
                      marcos
                    </span>
                  </div>

                  {/* 5-Column Grid for Raia 2 */}
                  <div className="grid grid-cols-5 gap-4">
                    {COSMIC_ERAS.map((era) => {
                      const eventsInEra = filteredEvents.filter(
                        (e) => e.swimlane === "severum" && e.eraId === era.id,
                      );
                      return (
                        <div
                          key={`severum-${era.id}`}
                          className="era-lane-column space-y-3 min-h-[160px] p-2 rounded-lg bg-[#18202a]/40 border border-[#FF2A54]/10"
                        >
                          {eventsInEra.length === 0 ? (
                            <div className="h-full flex items-center justify-center p-4 text-center">
                              <span className="text-[11px] text-[var(--muted)]/50 italic">
                                Sem eventos cósmicos
                              </span>
                            </div>
                          ) : (
                            eventsInEra.map((event) => (
                              <TimelineNodeCard
                                key={event.id}
                                event={event}
                                isSelected={selectedEventId === event.id}
                                isDrawerOpen={Boolean(selectedEventId)}
                                selectedEventId={selectedEventId}
                                isSyncHighlighted={
                                  highlightedSyncId === event.id ||
                                  (!!highlightedSyncId &&
                                    event.syncEventId === highlightedSyncId)
                                }
                                onSelect={() => setSelectedEventId(event.id)}
                                onSyncHover={(active) =>
                                  setHighlightedSyncId(active ? event.id : null)
                                }
                              />
                            ))
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          </div>

          {/* =========================================================================
             MOBILE STACKED VIEW (<= 767px - No Horizontal Page Overflow)
             ========================================================================= */}
          <div className="block md:hidden space-y-6 max-w-full overflow-hidden">
            {COSMIC_ERAS.map((era) => {
              const eraEvents = filteredEvents.filter((e) => {
                if (e.eraId !== era.id) return false;
                if (mobileActiveTab === "earth") return e.swimlane === "earth";
                if (mobileActiveTab === "severum")
                  return e.swimlane === "severum";
                if (mobileActiveTab === "sync") return Boolean(e.syncEventId);
                return true;
              });

              if (eraEvents.length === 0) return null;

              return (
                <div
                  key={`mobile-${era.id}`}
                  className="mobile-era-block bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 space-y-3"
                  style={{ borderLeft: `4px solid ${era.cor}` }}
                >
                  <div className="flex justify-between items-center pb-2 border-b border-[var(--border)]">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">
                        Era 0{era.ordem}
                      </span>
                      <h3 className="font-bold text-base text-[var(--foreground)]">
                        {era.nome}
                      </h3>
                    </div>
                    <span className="text-xs text-[var(--muted)] font-mono">
                      {eraEvents.length}{" "}
                      {eraEvents.length === 1 ? "evento" : "eventos"}
                    </span>
                  </div>

                  <div className="space-y-3 pt-1">
                    {eraEvents.map((event) => (
                      <TimelineNodeCard
                        key={`m-${event.id}`}
                        event={event}
                        isSelected={selectedEventId === event.id}
                        isDrawerOpen={Boolean(selectedEventId)}
                        selectedEventId={selectedEventId}
                        isSyncHighlighted={false}
                        onSelect={() => setSelectedEventId(event.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
         EVENT DETAIL DRAWER / INSPECTOR
         ========================================================================= */}
      {selectedEvent && (
        <div
          id="event-detail-drawer"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end transition-opacity"
          role="dialog"
          aria-modal="true"
          aria-label="Detalhes do Evento"
          onKeyDown={(e) => {
            if (e.key === "Escape") setSelectedEventId(null);
          }}
        >
          <div className="w-full max-w-lg bg-[var(--surface)] border-l border-[var(--border)] h-full overflow-y-auto p-6 space-y-6 shadow-2xl flex flex-col justify-between">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-start justify-between pb-4 border-b border-[var(--border)]">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        selectedEvent.swimlane === "earth"
                          ? "bg-[#3B82F6]/20 text-[#91e3dc] border border-[#3B82F6]/40"
                          : "bg-[#FF2A54]/20 text-[#ff746a] border border-[#FF2A54]/40"
                      }`}
                    >
                      {selectedEvent.swimlane === "earth"
                        ? "Raia 1 · Terra / Glen"
                        : "Raia 2 · Severum / Cósmico"}
                    </span>
                    <StatusBadge status={selectedEvent.status} />
                  </div>
                  <h2
                    id="drawer-event-title"
                    className="text-xl font-bold text-[var(--foreground)] tracking-tight"
                  >
                    {selectedEvent.title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedEventId(null)}
                  className="p-2 text-[var(--muted)] hover:text-white rounded-lg hover:bg-[var(--surface-raised)]"
                  aria-label="Fechar detalhes do evento"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </div>

              {/* Meta Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-[var(--background)] p-3.5 rounded-lg border border-[var(--border)]">
                <div>
                  <span className="text-[var(--muted)] block text-[10px] uppercase font-mono">
                    Era Cósmica
                  </span>
                  <span className="font-semibold text-[var(--foreground)]">
                    {COSMIC_ERAS.find((e) => e.id === selectedEvent.eraId)
                      ?.nome || selectedEvent.eraId}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--muted)] block text-[10px] uppercase font-mono">
                    Marco / Ano
                  </span>
                  <span className="font-semibold text-[var(--foreground)]">
                    {selectedEvent.cycleOrYear || "Não classificado"}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--muted)] block text-[10px] uppercase font-mono">
                    Ponto de Vista (POV)
                  </span>
                  <span className="font-semibold text-[var(--foreground)]">
                    {selectedEvent.pov || "Onisciente"}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--muted)] block text-[10px] uppercase font-mono">
                    Local Principal
                  </span>
                  <span className="font-semibold text-[var(--foreground)]">
                    {selectedEvent.location || "N/A"}
                  </span>
                </div>
              </div>

              {/* Canonical Summary */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--accent)] font-mono">
                  Resumo Canônico da Cena
                </h3>
                <p className="text-sm text-[var(--foreground)] leading-relaxed bg-[var(--surface-raised)] p-4 rounded-lg border border-[var(--border)]">
                  {selectedEvent.summary}
                </p>
              </div>

              {/* Review Notes */}
              {selectedEvent.notas && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--gold)] font-mono">
                    Notas de Revisão do Autor
                  </h3>
                  <p className="text-xs text-[var(--muted)] leading-relaxed italic bg-[var(--surface-raised)]/60 p-3 rounded-lg border border-[var(--border)]">
                    {selectedEvent.notas}
                  </p>
                </div>
              )}

              {/* Character Chips */}
              {selectedEvent.characters.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] font-mono flex items-center gap-1.5">
                    <Users size={13} aria-hidden="true" />
                    Personagens Participantes
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedEvent.characters.map((name) => (
                      <Link
                        key={name}
                        href={`/studio/personagens?q=${encodeURIComponent(name)}`}
                        className="text-xs px-2.5 py-1 rounded-md bg-[var(--background)] hover:bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--foreground)] flex items-center gap-1.5 transition-colors"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                        {name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Simultaneous Counterpart Banner */}
              {syncCounterpart && (
                <div className="space-y-2 bg-[var(--gold)]/10 border border-[var(--gold)]/30 p-3.5 rounded-lg">
                  <div className="flex items-center gap-2 text-xs font-bold text-[var(--gold)]">
                    <Zap
                      size={14}
                      className="animate-pulse"
                      aria-hidden="true"
                    />
                    Evento Simultâneo na Raia Oposta
                  </div>
                  <p className="text-xs text-[var(--muted)]">
                    {selectedEvent.syncLabel}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedEventId(syncCounterpart.id)}
                    className="mt-2 text-xs text-[var(--foreground)] hover:text-white font-semibold flex items-center gap-1.5 underline underline-offset-4"
                  >
                    Saltar para: “{syncCounterpart.title}” →
                  </button>
                </div>
              )}
            </div>

            {/* Drawer Bottom Actions */}
            <div className="pt-4 border-t border-[var(--border)] space-y-2">
              {selectedEvent.documentId && (
                <Link
                  href={`/studio/manuscritos?id=${selectedEvent.documentId}`}
                  className="w-full button button-primary bg-[var(--accent)] text-[#10151c] py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:brightness-110"
                >
                  <BookOpen size={15} aria-hidden="true" />
                  Abrir cena na Mesa de Escrita
                </Link>
              )}
              <button
                type="button"
                onClick={() => copyPrompt(selectedEvent)}
                className="w-full button button-secondary py-2.5 rounded-lg text-xs flex items-center justify-center gap-2"
              >
                <Copy size={15} aria-hidden="true" />
                Copiar Prompt de Revisão Canônica
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
         EVENT CREATION & EDIT MODAL (Full E2E Compatibility)
         ========================================================================= */}
      {isCreatingEvent && (
        <EventEditorModal
          initialEvent={editingEvent}
          workspace={workspace}
          onClose={() => setIsCreatingEvent(false)}
          onSaved={(savedEntity) => {
            setWorkspace((w) => {
              const exists = w.entities.some((e) => e.id === savedEntity.id);
              return {
                ...w,
                entities: exists
                  ? w.entities.map((e) =>
                      e.id === savedEntity.id ? savedEntity : e,
                    )
                  : [...w.entities, savedEntity],
              };
            });
            setFeedback("Salvo no PostgreSQL com sucesso.");
          }}
          onRelationCreated={(newRel) => {
            setWorkspace((w) => {
              const exists = w.relations.some((r) => r.id === newRel.id);
              if (exists) return w;
              return {
                ...w,
                relations: [...w.relations, newRel],
              };
            });
          }}
        />
      )}
    </div>
  );
}

/* =========================================================================
   Subcomponent: TimelineNodeCard
   ========================================================================= */

interface TimelineNodeCardProps {
  event: ParallelTimelineEvent;
  isSelected: boolean;
  isDrawerOpen?: boolean;
  selectedEventId?: string | null;
  isSyncHighlighted?: boolean;
  onSelect: () => void;
  onSyncHover?: (active: boolean) => void;
}

function TimelineNodeCard({
  event,
  isSelected,
  isDrawerOpen = false,
  selectedEventId = null,
  isSyncHighlighted,
  onSelect,
  onSyncHover,
}: TimelineNodeCardProps) {
  const isEarth = event.swimlane === "earth";
  const eraInfo = COSMIC_ERAS.find((e) => e.id === event.eraId);

  return (
    <div
      tabIndex={0}
      role="button"
      aria-haspopup="dialog"
      aria-expanded={isDrawerOpen && selectedEventId === event.id}
      aria-controls="event-detail-drawer"
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      onMouseEnter={() => onSyncHover?.(true)}
      onMouseLeave={() => onSyncHover?.(false)}
      className={`timeline-node w-full text-left rounded-xl p-3.5 transition-all duration-200 cursor-pointer border relative group ${
        isSelected
          ? "bg-[var(--surface-raised)] ring-2 ring-[var(--accent)] border-transparent shadow-xl"
          : isSyncHighlighted
            ? "bg-[var(--surface-raised)] ring-2 ring-[var(--gold)] border-transparent shadow-xl"
            : isEarth
              ? "bg-[var(--surface)] border-[#3B82F6]/30 hover:border-[#3B82F6] hover:bg-[var(--surface-raised)]"
              : "bg-[var(--surface)] border-[#FF2A54]/30 hover:border-[#FF2A54] hover:bg-[var(--surface-raised)]"
      }`}
    >
      {/* Top Meta Line */}
      <div className="flex items-center justify-between gap-1 mb-2">
        <span
          className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded font-mono ${
            isEarth
              ? "bg-[#3B82F6]/20 text-[#91e3dc]"
              : "bg-[#FF2A54]/20 text-[#ff746a]"
          }`}
        >
          {eraInfo?.nome || event.eraId} ·{" "}
          {event.cycleOrYear || (isEarth ? "Terra" : "Severum")}
        </span>

        <div className="flex items-center gap-1.5">
          {event.syncEventId && (
            <span
              className="text-[var(--gold)] flex items-center"
              title="Evento sincronizado com a raia paralela"
              aria-label="Confluência com a raia paralela"
            >
              <Zap size={12} className="animate-pulse" aria-hidden="true" />
            </span>
          )}
          <StatusBadge status={event.status} />
        </div>
      </div>

      {/* Title */}
      <h4 className="font-semibold text-xs text-[var(--foreground)] leading-snug line-clamp-2 mb-1.5 group-hover:text-[var(--accent)] transition-colors">
        {event.title}
      </h4>

      {/* Summary Snippet */}
      <p className="text-[11px] text-[var(--muted)] line-clamp-2 leading-relaxed mb-2.5">
        {event.summary}
      </p>

      {/* Characters & POV Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-[10px] text-[var(--muted)]">
        <div className="flex items-center gap-1 line-clamp-1 max-w-[70%]">
          {event.characters.length > 0 ? (
            <span>{event.characters.slice(0, 2).join(", ")}</span>
          ) : (
            <span>{event.location || (isEarth ? "Glen" : "Severum")}</span>
          )}
        </div>
        <ChevronRight
          size={13}
          className="text-[var(--muted)] group-hover:translate-x-0.5 transition-transform"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

/* =========================================================================
   Subcomponent: EventEditorModal (E2E Test Exact Compatibility)
   ========================================================================= */

interface EventEditorModalProps {
  initialEvent: StudioEntity | null;
  workspace: StudioWorkspace;
  onClose: () => void;
  onSaved: (entity: StudioEntity) => void;
  onRelationCreated?: (relation: StudioRelation) => void;
}

function EventEditorModal({
  initialEvent,
  workspace,
  onClose,
  onSaved,
  onRelationCreated,
}: EventEditorModalProps) {
  const [currentEntity, setCurrentEntity] = useState<StudioEntity | null>(
    initialEvent,
  );
  const [title, setTitle] = useState(initialEvent?.title || "");
  const [temporalRef, setTemporalRef] = useState(
    (initialEvent?.attributes?.temporalRef as string) ||
      (initialEvent?.attributes?.dateLabel as string) ||
      "",
  );
  const [order, setOrder] = useState<string>(
    initialEvent?.attributes?.order !== undefined
      ? String(initialEvent.attributes.order)
      : String(workspace.entities.filter((e) => e.kind === "event").length + 1),
  );
  const [eraId, setEraId] = useState(
    (initialEvent?.attributes?.eraId as string) || "ascensao",
  );
  const [swimlane, setSwimlane] = useState<SwimlaneId>(
    (initialEvent?.attributes?.swimlane as SwimlaneId) || "earth",
  );
  const [summary, setSummary] = useState(initialEvent?.summary || "");
  const [status, setStatus] = useState(initialEvent?.status || "draft");

  // Relações e Vínculos
  const [connectTarget, setConnectTarget] = useState("");
  const [relationLabel, setRelationLabel] = useState("");
  const [relations, setRelations] = useState<StudioRelation[]>(() => {
    if (!initialEvent) return [];
    return workspace.relations.filter(
      (r) => r.sourceId === initialEvent.id || r.targetId === initialEvent.id,
    );
  });
  const [feedback, setFeedback] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const stories = useMemo(
    () => workspace.entities.filter((e) => e.kind === "story"),
    [workspace.entities],
  );

  async function handleSave() {
    if (!title.trim()) {
      setError("O título do evento é obrigatório.");
      return;
    }
    setPending(true);
    setError("");

    const targetId =
      currentEntity?.id || initialEvent?.id || `event-${crypto.randomUUID()}`;
    const targetVersion = currentEntity?.version ?? initialEvent?.version ?? 0;

    const entityPayload: StudioEntity = {
      id: targetId,
      kind: "event",
      title: title.trim(),
      summary: summary.trim(),
      body: summary.trim(),
      status: (status as "draft" | "review" | "ready" | "done") || "draft",
      published: false,
      tags: [],
      version: targetVersion,
      attributes: {
        ...(currentEntity?.attributes || initialEvent?.attributes || {}),
        temporalRef: temporalRef.trim(),
        dateLabel: temporalRef.trim(),
        order: Number(order) || 42,
        eraId,
        swimlane,
        escala: swimlane === "earth" ? "TERRA" : "UNIVERSAL",
      },
    };

    try {
      const res = await fetch("/api/studio/entities", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entityPayload),
      });
      if (!res.ok) throw new Error("Falha ao salvar evento no servidor.");
      const saved: StudioEntity = await res.json();
      setCurrentEntity(saved);
      setFeedback("Salvo no PostgreSQL");
      onSaved(saved);
    } catch (err) {
      setError((err as Error).message || "Erro ao salvar.");
    } finally {
      setPending(false);
    }
  }

  async function handleCreateRelation() {
    if (!connectTarget) return;
    const sourceId = currentEntity?.id || initialEvent?.id;
    if (!sourceId) {
      setError("Salve o evento antes de criar vínculos.");
      return;
    }
    setPending(true);
    setError("");
    const rel: StudioRelation = {
      id: crypto.randomUUID(),
      sourceId,
      targetId: connectTarget,
      label: relationLabel.trim() || "relacionado",
    };

    try {
      let res = await fetch("/api/studio/relations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rel),
      });
      if (res.status === 405) {
        res = await fetch("/api/studio/relations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rel),
        });
      }
      if (!res.ok) throw new Error("Falha ao salvar vínculo no servidor.");
      const savedRel: StudioRelation = await res.json();
      const finalRel = savedRel?.id ? savedRel : rel;
      setRelations((prev) => [...prev, finalRel]);
      onRelationCreated?.(finalRel);
      setConnectTarget("");
      setRelationLabel("");
    } catch (err) {
      setError((err as Error).message || "Erro ao criar vínculo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        className="w-full max-w-lg bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-4 shadow-2xl pointer-events-auto max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center pb-2 border-b border-[var(--border)]">
          <h3
            id="modal-title"
            className="text-lg font-bold text-[var(--foreground)]"
          >
            {initialEvent ? "Editar Ficha de Evento" : "Nova ficha de evento"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[var(--muted)] hover:text-white"
            aria-label="Fechar modal"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {error && <p className="text-xs text-[#ff746a]">{error}</p>}

        <p
          className="workshop-feedback text-xs text-[var(--accent)] font-medium"
          role="status"
        >
          {feedback}
        </p>

        <div className="space-y-3 text-xs">
          {/* Nome ou título */}
          <div>
            <label
              htmlFor="evt-title"
              className="block text-[var(--muted)] mb-1"
            >
              Nome ou título
            </label>
            <input
              id="evt-title"
              aria-label="Nome ou título"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)]"
            />
          </div>

          {/* Data, era ou referência temporal */}
          <div>
            <label
              htmlFor="evt-temporal"
              className="block text-[var(--muted)] mb-1"
            >
              Data, era ou referência temporal
            </label>
            <input
              id="evt-temporal"
              aria-label="Data, era ou referência temporal"
              type="text"
              value={temporalRef}
              onChange={(e) => setTemporalRef(e.target.value)}
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)]"
            />
          </div>

          {/* Ordem na cronologia */}
          <div>
            <label
              htmlFor="evt-order"
              className="block text-[var(--muted)] mb-1"
            >
              Ordem na cronologia
            </label>
            <input
              id="evt-order"
              aria-label="Ordem na cronologia"
              type="number"
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)]"
            />
          </div>

          {/* Raia / Escala / Estado */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label
                htmlFor="evt-swimlane"
                className="block text-[var(--muted)] mb-1"
              >
                Raia Paralela
              </label>
              <select
                id="evt-swimlane"
                aria-label="Raia Paralela"
                value={swimlane}
                onChange={(e) => setSwimlane(e.target.value as SwimlaneId)}
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[var(--foreground)]"
              >
                <option value="earth">Raia 1 (Terra / Glen)</option>
                <option value="severum">Raia 2 (Severum / Cósmico)</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="evt-era"
                className="block text-[var(--muted)] mb-1"
              >
                Era Cósmica
              </label>
              <select
                id="evt-era"
                aria-label="Era Cósmica"
                value={eraId}
                onChange={(e) => setEraId(e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[var(--foreground)]"
              >
                {COSMIC_ERAS.map((era) => (
                  <option key={era.id} value={era.id}>
                    {era.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="evt-status"
                className="block text-[var(--muted)] mb-1"
              >
                Estado
              </label>
              <select
                id="evt-status"
                aria-label="Estado"
                value={status}
                onChange={(e) =>
                  setStatus(
                    e.target.value as "draft" | "review" | "ready" | "done",
                  )
                }
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[var(--foreground)]"
              >
                <option value="draft">Rascunho</option>
                <option value="review">Em revisão</option>
                <option value="ready">Pronto</option>
                <option value="done">Concluído</option>
              </select>
            </div>
          </div>

          {/* Resumo */}
          <div>
            <label
              htmlFor="evt-summary"
              className="block text-[var(--muted)] mb-1"
            >
              Resumo canônico
            </label>
            <textarea
              id="evt-summary"
              aria-label="Resumo canônico"
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)]"
            />
          </div>

          {/* Conexão com Histórias */}
          <div className="pt-2 border-t border-[var(--border)] space-y-2">
            <span className="text-[11px] font-bold text-[var(--muted)] uppercase font-mono">
              Vínculos e Histórias
            </span>
            <div className="flex gap-2">
              <label htmlFor="connect-target" className="sr-only">
                Conectar com
              </label>
              <select
                id="connect-target"
                aria-label="Conectar com"
                value={connectTarget}
                onChange={(e) => setConnectTarget(e.target.value)}
                className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--foreground)]"
              >
                <option value="">Selecione uma história...</option>
                {stories.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleCreateRelation}
                className="button button-secondary text-xs px-3 py-1.5 rounded-lg"
              >
                Criar vínculo
              </button>
            </div>

            <div className="db-relation-list text-xs space-y-1">
              {relations.map((r, i) => {
                const targetEntity = workspace.entities.find(
                  (e) => e.id === r.targetId,
                );
                const targetTitle = targetEntity
                  ? targetEntity.title
                  : r.targetId;
                return (
                  <div
                    key={r.id || i}
                    className="px-2 py-1 bg-[var(--background)] rounded border border-[var(--border)] text-[var(--foreground)] flex items-center justify-between"
                  >
                    <span>
                      Conectado com: <strong>{targetTitle}</strong>
                    </span>
                    {r.label && (
                      <span className="text-[10px] text-[var(--muted)] font-mono">
                        {r.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-[var(--border)] flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="button button-secondary text-xs px-4 py-2 rounded-lg"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={handleSave}
            className="button button-primary bg-[var(--accent)] text-[#10151c] font-bold text-xs px-5 py-2 rounded-lg hover:brightness-110"
          >
            {pending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
