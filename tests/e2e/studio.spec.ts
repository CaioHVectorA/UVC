import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { Pool } from "pg";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { studioTestEnv } from "../studio-fixture";
import {
  blankEntity,
  type StudioWorkspace,
  type StudioEntity,
} from "../../lib/workspace";
import assets from "../../data/studio-assets.json";
const base = "http://127.0.0.1:3101";
const origin = { Origin: base };
async function login(request: APIRequestContext) {
  const result = await request.post(`${base}/api/studio/session`, {
    headers: origin,
    data: { username: "admin", password: "admin" },
  });
  expect(result.status(), await result.text()).toBe(200);
}
async function loginPage(page: Page) {
  await login(page.request);
}
async function workspace(request: APIRequestContext) {
  return (await (
    await request.get(`${base}/api/studio/workspace`)
  ).json()) as StudioWorkspace;
}
async function put(request: APIRequestContext, entity: StudioEntity) {
  const payload = Object.fromEntries(
    Object.entries(entity).filter(([key]) => key !== "updatedAt"),
  );
  return request.put(`${base}/api/studio/entities`, {
    headers: origin,
    data: payload,
  });
}

test("login admin/admin cria sessão no banco; recusa credenciais erradas, CSRF e sessão forjada", async ({
  request,
}) => {
  expect(
    (await request.get(`${base}/studio`, { maxRedirects: 0 })).status(),
  ).toBe(307);
  expect((await request.get(`${base}/api/studio/workspace`)).status()).toBe(
    401,
  );
  expect(
    (
      await request.get(`${base}/api/studio/workspace`, {
        headers: { Cookie: "uvc-studio-session=" + "x".repeat(43) },
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await request.post(`${base}/api/studio/session`, {
        headers: { Origin: "https://outro.example" },
        data: { username: "admin", password: "admin" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post(`${base}/api/studio/session`, {
        headers: origin,
        data: { username: "admin", password: "errada" },
      })
    ).status(),
  ).toBe(401);
  const response = await request.post(`${base}/api/studio/session`, {
    headers: origin,
    data: { username: "admin", password: "admin" },
  });
  expect(response.status()).toBe(200);
  expect(response.headers()["set-cookie"]).toContain("HttpOnly");
  expect(response.headers()["set-cookie"]).toContain("SameSite=lax");
  const cookie = response.headers()["set-cookie"].split(";")[0];
  expect((await request.get(`${base}/studio`)).status()).toBe(200);
  expect(
    (
      await request.delete(`${base}/api/studio/session`, {
        headers: { Origin: "https://outro.example" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.delete(`${base}/api/studio/session`, { headers: origin })
    ).status(),
  ).toBe(200);
  expect(
    (
      await request.get(`${base}/api/studio/workspace`, {
        headers: { Cookie: cookie },
      })
    ).status(),
  ).toBe(401);
});

test("formulário de login entra com admin/admin sem depender do GitHub", async ({
  page,
}) => {
  await page.goto(`${base}/studio/entrar`);
  await page.getByLabel("Usuário", { exact: true }).fill("admin");
  await page.getByLabel("Senha", { exact: true }).fill("errada");
  await page
    .getByRole("button", { name: "Entrar no Studio", exact: true })
    .click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Usuário ou senha inválidos",
  );
  await page.getByLabel("Senha", { exact: true }).fill("admin");
  await page
    .getByRole("button", { name: "Entrar no Studio", exact: true })
    .click();
  await expect(page).toHaveURL(`${base}/studio`);
  await expect(page.locator(".db-editor")).toBeVisible();
});

test("sem DB, Studio informa conexão ausente e não finge autenticar ou salvar", async ({
  page,
  request,
}) => {
  await page.goto("/studio");
  await expect(page).toHaveURL(/\/studio\/entrar$/);
  await expect(page.locator("main")).toContainText("PostgreSQL");
  const response = await request.post("/api/studio/session", {
    headers: { Origin: "http://127.0.0.1:3100" },
    data: { username: "admin", password: "admin" },
  });
  expect(response.status()).toBe(503);
  expect((await request.get("/api/studio/workspace")).status()).toBe(401);
});

test("gravação PostgreSQL tem histórico e recusa versão antiga sem perder texto", async ({
  request,
}) => {
  await login(request);
  const entity = {
    ...blankEntity("concept"),
    title: "Conceito privado " + randomUUID(),
    body: "Primeira versão",
  };
  const created = await put(request, entity);
  expect(created.status()).toBe(200);
  const first = (await created.json()) as StudioEntity;
  expect(first.version).toBe(1);
  const updated = await put(request, {
    ...first,
    body: "Segunda versão persistida",
  });
  expect(updated.status()).toBe(200);
  expect((await updated.json()).version).toBe(2);
  expect(
    (await put(request, { ...first, body: "Não deve sobrescrever" })).status(),
  ).toBe(409);
  const pool = new Pool({ connectionString: studioTestEnv.DATABASE_URL });
  try {
    const result = await pool.query(
      "SELECT body,version FROM uvc_entities WHERE id=$1",
      [entity.id],
    );
    expect(result.rows[0]).toEqual({
      body: "Segunda versão persistida",
      version: 2,
    });
  } finally {
    await pool.end();
  }
  const history = await (
    await request.get(`${base}/api/studio/entities?id=${entity.id}`)
  ).json();
  expect(history[0].snapshot.body).toBe("Primeira versão");
  expect((await request.get(`${base}/conceitos/${entity.id}`)).status()).toBe(
    404,
  );
  expect(
    (
      await request.put(`${base}/api/studio/entities`, {
        headers: { Origin: "https://outro.example" },
        data: entity,
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.put(`${base}/api/studio/entities`, {
        headers: origin,
        data: { ...entity, publishNow: true },
      })
    ).status(),
  ).toBe(400);
});

test("edição de personagens persiste no banco e notas privadas não vazam no perfil público", async ({
  page,
  request,
}) => {
  const before = await readFile("data/characters.json", "utf8");
  await loginPage(page);
  await page.goto(`${base}/studio/personagens?id=cole-froz`);
  await page
    .getByLabel("Descrição e conteúdo", { exact: true })
    .fill("Descrição canônica de teste salva pelo autor.");
  await page
    .getByLabel("Notas privadas de trabalho", { exact: true })
    .fill("NOTA_INTERNA_NAO_PUBLICAR");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.locator(".workshop-feedback")).toContainText(
    "Salvo no PostgreSQL",
  );
  await page.reload();
  await expect(
    page.getByLabel("Descrição e conteúdo", { exact: true }),
  ).toHaveValue("Descrição canônica de teste salva pelo autor.");
  const profile = await request.get(`${base}/codex/cole-froz`);
  expect(profile.status()).toBe(200);
  const html = await profile.text();
  expect(html).toContain("Descrição canônica de teste salva pelo autor.");
  expect(html).not.toContain("NOTA_INTERNA_NAO_PUBLICAR");
  expect(await readFile("data/characters.json", "utf8")).toBe(before);
});

test("conceitos conectam-se a personagens no mapa e guardam o layout", async ({
  page,
}) => {
  await loginPage(page);
  await page.goto(`${base}/studio/conceitos?id=concept-planetas-cegos`);
  await page
    .getByLabel("Definição, regras e exemplos", { exact: true })
    .fill("Definição de trabalho preenchida pelo autor para o teste.");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.locator(".workshop-feedback")).toContainText(
    "Salvo no PostgreSQL",
  );
  await page.getByLabel("Conectar com", { exact: true }).selectOption("arner");
  await page.getByLabel("Relação", { exact: true }).fill("é estudado por");
  await page
    .getByRole("button", { name: "Criar vínculo", exact: true })
    .click();
  await expect(page.locator(".db-relation-list")).toContainText(
    "é estudado por",
  );
  await expect(
    page.locator('.react-flow__node[data-id="arner"]'),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Salvar layout", exact: true })
    .click();
  await expect(page.locator(".workshop-feedback")).toContainText(
    "Layout do mapa salvo",
  );
  await page.reload();
  await expect(page.locator(".db-relation-list")).toContainText(
    "é estudado por",
  );
  await page.locator('.react-flow__node[data-id="arner"]').click();
  await expect(page.getByLabel("Nome ou título", { exact: true })).toHaveValue(
    "Arner",
  );
});

test("galeria é visual: descrição e vínculos no DB, imagem privada protegida", async ({
  page,
  request,
}) => {
  const id = `visual-${assets[0].id}`;
  expect(
    (await request.get(`${base}/api/studio/assets/${assets[0].id}`)).status(),
  ).toBe(401);
  await loginPage(page);
  await page.goto(`${base}/studio/galeria?id=${id}`);
  await expect(page.locator(".db-visual-preview img")).toBeVisible();
  await page
    .getByLabel("Descrição visual", { exact: true })
    .fill("Referência visual: contraste de luzes e perspectiva urbana.");
  await page
    .getByLabel("Mostrar esta ficha no site público após salvar")
    .uncheck();
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.locator(".workshop-feedback")).toContainText(
    "Salvo no PostgreSQL",
  );
  await page.reload();
  await expect(
    page.getByLabel("Descrição visual", { exact: true }),
  ).toHaveValue("Referência visual: contraste de luzes e perspectiva urbana.");
  expect((await request.get(`${base}/api/public/visuals/${id}`)).status()).toBe(
    404,
  );
  const image = await page.request.get(
    `${base}/api/studio/assets/${assets[0].id}`,
  );
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toBe("image/webp");
});

test("evento e tarefa são editáveis e ligados à história", async ({ page }) => {
  await loginPage(page);
  await page.goto(`${base}/studio/cronologia`);
  await page.getByRole("button", { name: "Nova ficha", exact: true }).click();
  await page
    .getByLabel("Nome ou título", { exact: true })
    .fill("Evento de teste " + randomUUID());
  await page
    .getByLabel("Data, era ou referência temporal", { exact: true })
    .fill("Durante Marginal");
  await page.getByLabel("Ordem na cronologia", { exact: true }).fill("42");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.locator(".workshop-feedback")).toContainText(
    "Salvo no PostgreSQL",
  );
  await page
    .getByLabel("Conectar com", { exact: true })
    .selectOption("story-marginal");
  await page
    .getByRole("button", { name: "Criar vínculo", exact: true })
    .click();
  await expect(page.locator(".db-relation-list")).toContainText("Marginal");
  await page.getByRole("link", { name: "Tarefas", exact: true }).click();
  await page.getByRole("button", { name: "Nova ficha", exact: true }).click();
  await page
    .getByLabel("Nome ou título", { exact: true })
    .fill("Revisar cena de teste");
  await page.getByLabel("Estado", { exact: true }).selectOption("done");
  await page.getByLabel("Prioridade", { exact: true }).selectOption("high");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.locator(".workshop-feedback")).toContainText(
    "Salvo no PostgreSQL",
  );
});

test("importação de manuscrito preserva o original no DB e não o publica", async ({
  page,
  request,
}) => {
  await loginPage(page);
  await page.goto(`${base}/studio/manuscritos`);
  const content = "Manuscrito privado de teste.\nEste texto não é público.";
  await page.getByLabel("Importar manuscrito PDF ou texto").setInputFiles({
    name: "Texto privado de teste.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(content),
  });
  await expect(page.locator(".workshop-feedback")).toContainText(
    "Manuscrito importado no PostgreSQL",
  );
  await expect(
    page.getByLabel("Texto do manuscrito", { exact: true }),
  ).toHaveValue(content);
  const link = page.getByRole("link", { name: "Baixar documento original" });
  const url = await link.getAttribute("href");
  expect(url).toBeTruthy();
  expect((await request.get(base + url!)).status()).toBe(401);
  const original = await page.request.get(base + url!);
  expect(original.status()).toBe(200);
  expect(await original.text()).toBe(content);
  const all = await workspace(page.request);
  const document = all.entities.find(
    (e) => e.title === "Texto privado de teste",
  )!;
  expect(document.published).toBe(false);
  expect((await request.get(`${base}/conceitos/${document.id}`)).status()).toBe(
    404,
  );
});

test("rejeita vínculo inválido e duplicado sem corromper as fichas", async ({
  request,
}) => {
  await login(request);
  const data = {
    id: randomUUID(),
    sourceId: "arner",
    targetId: "concept-planetas-cegos",
    label: "teste de vínculo",
  };
  expect(
    (
      await request.post(`${base}/api/studio/relations`, {
        headers: origin,
        data,
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await request.post(`${base}/api/studio/relations`, {
        headers: origin,
        data: { ...data, id: randomUUID() },
      })
    ).ok(),
  ).toBe(false);
  expect(
    (
      await request.post(`${base}/api/studio/relations`, {
        headers: origin,
        data: { ...data, id: randomUUID(), targetId: "arner" },
      })
    ).status(),
  ).toBe(400);
  const all = await workspace(request);
  expect(all.entities.some((e) => e.id === "arner")).toBe(true);
  expect(
    all.relations.filter(
      (r) =>
        r.sourceId === data.sourceId &&
        r.targetId === data.targetId &&
        r.label === data.label,
    ),
  ).toHaveLength(1);
});

for (const route of [
  "/studio",
  "/studio/personagens",
  "/studio/galeria",
  "/studio/manuscritos",
])
  test(`reflow e acessibilidade do editor PostgreSQL ${route}`, async ({
    page,
  }, testInfo) => {
    await loginPage(page);
    await page.goto(base + route);
    await expect(page.locator(".db-editor")).toBeVisible();
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        ),
        String(width),
      ).toBeLessThanOrEqual(1);
    }
    if (route === "/studio") {
      await expect
        .poll(async () =>
          Math.round(
            (await page.locator(".react-flow__node").first().boundingBox())
              ?.width ?? 0,
          ),
        )
        .toBeGreaterThan(100);
      await page
        .getByRole("button", { name: "Expandir mapa", exact: true })
        .click();
      await expect(page.locator(".db-workbench")).toHaveClass(/map-wide/);
      await page
        .getByRole("button", { name: "Voltar ao editor", exact: true })
        .click();
    }
    const analysis = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      analysis.violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath("studio-db.png"),
      fullPage: true,
    });
  });

test("cancelar saída preserva edição e logout revoga a sessão", async ({
  page,
}) => {
  await loginPage(page);
  await page.goto(`${base}/studio/conceitos`);
  await page
    .getByLabel("Nome ou título", { exact: true })
    .fill("Texto ainda não salvo");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("link", { name: "Personagens", exact: true }).click();
  await expect(page).toHaveURL(/\/studio\/conceitos$/);
  await expect(page.getByLabel("Nome ou título", { exact: true })).toHaveValue(
    "Texto ainda não salvo",
  );
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Encerrar sessão", exact: true })
    .click();
  await expect(page).toHaveURL(/\/studio\/entrar$/);
  expect(
    (await page.request.get(`${base}/api/studio/workspace`)).status(),
  ).toBe(401);
});
