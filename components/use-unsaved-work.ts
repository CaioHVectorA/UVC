"use client";
import { useEffect } from "react";
export function useUnsavedWork(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    let acknowledged = false;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (acknowledged) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const navigate = (event: MouseEvent) => {
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.button !== 0
      )
        return;
      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest("a");
      if (
        anchor &&
        (anchor.hasAttribute("download") || anchor.target === "_blank")
      )
        return;
      if (!anchor && !target?.closest('[data-leave-studio="true"]')) return;
      if (anchor && new URL(anchor.href).href === window.location.href) return;
      if (
        !window.confirm("Há alterações sem uma cópia salva. Sair sem salvar?")
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
      } else acknowledged = true;
    };
    const cancel = () => {
      acknowledged = false;
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", navigate, true);
    window.addEventListener("uvc-studio-navigation-cancelled", cancel);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", navigate, true);
      window.removeEventListener("uvc-studio-navigation-cancelled", cancel);
    };
  }, [dirty]);
}
