"use client";
import { useState } from "react";
import { Copy } from "lucide-react";
import type { Timeline } from "@/lib/schemas";
import { PageIntro } from "@/components/ui";
import { SegmentedControl } from "@/components/segmented-control";
import { StatusBadge } from "@/components/status-badge";
const options = [
  { value: "eras", label: "5 Eras Cósmicas" },
  { value: "beats-rrh", label: "Cenas de Red Right Hand" },
  { value: "series", label: "Séries paralelas" },
] as const;
type View = (typeof options)[number]["value"];
export function StudioTimeline({ timeline }: { timeline: Timeline }) {
  const [view, setView] = useState<View>("eras");
  const [status, setStatus] = useState("TODOS");
  const [pov, setPov] = useState("TODOS");
  const [feedback, setFeedback] = useState("");
  const beats = timeline.livros.find((b) => b.id === "rrh-1")!.beats;
  const filtered = beats.filter(
    (beat) =>
      (status === "TODOS" || status === beat.status) &&
      (pov === "TODOS" || pov === beat.pov),
  );
  async function copyPrompt(beat: (typeof beats)[number]) {
    try {
      await navigator.clipboard.writeText(
        `Audite a consistência canônica desta cena de Red Right Hand: ${beat.titulo}.\n${beat.resumo}\nConsidere as 35 Teses de Severum, a psicologia dos personagens e a cronologia. Não reescreva o texto.`,
      );
      setFeedback(`Prompt de “${beat.titulo}” copiado.`);
    } catch {
      setFeedback(
        "Não foi possível copiar. Verifique a permissão do navegador e tente novamente.",
      );
    }
  }
  return (
    <div className="chronology-page">
      <PageIntro label="Oficina" title="Cronologia">
        Eras, cenas e séries do universo.
      </PageIntro>
      <SegmentedControl
        label="Visão da cronologia"
        value={view}
        options={options}
        onChange={setView}
      />
      {view === "eras" && (
        <div className="era-grid">
          {timeline.erasCosmicas.map((era) => (
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
      {view === "beats-rrh" && (
        <>
          <div className="toolbar">
            <label className="filter-label">
              Estado da cena
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="TODOS">Todos os estados</option>
                <option value="CANONE_TRAVADO">Cânone consolidado</option>
                <option value="EM_REVISAO">Em revisão</option>
                <option value="RASCUNHO">Rascunho</option>
              </select>
            </label>
            <label className="filter-label">
              Ponto de vista
              <select value={pov} onChange={(e) => setPov(e.target.value)}>
                <option value="TODOS">Todos os personagens</option>
                {Array.from(new Set(beats.map((b) => b.pov))).map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="results-label" role="status">
            {filtered.length} de {beats.length} cenas · versão de trabalho
          </p>
          <p role="status" className="clipboard-feedback">
            {feedback}
          </p>
          {filtered.length === 0 ? (
            <div className="empty-state">
              <h2>Nenhuma cena encontrada.</h2>
              <p>Tente outra combinação de filtros.</p>
              <button
                className="button button-secondary"
                onClick={() => {
                  setStatus("TODOS");
                  setPov("TODOS");
                }}
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            <div className="scene-list">
              {filtered.map((beat) => (
                <article className="scene-card" key={beat.id}>
                  <div className="scene-meta">
                    <span>
                      Cena{" "}
                      {String(
                        beats.findIndex((b) => b.id === beat.id) + 1,
                      ).padStart(2, "0")}{" "}
                      · Capítulo {beat.capitulo}
                    </span>
                    <StatusBadge status={beat.status} />
                  </div>
                  <h2>{beat.titulo}</h2>
                  <p>{beat.resumo}</p>
                  <div className="scene-context">
                    <span>
                      Ponto de vista: <strong>{beat.pov}</strong>
                    </span>
                    <span>
                      Local: <strong>{beat.local}</strong>
                    </span>
                  </div>
                  {beat.notas && (
                    <details>
                      <summary>Notas de revisão</summary>
                      <p>{beat.notas}</p>
                    </details>
                  )}
                  <div className="scene-footer">
                    <ul aria-label="Personagens da cena">
                      {beat.personagens.map((name) => (
                        <li key={name}>{name}</li>
                      ))}
                    </ul>
                    <button
                      className="button button-secondary"
                      onClick={() => copyPrompt(beat)}
                    >
                      <Copy size={15} aria-hidden />
                      Copiar prompt de revisão
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
      {view === "series" && (
        <div className="faction-grid chronology-series">
          {timeline.seriesParalelas.map((series) => {
            return (
              <article className="faction-card" key={series.id}>
                <p className="eyebrow">
                  {series.escala} / {series.localPrincipal}
                </p>
                <h2>{series.titulo}</h2>
                <p>{series.descricao}</p>
                <p>Protagonista: {series.protagonista}</p>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
