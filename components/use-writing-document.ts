"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { StudioEntity } from "@/lib/workspace";
import { writingPayload } from "@/lib/writing";
import { useUnsavedWork } from "./use-unsaved-work";

export function useWritingDocument(
  initial: StudioEntity,
  onSaved: (entity: StudioEntity) => void,
) {
  const [draft, setDraft] = useState(initial),
    [revision, setRevision] = useState(0),
    [savedRevision, setSavedRevision] = useState(0);
  const [status, setStatus] = useState<
      "saved" | "saving" | "error" | "conflict"
    >("saved"),
    [error, setError] = useState("");
  const current = useRef(initial),
    changed = useRef(0),
    persisted = useRef(0),
    flight = useRef<Promise<boolean> | null>(null),
    blocked = useRef(false);
  const savedCallback = useRef(onSaved);
  useEffect(() => {
    savedCallback.current = onSaved;
  }, [onSaved]);
  const dirty = revision !== savedRevision;
  useUnsavedWork(dirty);
  const update = useCallback((patch: Partial<StudioEntity>) => {
    current.current = { ...current.current, ...patch };
    changed.current++;
    setDraft(current.current);
    setRevision(changed.current);
  }, []);
  const attr = useCallback(
    (key: string, value: unknown) =>
      update({ attributes: { ...current.current.attributes, [key]: value } }),
    [update],
  );
  const save = useCallback((retry = false): Promise<boolean> => {
    if (flight.current) return flight.current;
    if (blocked.current && !retry) return Promise.resolve(false);
    if (persisted.current === changed.current) return Promise.resolve(true);
    if (!current.current.title.trim()) {
      setStatus("error");
      setError(
        "Dê um título ao texto para salvá-lo. A redação continua no editor.",
      );
      return Promise.resolve(false);
    }
    blocked.current = false;
    const run = async () => {
      setStatus("saving");
      setError("");
      try {
        while (persisted.current !== changed.current) {
          const snapshot = current.current,
            sendingRevision = changed.current;
          const response = await fetch("/api/studio/entities", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(writingPayload(snapshot)),
          });
          const value = await response.json();
          if (!response.ok) {
            blocked.current = true;
            setStatus(response.status === 409 ? "conflict" : "error");
            setError(
              value.error ||
                "Não foi possível salvar. Seu texto continua no editor.",
            );
            return false;
          }
          const saved = value as StudioEntity;
          persisted.current = sendingRevision;
          setSavedRevision(sendingRevision);
          current.current =
            changed.current === sendingRevision
              ? saved
              : {
                  ...current.current,
                  version: saved.version,
                  updatedAt: saved.updatedAt,
                };
          setDraft(current.current);
          savedCallback.current(saved);
        }
        setStatus("saved");
        return true;
      } catch {
        blocked.current = true;
        setStatus("error");
        setError(
          "Sem conexão. Seu texto continua no editor; tente salvar novamente ou baixe uma cópia.",
        );
        return false;
      } finally {
        flight.current = null;
      }
    };
    flight.current = run();
    return flight.current;
  }, []);
  useEffect(() => {
    if (!dirty || blocked.current) return;
    const timer = setTimeout(() => void save(), 1100);
    return () => clearTimeout(timer);
  }, [revision, dirty, save]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save(true);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [save]);
  return { draft, update, attr, save, dirty, status, error };
}
