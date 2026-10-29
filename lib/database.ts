import { readFileSync } from "node:fs";
import { Pool, type PoolClient } from "pg";
import { randomBytes, scryptSync } from "node:crypto";
import { seedEntities, seedRelations } from "./workspace-seed";
import type { StudioEntity, StudioRelation } from "./workspace";
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const globalDb = globalThis as typeof globalThis & {
  uvcPool?: Pool;
  uvcReady?: Promise<void>;
};
export function databaseConfigured() {
  return Boolean(connectionString);
}
export function db() {
  if (!connectionString) throw new Error("DATABASE_NOT_CONFIGURED");
  return (globalDb.uvcPool ??= new Pool({
    connectionString,
    max: 3,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
    allowExitOnIdle: true,
    statement_timeout: 15000,
  }));
}
export async function transaction<T>(work: (client: PoolClient) => Promise<T>) {
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
export function passwordHash(
  password: string,
  salt = randomBytes(16).toString("hex"),
) {
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export async function ensureDatabase() {
  if (!globalDb.uvcReady)
    globalDb.uvcReady = transaction(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(82632026)");
      await client.query(
        "CREATE TABLE IF NOT EXISTS uvc_schema_migrations(version integer PRIMARY KEY,installed_at timestamptz NOT NULL DEFAULT now())",
      );
      const migration = await client.query(
        "SELECT version FROM uvc_schema_migrations WHERE version=1",
      );
      if (!migration.rows.length) {
        await client.query(
          readFileSync("db/migrations/001_initial.sql", "utf8"),
        );
        await client.query(
          "INSERT INTO uvc_schema_migrations(version) VALUES(1)",
        );
      }

      await client.query(
        "INSERT INTO uvc_users(id,username,password_hash) VALUES('admin','admin',$1) ON CONFLICT(id) DO NOTHING",
        [passwordHash("admin")],
      );
      const seeded = await client.query(
        "SELECT version FROM uvc_seed_versions WHERE version=2",
      );
      if (!seeded.rows.length) {
        for (const entity of seedEntities) await insertEntity(client, entity);
        for (const relation of seedRelations)
          await client.query(
            "INSERT INTO uvc_relations(id,source_id,target_id,label) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING",
            [relation.id, relation.sourceId, relation.targetId, relation.label],
          );
        await client.query("INSERT INTO uvc_seed_versions(version) VALUES(2)");
      }
    }).catch((error) => {
      globalDb.uvcReady = undefined;
      throw error;
    });
  await globalDb.uvcReady;
}
export async function insertEntity(client: PoolClient, e: StudioEntity) {
  const result = await client.query(
    "INSERT INTO uvc_entities(id,kind,title,body,summary,status,published,tags,attributes) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb) ON CONFLICT(id) DO NOTHING RETURNING id",
    [
      e.id,
      e.kind,
      e.title,
      e.body,
      e.summary,
      e.status,
      e.published,
      JSON.stringify(e.tags),
      JSON.stringify(e.attributes),
    ],
  );
  return result.rowCount === 1;
}
function rowEntity(row: Record<string, unknown>): StudioEntity {
  return {
    id: row.id as string,
    kind: row.kind as StudioEntity["kind"],
    title: row.title as string,
    body: row.body as string,
    summary: row.summary as string,
    status: row.status as StudioEntity["status"],
    published: row.published as boolean,
    tags: row.tags as string[],
    attributes: row.attributes as Record<string, unknown>,
    version: row.version as number,
    updatedAt: String(row.updated_at),
  };
}
export async function loadWorkspace(publishedOnly = false) {
  await ensureDatabase();
  const result = await db().query(
    `SELECT * FROM uvc_entities WHERE NOT archived ${publishedOnly ? "AND published" : ""} ORDER BY kind,title`,
  );
  const entities = result.rows.map(rowEntity);
  const relations = await db().query(
    "SELECT r.* FROM uvc_relations r JOIN uvc_entities s ON s.id=r.source_id JOIN uvc_entities t ON t.id=r.target_id WHERE NOT s.archived AND NOT t.archived",
  );
  const allowed = new Set(entities.map((e) => e.id));
  const layout = publishedOnly
    ? []
    : (
        await db().query(
          "SELECT entity_id,x,y FROM uvc_layout WHERE user_id='admin'",
        )
      ).rows;
  return {
    entities,
    positions: Object.fromEntries(
      layout.map((r) => [r.entity_id, { x: r.x, y: r.y }]),
    ),
    relations: relations.rows
      .filter((r) => allowed.has(r.source_id) && allowed.has(r.target_id))
      .map(
        (r) =>
          ({
            id: r.id,
            sourceId: r.source_id,
            targetId: r.target_id,
            label: r.label,
          }) as StudioRelation,
      ),
  };
}
export class InvalidReferenceError extends Error {}
export class ConflictError extends Error {
  constructor() {
    super(
      "Outra versão foi salva. Recarregue para comparar antes de salvar novamente.",
    );
  }
}
export async function saveEntity(e: StudioEntity, userId: string) {
  await ensureDatabase();
  return transaction(async (client) => {
    const previous = await client.query(
      "SELECT * FROM uvc_entities WHERE id=$1 FOR UPDATE",
      [e.id],
    );
    if (previous.rows.length) {
      const row = previous.rows[0];
      if (row.kind !== e.kind)
        throw new InvalidReferenceError(
          "O tipo de uma ficha existente não pode ser alterado.",
        );
      if (row.version !== e.version || row.archived) throw new ConflictError();
      await client.query(
        "INSERT INTO uvc_revisions(entity_id,user_id,version,snapshot) VALUES($1,$2,$3,$4::jsonb)",
        [e.id, userId, row.version, JSON.stringify(rowEntity(row))],
      );
      await client.query(
        "UPDATE uvc_entities SET title=$2,body=$3,summary=$4,status=$5,published=$6,tags=$7::jsonb,attributes=$8::jsonb,version=version+1,updated_at=now() WHERE id=$1",
        [
          e.id,
          e.title,
          e.body,
          e.summary,
          e.status,
          e.published,
          JSON.stringify(e.tags),
          JSON.stringify(e.attributes),
        ],
      );
    } else {
      if (e.version !== 0) throw new ConflictError();
      if (!(await insertEntity(client, e))) throw new ConflictError();
    }
    return rowEntity(
      (await client.query("SELECT * FROM uvc_entities WHERE id=$1", [e.id]))
        .rows[0],
    );
  });
}
export async function archiveEntity(
  id: string,
  version: number,
  userId: string,
) {
  await ensureDatabase();
  return transaction(async (client) => {
    const result = await client.query(
      "SELECT * FROM uvc_entities WHERE id=$1 AND NOT archived FOR UPDATE",
      [id],
    );
    if (!result.rows[0] || result.rows[0].version !== version)
      throw new ConflictError();
    await client.query(
      "INSERT INTO uvc_revisions(entity_id,user_id,version,snapshot) VALUES($1,$2,$3,$4::jsonb)",
      [id, userId, version, JSON.stringify(rowEntity(result.rows[0]))],
    );
    await client.query(
      "UPDATE uvc_entities SET archived=true,published=false,version=version+1,updated_at=now() WHERE id=$1",
      [id],
    );
  });
}
export async function saveRelation(r: StudioRelation) {
  await ensureDatabase();
  return transaction(async (client) => {
    const existing = await client.query(
      "SELECT id FROM uvc_entities WHERE id=ANY($1::text[]) AND NOT archived FOR SHARE",
      [[r.sourceId, r.targetId]],
    );
    if (existing.rows.length !== 2)
      throw new InvalidReferenceError("As duas fichas precisam existir.");
    await client.query(
      "INSERT INTO uvc_relations(id,source_id,target_id,label) VALUES($1,$2,$3,$4)",
      [r.id, r.sourceId, r.targetId, r.label],
    );
    return r;
  });
}

export async function loadPublicEntities(kind?: StudioEntity["kind"]) {
  await ensureDatabase();
  const allowed = kind
    ? [kind]
    : ["character", "concept", "place", "artifact", "visual"];
  const result = await db().query(
    "SELECT * FROM uvc_entities WHERE NOT archived AND published AND kind=ANY($1::text[]) ORDER BY title",
    [allowed],
  );
  return result.rows.map(rowEntity);
}
