// Isolated PostgreSQL for tests only; never use this credential for a deployment.
export const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://uvc:uvc-test-only@127.0.0.1:55440/uvc_test";
export const studioTestEnv = {
  DATABASE_URL: testDatabaseUrl,
  POSTGRES_URL: "",
  UVC_SITE_URL: "https://studio.example.test",
  NEXTAUTH_URL: "https://studio.example.test",
};
