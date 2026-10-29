import { test, expect, type APIRequestContext } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { docxFixture } from "../docx-fixture";
import type { DocxPreview } from "../../lib/docx-contract";
import type { StudioWorkspace } from "../../lib/workspace";
const base = "http://127.0.0.1:3101",
  headers = { Origin: base },
  mimeType =
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
async function login(request: APIRequestContext) {
  expect(
    (
      await request.post(base + "/api/studio/session", {
        headers,
        data: { username: "admin", password: "admin" },
      })
    ).status(),
  ).toBe(200);
}
async function all(request: APIRequestContext): Promise<StudioWorkspace> {
  return (await request.get(base + "/api/studio/workspace")).json();
}
async function preview(request: APIRequestContext, buffer: Buffer) {
  return request.post(base + "/api/studio/import/docx", {
    headers,
    multipart: {
      file: { name: "Autoria do Docs.docx", mimeType, buffer },
      action: "preview",
    },
  });
}
test("prévia DOCX é privada, não grava fichas e importação é atômica e idempotente", async ({
  request,
}) => {
  const buffer = await docxFixture();
  expect((await preview(request, buffer)).status()).toBe(401);
  await login(request);
  const before = await all(request);
  expect(
    (
      await request.post(base + "/api/studio/import/docx", {
        headers: { Origin: "https://outro.example" },
        multipart: {
          file: { name: "teste.docx", mimeType, buffer },
          action: "preview",
        },
      })
    ).status(),
  ).toBe(403);
  const p = await preview(request, buffer);
  expect(p.status(), await p.text()).toBe(200);
  expect(p.headers()["cache-control"]).toContain("no-store");
  const data = (await p.json()) as DocxPreview;
  expect((await all(request)).entities.length).toBe(before.entities.length);
  const multipart = {
    file: { name: "Autoria do Docs.docx", mimeType, buffer },
    action: "import",
    split: "h1",
    importId: data.importId,
    digest: data.digest,
    storyId: "story-marginal",
  };
  const rejected = await request.post(base + "/api/studio/import/docx", {
    headers,
    multipart: { ...multipart, storyId: "story-inexistente" },
  });
  expect(rejected.status()).toBe(400);
  expect((await all(request)).entities.length).toBe(before.entities.length);
  const [r1, r2] = await Promise.all([
    request.post(base + "/api/studio/import/docx", { headers, multipart }),
    request.post(base + "/api/studio/import/docx", { headers, multipart }),
  ]);
  expect(r1.status(), await r1.text()).toBe(200);
  expect(r2.status()).toBe(200);
  expect(await r1.json()).toEqual(await r2.json());
  const result = await r1.json(),
    after = await all(request);
  expect(after.entities.length).toBe(before.entities.length + 4);
  expect(result.chapterIds).toHaveLength(3);
  const source = after.entities.find((e) => e.id === result.sourceId)!;
  expect(source.published).toBe(false);
  expect(source.attributes.importedIds).toEqual(result.chapterIds);
  const original = await request.get(
    base + "/api/studio/files/" + source.attributes.sourceFileId,
  );
  expect(original.status()).toBe(200);
  expect(original.headers()["content-type"]).toBe(mimeType);
  expect(await original.body()).toEqual(buffer);
  expect(
    after.entities
      .filter((e) => result.chapterIds.includes(e.id))
      .every((e) => !e.published && e.attributes.storyId === "story-marginal"),
  ).toBe(true);
});
test("DOCX entra pela mesa de escrita com prévia acessível, capítulos e formatação editáveis", async ({
  page,
}, info) => {
  await login(page.request);
  await page.goto(base + "/studio/manuscritos");
  await page
    .getByLabel("Projeto", { exact: true })
    .selectOption("story-ciecon");
  const buffer = await docxFixture({ extras: true }),
    before = (await all(page.request)).entities.length;
  await page
    .getByLabel("Importar manuscrito PDF, DOCX ou texto")
    .setInputFiles({ name: "Autoria do Docs.docx", mimeType, buffer });
  const dialog = page.getByRole("dialog", { name: "Importar DOCX" });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "Serão criados 3 textos" }),
  ).toBeVisible();
  expect((await all(page.request)).entities.length).toBe(before);
  await dialog.getByLabel("Organizar como").selectOption("none");
  await expect(
    dialog.getByRole("heading", { name: "Será criado 1 texto" }),
  ).toBeVisible();
  await dialog.getByLabel("Organizar como").selectOption("h1");
  await dialog.locator("summary").click();
  await expect(dialog).toContainText("Imagens permanecem");
  await expect(dialog).toContainText("Tabelas foram convertidas");
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await dialog.evaluate((e) => e.scrollWidth - e.clientWidth),
    ).toBeLessThanOrEqual(1);
  }
  const axe = await new AxeBuilder({ page })
    .include(".docx-dialog")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    axe.violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page.screenshot({
    path: info.outputPath("docx-preview.png"),
    fullPage: true,
  });
  await dialog
    .getByRole("button", { name: "Importar para o Studio", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await expect(page.locator(".writing-message")).toContainText(
    "DOCX importado",
  );
  await page.getByRole("button", { name: /^Capítulo Um / }).click();
  const editor = page.getByRole("textbox", {
    name: "Texto do manuscrito",
    exact: true,
  });
  await expect(editor.locator("strong")).toHaveText("Trecho em negrito.");
  await expect(editor.locator("em")).toHaveText("Trecho em itálico.");
  await expect(editor.locator("h1")).toHaveText("Capítulo Um");
  const originalLink = page.getByRole("link", {
    name: "Baixar documento original",
    exact: true,
  });
  expect(await originalLink.getAttribute("href")).toBeTruthy();
  await editor.fill("Texto importado e editado na plataforma.");
  await expect(page.locator(".writing-save-state")).toContainText(
    "Salvo na nuvem",
  );
  await page.reload();
  await expect(editor).toHaveText("Texto importado e editado na plataforma.");
  const download = await page.request.get(
    base + (await originalLink.getAttribute("href")),
  );
  expect(await download.body()).toEqual(buffer);
});
test("cancelar prévia não cria conteúdo e arquivo alterado não passa pela confirmação", async ({
  page,
}) => {
  await login(page.request);
  await page.goto(base + "/studio/manuscritos");
  const buffer = await docxFixture(),
    before = (await all(page.request)).entities.length;
  await page
    .getByLabel("Importar manuscrito PDF, DOCX ou texto")
    .setInputFiles({ name: "Cancelar.docx", mimeType, buffer });
  const dialog = page.getByRole("dialog", { name: "Importar DOCX" });
  await expect(
    dialog.getByRole("button", { name: "Importar para o Studio" }),
  ).toBeEnabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  expect((await all(page.request)).entities.length).toBe(before);
  const p = (await (await preview(page.request, buffer)).json()) as DocxPreview;
  const altered = await page.request.post(base + "/api/studio/import/docx", {
    headers,
    multipart: {
      file: {
        name: "Outro.docx",
        mimeType,
        buffer: await docxFixture({ plain: true }),
      },
      action: "import",
      split: "none",
      storyId: "story-marginal",
      importId: p.importId,
      digest: p.digest,
    },
  });
  expect(altered.status()).toBe(400);
  expect((await all(page.request)).entities.length).toBe(before);
});
