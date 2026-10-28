import media from "@/data/media.json";
export function mediaUrl(name: string) {
  if (!media.some((item) => item.id === name))
    throw new Error(`Imagem não registrada: ${name}`);
  return `/media/${name}.webp`;
}
