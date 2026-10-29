import test from "node:test";
import assert from "node:assert/strict";
import { isStudioConfigured, isStudioAuthor } from "../../lib/studio-policy";
test("Studio exige conexão PostgreSQL e não depende de uma OAuth App", () => {
  assert.equal(isStudioConfigured({}), false);
  assert.equal(
    isStudioConfigured({ DATABASE_URL: "postgresql://local/test" }),
    true,
  );
  assert.equal(
    isStudioConfigured({ POSTGRES_URL: "postgresql://local/test" }),
    true,
  );
  assert.equal(
    isStudioConfigured({ UVC_STUDIO_GITHUB_CLIENT_ID: "old" }),
    false,
  );
});
test("identidade de sessão do Studio é o usuário administrador", () => {
  assert.equal(isStudioAuthor("admin"), true);
  for (const value of [null, undefined, "", 123, "109510970", {}])
    assert.equal(isStudioAuthor(value), false);
});
