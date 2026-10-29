"use client";
import { useState } from "react";
export function StudioLoginForm() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <form
      className="studio-login-form"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError("");
        const data = new FormData(event.currentTarget);
        try {
          const response = await fetch("/api/studio/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: data.get("username"),
              password: data.get("password"),
            }),
          });
          if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error);
          }
          window.location.assign("/studio");
        } catch (error) {
          setError(
            error instanceof Error ? error.message : "Não foi possível entrar.",
          );
          setPending(false);
        }
      }}
    >
      <label htmlFor="studio-username">Usuário</label>
      <input
        id="studio-username"
        name="username"
        autoComplete="username"
        required
      />
      <label htmlFor="studio-password">Senha</label>
      <input
        id="studio-password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      <button className="button button-primary" disabled={pending}>
        {pending ? "Entrando…" : "Entrar no Studio"}
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
