"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Orbit,
  Cpu,
  Landmark,
  Dna,
  Flame,
  Plus,
  Search,
  Save,
  Trash2,
  Link2,
  Unlink,
  X,
  BookOpen,
  Shield,
  UsersRound,
  MapPin,
  Sparkles,
  FileText,
  AlertCircle,
  CheckCircle2,
  Layers,
  ChevronRight,
} from "lucide-react";
import {
  kindLabels,
  type StudioEntity,
  type StudioRelation,
  type StudioWorkspace,
} from "@/lib/workspace";
import { useUnsavedWork } from "@/components/use-unsaved-work";

/* =========================================================================
   Types & Taxonomy
   ========================================================================= */

export type ConceptCategory =
  "cosmologia" | "tecnologia" | "geopolitica" | "biologia" | "misticismo";

export type ConceptScale = "UNIVERSAL" | "SETOR" | "TERRA";

export interface ConceptAttributes {
  category?: ConceptCategory | string;
  rules?: string[];
  scale?: ConceptScale | string;
  visualAssetId?: string;
  source?: string;
  definitionPending?: boolean;
  [key: string]: unknown;
}

export const CONCEPT_CATEGORIES: {
  id: ConceptCategory;
  label: string;
  description: string;
  icon: React.ComponentType<{
    className?: string;
    size?: number;
    "aria-hidden"?: boolean;
  }>;
  color: string;
  badgeClass: string;
  activeClass: string;
}[] = [
  {
    id: "cosmologia",
    label: "Cosmologia",
    description: "Origem do universo, dualidade Ormuz/Hades e leis cósmicas",
    icon: Orbit,
    color: "#91e3dc",
    badgeClass: "bg-[#91e3dc]/15 text-[#91e3dc] border-[#91e3dc]/30",
    activeClass: "bg-[#91e3dc]/20 text-[#91e3dc] border-[#91e3dc]",
  },
  {
    id: "tecnologia",
    label: "Tecnologia",
    description:
      "Propulsão de dobra, motores de salto, armamento bélico e delimitação",
    icon: Cpu,
    color: "#5cc8ff",
    badgeClass: "bg-[#5cc8ff]/15 text-[#5cc8ff] border-[#5cc8ff]/30",
    activeClass: "bg-[#5cc8ff]/20 text-[#5cc8ff] border-[#5cc8ff]",
  },
  {
    id: "geopolitica",
    label: "Geopolítica Cósmica",
    description: "Metodologia militar de Severum, corporativismo e congregação",
    icon: Landmark,
    color: "#ff746a",
    badgeClass: "bg-[#ff746a]/15 text-[#ff746a] border-[#ff746a]/30",
    activeClass: "bg-[#ff746a]/20 text-[#ff746a] border-[#ff746a]",
  },
  {
    id: "biologia",
    label: "Biologia",
    description: "Biotecnologia Deroo Da, enxertos biomecânicos e genética",
    icon: Dna,
    color: "#7ae582",
    badgeClass: "bg-[#7ae582]/15 text-[#7ae582] border-[#7ae582]/30",
    activeClass: "bg-[#7ae582]/20 text-[#7ae582] border-[#7ae582]",
  },
  {
    id: "misticismo",
    label: "Misticismo",
    description:
      "Maldição Enokití, relíquias cósmicas e fenômenos transcendentais",
    icon: Flame,
    color: "#edc993",
    badgeClass: "bg-[#edc993]/15 text-[#edc993] border-[#edc993]/30",
    activeClass: "bg-[#edc993]/20 text-[#edc993] border-[#edc993]",
  },
];

export const CONCEPT_SCALES: {
  id: ConceptScale;
  label: string;
  description: string;
  badgeClass: string;
}[] = [
  {
    id: "UNIVERSAL",
    label: "Universal",
    description: "Rege todas as realidades e dimensões do cosmos",
    badgeClass: "bg-[#91e3dc]/10 text-[#91e3dc] border border-[#91e3dc]/40",
  },
  {
    id: "SETOR",
    label: "Setor Cósmico",
    description: "Abrangência regional: Severum, Lamprois ou Espaço Profundo",
    badgeClass: "bg-[#ff746a]/10 text-[#ff746a] border border-[#ff746a]/40",
  },
  {
    id: "TERRA",
    label: "Planetário / Terra",
    description: "Específico do planeta Terra, Glen ou Antártida",
    badgeClass: "bg-[#edc993]/10 text-[#edc993] border border-[#edc993]/40",
  },
];

const kindIconMap: Record<
  string,
  React.ComponentType<{
    className?: string;
    size?: number;
    "aria-hidden"?: boolean;
  }>
> = {
  character: UsersRound,
  story: BookOpen,
  faction: Shield,
  place: MapPin,
  artifact: Sparkles,
  document: FileText,
};

/* =========================================================================
   API Client Helper
   ========================================================================= */

async function api<T>(url: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Operação não pôde ser concluída.");
  }
  return data;
}

/* =========================================================================
   Component: ConceptMatrix
   ========================================================================= */

export function ConceptMatrix({
  initial,
  initialId,
}: {
  initial: StudioWorkspace;
  initialId?: string;
}) {
  const [workspace, setWorkspace] = useState<StudioWorkspace>(initial);
  const [selectedCategory, setSelectedCategory] = useState<
    ConceptCategory | "all"
  >("all");
  const [selectedScale, setSelectedScale] = useState<ConceptScale | "all">(
    "all",
  );
  const [search, setSearch] = useState("");
  const [activeConceptId, setActiveConceptId] = useState<string | null>(
    initialId ?? null,
  );
  const [isCreating, setIsCreating] = useState(false);
  const [draft, setDraft] = useState<StudioEntity | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  // Connection manager state
  const [targetEntityId, setTargetEntityId] = useState("");
  const [relationLabel, setRelationLabel] = useState<
    "fundamenta" | "relacionado" | string
  >("fundamenta");
  const [entityFilterKind, setEntityFilterKind] = useState<string>("all");
  const [entitySearch, setEntitySearch] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [deletingRelationId, setDeletingRelationId] = useState<string | null>(
    null,
  );

  const saveRef = useRef<() => void>(() => {});
  const drawerRef = useRef<HTMLDivElement>(null);

  useUnsavedWork(dirty);

  // Sync draft when activeConceptId changes
  useEffect(() => {
    if (activeConceptId) {
      const found = workspace.entities.find(
        (e) => e.kind === "concept" && e.id === activeConceptId,
      );
      if (found) {
        setDraft(found);
        setIsCreating(false);
        setDirty(false);
      }
    } else if (!isCreating) {
      setDraft(null);
      setDirty(false);
    }
  }, [activeConceptId, workspace.entities, isCreating]);

  // Keyboard shortcut Ctrl+S / Cmd+S and Escape
  useEffect(() => {
    saveRef.current = () => {
      void handleSave();
    };
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveRef.current();
      } else if (e.key === "Escape" && (activeConceptId || isCreating)) {
        if (
          !dirty ||
          window.confirm("Descartar alterações não salvas deste conceito?")
        ) {
          closeDrawer();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dirty, activeConceptId, isCreating]);

  // Concept entities list
  const concepts = useMemo(() => {
    return workspace.entities.filter((e) => e.kind === "concept");
  }, [workspace.entities]);

  // Filtered concepts
  const filteredConcepts = useMemo(() => {
    const query = search.toLocaleLowerCase("pt-BR").trim();
    return concepts.filter((c) => {
      const attrs = (c.attributes || {}) as ConceptAttributes;
      const category = (attrs.category || "cosmologia").toLowerCase();
      const scale = (attrs.scale || "UNIVERSAL").toUpperCase();

      if (selectedCategory !== "all" && category !== selectedCategory) {
        return false;
      }
      if (selectedScale !== "all" && scale !== selectedScale) {
        return false;
      }

      if (!query) return true;

      const rulesText = Array.isArray(attrs.rules) ? attrs.rules.join(" ") : "";
      const tagsText = Array.isArray(c.tags) ? c.tags.join(" ") : "";
      const searchHaystack =
        `${c.title} ${c.summary} ${c.body} ${rulesText} ${tagsText}`.toLocaleLowerCase(
          "pt-BR",
        );

      return searchHaystack.includes(query);
    });
  }, [concepts, selectedCategory, selectedScale, search]);

  // Metrics summary
  const metrics = useMemo(() => {
    let totalRules = 0;
    let universalCount = 0;
    for (const c of concepts) {
      const attrs = (c.attributes || {}) as ConceptAttributes;
      if (Array.isArray(attrs.rules)) totalRules += attrs.rules.length;
      if (attrs.scale === "UNIVERSAL") universalCount++;
    }
    const conceptIds = new Set(concepts.map((c) => c.id));
    const totalRelations = workspace.relations.filter(
      (r) => conceptIds.has(r.sourceId) || conceptIds.has(r.targetId),
    ).length;

    return {
      totalConcepts: concepts.length,
      totalRules,
      totalRelations,
      universalCount,
    };
  }, [concepts, workspace.relations]);

  // Active concept bidirectional connections
  const activeRelations = useMemo(() => {
    if (!draft) return [];
    return workspace.relations
      .filter((r) => r.sourceId === draft.id || r.targetId === draft.id)
      .map((r) => {
        const isSource = r.sourceId === draft.id;
        const otherId = isSource ? r.targetId : r.sourceId;
        const otherEntity = workspace.entities.find((e) => e.id === otherId);
        return {
          relation: r,
          isSource,
          otherId,
          otherEntity,
        };
      });
  }, [draft, workspace.relations, workspace.entities]);

  // Available entities to connect
  const availableEntitiesToConnect = useMemo(() => {
    if (!draft) return [];
    const connectedIds = new Set(activeRelations.map((ar) => ar.otherId));
    connectedIds.add(draft.id);

    const query = entitySearch.toLocaleLowerCase("pt-BR").trim();

    return workspace.entities
      .filter((e) => {
        if (connectedIds.has(e.id)) return false;
        if (entityFilterKind !== "all" && e.kind !== entityFilterKind)
          return false;
        if (!query) return true;
        return `${e.title} ${e.summary} ${kindLabels[e.kind]}`
          .toLocaleLowerCase("pt-BR")
          .includes(query);
      })
      .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
  }, [
    draft,
    activeRelations,
    workspace.entities,
    entityFilterKind,
    entitySearch,
  ]);

  // Drawer handlers
  function openConcept(id: string) {
    if (
      dirty &&
      !window.confirm(
        "Há alterações sem salvar. Abrir outro conceito e descartá-las?",
      )
    ) {
      return;
    }
    setActiveConceptId(id);
    setIsCreating(false);
    setError("");
    setFeedback("");
    const url = new URL(window.location.href);
    url.searchParams.set("id", id);
    window.history.replaceState(null, "", url);
  }

  function startNewConcept() {
    if (
      dirty &&
      !window.confirm(
        "Há alterações sem salvar. Criar novo conceito e descartá-las?",
      )
    ) {
      return;
    }
    const newId = `concept-${Date.now().toString(36)}`;
    const blank: StudioEntity = {
      id: newId,
      kind: "concept",
      title: "",
      summary: "",
      body: "",
      status: "draft",
      published: false,
      tags: [],
      attributes: {
        category: selectedCategory === "all" ? "cosmologia" : selectedCategory,
        scale: "UNIVERSAL",
        rules: [],
      },
      version: 0,
    };
    setDraft(blank);
    setActiveConceptId(newId);
    setIsCreating(true);
    setDirty(true);
    setError("");
    setFeedback("");
  }

  function closeDrawer() {
    setActiveConceptId(null);
    setIsCreating(false);
    setDraft(null);
    setDirty(false);
    setError("");
    setFeedback("");
    const url = new URL(window.location.href);
    url.searchParams.delete("id");
    window.history.replaceState(null, "", url);
  }

  function updateDraft(patch: Partial<StudioEntity>) {
    if (!draft) return;
    setDraft({ ...draft, ...patch });
    setDirty(true);
    setFeedback("");
  }

  function updateAttributes(patch: Partial<ConceptAttributes>) {
    if (!draft) return;
    const currentAttrs = (draft.attributes || {}) as ConceptAttributes;
    updateDraft({
      attributes: {
        ...currentAttrs,
        ...patch,
      },
    });
  }

  // Rules handlers
  function handleAddRule() {
    if (!draft) return;
    const currentAttrs = (draft.attributes || {}) as ConceptAttributes;
    const currentRules = Array.isArray(currentAttrs.rules)
      ? [...currentAttrs.rules]
      : [];
    currentRules.push("");
    updateAttributes({ rules: currentRules });
  }

  function handleRuleChange(index: number, value: string) {
    if (!draft) return;
    const currentAttrs = (draft.attributes || {}) as ConceptAttributes;
    const currentRules = Array.isArray(currentAttrs.rules)
      ? [...currentAttrs.rules]
      : [];
    currentRules[index] = value;
    updateAttributes({ rules: currentRules });
  }

  function handleRemoveRule(index: number) {
    if (!draft) return;
    const currentAttrs = (draft.attributes || {}) as ConceptAttributes;
    const currentRules = Array.isArray(currentAttrs.rules)
      ? [...currentAttrs.rules]
      : [];
    currentRules.splice(index, 1);
    updateAttributes({ rules: currentRules });
  }

  // Save concept
  async function handleSave() {
    if (!draft || pending) return;
    if (!draft.title.trim()) {
      setError("Informe o título do conceito antes de salvar.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const currentAttrs = (draft.attributes || {}) as ConceptAttributes;
      const cleanRules = Array.isArray(currentAttrs.rules)
        ? currentAttrs.rules.map((r) => r.trim()).filter(Boolean)
        : [];

      const payload: StudioEntity = {
        ...draft,
        title: draft.title.trim(),
        summary: draft.summary?.trim() || draft.body.slice(0, 300),
        attributes: {
          ...currentAttrs,
          category: currentAttrs.category || "cosmologia",
          scale: currentAttrs.scale || "UNIVERSAL",
          rules: cleanRules,
        },
      };

      const saved = await api<StudioEntity>(
        "/api/studio/entities",
        "PUT",
        payload,
      );
      setWorkspace((w) => {
        const exists = w.entities.some((e) => e.id === saved.id);
        return {
          ...w,
          entities: exists
            ? w.entities.map((e) => (e.id === saved.id ? saved : e))
            : [...w.entities, saved],
        };
      });
      setDraft(saved);
      setActiveConceptId(saved.id);
      setIsCreating(false);
      setDirty(false);
      setFeedback("Ficha do conceito salva no PostgreSQL com sucesso.");
    } catch (err) {
      setError((err as Error).message || "Erro ao salvar conceito.");
    } finally {
      setPending(false);
    }
  }

  // Connect entity relation
  async function handleConnectEntity() {
    if (!draft || !targetEntityId || connecting) return;
    if (dirty) {
      setError("Salve as alterações da ficha antes de criar novos vínculos.");
      return;
    }
    setConnecting(true);
    setError("");
    try {
      const relationPayload: StudioRelation = {
        id: crypto.randomUUID(),
        sourceId: draft.id,
        targetId: targetEntityId,
        label: relationLabel.trim() || "fundamenta",
      };
      const created = await api<StudioRelation>(
        "/api/studio/relations",
        "POST",
        relationPayload,
      );
      setWorkspace((w) => ({
        ...w,
        relations: [...w.relations, created],
      }));
      setTargetEntityId("");
      setFeedback("Vínculo bidirecional criado com sucesso.");
    } catch (err) {
      setError((err as Error).message || "Erro ao criar vínculo.");
    } finally {
      setConnecting(false);
    }
  }

  // Remove relation
  async function handleRemoveRelation(relationId: string) {
    if (deletingRelationId) return;
    if (
      !window.confirm("Remover este vínculo? As duas fichas serão preservadas.")
    ) {
      return;
    }
    setDeletingRelationId(relationId);
    setError("");
    try {
      await api("/api/studio/relations", "DELETE", { id: relationId });
      setWorkspace((w) => ({
        ...w,
        relations: w.relations.filter((r) => r.id !== relationId),
      }));
      setFeedback("Vínculo removido com sucesso.");
    } catch (err) {
      setError((err as Error).message || "Erro ao remover vínculo.");
    } finally {
      setDeletingRelationId(null);
    }
  }

  // Delete entire concept
  async function handleDeleteConcept() {
    if (!draft || pending) return;
    if (
      !window.confirm(
        `Tem certeza que deseja arquivar o conceito "${draft.title}"?`,
      )
    ) {
      return;
    }
    setPending(true);
    setError("");
    try {
      await api("/api/studio/entities", "DELETE", {
        id: draft.id,
        version: draft.version,
      });
      setWorkspace((w) => ({
        ...w,
        entities: w.entities.filter((e) => e.id !== draft.id),
        relations: w.relations.filter(
          (r) => r.sourceId !== draft.id && r.targetId !== draft.id,
        ),
      }));
      closeDrawer();
      setFeedback("Conceito arquivado.");
    } catch (err) {
      setError((err as Error).message || "Erro ao arquivar conceito.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="concept-matrix-root w-full max-w-7xl mx-auto px-4 py-8 space-y-8 text-[#f5f1e8]">
      {/* =========================================================================
          Top Hero & Statistics Header
          ========================================================================= */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#303c49]">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#91e3dc] font-semibold mb-1">
            <Orbit size={16} aria-hidden />
            <span>Engenharia de Worldbuilding Cósmico</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#f5f1e8]">
            Matriz de Conceitos Cósmicos
          </h1>
          <p className="mt-2 text-sm md:text-base text-[#b0b8bf] max-w-2xl leading-relaxed">
            Modele e catalogue as leis ontológicas, tecnologias gravitacionais,
            doutrinas geopolíticas e fenômenos místicos que fundamentam a
            narrativa do UVC.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={startNewConcept}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#91e3dc] hover:bg-[#aef5ef] text-[#10151c] font-semibold rounded-xl shadow-lg shadow-[#91e3dc]/10 transition cursor-pointer"
          >
            <Plus size={18} aria-hidden />
            <span>Novo Conceito</span>
          </button>
        </div>
      </header>

      {/* Metrics Row */}
      <section
        aria-label="Estatísticas da Matriz"
        className="grid grid-cols-2 sm:grid-cols-4 gap-4"
      >
        <div className="bg-[#18202a] border border-[#303c49] rounded-xl p-4 flex flex-col justify-between">
          <span className="text-xs text-[#b0b8bf] uppercase tracking-wider">
            Total de Conceitos
          </span>
          <span className="text-2xl md:text-3xl font-extrabold text-[#f5f1e8] mt-1">
            {metrics.totalConcepts}
          </span>
          <span className="text-[11px] text-[#91e3dc] mt-1">
            Fichas ativas no PostgreSQL
          </span>
        </div>

        <div className="bg-[#18202a] border border-[#303c49] rounded-xl p-4 flex flex-col justify-between">
          <span className="text-xs text-[#b0b8bf] uppercase tracking-wider">
            Regras Codificadas
          </span>
          <span className="text-2xl md:text-3xl font-extrabold text-[#edc993] mt-1">
            {metrics.totalRules}
          </span>
          <span className="text-[11px] text-[#b0b8bf] mt-1">
            Mecânicas canônicas invioláveis
          </span>
        </div>

        <div className="bg-[#18202a] border border-[#303c49] rounded-xl p-4 flex flex-col justify-between">
          <span className="text-xs text-[#b0b8bf] uppercase tracking-wider">
            Conexões Bidirecionais
          </span>
          <span className="text-2xl md:text-3xl font-extrabold text-[#5cc8ff] mt-1">
            {metrics.totalRelations}
          </span>
          <span className="text-[11px] text-[#b0b8bf] mt-1">
            Vínculos de fundamentação
          </span>
        </div>

        <div className="bg-[#18202a] border border-[#303c49] rounded-xl p-4 flex flex-col justify-between">
          <span className="text-xs text-[#b0b8bf] uppercase tracking-wider">
            Escala Universal
          </span>
          <span className="text-2xl md:text-3xl font-extrabold text-[#91e3dc] mt-1">
            {metrics.universalCount}
          </span>
          <span className="text-[11px] text-[#b0b8bf] mt-1">
            Disponíveis em todas as histórias
          </span>
        </div>
      </section>

      {/* Global Alerts / Feedback */}
      {feedback && (
        <div
          role="status"
          className="flex items-center justify-between p-4 bg-[#91e3dc]/10 border border-[#91e3dc]/40 text-[#91e3dc] rounded-xl text-sm"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} aria-hidden />
            <span>{feedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback("")}
            className="text-[#91e3dc] hover:text-[#f5f1e8]"
            aria-label="Dispensar aviso"
          >
            <X size={16} aria-hidden />
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between p-4 bg-[#ff746a]/10 border border-[#ff746a]/40 text-[#ff746a] rounded-xl text-sm"
        >
          <div className="flex items-center gap-2">
            <AlertCircle size={18} aria-hidden />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError("")}
            className="text-[#ff746a] hover:text-[#f5f1e8]"
            aria-label="Dispensar erro"
          >
            <X size={16} aria-hidden />
          </button>
        </div>
      )}

      {/* =========================================================================
          Filter Toolbar & Category Tabs
          ========================================================================= */}
      <section
        aria-label="Filtros e navegação de categorias"
        className="space-y-4"
      >
        {/* Category Tabs */}
        <div
          role="tablist"
          aria-label="Categorias cósmicas"
          className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none"
        >
          <button
            role="tab"
            aria-selected={selectedCategory === "all"}
            onClick={() => setSelectedCategory("all")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-medium border transition cursor-pointer shrink-0 ${
              selectedCategory === "all"
                ? "bg-[#202c38] text-[#f5f1e8] border-[#91e3dc]"
                : "bg-[#18202a] text-[#b0b8bf] border-[#303c49] hover:border-[#b0b8bf]/50"
            }`}
          >
            <Layers size={16} aria-hidden />
            <span>Todas as Categorias</span>
            <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-[#10151c] text-[#b0b8bf]">
              {concepts.length}
            </span>
          </button>

          {CONCEPT_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const count = concepts.filter(
              (c) =>
                ((c.attributes || {}) as ConceptAttributes).category === cat.id,
            ).length;
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                role="tab"
                aria-selected={isSelected}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-medium border transition cursor-pointer shrink-0 ${
                  isSelected
                    ? cat.activeClass
                    : "bg-[#18202a] text-[#b0b8bf] border-[#303c49] hover:border-[#b0b8bf]/50"
                }`}
              >
                <Icon size={16} aria-hidden />
                <span>{cat.label}</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-[#10151c] text-[#b0b8bf]">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Scale Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b0b8bf]"
              aria-hidden
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título, mecânicas, regras ou tags canônicas..."
              className="w-full pl-10 pr-10 py-2.5 bg-[#18202a] border border-[#303c49] rounded-xl text-sm text-[#f5f1e8] placeholder-[#b0b8bf]/60 focus:border-[#91e3dc] focus:outline-hidden transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b0b8bf] hover:text-[#f5f1e8]"
                aria-label="Limpar busca"
              >
                <X size={16} aria-hidden />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedScale}
              onChange={(e) =>
                setSelectedScale(e.target.value as ConceptScale | "all")
              }
              aria-label="Filtrar por escala"
              className="px-3.5 py-2.5 bg-[#18202a] border border-[#303c49] rounded-xl text-xs md:text-sm text-[#f5f1e8] focus:border-[#91e3dc] focus:outline-hidden cursor-pointer"
            >
              <option value="all">Todas as Escalas</option>
              <option value="UNIVERSAL">Universal (Cosmos)</option>
              <option value="SETOR">Setor Cósmico (Severum / Lamprois)</option>
              <option value="TERRA">Planetário (Terra / Glen)</option>
            </select>
          </div>
        </div>
      </section>

      {/* =========================================================================
          Concept Cards Grid
          ========================================================================= */}
      <section aria-label="Catálogo de Conceitos">
        {filteredConcepts.length === 0 ? (
          <div className="text-center py-16 px-4 bg-[#18202a]/60 border border-dashed border-[#303c49] rounded-2xl">
            <Orbit
              size={48}
              className="mx-auto text-[#b0b8bf]/40 mb-3"
              aria-hidden
            />
            <h2 className="text-lg font-semibold text-[#f5f1e8]">
              Nenhum conceito encontrado
            </h2>
            <p className="text-sm text-[#b0b8bf] max-w-md mx-auto mt-1">
              Nenhuma ficha cósmica corresponde aos critérios de pesquisa ou
              categoria selecionada.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              {(search ||
                selectedCategory !== "all" ||
                selectedScale !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSelectedCategory("all");
                    setSelectedScale("all");
                  }}
                  className="px-4 py-2 bg-[#202c38] hover:bg-[#303c49] text-sm text-[#f5f1e8] rounded-xl transition cursor-pointer"
                >
                  Limpar Filtros
                </button>
              )}
              <button
                type="button"
                onClick={startNewConcept}
                className="px-4 py-2 bg-[#91e3dc] hover:bg-[#aef5ef] text-[#10151c] font-semibold text-sm rounded-xl transition cursor-pointer"
              >
                + Criar Conceito
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredConcepts.map((concept) => {
              const attrs = (concept.attributes || {}) as ConceptAttributes;
              const catConfig =
                CONCEPT_CATEGORIES.find((c) => c.id === attrs.category) ||
                CONCEPT_CATEGORIES[0];
              const scaleConfig =
                CONCEPT_SCALES.find((s) => s.id === attrs.scale) ||
                CONCEPT_SCALES[0];
              const rules = Array.isArray(attrs.rules) ? attrs.rules : [];
              const CatIcon = catConfig.icon;

              const relationsCount = workspace.relations.filter(
                (r) => r.sourceId === concept.id || r.targetId === concept.id,
              ).length;

              return (
                <article
                  key={concept.id}
                  onClick={() => openConcept(concept.id)}
                  className="group relative bg-[#18202a] hover:bg-[#202c38] border border-[#303c49] hover:border-[#91e3dc]/50 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 cursor-pointer shadow-md hover:shadow-xl hover:shadow-black/40"
                >
                  <div className="space-y-4">
                    {/* Top Row: Category + Scale + Status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${catConfig.badgeClass}`}
                        >
                          <CatIcon size={14} aria-hidden />
                          <span>{catConfig.label}</span>
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${scaleConfig.badgeClass}`}
                        >
                          {scaleConfig.label}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#b0b8bf] font-mono">
                        v{concept.version}
                      </span>
                    </div>

                    {/* Title */}
                    <div>
                      <h2 className="text-lg font-bold text-[#f5f1e8] group-hover:text-[#91e3dc] transition line-clamp-2">
                        {concept.title}
                      </h2>
                      <p className="mt-2 text-xs md:text-sm text-[#b0b8bf] line-clamp-3 leading-relaxed">
                        {concept.summary ||
                          concept.body ||
                          "Sem descrição cadastrada."}
                      </p>
                    </div>

                    {/* Operational Rules Preview */}
                    <div className="bg-[#10151c]/70 border border-[#303c49]/60 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#edc993] font-semibold flex items-center gap-1.5">
                          <BookOpen size={14} aria-hidden />
                          <span>Regras Canônicas ({rules.length})</span>
                        </span>
                      </div>
                      {rules.length > 0 ? (
                        <ul className="text-xs text-[#b0b8bf] space-y-1 list-disc list-inside">
                          {rules.slice(0, 2).map((rule, idx) => (
                            <li key={idx} className="line-clamp-1">
                              {rule}
                            </li>
                          ))}
                          {rules.length > 2 && (
                            <li className="text-[11px] text-[#91e3dc] list-none font-medium">
                              +{rules.length - 2} regra(s) adicional(is)
                            </li>
                          )}
                        </ul>
                      ) : (
                        <p className="text-[11px] text-[#b0b8bf]/60 italic">
                          Nenhuma regra operacional cadastrada.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom Meta */}
                  <div className="mt-5 pt-3 border-t border-[#303c49]/60 flex items-center justify-between text-xs text-[#b0b8bf]">
                    <div className="flex items-center gap-1.5 text-[#5cc8ff]">
                      <Link2 size={14} aria-hidden />
                      <span>
                        {relationsCount}{" "}
                        {relationsCount === 1 ? "vínculo" : "vínculos"}
                      </span>
                    </div>
                    <span className="text-[#91e3dc] font-medium flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Abrir Ficha <ChevronRight size={14} aria-hidden />
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* =========================================================================
          Detail Drawer / Editing Modal
          ========================================================================= */}
      {draft && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="drawer-title"
          className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs transition-opacity"
        >
          {/* Backdrop click to dismiss */}
          <div
            className="absolute inset-0"
            onClick={() => {
              if (
                !dirty ||
                window.confirm("Descartar alterações não salvas?")
              ) {
                closeDrawer();
              }
            }}
          />

          {/* Drawer container */}
          <div
            ref={drawerRef}
            className="relative w-full max-w-2xl bg-[#18202a] border-l border-[#303c49] h-full flex flex-col shadow-2xl z-10 overflow-hidden"
          >
            {/* Drawer Header */}
            <header className="px-6 py-4 border-b border-[#303c49] flex items-center justify-between gap-4 bg-[#10151c]/60">
              <div className="flex items-center gap-2 overflow-hidden">
                <Orbit
                  size={20}
                  className="text-[#91e3dc] shrink-0"
                  aria-hidden
                />
                <h2
                  id="drawer-title"
                  className="text-lg font-bold text-[#f5f1e8] truncate"
                >
                  {isCreating
                    ? "Novo Conceito Cósmico"
                    : draft.title || "Conceito Sem Título"}
                </h2>
                {dirty && (
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#edc993]/20 text-[#edc993] border border-[#edc993]/40 shrink-0">
                    Não salvo
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={pending}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#91e3dc] hover:bg-[#aef5ef] disabled:opacity-50 text-[#10151c] font-semibold text-xs md:text-sm rounded-xl transition cursor-pointer"
                >
                  <Save size={16} aria-hidden />
                  <span>{pending ? "Gravando…" : "Salvar Conceito"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (
                      !dirty ||
                      window.confirm("Descartar alterações não salvas?")
                    ) {
                      closeDrawer();
                    }
                  }}
                  className="p-2 text-[#b0b8bf] hover:text-[#f5f1e8] hover:bg-[#202c38] rounded-xl transition cursor-pointer"
                  aria-label="Fechar painel"
                >
                  <X size={20} aria-hidden />
                </button>
              </div>
            </header>

            {/* Drawer Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
              {/* Form Fields: General */}
              <section className="space-y-4">
                <h3 className="text-xs uppercase tracking-wider text-[#91e3dc] font-bold">
                  Definições Primárias
                </h3>

                <div className="space-y-1.5">
                  <label
                    htmlFor="concept-title"
                    className="text-xs text-[#b0b8bf] font-medium"
                  >
                    Título do Conceito Cósmico *
                  </label>
                  <input
                    id="concept-title"
                    type="text"
                    value={draft.title}
                    onChange={(e) => updateDraft({ title: e.target.value })}
                    placeholder="Ex: A Origem do Universo e a Dualidade Ormuz/Hades"
                    className="w-full px-3.5 py-2.5 bg-[#10151c] border border-[#303c49] rounded-xl text-sm text-[#f5f1e8] focus:border-[#91e3dc] focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="concept-category"
                      className="text-xs text-[#b0b8bf] font-medium"
                    >
                      Categoria Cósmica
                    </label>
                    <select
                      id="concept-category"
                      value={
                        ((draft.attributes || {}) as ConceptAttributes)
                          .category || "cosmologia"
                      }
                      onChange={(e) =>
                        updateAttributes({
                          category: e.target.value as ConceptCategory,
                        })
                      }
                      className="w-full px-3.5 py-2.5 bg-[#10151c] border border-[#303c49] rounded-xl text-sm text-[#f5f1e8] focus:border-[#91e3dc] focus:outline-hidden cursor-pointer"
                    >
                      {CONCEPT_CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.label} — {cat.description.slice(0, 36)}…
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="concept-scale"
                      className="text-xs text-[#b0b8bf] font-medium"
                    >
                      Escala de Abrangência
                    </label>
                    <select
                      id="concept-scale"
                      value={
                        ((draft.attributes || {}) as ConceptAttributes).scale ||
                        "UNIVERSAL"
                      }
                      onChange={(e) =>
                        updateAttributes({
                          scale: e.target.value as ConceptScale,
                        })
                      }
                      className="w-full px-3.5 py-2.5 bg-[#10151c] border border-[#303c49] rounded-xl text-sm text-[#f5f1e8] focus:border-[#91e3dc] focus:outline-hidden cursor-pointer"
                    >
                      {CONCEPT_SCALES.map((scale) => (
                        <option key={scale.id} value={scale.id}>
                          {scale.label} ({scale.description})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="concept-summary"
                    className="text-xs text-[#b0b8bf] font-medium"
                  >
                    Resumo Canônico (Síntese para Referências)
                  </label>
                  <textarea
                    id="concept-summary"
                    rows={2}
                    value={draft.summary}
                    onChange={(e) => updateDraft({ summary: e.target.value })}
                    placeholder="Síntese curta exibida nos cards e no cockpit da mesa de escrita..."
                    className="w-full px-3.5 py-2 bg-[#10151c] border border-[#303c49] rounded-xl text-sm text-[#f5f1e8] focus:border-[#91e3dc] focus:outline-hidden resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="concept-body"
                    className="text-xs text-[#b0b8bf] font-medium"
                  >
                    Corpo Doutrinário e Lore Profundo
                  </label>
                  <textarea
                    id="concept-body"
                    rows={6}
                    value={draft.body}
                    onChange={(e) => updateDraft({ body: e.target.value })}
                    placeholder="Descrição ontológica detalhada, fundamentos teóricos e narrativa profunda do conceito..."
                    className="w-full px-3.5 py-2.5 bg-[#10151c] border border-[#303c49] rounded-xl text-sm text-[#f5f1e8] focus:border-[#91e3dc] focus:outline-hidden leading-relaxed font-sans"
                  />
                </div>
              </section>

              {/* Rules Editor */}
              <section className="space-y-4 pt-4 border-t border-[#303c49]">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs uppercase tracking-wider text-[#edc993] font-bold flex items-center gap-1.5">
                      <BookOpen size={16} aria-hidden />
                      <span>Regras Operacionais e Mecânicas Invioláveis</span>
                    </h3>
                    <p className="text-xs text-[#b0b8bf] mt-0.5">
                      Diretrizes canônicas obrigatórias que autores e
                      subescritores devem respeitar.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddRule}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#202c38] hover:bg-[#303c49] text-[#edc993] text-xs font-semibold rounded-lg border border-[#edc993]/30 transition cursor-pointer"
                  >
                    <Plus size={14} aria-hidden />
                    <span>Adicionar Regra</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {(((draft.attributes || {}) as ConceptAttributes).rules || [])
                    .length === 0 ? (
                    <div className="text-center py-6 px-4 bg-[#10151c] border border-dashed border-[#303c49] rounded-xl text-xs text-[#b0b8bf]">
                      <p>Nenhuma regra cadastrada para este conceito.</p>
                      <button
                        type="button"
                        onClick={handleAddRule}
                        className="mt-2 text-[#edc993] hover:underline font-medium inline-flex items-center gap-1"
                      >
                        <Plus size={12} aria-hidden /> Inserir primeira regra
                        canônica
                      </button>
                    </div>
                  ) : (
                    (
                      ((draft.attributes || {}) as ConceptAttributes).rules ||
                      []
                    ).map((rule, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 bg-[#10151c] border border-[#303c49] rounded-xl p-2.5 focus-within:border-[#edc993]"
                      >
                        <span className="text-xs font-mono text-[#edc993] font-bold pt-2 shrink-0 w-6 text-center">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <textarea
                          rows={2}
                          value={rule}
                          onChange={(e) =>
                            handleRuleChange(index, e.target.value)
                          }
                          placeholder="Ex: A dualidade entre Ormuz e Hades é o equilíbrio primordial da criação; nenhum pode aniquilar o outro sem colapsar a existência."
                          className="flex-1 bg-transparent border-0 text-xs text-[#f5f1e8] placeholder-[#b0b8bf]/50 focus:outline-hidden resize-none leading-relaxed"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveRule(index)}
                          className="p-1.5 text-[#b0b8bf] hover:text-[#ff746a] rounded-lg transition"
                          aria-label={`Remover regra ${index + 1}`}
                        >
                          <Trash2 size={16} aria-hidden />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* Bidirectional Relations Manager */}
              <section className="space-y-4 pt-4 border-t border-[#303c49]">
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-[#5cc8ff] font-bold flex items-center gap-1.5">
                    <Link2 size={16} aria-hidden />
                    <span>Gerenciador de Conexões Bidirecionais</span>
                  </h3>
                  <p className="text-xs text-[#b0b8bf] mt-0.5">
                    Vínculos de fundamentação ontológica com personagens,
                    histórias, facções e locais.
                  </p>
                </div>

                {/* Existing Relations List */}
                <div className="space-y-2">
                  {activeRelations.length === 0 ? (
                    <p className="text-xs text-[#b0b8bf]/60 italic py-2">
                      Este conceito ainda não possui entidades conectadas no
                      grafo.
                    </p>
                  ) : (
                    activeRelations.map(
                      ({ relation, otherEntity, isSource, otherId }) => {
                        const Icon =
                          (otherEntity && kindIconMap[otherEntity.kind]) ||
                          Sparkles;
                        const isFundamenta =
                          relation.label.toLowerCase() === "fundamenta";

                        return (
                          <div
                            key={relation.id}
                            className="flex items-center justify-between gap-3 p-3 bg-[#10151c] border border-[#303c49] rounded-xl text-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="p-1.5 rounded-lg bg-[#202c38] text-[#91e3dc] shrink-0">
                                <Icon size={16} aria-hidden />
                              </span>
                              <div className="truncate">
                                <div className="font-semibold text-[#f5f1e8] truncate">
                                  {otherEntity?.title || otherId}
                                </div>
                                <div className="text-[11px] text-[#b0b8bf] flex items-center gap-1.5">
                                  <span>
                                    {otherEntity
                                      ? kindLabels[otherEntity.kind]
                                      : "Ficha"}
                                  </span>
                                  <span>•</span>
                                  <span
                                    className={`px-1.5 py-0.2 rounded font-mono text-[10px] ${
                                      isFundamenta
                                        ? "bg-[#91e3dc]/20 text-[#91e3dc]"
                                        : "bg-[#202c38] text-[#b0b8bf]"
                                    }`}
                                  >
                                    {relation.label}
                                  </span>
                                  <span>•</span>
                                  <span className="text-[10px]">
                                    {isSource
                                      ? "Conceito fundamenta"
                                      : "Vinculado ao conceito"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveRelation(relation.id)}
                              disabled={deletingRelationId === relation.id}
                              className="p-1.5 text-[#b0b8bf] hover:text-[#ff746a] hover:bg-[#202c38] rounded-lg transition cursor-pointer shrink-0"
                              aria-label={`Desvincular ${otherEntity?.title || otherId}`}
                            >
                              <Unlink size={16} aria-hidden />
                            </button>
                          </div>
                        );
                      },
                    )
                  )}
                </div>

                {/* Add New Connection Form */}
                <div className="p-3 bg-[#10151c]/70 border border-[#303c49] rounded-xl space-y-3">
                  <div className="text-xs font-semibold text-[#f5f1e8] flex items-center gap-1.5">
                    <Plus size={14} aria-hidden />
                    <span>Conectar Nova Entidade ao Conceito</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label
                        htmlFor="relation-filter-kind"
                        className="text-[11px] text-[#b0b8bf]"
                      >
                        Tipo de Ficha
                      </label>
                      <select
                        id="relation-filter-kind"
                        value={entityFilterKind}
                        onChange={(e) => setEntityFilterKind(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#18202a] border border-[#303c49] rounded-lg text-xs text-[#f5f1e8] focus:border-[#5cc8ff] focus:outline-hidden"
                      >
                        <option value="all">Todas as Fichas</option>
                        <option value="character">Personagens</option>
                        <option value="story">Histórias / Projetos</option>
                        <option value="faction">Facções</option>
                        <option value="place">Lugares</option>
                        <option value="artifact">Objetos Cósmicos</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label
                        htmlFor="relation-label-select"
                        className="text-[11px] text-[#b0b8bf]"
                      >
                        Rótulo da Relação
                      </label>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setRelationLabel("fundamenta")}
                          className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-medium border transition ${
                            relationLabel === "fundamenta"
                              ? "bg-[#91e3dc]/20 text-[#91e3dc] border-[#91e3dc]"
                              : "bg-[#18202a] text-[#b0b8bf] border-[#303c49]"
                          }`}
                        >
                          fundamenta
                        </button>
                        <button
                          type="button"
                          onClick={() => setRelationLabel("relacionado")}
                          className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-medium border transition ${
                            relationLabel === "relacionado"
                              ? "bg-[#5cc8ff]/20 text-[#5cc8ff] border-[#5cc8ff]"
                              : "bg-[#18202a] text-[#b0b8bf] border-[#303c49]"
                          }`}
                        >
                          relacionado
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="relation-search-input"
                      className="text-[11px] text-[#b0b8bf]"
                    >
                      Filtrar Entidade por Nome
                    </label>
                    <input
                      id="relation-search-input"
                      type="text"
                      value={entitySearch}
                      onChange={(e) => setEntitySearch(e.target.value)}
                      placeholder="Buscar por título ou resumo..."
                      className="w-full px-2.5 py-1.5 bg-[#18202a] border border-[#303c49] rounded-lg text-xs text-[#f5f1e8] focus:border-[#5cc8ff] focus:outline-hidden"
                    />
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="relation-target-entity"
                      className="text-[11px] text-[#b0b8bf]"
                    >
                      Selecione a Entidade
                    </label>
                    <select
                      id="relation-target-entity"
                      value={targetEntityId}
                      onChange={(e) => setTargetEntityId(e.target.value)}
                      className="w-full px-2.5 py-2 bg-[#18202a] border border-[#303c49] rounded-lg text-xs text-[#f5f1e8] focus:border-[#5cc8ff] focus:outline-hidden"
                    >
                      <option value="">
                        Selecione uma ficha para vincular…
                      </option>
                      {availableEntitiesToConnect.map((e) => (
                        <option key={e.id} value={e.id}>
                          [{kindLabels[e.kind]}] {e.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleConnectEntity}
                    disabled={!targetEntityId || connecting}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-[#5cc8ff] hover:bg-[#78d4ff] disabled:opacity-40 text-[#10151c] font-semibold text-xs rounded-lg transition cursor-pointer"
                  >
                    <Link2 size={14} aria-hidden />
                    <span>
                      {connecting
                        ? "Conectando…"
                        : "Vincular ao Grafo de Conceitos"}
                    </span>
                  </button>
                </div>
              </section>

              {/* Danger Zone: Archive */}
              {!isCreating && (
                <section className="pt-4 border-t border-[#303c49] flex items-center justify-between">
                  <div className="text-xs text-[#b0b8bf]">
                    <span>ID da Ficha: </span>
                    <span className="font-mono text-[11px] text-[#f5f1e8]">
                      {draft.id}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteConcept}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#ff746a] hover:bg-[#ff746a]/10 rounded-lg transition cursor-pointer"
                  >
                    <Trash2 size={14} aria-hidden />
                    <span>Arquivar Conceito</span>
                  </button>
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
