"use client";
import { useEffect, useRef, useState } from "react";
import { FileText, Upload, X } from "lucide-react";
import type { DocxPreview, DocxSplit } from "@/lib/docx-contract";
import type { StudioWorkspace } from "@/lib/workspace";
export function DocxImportDialog({
  file,
  storyId,
  projectTitle,
  onCancel,
  onComplete,
}: {
  file: File;
  storyId: string;
  projectTitle: string;
  onCancel: () => void;
  onComplete: (workspace: StudioWorkspace, id: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [preview, setPreview] = useState<DocxPreview>(),
    [split, setSplit] = useState<DocxSplit>("none"),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const read = async () => {
      try {
        if (!file.size || file.size > 4 * 1024 * 1024)
          throw new Error("Selecione um DOCX de até 4 MB.");
        const form = new FormData();
        form.set("file", file);
        form.set("action", "preview");
        const r = await fetch("/api/studio/import/docx", {
          method: "POST",
          body: form,
          signal: controller.signal,
        });
        if (!r.headers.get("content-type")?.includes("application/json"))
          throw new Error("Não foi possível ler a prévia. Tente novamente.");
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        if (controller.signal.aborted) return;
        setPreview(data);
        setSplit(
          data.modes.find((m: DocxPreview["modes"][number]) => m.value === "h1")
            ?.value ??
            data.modes.find(
              (m: DocxPreview["modes"][number]) => m.value === "h2",
            )?.value ??
            "none",
        );
      } catch (e) {
        if (!controller.signal.aborted) setError((e as Error).message);
      }
    };
    void read();
    return () => controller.abort();
  }, [file]);
  async function confirm() {
    if (!preview || pending) return;
    setPending(true);
    setError("");
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("action", "import");
      form.set("storyId", storyId);
      form.set("split", split);
      form.set("digest", preview.digest);
      form.set("importId", preview.importId);
      const r = await fetch("/api/studio/import/docx", {
          method: "POST",
          body: form,
        }),
        data = await r.json();
      if (!r.ok) throw new Error(data.error);
      const loaded = await fetch("/api/studio/workspace", {
          cache: "no-store",
        }),
        workspace = await loaded.json();
      if (!loaded.ok) throw new Error(workspace.error);
      onComplete(workspace, data.id);
    } catch (e) {
      setError(
        (e as Error).message || "Não foi possível importar. Tente novamente.",
      );
    } finally {
      setPending(false);
    }
  }
  const selected = preview?.modes.find((m) => m.value === split);
  return (
    <dialog
      ref={dialog}
      className="docx-dialog"
      aria-labelledby="docx-title"
      aria-describedby="docx-description"
      onCancel={(e) => {
        e.preventDefault();
        if (!pending) onCancel();
      }}
    >
      <header>
        <div>
          <p className="eyebrow">Do Docs para sua mesa</p>
          <h2 id="docx-title">
            <FileText size={23} />
            Importar DOCX
          </h2>
        </div>
        <button
          type="button"
          aria-label="Fechar prévia de importação"
          disabled={pending}
          onClick={onCancel}
        >
          <X size={19} />
        </button>
      </header>
      <p id="docx-description">
        Confira a estrutura antes de trazer o texto para{" "}
        <strong>{projectTitle}</strong>. O arquivo original será preservado.
      </p>
      <div className="docx-file">
        <FileText size={19} />
        <span>
          {file.name}
          <small>
            {preview
              ? `${preview.words.toLocaleString("pt-BR")} palavras`
              : `${Math.ceil(file.size / 1024)} KB`}
          </small>
        </span>
      </div>
      {!preview && !error && (
        <p role="status">Lendo o documento e identificando os títulos…</p>
      )}
      {preview && (
        <>
          <label className="docx-split">
            Organizar como
            <select
              value={split}
              disabled={pending}
              onChange={(e) => setSplit(e.target.value as DocxSplit)}
            >
              {preview.modes.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          {preview.modes.length === 1 && (
            <p className="docx-hint">
              Nenhum título de capítulo foi identificado. Para separar
              automaticamente, use os estilos Título 1 ou Título 2 no Docs ou
              Word.
            </p>
          )}
          <h3>
            {selected?.sections.length === 1
              ? "Será criado 1 texto"
              : `Serão criados ${selected?.sections.length} textos`}
          </h3>
          <ol
            className="docx-sections"
            aria-label="Textos que serão importados"
          >
            {selected?.sections.map((s, index) => (
              <li key={index}>
                <span>{s.title}</span>
                <small>{s.words.toLocaleString("pt-BR")} palavras</small>
              </li>
            ))}
          </ol>
          <details className="docx-details">
            <summary>O que é preservado e o que conferir</summary>
            <p>
              Títulos, parágrafos, negrito, itálico, listas e links compatíveis
              ficam editáveis no Studio.
            </p>
            <ul>
              {preview.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </details>
        </>
      )}
      {error && (
        <p role="alert" className="docx-error">
          {error}
        </p>
      )}
      <footer>
        <button type="button" disabled={pending} onClick={onCancel}>
          Cancelar
        </button>
        <button
          type="button"
          className="docx-confirm"
          disabled={!preview || pending}
          onClick={() => void confirm()}
        >
          <Upload size={17} />
          {pending ? "Importando…" : "Importar para o Studio"}
        </button>
      </footer>
    </dialog>
  );
}
