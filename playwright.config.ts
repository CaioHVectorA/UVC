import { defineConfig, devices } from "@playwright/test";
import { studioTestEnv } from "./tests/studio-fixture";
export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? {
          launchOptions: {
            executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
          },
        }
      : {}),
  },
  webServer: [
    {
      command: "npm run start -- --hostname 127.0.0.1 --port 3100",
      url: "http://127.0.0.1:3100",
      env: {
        DATABASE_URL: "",
        POSTGRES_URL: "",
        NEXTAUTH_SECRET: "",
        UVC_STUDIO_GITHUB_CLIENT_ID: "",
        UVC_STUDIO_GITHUB_CLIENT_SECRET: "",
        UVC_STUDIO_GITHUB_ID: "",
      },
      reuseExistingServer: false,
      timeout: 60000,
    },
    {
      command: "npm run start -- --hostname 127.0.0.1 --port 3101",
      url: "http://127.0.0.1:3101/studio/entrar",
      env: studioTestEnv,
      reuseExistingServer: false,
      timeout: 60000,
    },
  ],
});
