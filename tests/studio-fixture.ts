// Local test credentials only: never used by application code or a deployment.
export const studioTestEnv = {
  NEXTAUTH_URL: "https://studio.example.test",
  NEXTAUTH_SECRET: "e2e-only-signing-secret-for-local-studio-tests-2026",
  UVC_STUDIO_GITHUB_CLIENT_ID: "e2e-client",
  UVC_STUDIO_GITHUB_CLIENT_SECRET: "e2e-provider-secret",
  UVC_STUDIO_GITHUB_ID: "123",
};
