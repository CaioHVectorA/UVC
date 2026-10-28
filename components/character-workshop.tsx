"use client";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  Download,
  FilePlus2,
  LockKeyhole,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import type { Character } from "@/lib/schemas";
import {
  characterWorkspaceSchema,
  draftChecklist,
  emptyCharacterDraft,
  hasDraftContent,
  serializeCharacterDrafts,
  type CharacterDraft,
} from "@/lib/character-drafts";

type Section = "identity" | "motivation" | "abilities";
type Field = Exclude<keyof CharacterDraft, "id">;
const sections: { id: Section; label: string }[] = [
  { id: "identity", label: "Identidade" },
  { id: "motivation", label: "Motivações" },
  { id: "abilities", label: "Poderes e arco" },
];
const signature = (draft: CharacterDraft) => JSON.stringify(draft);
const lines = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

function DraftField({
  field,
  label,
  value,
  onChange,
  multiline = false,
  maxLength = 160,
  hint,
  placeholder,
  list,
}: {
  field: Field;
  label: string;
  value: string;
  onChange: (field: Field, value: string) => void;
  multiline?: boolean;
  maxLength?: number;
  hint?: string;
  placeholder?: string;
  list?: string;
}) {
  const props = {
    id: `draft-${field}`,
    value,
    maxLength,
    placeholder,
    "aria-describedby": hint ? `hint-${field}` : undefined,
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => onChange(field, event.target.value),
  };
  return (
    <div className="workshop-field">
      <label htmlFor={props.id}>{label}</label>
      {multiline ? (
        <textarea
          {...props}
          rows={field === "desc" || field === "arco" ? 5 : 3}
        />
      ) : (
        <input {...props} type="text" list={list} />
      )}
      {hint && <p id={`hint-${field}`}>{hint}</p>}
    </div>
  );
}

export function CharacterWorkshop({
  characters,
  factions,
  stories,
}: {
  characters: Character[];
  factions: string[];
  stories: string[];
}) {
  const [drafts, setDrafts] = useState<CharacterDraft[]>([
    emptyCharacterDraft("draft-1"),
  ]);
  const [activeId, setActiveId] = useState("draft-1");
  const [library, setLibrary] = useState<"drafts" | "canon">("drafts");
  const [referenceId, setReferenceId] = useState(characters[0]?.id ?? "");
  const [section, setSection] = useState<Section>("identity");
  const [search, setSearch] = useState("");
  const [copies, setCopies] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLDetailsElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const active = drafts.find((draft) => draft.id === activeId) ?? drafts[0];
  const reference = characters.find(
    (character) => character.id === referenceId,
  );
  const dirty = drafts.some(
    (draft) => hasDraftContent(draft) && copies[draft.id] !== signature(draft),
  );
  const checklist = draftChecklist(active);
  const query = search.trim().toLocaleLowerCase("pt-BR");
  const filteredDrafts = drafts.filter((draft) =>
    [draft.nome, draft.equipe].some((value) =>
      value.toLocaleLowerCase("pt-BR").includes(query),
    ),
  );
  const filteredCanon = characters.filter((character) =>
    [character.nome, character.equipe].some((value) =>
      value.toLocaleLowerCase("pt-BR").includes(query),
    ),
  );

  useEffect(() => {
    if (libraryRef.current && window.matchMedia("(max-width: 760px)").matches)
      libraryRef.current.open = false;
  }, []);
  useEffect(() => {
    if (!dirty) return;
    let leavingAcknowledged = false;
    const cancelNavigation = () => {
      leavingAcknowledged = false;
    };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (leavingAcknowledged) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const beforeNavigation = (event: MouseEvent) => {
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.button !== 0
      )
        return;
      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest("a");
      const signingOut = target?.closest('[data-leave-studio="true"]');
      if (
        anchor &&
        (anchor.hasAttribute("download") || anchor.target === "_blank")
      )
        return;
      if (!anchor && !signingOut) return;
      if (anchor && new URL(anchor.href).pathname === window.location.pathname)
        return;
      if (
        !window.confirm(
          "Há rascunhos sem uma cópia em arquivo. Sair sem baixar?",
        )
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
      } else leavingAcknowledged = true;
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", beforeNavigation, true);
    window.addEventListener(
      "uvc-studio-navigation-cancelled",
      cancelNavigation,
    );
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", beforeNavigation, true);
      window.removeEventListener(
        "uvc-studio-navigation-cancelled",
        cancelNavigation,
      );
    };
  }, [dirty]);

  function focusEditor() {
    if (window.matchMedia("(max-width: 760px)").matches && libraryRef.current)
      libraryRef.current.open = false;
    requestAnimationFrame(() => {
      headingRef.current?.focus({ preventScroll: true });
      headingRef.current?.scrollIntoView({
        block: "start",
        behavior: "instant",
      });
    });
  }
  function update(field: Field, value: string) {
    setDrafts((current) =>
      current.map((draft) =>
        draft.id === active.id ? { ...draft, [field]: value } : draft,
      ),
    );
    setFeedback("");
    setError("");
  }
  function newDraft() {
    if (drafts.length >= 50) return;
    const draft = emptyCharacterDraft(crypto.randomUUID());
    setDrafts((current) => [...current, draft]);
    setActiveId(draft.id);
    setLibrary("drafts");
    setSection("identity");
    setSearch("");
    setFeedback("");
    requestAnimationFrame(() => document.getElementById("draft-nome")?.focus());
  }
  function discard() {
    if (
      hasDraftContent(active) &&
      !window.confirm(
        `Descartar o rascunho de ${active.nome || "personagem sem nome"}?`,
      )
    )
      return;
    const remaining = drafts.filter((draft) => draft.id !== active.id);
    if (!remaining.length)
      remaining.push(emptyCharacterDraft(crypto.randomUUID()));
    setDrafts(remaining);
    setActiveId(remaining[0].id);
    setSection("identity");
    setFeedback("Rascunho descartado nesta sessão.");
  }
  function download() {
    try {
      const serialized = serializeCharacterDrafts(drafts);
      const url = URL.createObjectURL(
        new Blob([serialized], { type: "application/json;charset=utf-8" }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "uvc-personagens-rascunhos.json";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10000);
      setCopies(
        Object.fromEntries(drafts.map((draft) => [draft.id, signature(draft)])),
      );
      setError("");
      setFeedback(
        "Arquivo preparado. Confira o download para guardar sua cópia.",
      );
    } catch {
      setError(
        "Não foi possível preparar o arquivo. Seus rascunhos continuam nesta sessão.",
      );
    }
  }
  async function importDrafts(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImporting(true);
    setError("");
    setFeedback("");
    try {
      if (file.size > 10 * 1024 * 1024)
        throw new Error("Arquivo grande demais");
      const imported = characterWorkspaceSchema.parse(
        JSON.parse(await file.text()),
      );
      const existing = drafts.filter(hasDraftContent);
      if (existing.length + imported.drafts.length > 50)
        throw new Error("Limite de rascunhos");
      // Imported IDs cannot collide with an open draft or replace its content.
      const restored = imported.drafts.map((draft) => ({
        ...draft,
        id: crypto.randomUUID(),
      }));
      setDrafts((current) => [...current.filter(hasDraftContent), ...restored]);
      setCopies((current) => ({
        ...current,
        ...Object.fromEntries(
          restored.map((draft) => [draft.id, signature(draft)]),
        ),
      }));
      setActiveId(restored[0].id);
      setLibrary("drafts");
      setSearch("");
      setSection("identity");
      setFeedback(
        `${restored.length} rascunho(s) aberto(s). O cânone não foi alterado.`,
      );
    } catch {
      setError(
        "Arquivo inválido ou limite excedido. Use um arquivo de rascunhos exportado pelo Studio, com até 50 fichas e 10 MB.",
      );
    } finally {
      setImporting(false);
    }
  }
  const field = (
    name: Field,
    label: string,
    options: Partial<React.ComponentProps<typeof DraftField>> = {},
  ) => (
    <DraftField
      key={name}
      field={name}
      label={label}
      value={active[name]}
      onChange={update}
      {...options}
    />
  );

  return (
    <div className="character-workshop">
      <div className="workshop-commandbar">
        <div className="workshop-local-state">
          <LockKeyhole size={16} aria-hidden />
          <span>
            {dirty
              ? "Alterações sem cópia em arquivo"
              : "Rascunhos nesta sessão"}
            <small>
              Baixe um arquivo para continuar depois. Não há salvamento no
              servidor.
            </small>
          </span>
        </div>
        <div className="workshop-actions">
          <input
            type="file"
            accept=".json,application/json"
            ref={fileRef}
            hidden
            aria-label="Importar arquivo de rascunhos"
            onChange={importDrafts}
          />
          <button
            type="button"
            className="button button-secondary"
            disabled={importing}
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={16} aria-hidden />{" "}
            {importing ? "Abrindo…" : "Abrir arquivo"}
          </button>
          <button
            type="button"
            className="button button-primary"
            disabled={importing || !drafts.some(hasDraftContent)}
            onClick={download}
          >
            <Download size={16} aria-hidden /> Baixar rascunhos
          </button>
        </div>
      </div>
      <p role="status" className="workshop-feedback">
        {feedback}
      </p>
      {error && (
        <p role="alert" className="workshop-error">
          {error}
        </p>
      )}
      <div className="workshop-grid">
        <aside className="workshop-library">
          <button
            type="button"
            className="button button-secondary workshop-new"
            disabled={importing || drafts.length >= 50}
            onClick={newDraft}
          >
            <FilePlus2 size={17} aria-hidden /> Novo personagem
          </button>
          <details open ref={libraryRef}>
            <summary>Biblioteca de personagens</summary>
            <div
              className="workshop-library-switch"
              role="group"
              aria-label="Origem das fichas"
            >
              <button
                type="button"
                aria-pressed={library === "drafts"}
                onClick={() => {
                  setLibrary("drafts");
                  setSearch("");
                }}
              >
                Rascunhos <span>{drafts.length}</span>
              </button>
              <button
                type="button"
                aria-pressed={library === "canon"}
                onClick={() => {
                  setLibrary("canon");
                  setSearch("");
                }}
              >
                Cânone <span>{characters.length}</span>
              </button>
            </div>
            <label className="workshop-search">
              <Search size={16} aria-hidden />
              <span className="sr-only">Buscar fichas de personagem</span>
              <input
                type="search"
                placeholder="Nome ou equipe…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <div
              className="workshop-file-list"
              aria-label={
                library === "drafts"
                  ? "Rascunhos de personagens"
                  : "Personagens canônicos"
              }
            >
              {library === "drafts"
                ? filteredDrafts.map((draft) => (
                    <button
                      type="button"
                      key={draft.id}
                      aria-pressed={active.id === draft.id}
                      onClick={() => {
                        setActiveId(draft.id);
                        focusEditor();
                      }}
                    >
                      <UserRound size={17} aria-hidden />
                      <span>
                        {draft.nome || "Personagem sem nome"}
                        <small>
                          {draft.equipe || "Rascunho de personagem"}
                        </small>
                      </span>
                    </button>
                  ))
                : filteredCanon.map((character) => (
                    <button
                      type="button"
                      key={character.id}
                      aria-pressed={referenceId === character.id}
                      onClick={() => {
                        setReferenceId(character.id);
                        focusEditor();
                      }}
                    >
                      <ShieldCheck size={17} aria-hidden />
                      <span>
                        {character.nome}
                        <small>{character.equipe}</small>
                      </span>
                    </button>
                  ))}
              {(library === "drafts"
                ? !filteredDrafts.length
                : !filteredCanon.length) && (
                <p className="workshop-no-results">Nenhuma ficha encontrada.</p>
              )}
            </div>
          </details>
          <p className="workshop-library-note">
            O cânone é uma referência. Criar um rascunho não publica nem altera
            fichas oficiais.
          </p>
        </aside>
        <section
          className="workshop-editor"
          aria-labelledby="workshop-editor-title"
        >
          <div className="workshop-editor-heading">
            <div>
              <p className="eyebrow">
                {library === "canon"
                  ? "Cânone · somente consulta"
                  : "Ficha de trabalho · rascunho"}
              </p>
              <h2 ref={headingRef} tabIndex={-1} id="workshop-editor-title">
                {library === "canon"
                  ? reference?.nome
                  : active.nome || "Um personagem começa aqui."}
              </h2>
            </div>
            {library === "drafts" && (
              <button
                type="button"
                className="workshop-discard"
                onClick={discard}
                disabled={importing}
                aria-label="Descartar rascunho"
              >
                <Trash2 size={17} aria-hidden />
              </button>
            )}
          </div>
          {library === "canon" && reference ? (
            <div className="workshop-canonical">
              <p className="workshop-canonical-note">
                <ShieldCheck size={17} aria-hidden /> Ficha oficial. O texto
                original está preservado.
              </p>
              <dl>
                <dt>Equipe</dt>
                <dd>{reference.equipe}</dd>
                <dt>Escala</dt>
                <dd>{reference.escala}</dd>
                <dt>Alinhamento</dt>
                <dd>{reference.alinhamento}</dd>
              </dl>
              <h3>Descrição</h3>
              <p>{reference.desc}</p>
              <h3>Poderes e habilidades</h3>
              <ul>
                {reference.poderes.map((power) => (
                  <li key={power}>{power}</li>
                ))}
              </ul>
              <h3>Aparições</h3>
              <ul>
                {reference.aparicoes.map((appearance) => (
                  <li key={appearance}>{appearance}</li>
                ))}
              </ul>
            </div>
          ) : (
            <>
              <div
                className="workshop-sections"
                role="group"
                aria-label="Seções da ficha"
              >
                {sections.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    aria-pressed={section === item.id}
                    onClick={() => setSection(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <form
                className="workshop-form"
                onSubmit={(event) => event.preventDefault()}
                aria-label="Rascunho de personagem"
              >
                <fieldset disabled={importing}>
                  <legend className="sr-only">
                    Desenvolvimento do personagem
                  </legend>
                  {section === "identity" && (
                    <>
                      {field("nome", "Nome do personagem", {
                        placeholder: "Como ele será conhecido?",
                      })}
                      <div className="workshop-field-row">
                        <div className="workshop-field">
                          <label htmlFor="draft-escala">Escala</label>
                          <select
                            id="draft-escala"
                            value={active.escala}
                            onChange={(event) =>
                              update("escala", event.target.value)
                            }
                          >
                            <option value="">Escolher mundo</option>
                            <option value="TERRA">Terra / Glen</option>
                            <option value="UNIVERSAL">
                              Universal / Cosmos
                            </option>
                            <option value="UNIVERSAL / TERRA">
                              Universal e Terra
                            </option>
                          </select>
                        </div>
                        {field("alinhamento", "Alinhamento", {
                          placeholder: "Definido por você",
                        })}
                      </div>
                      {field("equipe", "Equipe ou facção", {
                        list: "canonical-factions",
                        placeholder: "Escolher ou escrever uma equipe",
                      })}
                      <datalist id="canonical-factions">
                        {factions.map((faction) => (
                          <option key={faction} value={faction} />
                        ))}
                      </datalist>
                      {field("desc", "Quem é esse personagem?", {
                        multiline: true,
                        maxLength: 5000,
                        placeholder:
                          "Uma descrição que revele sua identidade e seu lugar na história.",
                      })}
                    </>
                  )}
                  {section === "motivation" && (
                    <>
                      {field("papel", "Papel na história", {
                        placeholder: "Qual é a sua função no enredo?",
                      })}
                      {field("desejo", "O que ele quer?", {
                        multiline: true,
                        maxLength: 3000,
                        placeholder: "O desejo que o faz agir.",
                      })}
                      {field("conflito", "O que o impede?", {
                        multiline: true,
                        maxLength: 3000,
                        placeholder:
                          "Conflitos internos, obstáculos ou forças opostas.",
                      })}
                    </>
                  )}
                  {section === "abilities" && (
                    <>
                      {field("poderes", "Poderes e habilidades", {
                        multiline: true,
                        maxLength: 5000,
                        hint: "Uma habilidade por linha. Descreva também personagens sem poderes.",
                      })}
                      {field("limites", "Limites, custos e vulnerabilidades", {
                        multiline: true,
                        maxLength: 3000,
                      })}
                      {field("arco", "Arco do personagem", {
                        multiline: true,
                        maxLength: 5000,
                        placeholder: "De onde ele parte e o que pode mudar?",
                      })}
                      {field("aparicoes", "Histórias e aparições", {
                        multiline: true,
                        maxLength: 3000,
                        hint: `Uma por linha. Histórias registradas: ${stories.join(", ")}.`,
                      })}
                      {field("notas", "Notas do autor", {
                        multiline: true,
                        maxLength: 10000,
                      })}
                    </>
                  )}
                </fieldset>
              </form>
            </>
          )}
        </section>
        <aside className="workshop-preview" aria-label="Resumo da ficha">
          <p className="eyebrow">
            {library === "canon" ? "Referência canônica" : "Prévia da ficha"}
          </p>
          <div className="workshop-avatar">
            <UserRound size={30} aria-hidden />
          </div>
          <h2>
            {library === "canon"
              ? reference?.nome
              : active.nome || "Personagem sem nome"}
          </h2>
          <p className="workshop-preview-meta">
            {(library === "canon" ? reference?.equipe : active.equipe) ||
              "Equipe a definir"}
          </p>
          <span className="workshop-draft-badge">
            {library === "canon"
              ? "Somente consulta"
              : "Rascunho · não publicado"}
          </span>
          <p className="workshop-preview-description">
            {(library === "canon" ? reference?.desc : active.desc) ||
              "Sua descrição aparece aqui enquanto você escreve."}
          </p>
          {library === "drafts" && (
            <>
              <div className="workshop-checklist">
                <h3>
                  Pontos da ficha{" "}
                  <span>
                    {checklist.filter((item) => item.done).length}/
                    {checklist.length}
                  </span>
                </h3>
                <ul>
                  {checklist.map((item) => (
                    <li
                      key={item.label}
                      className={item.done ? "is-complete" : ""}
                    >
                      <span className="workshop-checkmark" aria-hidden>
                        {item.done && <Check size={13} aria-hidden />}
                      </span>
                      <span className="sr-only">
                        {item.done ? "Preenchido:" : "Pendente:"}{" "}
                      </span>
                      {item.label}
                    </li>
                  ))}
                </ul>
              </div>
              {lines(active.poderes).length > 0 && (
                <div className="workshop-power-preview">
                  <h3>Habilidades</h3>
                  <ul>
                    {lines(active.poderes).map((power, index) => (
                      <li key={index}>{power}</li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="workshop-preview-note">
                Preenchimento ajuda a desenvolver a ficha. Não representa
                validação automática do cânone.
              </p>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
