"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Lightbulb,
  Sparkles,
  Flame,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Compass,
  FilePlus2,
  UserPlus,
  Zap,
  Layers,
  ChevronRight,
  X,
  Bookmark,
} from "lucide-react";
import type { StudioEntity, StudioWorkspace } from "@/lib/workspace";
import {
  findActiveManuscript,
  computeActiveProjects,
  computeUniverseRadar,
  createQuickEntity,
  buildRadarSvgPolygon,
  getRadarCoordinates,
  formatNumberBR,
  type QuickActionType,
} from "@/lib/studio-cockpit";
import { StudioWorkbench } from "@/components/studio-workbench";

/* =========================================================================
   Studio Cockpit Dashboard (F23 - F26)
   ========================================================================= */

export function StudioCockpit({
  initial,
  initialId,
}: {
  initial: StudioWorkspace;
  initialId?: string;
}) {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<StudioWorkspace>(initial);
  const [isPending, startTransition] = useTransition();

  // Quick Action Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<QuickActionType>("chapter");
  const [modalDraft, setModalDraft] = useState<{
    title: string;
    notes: string;
    storyId: string;
    category: string;
    scale: string;
  }>({
    title: "",
    notes: "",
    storyId: "story-red-right-hand",
    category: "cosmologia",
    scale: "UNIVERSAL",
  });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Computed Domain Models
  const activeManuscript = useMemo(
    () => findActiveManuscript(workspace),
    [workspace],
  );

  const activeProjects = useMemo(
    () => computeActiveProjects(workspace),
    [workspace],
  );

  const universeRadar = useMemo(
    () => computeUniverseRadar(workspace),
    [workspace],
  );

  // Radar Polygon Points
  const radarPolygon = useMemo(
    () => buildRadarSvgPolygon(universeRadar.axes, 80, 110),
    [universeRadar.axes],
  );

  // Quick Action Handler
  const handleOpenQuickAction = (type: QuickActionType) => {
    setActiveTab(type);
    setErrorMsg(null);
    setFeedback(null);
    setModalDraft((prev) => ({
      ...prev,
      title: "",
      notes: "",
      storyId: activeManuscript?.storyId || "story-red-right-hand",
    }));
    setModalOpen(true);
  };

  const handleSaveQuickAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalDraft.title.trim()) {
      setErrorMsg("Por favor, informe um título ou nome.");
      return;
    }

    if (isPending) return; // Prevent rapid double submits

    setErrorMsg(null);
    startTransition(async () => {
      try {
        const payload = createQuickEntity(
          {
            type: activeTab,
            title: modalDraft.title.trim(),
            notes: modalDraft.notes.trim(),
            storyId: modalDraft.storyId,
            category: modalDraft.category,
            scale: modalDraft.scale,
          },
          workspace,
        );

        const res = await fetch("/api/studio/entities", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Erro ao salvar entidade.");
        }

        const savedEntity: StudioEntity = await res.json();

        // Optimistically update workspace
        setWorkspace((prev) => ({
          ...prev,
          entities: [
            savedEntity,
            ...prev.entities.filter((item) => item.id !== savedEntity.id),
          ],
        }));

        setFeedback(`Registro "${savedEntity.title}" criado com sucesso!`);

        setTimeout(() => {
          setModalOpen(false);
          setFeedback(null);
          if (activeTab === "chapter") {
            router.push(`/studio/manuscritos?id=${savedEntity.id}`);
          } else if (activeTab === "concept") {
            router.push(`/studio/conceitos?id=${savedEntity.id}`);
          }
        }, 800);
      } catch (err: unknown) {
        setErrorMsg(
          (err as Error).message || "Falha na comunicação com o banco.",
        );
      }
    });
  };

  return (
    <div className="studio-cockpit-container min-h-screen bg-[#10151c] text-[#e8f1fc] pb-16">
      {/* 1. Header & Status Eyebrow */}
      <header className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8 border-b border-[#303c49]/50">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide uppercase bg-[#91e3dc]/15 text-[#91e3dc] border border-[#91e3dc]/30">
                <Sparkles size={13} aria-hidden="true" /> Centro de Comando do
                Autor
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono bg-[#18202a] text-[#a0b3c6] border border-[#303c49]">
                PostgreSQL 17 · Canônico
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-[#f3f8fe]">
              Cockpit do Autor
            </h1>
            <p className="mt-1 text-sm sm:text-base text-[#a0b3c6]">
              Painel operacional unificado para escrita contínua, worldbuilding
              e engenharia do cosmos UVC.
            </p>
          </div>

          {/* Quick Action Triggers */}
          <div
            className="flex flex-wrap items-center gap-2.5"
            role="toolbar"
            aria-label="Gatilhos de criação rápida"
          >
            <button
              type="button"
              onClick={() => handleOpenQuickAction("chapter")}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-[#91e3dc] !text-[#10151c] hover:bg-[#a6ebe5] active:scale-95 transition-all shadow-md shadow-[#91e3dc]/10 cursor-pointer"
              aria-label="+ Novo Capítulo"
            >
              <FilePlus2 size={16} aria-hidden="true" />
              <span className="!text-[#10151c] font-semibold">
                + Novo Capítulo
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenQuickAction("character")}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-[#18202a] text-[#91e3dc] border border-[#91e3dc]/40 hover:bg-[#18202a]/80 active:scale-95 transition-all cursor-pointer"
              aria-label="+ Novo Personagem"
            >
              <UserPlus size={16} aria-hidden="true" />
              <span>+ Novo Personagem</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenQuickAction("concept")}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-[#18202a] text-[#edc993] border border-[#edc993]/40 hover:bg-[#18202a]/80 active:scale-95 transition-all cursor-pointer"
              aria-label="+ Novo Conceito"
            >
              <Lightbulb size={16} aria-hidden="true" />
              <span>+ Novo Conceito</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenQuickAction("idea")}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-[#18202a] text-[#ff746a] border border-[#ff746a]/40 hover:bg-[#18202a]/80 active:scale-95 transition-all cursor-pointer"
              aria-label="+ Nova Ideia"
            >
              <Zap size={16} aria-hidden="true" />
              <span>+ Nova Ideia</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Cockpit Body */}
      <div className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-8">
        {/* =========================================================================
            2. Central "Continuar Escrevendo" Hero Card (F23)
            ========================================================================= */}
        <section
          aria-labelledby="hero-writing-heading"
          role="region"
          className="w-full"
        >
          <h2 id="hero-writing-heading" className="sr-only">
            Continuar Escrevendo
          </h2>

          {activeManuscript ? (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#18202a] via-[#141b24] to-[#10151c] border-2 border-[#91e3dc]/40 p-6 sm:p-8 shadow-2xl shadow-[#91e3dc]/5 transition-all hover:border-[#91e3dc]/70">
              {/* Background Ambient Glow */}
              <div
                className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-[#91e3dc]/10 blur-3xl pointer-events-none"
                aria-hidden="true"
              />

              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                {/* Left Side: Active Chapter Details */}
                <div className="space-y-3 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#91e3dc]/20 text-[#91e3dc] border border-[#91e3dc]/30">
                      <BookOpen size={13} aria-hidden="true" /> Manuscrito em
                      Foco
                    </span>
                    <span className="text-xs font-medium text-[#edc993] bg-[#edc993]/15 px-2.5 py-0.5 rounded-full border border-[#edc993]/30">
                      {activeManuscript.storyTitle}
                    </span>
                    <span className="text-xs text-[#a0b3c6] flex items-center gap-1">
                      <Clock size={12} aria-hidden="true" />{" "}
                      {activeManuscript.lastEditedLabel}
                    </span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-bold text-[#f3f8fe] tracking-tight">
                    {activeManuscript.title}
                  </h3>

                  <p className="text-sm text-[#cbd6e2] line-clamp-2 leading-relaxed">
                    “{activeManuscript.snippet}”
                  </p>

                  <div className="flex flex-wrap items-center gap-4 pt-1 text-xs sm:text-sm text-[#a0b3c6]">
                    <div className="flex items-center gap-1.5 font-mono text-[#f3f8fe]">
                      <strong className="text-base font-bold text-[#91e3dc]">
                        {formatNumberBR(activeManuscript.wordCount)}
                      </strong>{" "}
                      palavras neste texto
                    </div>
                    <span className="text-[#303c49]">|</span>
                    <div className="flex items-center gap-1">
                      <span>Status:</span>
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-[#303c49] text-[#e8f1fc]">
                        {activeManuscript.statusLabel}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Side: Rhythm & 1-Click Jump Action */}
                <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-4 border-t lg:border-t-0 lg:border-l border-[#303c49]/60 pt-4 lg:pt-0 lg:pl-8">
                  {/* Rhythm / Streak Box */}
                  <div className="space-y-1.5 text-left lg:text-right">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#ff746a]/15 text-[#ff746a] border border-[#ff746a]/30 text-xs font-bold">
                      <Flame
                        size={14}
                        className="animate-pulse"
                        aria-hidden="true"
                      />
                      <span>
                        {activeManuscript.writingRhythm.streakDays} dias de
                        sequência
                      </span>
                    </div>
                    <p className="text-xs text-[#cbd6e2]">
                      Meta diária:{" "}
                      <strong className="text-[#91e3dc]">
                        +
                        {formatNumberBR(
                          activeManuscript.writingRhythm.todayWords,
                        )}
                      </strong>{" "}
                      /{" "}
                      {formatNumberBR(
                        activeManuscript.writingRhythm.dailyTargetWords,
                      )}{" "}
                      palavras
                    </p>
                    <div
                      className="w-48 h-2 rounded-full bg-[#18202a] border border-[#303c49] overflow-hidden ml-auto"
                      role="progressbar"
                      aria-valuenow={
                        activeManuscript.writingRhythm.targetProgressPercent
                      }
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Progresso da meta diária de escrita"
                    >
                      <div
                        className="h-full bg-gradient-to-r from-[#91e3dc] to-[#5cc8ff] transition-all duration-500"
                        style={{
                          width: `${activeManuscript.writingRhythm.targetProgressPercent}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* 1-Click Jump Primary Button */}
                  <Link
                    href={`/studio/manuscritos?id=${activeManuscript.id}`}
                    className="inline-flex items-center justify-center gap-3 px-6 py-3.5 text-sm sm:text-base font-bold rounded-xl bg-gradient-to-r from-[#91e3dc] via-[#75ded5] to-[#5cc8ff] !text-[#10151c] hover:opacity-95 hover:shadow-lg hover:shadow-[#91e3dc]/20 active:scale-95 transition-all w-full sm:w-auto"
                    aria-label="Continuar escrevendo este manuscrito"
                  >
                    <span className="!text-[#10151c] font-bold">
                      Continuar Escrevendo
                    </span>
                    <ArrowRight size={18} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-[#18202a] border-2 border-dashed border-[#303c49] p-8 text-center space-y-4">
              <BookOpen
                size={36}
                className="mx-auto text-[#a0b3c6]"
                aria-hidden="true"
              />
              <h3 className="text-xl font-bold text-[#f3f8fe]">
                Nenhum manuscrito ativo no momento
              </h3>
              <p className="text-sm text-[#a0b3c6] max-w-md mx-auto">
                Crie seu primeiro capítulo ou importe um arquivo DOCX para
                iniciar sua jornada de escrita cósmica.
              </p>
              <Link
                href="/studio/manuscritos"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-[#91e3dc] !text-[#10151c] hover:bg-[#a6ebe5] transition-all"
                aria-label="Começar a escrever"
              >
                <FilePlus2 size={16} aria-hidden="true" />
                <span className="!text-[#10151c] font-semibold">
                  Começar a Escrever
                </span>
              </Link>
            </div>
          )}
        </section>

        {/* =========================================================================
            3. Two-Column Dashboard Grid: Active Projects & Universe Radar
            ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: Active Projects Panel (F24) */}
          <section
            aria-labelledby="active-projects-heading"
            role="region"
            className="lg:col-span-7 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2
                  id="active-projects-heading"
                  className="text-xl sm:text-2xl font-bold text-[#f3f8fe] flex items-center gap-2"
                >
                  <Bookmark
                    size={22}
                    className="text-[#91e3dc]"
                    aria-hidden="true"
                  />
                  Projetos Ativos
                </h2>
                <p className="text-xs sm:text-sm text-[#a0b3c6]">
                  Acompanhe metas de palavras, capítulos montados e elenco
                  escalado.
                </p>
              </div>
              <Link
                href="/studio/historias"
                className="text-xs font-medium text-[#91e3dc] hover:underline flex items-center gap-1"
              >
                <span>Ver todas as histórias</span>
                <ChevronRight size={14} aria-hidden="true" />
              </Link>
            </div>

            <div className="space-y-4">
              {activeProjects.map((project) => (
                <article
                  key={project.id}
                  className="rounded-xl bg-[#18202a] border border-[#303c49] p-5 hover:border-[#91e3dc]/50 transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-[#303c49]/80 text-[#cbd6e2]">
                          {project.format}
                        </span>
                        <span
                          className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded ${
                            project.location === "TERRA"
                              ? "bg-[#5cc8ff]/15 text-[#5cc8ff] border border-[#5cc8ff]/30"
                              : "bg-[#ff746a]/15 text-[#ff746a] border border-[#ff746a]/30"
                          }`}
                        >
                          {project.location}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-[#f3f8fe]">
                        {project.title}
                      </h3>
                    </div>

                    <Link
                      href={
                        project.activeChapterId
                          ? `/studio/manuscritos?id=${project.activeChapterId}`
                          : `/studio/manuscritos`
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#303c49]/50 text-[#91e3dc] border border-[#91e3dc]/30 hover:bg-[#91e3dc]/15 transition-all self-start sm:self-auto cursor-pointer"
                      aria-label={`Escrever em ${project.title}`}
                    >
                      <span>Escrever</span>
                      <ArrowRight size={13} aria-hidden="true" />
                    </Link>
                  </div>

                  {/* Word Count Progress Bar (Protected against zero-division) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#a0b3c6]">
                        Progresso de Escrita:{" "}
                        <strong className="text-[#f3f8fe]">
                          {formatNumberBR(project.totalWords)}
                        </strong>{" "}
                        / {formatNumberBR(project.targetWords)} palavras
                      </span>
                      <span className="font-mono font-bold text-[#91e3dc]">
                        {project.progressPercent}%
                      </span>
                    </div>

                    <div
                      className="w-full h-2 rounded-full bg-[#10151c] border border-[#303c49] overflow-hidden"
                      role="progressbar"
                      aria-valuenow={project.progressPercent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Progresso de escrita de ${project.title}: ${project.progressPercent}%`}
                    >
                      <div
                        className="h-full bg-gradient-to-r from-[#91e3dc] to-[#5cc8ff] rounded-full transition-all duration-300"
                        style={{ width: `${project.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Project Metadata & Cast */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#303c49]/40 text-xs text-[#a0b3c6]">
                    <div className="flex items-center gap-3">
                      <span>
                        <strong className="text-[#f3f8fe]">
                          {project.chapterCount}
                        </strong>{" "}
                        {project.chapterCount === 1 ? "capítulo" : "capítulos"}
                      </span>
                      <span>·</span>
                      <span>
                        <strong className="text-[#f3f8fe]">
                          {project.castCount}
                        </strong>{" "}
                        personagens vinculados
                      </span>
                    </div>

                    {/* Cast Pills */}
                    {project.cast.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {project.cast.slice(0, 4).map((c) => (
                          <span
                            key={c.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-[#10151c] border border-[#303c49] text-[#cbd6e2]"
                            title={c.role ? `${c.name} (${c.role})` : c.name}
                          >
                            <span>{c.name.split(" ")[0]}</span>
                            {c.role && (
                              <span className="text-[9px] font-bold text-[#edc993] uppercase">
                                [{c.role.slice(0, 4)}]
                              </span>
                            )}
                          </span>
                        ))}
                        {project.cast.length > 4 && (
                          <span className="text-[10px] text-[#a0b3c6]">
                            +{project.cast.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* RIGHT: Universe Radar Panel (F25) */}
          <section
            aria-labelledby="universe-radar-heading"
            role="region"
            className="lg:col-span-5 space-y-4"
          >
            <div>
              <h2
                id="universe-radar-heading"
                className="text-xl sm:text-2xl font-bold text-[#f3f8fe] flex items-center gap-2"
              >
                <Compass
                  size={22}
                  className="text-[#edc993]"
                  aria-hidden="true"
                />
                Radar do Universo
              </h2>
              <p className="text-xs sm:text-sm text-[#a0b3c6]">
                Estatísticas cósmicas, integridade de lore e índice de
                consistência.
              </p>
            </div>

            <div className="rounded-xl bg-[#18202a] border border-[#303c49] p-5 space-y-6">
              {/* Canon Consistency Index Card */}
              <div className="p-4 rounded-lg bg-[#10151c] border border-[#303c49] flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ShieldCheck
                      size={18}
                      className="text-[#91e3dc]"
                      aria-hidden="true"
                    />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#91e3dc]">
                      {universeRadar.consistency.label}
                    </span>
                  </div>
                  <p className="text-xs text-[#a0b3c6] leading-tight">
                    {universeRadar.consistency.description}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-2xl sm:text-3xl font-extrabold font-mono text-[#91e3dc]">
                    {universeRadar.consistency.score}%
                  </span>
                  <span className="block text-[10px] text-[#a0b3c6]">
                    Consistência
                  </span>
                </div>
              </div>

              {/* Visual Radar SVG Graph */}
              <div className="flex flex-col items-center justify-center p-2">
                <svg
                  width={220}
                  height={220}
                  viewBox="0 0 220 220"
                  className="overflow-visible"
                  aria-label="Radar do Universo com indicadores de lore e volume cósmico"
                  role="img"
                >
                  <title>Radar do Universo</title>
                  <desc>
                    Gráfico hexagonal comparando Personagens, Facções,
                    Conceitos, Lugares, Linha do Tempo e Densidade de Vínculos.
                  </desc>

                  {/* Concentric Background Polygons */}
                  {[0.25, 0.5, 0.75, 1.0].map((level) => (
                    <circle
                      key={level}
                      cx={110}
                      cy={110}
                      r={80 * level}
                      fill="none"
                      stroke="#303c49"
                      strokeDasharray={level === 1 ? undefined : "3,3"}
                      strokeWidth={1}
                    />
                  ))}

                  {/* Radial Axis Lines */}
                  {universeRadar.axes.map((axis, i) => {
                    const coords = getRadarCoordinates(
                      i,
                      universeRadar.axes.length,
                      100,
                      80,
                      110,
                      110,
                    );
                    return (
                      <line
                        key={axis.key}
                        x1={110}
                        y1={110}
                        x2={coords.x}
                        y2={coords.y}
                        stroke="#303c49"
                        strokeWidth={1}
                      />
                    );
                  })}

                  {/* Filled Radar Polygon */}
                  <polygon
                    points={radarPolygon}
                    fill="rgba(145, 227, 220, 0.25)"
                    stroke="#91e3dc"
                    strokeWidth={2}
                    className="transition-all duration-700"
                  />

                  {/* Radar Vertex Points */}
                  {universeRadar.axes.map((axis, i) => {
                    const coords = getRadarCoordinates(
                      i,
                      universeRadar.axes.length,
                      Math.max(15, axis.percent),
                      80,
                      110,
                      110,
                    );
                    return (
                      <circle
                        key={axis.key}
                        cx={coords.x}
                        cy={coords.y}
                        r={4}
                        fill={axis.color}
                        stroke="#10151c"
                        strokeWidth={1.5}
                      />
                    );
                  })}
                </svg>

                {/* Screen-reader accessible data list */}
                <ul
                  className="sr-only"
                  aria-label="Valores numéricos do Radar do Universo"
                >
                  {universeRadar.axes.map((ax) => (
                    <li
                      key={ax.key}
                    >{`${ax.label}: ${ax.count} itens (${ax.percent}% da meta)`}</li>
                  ))}
                </ul>
              </div>

              {/* Six Cosmic Metric Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
                <Link
                  href="/studio/personagens"
                  className="p-3 rounded-lg bg-[#10151c] border border-[#303c49] hover:border-[#5cc8ff] transition-all text-left"
                >
                  <span className="text-[11px] text-[#a0b3c6] block">
                    Personagens
                  </span>
                  <strong className="text-xl font-bold font-mono text-[#5cc8ff]">
                    {universeRadar.charactersCount}
                  </strong>
                </Link>

                <Link
                  href="/studio/conceitos"
                  className="p-3 rounded-lg bg-[#10151c] border border-[#303c49] hover:border-[#91e3dc] transition-all text-left"
                >
                  <span className="text-[11px] text-[#a0b3c6] block">
                    Conceitos
                  </span>
                  <strong className="text-xl font-bold font-mono text-[#91e3dc]">
                    {universeRadar.conceptsCount}
                  </strong>
                </Link>

                <Link
                  href="/studio/cronologia"
                  className="p-3 rounded-lg bg-[#10151c] border border-[#303c49] hover:border-[#d48df0] transition-all text-left"
                >
                  <span className="text-[11px] text-[#a0b3c6] block">
                    Linha do Tempo
                  </span>
                  <strong className="text-xl font-bold font-mono text-[#d48df0]">
                    {universeRadar.eventsCount}
                  </strong>
                </Link>

                <Link
                  href="/studio/lugares"
                  className="p-3 rounded-lg bg-[#10151c] border border-[#303c49] hover:border-[#edc993] transition-all text-left"
                >
                  <span className="text-[11px] text-[#a0b3c6] block">
                    Lugares
                  </span>
                  <strong className="text-xl font-bold font-mono text-[#edc993]">
                    {universeRadar.placesCount}
                  </strong>
                </Link>

                <div className="p-3 rounded-lg bg-[#10151c] border border-[#303c49] text-left">
                  <span className="text-[11px] text-[#a0b3c6] block">
                    Facções
                  </span>
                  <strong className="text-xl font-bold font-mono text-[#ff746a]">
                    {universeRadar.factionsCount}
                  </strong>
                </div>

                <div className="p-3 rounded-lg bg-[#10151c] border border-[#303c49] text-left">
                  <span className="text-[11px] text-[#a0b3c6] block">
                    Vínculos Canônicos
                  </span>
                  <strong className="text-xl font-bold font-mono text-[#7df9c2]">
                    {universeRadar.totalRelations}
                  </strong>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* =========================================================================
            4. Interactive Workbench & Cosmic Graph (Full Parity with Legacy Specs)
            ========================================================================= */}
        <section
          aria-labelledby="workbench-heading"
          role="region"
          className="pt-8 border-t border-[#303c49]/50 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2
                id="workbench-heading"
                className="text-xl sm:text-2xl font-bold text-[#f3f8fe] flex items-center gap-2"
              >
                <Layers
                  size={22}
                  className="text-[#91e3dc]"
                  aria-hidden="true"
                />
                Mesa de Trabalho & Grafo Canônico
              </h2>
              <p className="text-xs sm:text-sm text-[#a0b3c6]">
                Edição detalhada de fichas, metadados e visualização interativa
                do grafo cósmico.
              </p>
            </div>
          </div>
          <StudioWorkbench
            initial={workspace}
            initialKind="all"
            initialId={initialId}
          />
        </section>
      </div>

      {/* =========================================================================
          5. Quick Action Modal Dialog (Accessible WCAG AA)
          ========================================================================= */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-action-modal-title"
        >
          <div className="relative w-full max-w-lg rounded-2xl bg-[#18202a] border border-[#303c49] shadow-2xl p-6 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#303c49] pb-4">
              <h3
                id="quick-action-modal-title"
                className="text-lg font-bold text-[#f3f8fe] flex items-center gap-2"
              >
                <Sparkles
                  size={18}
                  className="text-[#91e3dc]"
                  aria-hidden="true"
                />
                Gatilho Rápido de Criação
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-[#a0b3c6] hover:text-[#f3f8fe] hover:bg-[#303c49]/50 transition-colors cursor-pointer"
                aria-label="Fechar janela"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            {/* Tab Selector */}
            <div
              className="grid grid-cols-4 gap-1 p-1 rounded-lg bg-[#10151c] border border-[#303c49]"
              role="tablist"
              aria-label="Opções de criação"
            >
              {[
                { id: "chapter", label: "Capítulo", icon: FilePlus2 },
                { id: "character", label: "Personagem", icon: UserPlus },
                { id: "concept", label: "Conceito", icon: Lightbulb },
                { id: "idea", label: "Ideia", icon: Zap },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === id}
                  onClick={() => setActiveTab(id as QuickActionType)}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === id
                      ? "bg-[#303c49] text-[#91e3dc] shadow"
                      : "text-[#a0b3c6] hover:text-[#f3f8fe]"
                  }`}
                >
                  <Icon size={16} aria-hidden="true" />
                  <span className="mt-1">{label}</span>
                </button>
              ))}
            </div>

            {/* Error & Feedback alerts */}
            {errorMsg && (
              <div
                className="p-3 text-xs rounded-lg bg-[#ff746a]/15 text-[#ff746a] border border-[#ff746a]/30 flex items-center gap-2"
                role="alert"
              >
                <ShieldAlert size={16} aria-hidden="true" />
                <span>{errorMsg}</span>
              </div>
            )}

            {feedback && (
              <div
                className="p-3 text-xs rounded-lg bg-[#91e3dc]/15 text-[#91e3dc] border border-[#91e3dc]/30 flex items-center gap-2"
                role="status"
              >
                <CheckCircle2 size={16} aria-hidden="true" />
                <span>{feedback}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSaveQuickAction} className="space-y-4">
              {/* Conditional Story Selector for Chapters */}
              {activeTab === "chapter" && (
                <div className="space-y-1">
                  <label
                    htmlFor="qa-story-select"
                    className="block text-xs font-medium text-[#cbd6e2]"
                  >
                    Vincular à História:
                  </label>
                  <select
                    id="qa-story-select"
                    value={modalDraft.storyId}
                    onChange={(e) =>
                      setModalDraft({ ...modalDraft, storyId: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg bg-[#10151c] border border-[#303c49] text-[#f3f8fe] focus:outline-none focus:border-[#91e3dc]"
                  >
                    {activeProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.format})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Conditional Category for Concepts */}
              {activeTab === "concept" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label
                      htmlFor="qa-concept-cat"
                      className="block text-xs font-medium text-[#cbd6e2]"
                    >
                      Categoria Ontológica:
                    </label>
                    <select
                      id="qa-concept-cat"
                      value={modalDraft.category}
                      onChange={(e) =>
                        setModalDraft({
                          ...modalDraft,
                          category: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm rounded-lg bg-[#10151c] border border-[#303c49] text-[#f3f8fe] focus:outline-none focus:border-[#91e3dc]"
                    >
                      <option value="cosmologia">Cosmologia</option>
                      <option value="geopolitica">Geopolítica Cósmica</option>
                      <option value="tecnologia">Tecnologia</option>
                      <option value="biologia">Biologia & Enxertos</option>
                      <option value="misticismo">Misticismo & Maldições</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="qa-concept-scale"
                      className="block text-xs font-medium text-[#cbd6e2]"
                    >
                      Escala de Influência:
                    </label>
                    <select
                      id="qa-concept-scale"
                      value={modalDraft.scale}
                      onChange={(e) =>
                        setModalDraft({ ...modalDraft, scale: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm rounded-lg bg-[#10151c] border border-[#303c49] text-[#f3f8fe] focus:outline-none focus:border-[#91e3dc]"
                    >
                      <option value="UNIVERSAL">Universal</option>
                      <option value="SETOR">Setor / Regional</option>
                      <option value="TERRA">Terra / Planetária</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Title Input */}
              <div className="space-y-1">
                <label
                  htmlFor="qa-title-input"
                  className="block text-xs font-medium text-[#cbd6e2]"
                >
                  {activeTab === "character"
                    ? "Nome do Personagem:"
                    : activeTab === "concept"
                      ? "Nome do Conceito Cósmico:"
                      : activeTab === "idea"
                        ? "Título da Ideia:"
                        : "Título do Capítulo:"}
                </label>
                <input
                  id="qa-title-input"
                  type="text"
                  required
                  placeholder={
                    activeTab === "chapter"
                      ? "Ex: Capítulo 06 · O Despertar das Fornalhas"
                      : activeTab === "character"
                        ? "Ex: Valen (Mercenário de Severum)"
                        : activeTab === "concept"
                          ? "Ex: Propulsão de Salto Quântico"
                          : "Ex: Conexão entre o Bracelete e as Fornalhas de Deroo Da"
                  }
                  value={modalDraft.title}
                  onChange={(e) =>
                    setModalDraft({ ...modalDraft, title: e.target.value })
                  }
                  className="w-full px-3.5 py-2 text-sm rounded-lg bg-[#10151c] border border-[#303c49] text-[#f3f8fe] placeholder-[#a0b3c6]/60 focus:outline-none focus:border-[#91e3dc]"
                />
              </div>

              {/* Notes / Description Input */}
              <div className="space-y-1">
                <label
                  htmlFor="qa-notes-input"
                  className="block text-xs font-medium text-[#cbd6e2]"
                >
                  {activeTab === "concept"
                    ? "Regra Fundamental / Definição:"
                    : "Anotações / Resumo Inicial:"}
                </label>
                <textarea
                  id="qa-notes-input"
                  rows={3}
                  placeholder={
                    activeTab === "concept"
                      ? "Insira a lei primordial que rege este conceito..."
                      : "Insira detalhes, notas ou cenas a explorar..."
                  }
                  value={modalDraft.notes}
                  onChange={(e) =>
                    setModalDraft({ ...modalDraft, notes: e.target.value })
                  }
                  className="w-full px-3.5 py-2 text-sm rounded-lg bg-[#10151c] border border-[#303c49] text-[#f3f8fe] placeholder-[#a0b3c6]/60 focus:outline-none focus:border-[#91e3dc]"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#303c49]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-transparent text-[#cbd6e2] hover:bg-[#303c49]/40 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-lg bg-[#91e3dc] !text-[#10151c] hover:bg-[#a6ebe5] active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? (
                    <span className="!text-[#10151c] font-bold">
                      Registrando…
                    </span>
                  ) : (
                    <>
                      <span className="!text-[#10151c] font-bold">
                        Criar e Registrar
                      </span>
                      <ArrowRight size={14} aria-hidden="true" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
