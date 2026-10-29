import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { importDocument } from "../lib/import-document";
import { db } from "../lib/database";
async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("Informe o caminho do PDF do autor.");
  const id = await importDocument(
    { name: basename(file), bytes: new Uint8Array(await readFile(file)) },
    "story-marginal",
    "document-marginal-ptp-2025-2",
  );
  console.log(
    `Manuscrito e original preservados no PostgreSQL: ${id}. Nenhum texto foi publicado no Git.`,
  );
  await db().end();
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
