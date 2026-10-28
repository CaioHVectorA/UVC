import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import book from "../../books/red-right-hand/book.json";
import { stories, publishedStories } from "../../lib/catalog";
const paths = [
  "data/timeline.json",
  "data/characters.json",
  ...book.capitulos.map((chapter) => `books/red-right-hand/${chapter.arquivo}`),
];
async function snapshot() {
  return Promise.all(
    paths.map(async (path) =>
      createHash("sha256")
        .update(await readFile(path))
        .digest("hex"),
    ),
  );
}

test("escrita é rejeitada sem modificar cânone ou manuscritos", async ({
  request,
}) => {
  const before = await snapshot();
  for (const endpoint of ["/api/chapters", "/api/timeline"]) {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"])
      for (const data of [
        { chapterNumber: 0, content: "não salvar", erasCosmicas: [] },
        "{json inválido",
      ]) {
        const response = await request.fetch(endpoint, {
          method,
          data,
          headers: { Origin: "https://site-externo.example" },
        });
        expect(response.status()).toBe(405);
        expect(response.headers().allow).toBe("GET, HEAD, OPTIONS");
        expect(
          response.headers()["access-control-allow-origin"],
        ).toBeUndefined();
        expect((await response.json()).code).toBe("READ_ONLY");
      }
    expect(
      (await request.fetch(endpoint, { method: "OPTIONS" })).status(),
    ).toBe(204);
  }
  expect(await snapshot()).toEqual(before);
});

test("rascunhos não são leitura pública; consulta de capítulos rejeita entradas inválidas", async ({
  request,
}) => {
  for (const chapter of book.capitulos) {
    expect(
      (await request.get(`/api/chapters?num=${chapter.numero}`)).status(),
    ).toBe(404);
    expect((await request.get(`/ler/${chapter.numero}`)).status()).toBe(404);
  }
  for (const query of [
    "num=-1",
    "num=1.5",
    "num=",
    "num=../../etc/passwd",
    "num=1&num=2",
    "extra=1",
    "num=000",
    "num=Infinity",
  ])
    expect((await request.get(`/api/chapters?${query}`)).status()).toBe(400);
  const head = await request.head("/api/chapters?num=0");
  expect(head.status()).toBe(404);
  expect(await head.text()).toBe("");
  const timeline = await request.get("/api/timeline");
  expect(timeline.status()).toBe(401);
  expect(await timeline.text()).not.toContain("erasCosmicas");
});

test("vitrine só apresenta edição publicada e compra real, sem artes da galeria", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(page.locator(".published-book")).toHaveCount(1);
  await expect(page.locator("main")).toContainText("Red Right Hand");
  await expect(
    page.getByRole("link", { name: "Ver na Amazon" }),
  ).toHaveAttribute("href", /\/dp\/B0CLKRNS29$/);
  await expect(page.locator("main img")).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText("Congregadores");
  await expect(page.locator('a[href^="/ler/"]')).toHaveCount(0);
  await page.getByRole("link", { name: "Sobre o livro" }).click();
  await expect(page).toHaveURL(/\/historias\/red-right-hand$/);
  await expect(page.locator("main img")).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText("Em revisão");
  await page.goto("/");
  await page.screenshot({
    path: testInfo.outputPath("public-storefront.png"),
    fullPage: true,
  });
});

test("menu móvel, galeria separada e seleção pública de personagens", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
  await page
    .locator("#mobile-nav")
    .getByRole("link", { name: "Galeria", exact: true })
    .click();
  await expect(page).toHaveURL(/\/assets$/);
  await expect(
    page.getByRole("button", { name: "Abrir menu", exact: true }),
  ).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator(".gallery-item")).toHaveCount(12);
  await page.getByRole("combobox").selectOption("Cenários");
  await expect(page.locator(".gallery-item")).toHaveCount(2);
  await page.goto("/codex?equipe=Congregadores");
  await expect(page.locator(".character-card")).toHaveCount(3);
  await expect(page.locator("main img")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /Acervo completo/ }),
  ).toHaveCount(0);
  await page.getByRole("searchbox").fill("nada-encontrado-xyz");
  await expect(
    page.getByRole("heading", { name: "Nenhum personagem encontrado." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Limpar busca" }).click();
  await expect(page.locator(".character-card")).toHaveCount(3);
});

test("acesso ao Studio sem configuração permanece fechado", async ({
  page,
  request,
}) => {
  await page.goto("/studio");
  await expect(page).toHaveURL(/\/studio\/entrar$/);
  await expect(
    page.getByText("O acesso ao Studio ainda não foi configurado."),
  ).toBeVisible();
  await expect(page.locator(".reading-paper")).toHaveCount(0);
  expect((await request.get("/timeline")).url()).toContain("/studio/entrar");
});

test("menu fecha com Escape e mantém Livros como seção ativa", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/historias/red-right-hand");
  await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
  await expect(page.locator('#mobile-nav a[aria-current="page"]')).toHaveText(
    "Livros",
  );
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Abrir menu", exact: true }),
  ).toBeFocused();
  await expect(page.locator("#mobile-nav")).toHaveCount(0);
});

test("páginas e metadados de histórias não publicadas retornam 404", async ({
  request,
}) => {
  for (const story of stories)
    expect((await request.get(`/historias/${story.slug}`)).status()).toBe(
      publishedStories.some((entry) => entry.id === story.id) ? 200 : 404,
    );
  expect((await request.get("/historias/inexistente")).status()).toBe(404);
});

const publicRoutes = [
  "/",
  "/codex",
  "/assets",
  "/historias/red-right-hand",
  "/studio/entrar",
];
for (const width of [320, 390, 768, 1440])
  test(`reflow a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of publicRoutes) {
      await page.goto(route);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        ),
        route,
      ).toBeLessThanOrEqual(1);
    }
  });
for (const route of publicRoutes)
  test(`acessibilidade automatizada ${route}`, async ({ page }) => {
    await page.goto(route);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((violation) => ({
        id: violation.id,
        targets: violation.nodes.map((node) => node.target),
      })),
    ).toEqual([]);
  });
test("SEO e cabeçalhos de segurança respeitam os destinos publicados", async ({
  page,
  request,
}) => {
  const response = await request.get("/");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
  expect(response.headers()["x-powered-by"]).toBeUndefined();
  expect(await (await request.get("/robots.txt")).text()).toContain(
    "Disallow: /studio",
  );
  expect((await request.get("/sitemap.xml")).status()).toBe(200);
  await page.goto("/historias/red-right-hand");
  await expect(page).toHaveTitle(/Red Right Hand: Ascensão/);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    "Red Right Hand: Ascensão",
  );
});
