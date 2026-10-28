import { readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const source = path.posix.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(source)));
    else if (entry.isFile() && /\.(png|jpe?g|webp)$/i.test(entry.name))
      files.push(source);
  }
  return files;
}
const files = (await walk("assets")).sort();
await writeFile(
  "data/studio-assets.json",
  JSON.stringify(
    files.map((source) => ({
      id: createHash("sha256").update(source).digest("hex").slice(0, 20),
      source,
      name: path.parse(source).name,
      folder: path.basename(path.dirname(source)),
    })),
    null,
    2,
  ) + "\n",
);
console.log(`${files.length} assets indexados; originais preservados.`);
