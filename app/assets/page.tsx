"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageIntro } from "@/components/ui";
import { mediaUrl } from "@/lib/catalog";
import factions from "@/data/factions.json";
const items = [
  { art: "rrh-art", name: "Red Right Hand", category: "Artes" },
  { art: "guardioes", name: "Guardiões", category: "Capas" },
  { art: "congregadores", name: "Congregadores", category: "Capas" },
  { art: "mr", name: "Menino Resiliente", category: "Capas" },
  { art: "ciecon", name: "Ciecon", category: "Capas" },
  { art: "deroo-art", name: "Deroo Da", category: "Artes" },
  { art: "tarlin", name: "Tarlin", category: "Artes" },
  { art: "delimitador", name: "Delimitador", category: "Artes" },
  { art: "city", name: "Metrópole", category: "Cenários" },
  { art: "space", name: "Espaço cósmico", category: "Cenários" },
  {
    art: "congregadores-logo",
    name: "Símbolo dos Congregadores",
    category: "Símbolos",
  },
  { art: "uvc", name: "Identidade UVC", category: "Símbolos" },
];
export default function AssetsPage() {
  const [tab, setTab] = useState("gallery");
  const [category, setCategory] = useState("Tudo");
  return (
    <>
      <PageIntro
        label="Nos bastidores da imaginação"
        title="Um universo também se desenha."
      >
        Capas, símbolos e cenários que acompanham as histórias. Explore uma
        seleção do acervo visual e descubra as conexões entre suas facções.
      </PageIntro>
      <div className="segmented" aria-label="Tipo de acervo">
        <button
          aria-pressed={tab === "gallery"}
          onClick={() => setTab("gallery")}
        >
          Acervo visual
        </button>
        <button
          aria-pressed={tab === "connections"}
          onClick={() => setTab("connections")}
        >
          Conexões do universo
        </button>
      </div>
      {tab === "gallery" ? (
        <>
          <div className="toolbar">
            <p className="text-sm text-[var(--muted)]">
              Do arquivo histórico para novas descobertas.
            </p>
            <label className="filter-label">
              Mostrar
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {["Tudo", "Capas", "Artes", "Cenários", "Símbolos"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="gallery-grid">
            {items
              .filter((i) => category === "Tudo" || i.category === category)
              .map((item) => (
                <a
                  className="gallery-item"
                  key={item.art}
                  href={mediaUrl(item.art)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Ampliar ${item.name} em nova aba`}
                >
                  <div className="gallery-image">
                    <Image
                      src={mediaUrl(item.art)}
                      alt={item.name}
                      width={650}
                      height={500}
                    />
                  </div>
                  <div className="gallery-caption">
                    <div>
                      <h2>{item.name}</h2>
                      <p>{item.category} · Arquivo UVC</p>
                    </div>
                    <ArrowUpRight size={20} aria-hidden />
                  </div>
                </a>
              ))}
          </div>
        </>
      ) : (
        <>
          <div className="notice">
            Cada grupo tem seus ideais — e seus conflitos. Esta visão contém
            informações do acervo completo e pode revelar acontecimentos das
            histórias.
          </div>
          <div className="faction-grid mb-16">
            {factions.map((f) => (
              <article key={f.id} className="faction-card">
                <p className="eyebrow">{f.base}</p>
                <h2 className="text-2xl font-semibold mb-4">{f.nome}</h2>
                <p>{f.desc}</p>
                <p>
                  <strong>Liderança:</strong> {f.lider}
                  <br />
                  <strong>Membros:</strong> {f.membros.join(", ")}
                </p>
                <Link
                  href={`/codex?equipe=${encodeURIComponent(f.id === "red-right-hand" ? "Red Right Hand" : f.id === "guardioes" ? "Guardiões" : f.id === "congregadores" ? "Congregadores" : f.nome.replace(/^Os /, ""))}`}
                  className="text-link"
                >
                  Explorar personagens
                  <ArrowUpRight size={17} aria-hidden />
                </Link>
              </article>
            ))}
          </div>
        </>
      )}
    </>
  );
}
