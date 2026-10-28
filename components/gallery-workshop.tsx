"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Download, Upload, Save, Search, Link2, ImageIcon } from "lucide-react";
import {
  emptyGalleryNote,
  parseGalleryWorkspace,
  type GalleryAsset,
  type GalleryNote,
  type GalleryReferences,
} from "@/lib/gallery-workspace";
import { useUnsavedWork } from "@/components/use-unsaved-work";

type Props = GalleryReferences & { ownerId: string; assets: GalleryAsset[] };
export function GalleryWorkshop({
  ownerId,
  assets,
  characters,
  stories,
  chapters,
}: Props) {
  const [notes, setNotes] = useState<GalleryNote[]>([]);
  const [activeId, setActiveId] = useState(assets[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const storageKey = `uvc-gallery-workspace:${ownerId}:v1`;
  useUnsavedWork(dirty);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const workspace = parseGalleryWorkspace(JSON.parse(saved), assets, {
          characters,
          stories,
          chapters,
        });
        setNotes(workspace.notes);
        setFeedback("Cópia deste navegador restaurada.");
      }
    } catch {
      setError(
        "Não foi possível restaurar a cópia deste navegador. Você pode abrir um arquivo de backup.",
      );
    }
    setReady(true);
  }, [storageKey, assets, characters, stories, chapters]);
  const active = assets.find((asset) => asset.id === activeId);
  const note =
    notes.find((entry) => entry.assetId === activeId) ??
    emptyGalleryNote(activeId);
  const query = search.toLocaleLowerCase("pt-BR").trim();
  const filtered = assets.filter((asset) => {
    const draft = notes.find((entry) => entry.assetId === asset.id);
    return (
      (filter !== "linked" ||
        Boolean(
          draft &&
          (draft.characterIds.length ||
            draft.storyIds.length ||
            draft.chapterNumbers.length),
        )) &&
      (filter !== "noted" || Boolean(draft)) &&
      `${asset.name} ${asset.source} ${draft?.title ?? ""} ${draft?.tags ?? ""} ${draft?.idea ?? ""}`
        .toLocaleLowerCase("pt-BR")
        .includes(query)
    );
  });
  function update(patch: Partial<GalleryNote>) {
    const next = { ...note, ...patch };
    setNotes((previous) => [
      ...previous.filter((entry) => entry.assetId !== activeId),
      next,
    ]);
    setDirty(true);
    setFeedback("");
    setError("");
  }
  function toggle(field: "characterIds" | "storyIds", id: string) {
    update({
      [field]: note[field].includes(id)
        ? note[field].filter((value) => value !== id)
        : [...note[field], id],
    });
  }
  function workspace() {
    return parseGalleryWorkspace(
      { format: "uvc-gallery-workspace", version: 1, notes },
      assets,
      { characters, stories, chapters },
    );
  }
  function save() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(workspace()));
      setDirty(false);
      setFeedback(
        "Salvo neste navegador. Nada foi publicado na galeria pública.",
      );
      setError("");
    } catch {
      setError(
        "Não foi possível salvar neste navegador. Baixe uma cópia para preservar o trabalho.",
      );
    }
  }
  function download() {
    try {
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(workspace(), null, 2)], {
          type: "application/json",
        }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "uvc-galeria-ideias.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDirty(false);
      setFeedback(
        "Cópia baixada. Use Abrir arquivo para continuar em outro navegador.",
      );
      setError("");
    } catch {
      setError(
        "Não foi possível exportar. Revise os campos e tente novamente.",
      );
    }
  }
  async function importFile(file: File) {
    setImporting(true);
    setError("");
    try {
      if (file.size > 10 * 1024 * 1024)
        throw new Error("Arquivo muito grande.");
      const parsed = parseGalleryWorkspace(
        JSON.parse(await file.text()),
        assets,
        { characters, stories, chapters },
      );
      if (
        notes.length &&
        !window.confirm(
          "Substituir as notas atuais pelo arquivo? Baixe uma cópia antes se precisar preservá-las.",
        )
      )
        return;
      setNotes(parsed.notes);
      setDirty(true);
      setFeedback(
        "Arquivo aberto. Salve neste navegador para manter a cópia local.",
      );
    } catch {
      setError(
        "Arquivo inválido ou com vínculos desconhecidos. As notas atuais foram preservadas.",
      );
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }
  return (
    <>
      <div className="gallery-workspace-toolbar">
        <div>
          <strong>{assets.length} assets no projeto</strong>
          <p>
            {dirty
              ? "Alterações sem cópia salva"
              : "Notas privadas · cópia local"}
          </p>
        </div>
        <div className="workshop-actions">
          <button
            className="button button-primary"
            onClick={save}
            disabled={!ready || importing}
          >
            <Save size={16} aria-hidden />
            Salvar neste navegador
          </button>
          <button
            className="button button-secondary"
            onClick={download}
            disabled={!ready || importing}
          >
            <Download size={16} aria-hidden />
            Baixar cópia
          </button>
          <button
            className="button button-secondary"
            onClick={() => fileRef.current?.click()}
            disabled={!ready || importing}
          >
            <Upload size={16} aria-hidden />
            Abrir arquivo
          </button>
          <input
            ref={fileRef}
            className="sr-only"
            aria-label="Arquivo de notas da galeria"
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importFile(file);
            }}
          />
        </div>
      </div>
      <p className="gallery-storage-note">
        Suas notas ficam neste navegador. Baixe uma cópia para backup ou para
        continuar em outro dispositivo. Editar aqui não altera o cânone nem
        publica imagens ou textos.
      </p>
      <p role="status" className="workshop-feedback">
        {feedback}
      </p>
      {error && (
        <p role="alert" className="workshop-error">
          {error}
        </p>
      )}
      <div className="gallery-workspace">
        <aside className="gallery-library" aria-label="Biblioteca de assets">
          <label className="search-field">
            <Search size={16} aria-hidden />
            <span className="sr-only">Buscar asset</span>
            <input
              type="search"
              placeholder="Nome, ideia ou tag"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label className="gallery-filter">
            Mostrar
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="all">Todo o acervo</option>
              <option value="linked">Com vínculos</option>
              <option value="noted">Com notas</option>
            </select>
          </label>
          <p className="results-label" role="status">
            {filtered.length} assets
          </p>
          <div className="gallery-asset-list">
            {filtered.map((asset) => (
              <button
                className="gallery-asset"
                key={asset.id}
                aria-pressed={activeId === asset.id}
                aria-label={asset.source}
                onClick={() => setActiveId(asset.id)}
              >
                <Image
                  src={`/api/studio/assets/${asset.id}`}
                  alt=""
                  width={58}
                  height={58}
                  unoptimized
                  loading="lazy"
                />
                <span>
                  <strong>
                    {notes.find((entry) => entry.assetId === asset.id)?.title ||
                      asset.name}
                  </strong>
                  <small>{asset.folder}</small>
                </span>
                {notes.some((entry) => entry.assetId === asset.id) && (
                  <Link2 size={14} aria-label="Com notas" />
                )}
              </button>
            ))}
          </div>
          {!filtered.length && (
            <p className="empty-state">Nenhum asset encontrado.</p>
          )}
        </aside>
        {active && (
          <div className="gallery-editor">
            <div className="gallery-asset-preview">
              <Image
                src={`/api/studio/assets/${active.id}`}
                alt={note.title || active.name}
                width={800}
                height={600}
                unoptimized
              />
              <div>
                <ImageIcon size={16} aria-hidden />
                <span>{active.source}</span>
                <a
                  href={`/api/studio/assets/${active.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ampliar ↗
                </a>
              </div>
            </div>
            <fieldset
              disabled={!ready || importing}
              className="gallery-note-fields"
            >
              <legend className="sr-only">Notas e vínculos do asset</legend>
              <div className="gallery-note-title-row">
                <label>
                  Título de trabalho
                  <input
                    maxLength={160}
                    value={note.title}
                    placeholder={active.name}
                    onChange={(event) => update({ title: event.target.value })}
                  />
                </label>
                <label>
                  Uso criativo
                  <select
                    value={note.stage}
                    onChange={(event) =>
                      update({
                        stage: event.target.value as GalleryNote["stage"],
                      })
                    }
                  >
                    <option value="reference">Referência</option>
                    <option value="exploration">Exploração</option>
                    <option value="selected">Selecionado</option>
                  </select>
                </label>
              </div>
              <label>
                Ideia
                <textarea
                  rows={3}
                  maxLength={5000}
                  value={note.idea}
                  placeholder="O que esta imagem sugere para a história?"
                  onChange={(event) => update({ idea: event.target.value })}
                />
              </label>
              <label>
                Texto e notas
                <textarea
                  rows={8}
                  maxLength={20000}
                  value={note.text}
                  placeholder="Trechos, cenas, decisões visuais, referências…"
                  onChange={(event) => update({ text: event.target.value })}
                />
              </label>
              <label>
                Tags
                <input
                  value={note.tags}
                  maxLength={500}
                  placeholder="Severum, atmosfera, cena de abertura…"
                  onChange={(event) => update({ tags: event.target.value })}
                />
              </label>
              <div className="gallery-connections">
                <fieldset>
                  <legend>Personagens</legend>
                  {characters.map((character) => (
                    <label key={character.id}>
                      <input
                        type="checkbox"
                        checked={note.characterIds.includes(character.id)}
                        onChange={() => toggle("characterIds", character.id)}
                      />
                      {character.nome}
                    </label>
                  ))}
                </fieldset>
                <fieldset>
                  <legend>Histórias</legend>
                  {stories.map((story) => (
                    <label key={story.id}>
                      <input
                        type="checkbox"
                        checked={note.storyIds.includes(story.id)}
                        onChange={() => toggle("storyIds", story.id)}
                      />
                      {story.titulo}
                    </label>
                  ))}
                </fieldset>
                <fieldset>
                  <legend>Capítulos de RRH</legend>
                  {chapters.map((chapter) => (
                    <label key={chapter.numero}>
                      <input
                        type="checkbox"
                        checked={note.chapterNumbers.includes(chapter.numero)}
                        onChange={() =>
                          update({
                            chapterNumbers: note.chapterNumbers.includes(
                              chapter.numero,
                            )
                              ? note.chapterNumbers.filter(
                                  (n) => n !== chapter.numero,
                                )
                              : [...note.chapterNumbers, chapter.numero],
                          })
                        }
                      />
                      {String(chapter.numero).padStart(2, "0")} ·{" "}
                      {chapter.titulo}
                    </label>
                  ))}
                </fieldset>
              </div>
            </fieldset>
            <div className="gallery-linked-summary">
              <h2>
                <Link2 size={17} aria-hidden />
                Conexões deste asset
              </h2>
              {!note.characterIds.length &&
              !note.storyIds.length &&
              !note.chapterNumbers.length ? (
                <p>
                  Selecione personagens, histórias ou capítulos para conectar
                  esta referência.
                </p>
              ) : (
                <ul>
                  {note.characterIds.map((id) => (
                    <li key={id}>
                      {characters.find((entry) => entry.id === id)?.nome}
                    </li>
                  ))}
                  {note.storyIds.map((id) => (
                    <li key={id}>
                      {stories.find((entry) => entry.id === id)?.titulo}
                    </li>
                  ))}
                  {note.chapterNumbers.map((numero) => (
                    <li key={numero}>
                      <a href={`/studio?capitulo=${numero}`}>
                        RRH · Capítulo {String(numero).padStart(2, "0")}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
