import { spawnSync } from "node:child_process";
const name = "uvc-studio-test-postgres";
const exists =
  spawnSync("docker", ["inspect", name], { stdio: "ignore" }).status === 0;
const result = spawnSync(
  "docker",
  exists
    ? ["start", name]
    : [
        "run",
        "-d",
        "--name",
        name,
        "-p",
        "127.0.0.1:55440:5432",
        "-e",
        "POSTGRES_USER=uvc",
        "-e",
        "POSTGRES_PASSWORD=uvc-test-only",
        "-e",
        "POSTGRES_DB=uvc_test",
        "--tmpfs",
        "/var/lib/postgresql/data",
        "postgres:17-alpine",
      ],
  { stdio: "inherit" },
);
if (result.status !== 0) process.exit(result.status ?? 1);
