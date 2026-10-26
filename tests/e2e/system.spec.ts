import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import book from "../../books/red-right-hand/book.json";
import { stories } from "../../lib/catalog";

const paths = [
  "data/timeline.json",
  ...book.capitulos.map((c) => `books/red-right-hand/${c.arquivo}`),
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

test("escrita é rejeitada sem modificar arquivos ou declarar salvamento", async ({
  request,
}) => {
  const before = await snapshot();
  const timeline = await (await request.get("/api/timeline")).json();
  for (const endpoint of ["/api/chapters", "/api/timeline"]) {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
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
        const result = await response.json();
        expect(result.code).toBe("READ_ONLY");
        expect(result.success).toBeUndefined();
      }
    }
    const options = await request.fetch(endpoint, {
      method: "OPTIONS",
      headers: {
        Origin: "https://site-externo.example",
        "Access-Control-Request-Method": "POST",
      },
    });
    expect(options.status()).toBe(204);
    expect(options.headers()["access-control-allow-origin"]).toBeUndefined();
  }
  expect(await snapshot()).toEqual(before);
  expect(await (await request.get("/api/timeline")).json()).toEqual(timeline);
});

test("leitura exata do manifesto, HEAD e erros de entrada", async ({
  request,
}) => {
  for (const chapter of book.capitulos) {
    const response = await request.get(`/api/chapters?num=${chapter.numero}`);
    expect(response.status()).toBe(200);
    const value = await response.json();
    expect(value.chapter).toBe(chapter.arquivo.split("/").at(-1));
    expect(value.content).toBe(
      await readFile(`books/red-right-hand/${chapter.arquivo}`, "utf8"),
    );
  }
  expect((await request.get("/api/chapters?num=00")).status()).toBe(200);
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
    expect((await request.get("/api/chapters?" + query)).status()).toBe(400);
  expect((await request.get("/api/chapters?num=99")).status()).toBe(404);
  const head = await request.head("/api/chapters?num=0");
  expect(head.status()).toBe(200);
  expect(await head.text()).toBe("");
});

test("menu, filtros, spoilers e estado vazio funcionam no celular", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Fechar menu", exact: true }),
  ).toHaveAttribute("aria-expanded", "true");
  await page
    .locator("#mobile-nav")
    .getByRole("link", { name: "Personagens", exact: true })
    .click();
  await expect(page).toHaveURL(/\/codex$/);
  await expect(
    page.getByRole("button", { name: "Abrir menu", exact: true }),
  ).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator(".character-card")).toHaveCount(3);
  await page.getByRole("searchbox").fill("nada-encontrado-xyz");
  await expect(
    page.getByRole("heading", { name: "Nenhum personagem por aqui." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Limpar filtros" }).click();
  await page
    .getByRole("button", { name: "Acervo completo · spoilers" })
    .click();
  await expect(page.locator(".character-card")).toHaveCount(21);
  await page.getByRole("combobox").selectOption("TERRA");
  await expect(page.locator("#hades")).toBeVisible();
  await page.locator("#hades summary").click();
  await expect(page.locator("#hades details")).toHaveAttribute("open", "");
  await page.goto("/assets");
  await page.getByRole("combobox").selectOption("Cenários");
  await expect(page.locator(".gallery-item")).toHaveCount(2);
});

test("cronologia compartilha estados, filtra cenas e trata falha de clipboard", async ({
  page,
}) => {
  await page.goto("/timeline");
  await expect(
    page.getByRole("button", { name: "5 Eras Cósmicas", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
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

test("leitor renderiza Markdown no servidor e mantém controles de leitura", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const html = await (await request.get("/ler/0")).text();
  expect(html).toContain("<strong>Delimitador</strong>");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ler/0");
  await expect(page.locator(".reader-sidebar>details")).not.toHaveAttribute(
    "open",
    "",
  );
  await page.getByRole("button", { name: "Usar leitura noturna" }).click();
  await expect(page.locator(".reading-paper")).toHaveClass(/reader-night/);
  await page.getByRole("slider").fill("24");
  await expect(page.locator(".reading-paper")).toHaveCSS("font-size", "24px");
  await page
    .getByRole("link", { name: "Próximo capítulo", exact: true })
    .click();
  await expect(page).toHaveURL(/\/ler\/1$/);
  await expect(page.locator("article h1")).toContainText("01");
  await page
    .getByRole("link", { name: "Capítulo anterior", exact: true })
    .click();
  await expect(page).toHaveURL(/\/ler\/0$/);
  await page.goto("/studio");
  await expect(
    page.getByText(/Este espaço de revisão é público/),
  ).toBeVisible();
  await page.getByText("Sumário de capítulos", { exact: true }).click();
  await page.getByRole("button", { name: /02 ·/ }).click();
  await expect(page.locator("article h1")).toContainText("01");
  expect(errors).toEqual([]);
});

test("todas as histórias e capítulos têm destinos; inválidos retornam 404", async ({
  request,
}) => {
  for (const story of stories)
    expect((await request.get(`/historias/${story.slug}`)).status()).toBe(200);
  for (const chapter of book.capitulos)
    expect((await request.get(`/ler/${chapter.numero}`)).status()).toBe(200);
  for (const path of ["/historias/inexistente", "/ler/99"])
    expect((await request.get(path)).status()).toBe(404);
});

for (const width of [320, 390, 768, 1440])
  test(`reflow a ${width}px e tamanho-base de fonte ampliado`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of [
      "/",
      "/codex",
      "/assets",
      "/timeline",
      "/studio",
      "/ler/0",
    ]) {
      await page.goto(route);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        ),
        route,
      ).toBeLessThanOrEqual(1);
    }
    await page.goto("/");
    await page.evaluate(
      () => (document.documentElement.style.fontSize = "200%"),
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
  });

for (const route of [
  "/",
  "/codex",
  "/assets",
  "/timeline",
  "/studio",
  "/ler/0",
])
  test(`acessibilidade automatizada ${route}`, async ({ page }) => {
    await page.goto(route);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  });

test("metadados, SEO opcional e cabeçalhos de segurança", async ({
  page,
  request,
}) => {
  const response = await request.get("/");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
  expect(response.headers()["x-powered-by"]).toBeUndefined();
  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toContain("Disallow: /studio");
  expect((await request.get("/sitemap.xml")).status()).toBe(200);
  await page.goto("/historias/red-right-hand");
  await expect(page).toHaveTitle(/Red Right Hand/);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    "Red Right Hand",
  );
});
