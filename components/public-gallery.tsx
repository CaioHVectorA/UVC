"use client";
import { useState } from "react";
import Image from "next/image";
import { PageIntro } from "@/components/ui";
export function PublicGallery({
  items,
}: {
  items: { id: string; title: string; description: string; category: string }[];
}) {
  const [category, setCategory] = useState("Tudo");
  return (
    <>
      <PageIntro label="UVC" title="Galeria">
        Referências visuais, artes e estudos do universo.
      </PageIntro>
      <div className="toolbar">
        <label className="filter-label">
          Categoria
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {["Tudo", ...new Set(items.map((item) => item.category))].map(
              (value) => (
                <option key={value}>{value}</option>
              ),
            )}
          </select>
        </label>
      </div>
      <div className="gallery-grid">
        {items
          .filter((item) => category === "Tudo" || item.category === category)
          .map((item) => (
            <figure className="gallery-item" key={item.id}>
              <a
                href={`/api/public/visuals/${item.id}`}
                target="_blank"
                rel="noreferrer"
                aria-label={`Ampliar ${item.title}`}
              >
                <div className="gallery-image">
                  <Image
                    src={`/api/public/visuals/${item.id}`}
                    alt={item.description || item.title}
                    width={650}
                    height={500}
                    unoptimized
                  />
                </div>
              </a>
              <figcaption className="gallery-caption">
                <div>
                  <h2>{item.title}</h2>
                  <p>{item.category}</p>
                  {item.description && <p>{item.description}</p>}
                </div>
              </figcaption>
            </figure>
          ))}
      </div>
    </>
  );
}
