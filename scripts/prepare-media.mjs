// Derive lightweight web assets without modifying the historical archive.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
await mkdir("public/media", { recursive: true });
const media = {
  space: "assets/backgrounds/espaço.jpg",
  city: "assets/backgrounds/cidade.jpg",
  uvc: "assets/logos/UVC transparente.png",
  rrh: "assets/logos/rrhcapa.png",
  "rrh-art": "assets/logos/rrh_slide.png",
  congregadores: "assets/logos/CONGREGADores.png",
  guardioes: "assets/characters/guardiões capa.png",
  mr: "assets/characters/mrcapa.png",
  ciecon: "assets/characters/Ciecon.jpg",
  kerry: "assets/characters/Kerry.png",
  hades: "assets/characters/HADES.png",
  deroo: "assets/characters/DerooDa.png",
  "deroo-art": "assets/characters/deroo.jpg",
  tarlin: "assets/characters/tarlin.jpg",
  delimitador: "assets/characters/delimitador.jpg",
  "rrh-logo": "assets/logos/RRH.png",
  "guardioes-logo": "assets/characters/Guardioes.png",
  "mr-logo": "assets/characters/MeninoResiliente.png",
  "congregadores-logo": "assets/logos/Cong.png",
  "punho-logo": "assets/logos/Punho Mortal.png",
};
for (const [name, source] of Object.entries(media)) {
  await sharp(source)
    .rotate()
    .resize({
      width: name === "city" ? 1400 : name === "space" ? 1000 : 900,
      withoutEnlargement: true,
    })
    .webp({ quality: name === "space" ? 60 : name === "city" ? 75 : 85 })
    .toFile(`public/media/${name}.webp`);
}
console.log(`Prepared ${Object.keys(media).length} archive images.`);
