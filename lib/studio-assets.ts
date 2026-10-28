import "server-only";
import path from "node:path";
import { readFile, realpath } from "node:fs/promises";
import sharp from "sharp";
import inventory from "@/data/studio-assets.json";
export const studioAssets = inventory;
export async function readStudioAsset(id: string) {
  const asset = studioAssets.find((item) => item.id === id);
  if (!asset) return null;
  const root = await realpath(path.join(process.cwd(), "assets"));
  const file = await realpath(path.join(process.cwd(), asset.source));
  if (!file.startsWith(root + path.sep))
    throw new Error("Asset fora do acervo.");
  return sharp(await readFile(file))
    .rotate()
    .resize({
      width: 1000,
      height: 1000,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toBuffer();
}
