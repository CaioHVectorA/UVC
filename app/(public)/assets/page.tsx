"use client";
import { useState } from "react";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { PageIntro } from "@/components/ui";
import { mediaUrl } from "@/lib/media";
const items = [
  { art: "rrh-art", name: "Red Right Hand", category: "Artes" },
  { art: "guardioes", name: "Guardiões", category: "Estudos" },
  { art: "congregadores", name: "Congregadores", category: "Estudos" },
  { art: "mr", name: "Menino Resiliente", category: "Estudos" },
  { art: "ciecon", name: "Ciecon", category: "Estudos" },
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
  const [category, setCategory] = useState("Tudo");
  return (
    <>
      <PageIntro label="UVC" title="Galeria">
        Artes, símbolos e estudos visuais.
      </PageIntro>
      <div className="toolbar">
        <label className="filter-label">
          Categoria
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {["Tudo", "Estudos", "Artes", "Cenários", "Símbolos"].map(
              (item) => (
                <option key={item}>{item}</option>
              ),
            )}
          </select>
        </label>
      </div>
      <div className="gallery-grid">
        {items
          .filter((item) => category === "Tudo" || item.category === category)
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
                  sizes="(max-width:760px) 45vw, 400px"
                />
              </div>
              <div className="gallery-caption">
                <div>
                  <h2>{item.name}</h2>
                  <p>{item.category}</p>
                </div>
                <ArrowUpRight size={18} aria-hidden />
              </div>
            </a>
          ))}
      </div>
    </>
  );
}
