import { test, expect } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { studioTestEnv } from "../studio-fixture";

const base = "http://127.0.0.1:3101";
async function authorCookie(id = "123", maxAge = 3600) {
  const value = await encode({
    secret: studioTestEnv.NEXTAUTH_SECRET,
    token: { studioAuthorId: id, sub: id },
    maxAge,
  });
  return `__Secure-next-auth.session-token=${value}`;
}

test("Studio fechado não envia manuscritos nem aceita ativação por cookie", async ({
  request,
}) => {
  for (const headers of [
    {},
    { Cookie: await authorCookie() },
    {
      "x-middleware-subrequest":
        "middleware:middleware:middleware:middleware:middleware",
    },
  ] as Record<string, string>[]) {
    const response = await request.get("/studio", { headers, maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers().location).toBe("/studio/entrar");
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect(await response.text()).not.toContain("A Reunião");
  }
  const response = await request.get("/api/auth/providers");
  expect(response.status()).toBe(503);
});

test("sem sessão, cookie forjado, sessão expirada e outra conta não recebem o Studio", async ({
  request,
}) => {
  for (const cookie of [
    "",
    "__Secure-next-auth.session-token=forjado",
    await authorCookie("124"),
    await authorCookie("123", -120),
  ]) {
    const response = await request.get(`${base}/studio`, {
      headers: { Cookie: cookie },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(307);
    expect(response.headers().location).toBe("/studio/entrar");
    expect(await response.text()).not.toContain("A Reunião");
  }
  // RSC requests must pass the same page-level authorization.
  const response = await request.get(`${base}/studio?_rsc=test`, {
    headers: { RSC: "1" },
  });
  expect(await response.text()).not.toContain("A Reunião");
});

test("sessão válida do autor libera consulta; continua sem escrita HTTP", async ({
  request,
}) => {
  const headers = { Cookie: await authorCookie() };
  const response = await request.get(`${base}/studio`, { headers });
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain("A Reunião");
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(response.headers()["x-robots-tag"]).toContain("noindex");
  for (const route of ["/api/chapters", "/api/timeline"]) {
    expect(
      (
        await request.post(`${base}${route}`, {
          headers,
          data: { content: "não salvar" },
        })
      ).status(),
    ).toBe(405);
  }
});

test("entrada do Studio tem navegação própria e o portal continua público", async ({
  page,
}) => {
  await page.goto(`${base}/studio/entrar?error=AccessDenied`);
  await expect(
    page.getByRole("button", { name: "Entrar com GitHub" }),
  ).toBeVisible();
  await expect(page.locator('.notice[role="alert"]')).toContainText(
    "Não foi possível autorizar",
  );
  await expect(
    page.getByRole("navigation", { name: "Navegação principal" }),
  ).toHaveCount(0);
  await expect(page.locator(".reader-layout")).toHaveCount(0);
  await page.getByRole("link", { name: "Voltar ao portal público" }).click();
  await expect(
    page.getByRole("navigation", { name: "Navegação principal" }),
  ).toBeVisible();
  await page.goto(`${base}/historias/red-right-hand`);
  await expect(page.getByRole("link", { name: "Ver na Amazon" })).toBeVisible();
  await expect(page.locator(".inspector")).toHaveCount(0);
});

test("signout exige CSRF e encerra a sessão no cookie", async ({
  playwright,
}) => {
  const token = (await authorCookie()).split("=")[1];
  // Add a fixture session to the cookie jar; subsequent responses can clear it.
  const signedIn = await playwright.request.newContext({
    baseURL: base,
    storageState: {
      cookies: [
        {
          name: "__Secure-next-auth.session-token",
          value: token,
          domain: "127.0.0.1",
          path: "/",
          expires: -1,
          httpOnly: true,
          secure: true,
          sameSite: "Lax",
        },
      ],
      origins: [],
    },
  });
  const csrfResponse = await signedIn.get("/api/auth/csrf");
  expect((await signedIn.get("/studio", { maxRedirects: 0 })).status()).toBe(
    200,
  );
  const { csrfToken } = await csrfResponse.json();
  const invalid = await signedIn.post("/api/auth/signout", {
    form: { csrfToken: "inválido", json: "true" },
    maxRedirects: 0,
  });
  expect(invalid.headers()["set-cookie"] ?? "").not.toContain(
    "__Secure-next-auth.session-token=;",
  );
  const result = await signedIn.post("/api/auth/signout", {
    form: { csrfToken, json: "true" },
  });
  expect(result.headers()["set-cookie"]).toContain(
    "__Secure-next-auth.session-token=;",
  );
  expect((await signedIn.get("/studio", { maxRedirects: 0 })).status()).toBe(
    307,
  );
  await signedIn.dispose();
});

test("autor troca capítulo com foco no texto e encerra sessão pela interface", async ({
  page,
}) => {
  const token = (await authorCookie()).split("=")[1];
  await page.context().addCookies([
    {
      name: "__Secure-next-auth.session-token",
      value: token,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    },
  ]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/studio`);
  await expect(
    page.getByText("Sessão do autor · Consulta e revisão"),
  ).toBeVisible();
  await page.getByText("Sumário de capítulos", { exact: true }).click();
  await page
    .getByRole("button", {
      name: "Cap. 01 · Fundação e Recrutamento",
      exact: true,
    })
    .click();
  await expect(page.locator("article h1")).toContainText("01");
  await expect(page.locator(".reading-paper")).toBeFocused();
  await expect(
    page.locator(".reader-sidebar>details:first-child"),
  ).not.toHaveAttribute("open", "");
  await page.getByText("Ajustes de leitura", { exact: true }).click();
  await page.getByRole("button", { name: "Usar leitura noturna" }).click();
  await page.getByRole("slider").fill("24");
  await page
    .getByRole("button", { name: "Próximo capítulo →", exact: true })
    .click();
  await expect(page.locator(".reading-paper")).toHaveClass(/reader-night/);
  await expect(page.locator("article h1")).toContainText("02");
  await expect(page.getByRole("slider")).toHaveValue("24");
  await page.getByRole("button", { name: "Encerrar sessão" }).click();
  await expect(page).toHaveURL(/\/studio\/entrar$/);
  await page.goto(`${base}/studio`);
  await expect(page).toHaveURL(/\/studio\/entrar$/);
  await expect(page.locator(".reader-layout")).toHaveCount(0);
});

test("painel de personagens é privado e não entrega fichas por RSC sem autorização", async ({
  request,
}) => {
  for (const headers of [{}, { Cookie: await authorCookie("124") }] as Record<
    string,
    string
  >[]) {
    const response = await request.get(`${base}/studio/personagens`, {
      headers,
      maxRedirects: 0,
    });
    expect(response.status()).toBe(307);
    expect(response.headers().location).toBe("/studio/entrar");
  }
  const rsc = await request.get(`${base}/studio/personagens?_rsc=test`, {
    headers: { RSC: "1" },
  });
  expect(await rsc.text()).not.toContain("Fundador de Severum");
});

test("oficina cria ficha, consulta cânone e permite baixar/reabrir rascunhos sem publicá-los", async ({
  page,
  request,
}, testInfo) => {
  const { readFile } = await import("node:fs/promises");
  const canonBefore = await readFile("data/characters.json", "utf8");
  await page.context().addCookies([
    {
      name: "__Secure-next-auth.session-token",
      value: (await authorCookie()).split("=")[1],
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    },
  ]);
  await page.goto(`${base}/studio/personagens`);
  await page
    .getByLabel("Nome do personagem", { exact: true })
    .fill("Ficha de teste privada");
  await page.getByLabel("Escala", { exact: true }).selectOption("TERRA");
  await page
    .getByLabel("Quem é esse personagem?", { exact: true })
    .fill("Descrição de teste escrita pelo autor.");
  await expect(page.locator(".workshop-preview h2")).toHaveText(
    "Ficha de teste privada",
  );
  await page.getByRole("button", { name: "Motivações", exact: true }).click();
  await page
    .getByLabel("O que ele quer?", { exact: true })
    .fill("Desejo de teste");
  await page
    .getByLabel("O que o impede?", { exact: true })
    .fill("Conflito de teste");
  await page
    .getByRole("button", { name: "Poderes e arco", exact: true })
    .click();
  await page
    .getByLabel("Poderes e habilidades", { exact: true })
    .fill("Habilidade de teste\nOutra habilidade de teste");
  await page
    .getByLabel("Limites, custos e vulnerabilidades", { exact: true })
    .fill("Limite de teste");
  await expect(page.locator(".workshop-checklist h3")).toContainText("4/4");
  await page.getByRole("button", { name: /Cânone 21/ }).click();
  await page.getByRole("button", { name: /^Arner Red Right Hand$/ }).click();
  await expect(page.locator(".workshop-canonical")).toContainText(
    "Comandante-Geral",
  );
  await expect(
    page.getByRole("form", { name: "Rascunho de personagem" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: /Rascunhos 1/ }).click();
  await page.getByRole("button", { name: "Identidade", exact: true }).click();
  await expect(
    page.getByLabel("Nome do personagem", { exact: true }),
  ).toHaveValue("Ficha de teste privada");
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Baixar rascunhos", exact: true })
    .click();
  const download = await downloaded;
  const file = testInfo.outputPath("character-drafts.json");
  await download.saveAs(file);
  const workspace = JSON.parse(await readFile(file, "utf8"));
  expect(workspace.status).toBe("RASCUNHO");
  expect(workspace.drafts[0].nome).toBe("Ficha de teste privada");
  expect(workspace.drafts[0].poderes).toContain("Outra habilidade");
  await page.getByRole("link", { name: "Manuscrito", exact: true }).click();
  await expect(page).toHaveURL(/\/studio$/);
  await page.getByRole("link", { name: "Personagens", exact: true }).click();
  await page
    .getByLabel("Importar arquivo de rascunhos", { exact: true })
    .setInputFiles(file);
  await expect(
    page.getByLabel("Nome do personagem", { exact: true }),
  ).toHaveValue("Ficha de teste privada");
  expect(await readFile("data/characters.json", "utf8")).toBe(canonBefore);
  expect(await (await request.get("/codex")).text()).not.toContain(
    "Ficha de teste privada",
  );
});

test("oficina preserva alterações ao cancelar saída e rejeita importação inválida", async ({
  page,
}) => {
  await page.context().addCookies([
    {
      name: "__Secure-next-auth.session-token",
      value: (await authorCookie()).split("=")[1],
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    },
  ]);
  await page.goto(`${base}/studio/personagens`);
  await page
    .getByLabel("Nome do personagem", { exact: true })
    .fill("Não perder este rascunho");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("link", { name: "Manuscrito", exact: true }).click();
  await expect(page).toHaveURL(/\/studio\/personagens$/);
  await page
    .getByLabel("Importar arquivo de rascunhos", { exact: true })
    .setInputFiles({
      name: "invalido.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"status":"PUBLICO"}'),
    });
  await expect(page.locator('.workshop-error[role="alert"]')).toBeVisible();
  await expect(
    page.getByLabel("Nome do personagem", { exact: true }),
  ).toHaveValue("Não perder este rascunho");
  let dialogs = 0;
  page.on("dialog", async (dialog) => {
    dialogs += 1;
    await dialog.accept();
  });
  await page.getByRole("link", { name: "Manuscrito", exact: true }).click();
  await expect(page).toHaveURL(/\/studio$/);
  expect(dialogs).toBe(1);
});

test("oficina tem reflow móvel e acessibilidade automatizada", async ({
  page,
}, testInfo) => {
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  await page.context().addCookies([
    {
      name: "__Secure-next-auth.session-token",
      value: (await authorCookie()).split("=")[1],
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    },
  ]);
  await page.goto(`${base}/studio/personagens`);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
      String(width),
    ).toBeLessThanOrEqual(1);
  }
  await expect(
    page.getByRole("heading", {
      name: "Um personagem começa aqui.",
      exact: true,
    }),
  ).toBeVisible();
  const analysis = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    analysis.violations.map((violation) => ({
      id: violation.id,
      targets: violation.nodes.map((node) => node.target),
    })),
  ).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath("character-workshop-desktop.png"),
    fullPage: true,
  });
});

test("cronologia de trabalho e sua API exigem acesso do autor", async ({
  page,
  request,
}) => {
  const anonymous = await request.get(`${base}/api/timeline`);
  expect(anonymous.status()).toBe(401);
  expect(await anonymous.text()).not.toContain("erasCosmicas");
  expect(
    (
      await request.get(`${base}/studio/cronologia`, { maxRedirects: 0 })
    ).status(),
  ).toBe(307);
  const cookie = await authorCookie();
  const authorized = await request.get(`${base}/api/timeline`, {
    headers: { Cookie: cookie },
  });
  expect(authorized.status()).toBe(200);
  expect((await authorized.json()).erasCosmicas).toHaveLength(5);
  await page.context().addCookies([
    {
      name: "__Secure-next-auth.session-token",
      value: cookie.split("=")[1],
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    },
  ]);
  await page.goto(`${base}/studio/cronologia`);
  await expect(page.locator(".era-card")).toHaveCount(5);
  await page.getByRole("button", { name: "Cenas de Red Right Hand" }).click();
  await page.getByLabel("Estado da cena").selectOption("RASCUNHO");
  await page.getByLabel("Ponto de vista").selectOption("Deroo Da");
  await expect(
    page.getByRole("heading", { name: "Nenhuma cena encontrada." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Limpar filtros" }).click();
  await expect(page.locator(".scene-card")).toHaveCount(8);
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: () => Promise.reject(new Error("Denied")) },
      configurable: true,
    }),
  );
  await page
    .getByRole("button", { name: "Copiar prompt de revisão" })
    .first()
    .click();
  await expect(page.locator(".clipboard-feedback")).toContainText(
    "Não foi possível copiar",
  );
});
