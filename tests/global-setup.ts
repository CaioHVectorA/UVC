import { Pool } from "pg";
import { testDatabaseUrl } from "./studio-fixture";
export default async function setup() {
  const url = new URL(testDatabaseUrl);
  if (
    url.pathname !== "/uvc_test" ||
    !["localhost", "127.0.0.1"].includes(url.hostname)
  )
    throw new Error("Os testes só podem inicializar o banco local uvc_test.");
  const pool = new Pool({ connectionString: testDatabaseUrl });
  await pool.query(
    "DROP TABLE IF EXISTS uvc_schema_migrations,uvc_seed_versions,uvc_layout,uvc_files,uvc_revisions,uvc_relations,uvc_sessions,uvc_users,uvc_entities CASCADE",
  );
  await pool.end();
}
