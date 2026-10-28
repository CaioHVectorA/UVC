import test from "node:test";
import assert from "node:assert/strict";
import { isStudioAuthor, isStudioConfigured } from "../../lib/studio-policy";

const configured = {
  NODE_ENV: "production",
  NEXTAUTH_URL: "https://studio.example.test",
  NEXTAUTH_SECRET: "test-only-secret-with-at-least-32-characters",
  UVC_STUDIO_GITHUB_CLIENT_ID: "test-client",
  UVC_STUDIO_GITHUB_CLIENT_SECRET: "test-provider-secret",
  UVC_STUDIO_GITHUB_ID: "123",
} as NodeJS.ProcessEnv;

test("Studio permanece fechado com configuração ausente ou incompleta", () => {
  assert.equal(isStudioConfigured({}), false);
  assert.equal(isStudioConfigured(configured), true);
  for (const key of Object.keys(configured).filter(
    (key) => key !== "NODE_ENV",
  )) {
    assert.equal(isStudioConfigured({ ...configured, [key]: "" }), false, key);
  }
  for (const url of [
    "http://studio.example.test",
    "https://user:pass@studio.example.test",
    "https://studio.example.test/other",
    "https://studio.example.test?x=1",
    "http://localhost:3100",
    "javascript:alert(1)",
  ]) {
    assert.equal(
      isStudioConfigured({ ...configured, NEXTAUTH_URL: url }),
      false,
      url,
    );
  }
  assert.equal(
    isStudioConfigured({ ...configured, NEXTAUTH_SECRET: " ".repeat(40) }),
    false,
  );
  assert.equal(
    isStudioConfigured({
      ...configured,
      NODE_ENV: "development",
      NEXTAUTH_URL: "http://localhost:3100",
    }),
    true,
  );
});

test("autorização exige ID exato do autor e rejeita usuário renomeável, ausência e troca de conta", () => {
  assert.equal(isStudioAuthor("123", "123"), true);
  for (const candidate of [
    undefined,
    null,
    123,
    "",
    "CaioHVectorA",
    "0123",
    "124",
    { id: "123" },
  ]) {
    assert.equal(isStudioAuthor(candidate, "123"), false);
  }
  assert.equal(isStudioAuthor("123", undefined), false);
  assert.equal(isStudioAuthor("123", "124"), false);
  assert.equal(isStudioAuthor("123", "123,124"), false);
});
