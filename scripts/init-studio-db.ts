import { ensureDatabase, db } from "../lib/database";
async function main() {
  await ensureDatabase();
  console.log(
    "PostgreSQL inicializado. Usuário inicial: admin. Senha inicial: admin.",
  );
  await db().end();
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
