"use client";
import { signIn, signOut } from "next-auth/react";
import { useState } from "react";
import { LogIn, LogOut } from "lucide-react";

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
          setPending(true);
          setError("");
          try {
            if (action === "signin")
              await signIn("github", { callbackUrl: "/studio" });
            else {
              // Full navigation clears the previous session's in-browser RSC state.
              const result = await signOut({ redirect: false });
              if (!result?.url) throw new Error("Signout failed");
              const response = await fetch("/api/auth/session", {
                cache: "no-store",
              });
              if (!response.ok || (await response.json()).studioAuthorId)
                throw new Error("Session is still active");
              window.location.assign("/studio/entrar");
            }
          } catch {
            window.dispatchEvent(new Event("uvc-studio-navigation-cancelled"));
            setError("Não foi possível concluir. Tente novamente.");
            setPending(false);
          }
        }}
      >
        {action === "signin" ? (
          <LogIn size={18} aria-hidden />
        ) : (
          <LogOut size={18} aria-hidden />
        )}
        {pending
          ? "Aguarde…"
          : action === "signin"
            ? "Entrar com GitHub"
            : "Encerrar sessão"}
      </button>
      <p role="status" className="session-feedback">
        {error}
      </p>
    </>
  );
}
