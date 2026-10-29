"use client";
import { useState } from "react";
import { LogOut } from "lucide-react";
export function StudioSessionControl({
  action,
}: {
  action: "signin" | "signout";
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <button
        className="button button-secondary"
        data-leave-studio={action === "signout" ? "true" : undefined}
        disabled={pending}
        onClick={async () => {
          if (action === "signin") {
            window.location.assign("/studio/entrar");
            return;
          }
          setPending(true);
          try {
            const response = await fetch("/api/studio/session", {
              method: "DELETE",
            });
            if (!response.ok) throw new Error();
            window.location.assign("/studio/entrar");
          } catch {
            setError("Não foi possível sair. Tente novamente.");
            setPending(false);
            window.dispatchEvent(new Event("uvc-studio-navigation-cancelled"));
          }
        }}
      >
        <LogOut size={18} aria-hidden />
        {pending
          ? "Aguarde…"
          : action === "signout"
            ? "Encerrar sessão"
            : "Entrar"}
      </button>
      <p role="status" className="session-feedback">
        {error}
      </p>
    </>
  );
}
