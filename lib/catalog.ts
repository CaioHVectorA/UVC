import series from "@/data/series_and_solos.json";

const editions: Record<string, { slug: string; art: string; color: string }> = {
  Guardiões: { slug: "guardioes", art: "guardioes", color: "#f3bd62" },
  "Menino Resiliente (Part I)": {
    slug: "menino-resiliente",
    art: "mr",
    color: "#d9f36b",
  },
  Congregadores: {
    slug: "congregadores",
    art: "congregadores",
    color: "#75e3d8",
  },
  "Red Right Hand": { slug: "red-right-hand", art: "rrh", color: "#ff7269" },
  Hades: { slug: "hades", art: "hades", color: "#d69cb3" },
  Ciecon: { slug: "ciecon", art: "ciecon", color: "#b0bee6" },
  "Kerry, o Guerreiro da Vingança": {
    slug: "kerry",
    art: "kerry",
    color: "#c4c3ca",
  },
  "Naok: Punho Mortal": {
    slug: "punho-mortal",
    art: "punho-logo",
    color: "#e5bd91",
  },
};
export const stories = series.map((story) => {
  const edition = editions[story.titulo];
  if (!edition)
    throw new Error(
      `Configuração de apresentação ausente para: ${story.titulo}`,
    );
  return { ...story, ...edition };
});
export const characterArt: Record<string, string> = {
  arner: "rrh-art",
  "deroo-da": "deroo-art",
  delimitador: "delimitador",
  tarlin: "tarlin",
  "irmaos-yaa": "rrh-logo",
  beenie: "guardioes-logo",
  kerry: "kerry",
  "larry-mr": "mr-logo",
  ciecon: "ciecon",
  rex: "congregadores-logo",
  "naok-pm": "punho-logo",
  hades: "hades",
  curtin: "rrh-logo",
  mylon: "rrh-logo",
  chin: "rrh-logo",
  ellis: "rrh-logo",
  inera: "guardioes-logo",
  alero: "guardioes-logo",
};
export const mediaUrl = (name: string) => `/media/${name}.webp`;
