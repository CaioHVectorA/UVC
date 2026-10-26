// Derive lightweight web assets without modifying the historical archive.
import sharp from "sharp";
import { mkdir, readFile } from "node:fs/promises";
await mkdir("public/media", { recursive: true });
const media = JSON.parse(
  await readFile(new URL("../data/media.json", import.meta.url), "utf8"),
);
for (const { id: name, source } of media) {
  await sharp(source)
    .rotate()
    .resize({
      width: name === "city" ? 1400 : name === "space" ? 1000 : 900,
      withoutEnlargement: true,
    })
    .webp({ quality: name === "space" ? 60 : name === "city" ? 75 : 85 })
    .toFile(`public/media/${name}.webp`);
}
console.log(`Prepared ${media.length} archive images.`);
