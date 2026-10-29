import {
  test,
  expect,
  type Page,
  type APIRequestContext,
} from "@playwright/test";
import { randomUUID } from "node:crypto";
import {
  blankEntity,
  type StudioEntity,
  type StudioWorkspace,
} from "../../lib/workspace";
const base = "http://127.0.0.1:3101",
  headers = { Origin: base };
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
async function seed(request: APIRequestContext) {
  await login(request);
  const entity = {
    ...blankEntity("document"),
    title: "Escrita " + randomUUID().slice(0, 8),
    body: "Primeira linha.\nSegunda linha.",
    attributes: {
      storyId: "story-marginal",
      writingType: "chapter",
      writingOrder: 1000,
    },
  };
  const r = await request.put(base + "/api/studio/entities", {
    headers,
    data: entity,
  });
  expect(r.status()).toBe(200);
  return (await r.json()) as StudioEntity;
}
const text = (page: Page) =>
  page.getByRole("textbox", { name: "Texto do manuscrito", exact: true });
test("editor preserva fonte ao abrir, salva formatação, sinopse e cena no projeto", async ({
  page,
}, info) => {
  const entity = await seed(page.request);
  await page.goto(base + "/studio/manuscritos?id=" + entity.id);
  await expect(text(page)).toContainText("Primeira linha.");
  expect(
    (await all(page.request)).entities.find((e) => e.id === entity.id)?.version,
  ).toBe(1);
  await text(page).fill("Uma cena com voz própria.");
  await text(page).press("ControlOrMeta+a");
  await page.getByRole("button", { name: "Negrito", exact: true }).click();
  await page.getByLabel("Sinopse").fill("O conflito começa aqui.");
  await page.getByLabel("Notas de escrita").fill("Rever o ponto de vista.");
  await expect(page.locator(".writing-save-state")).toContainText(
    "Salvo na nuvem",
  );
  const saved = (await all(page.request)).entities.find(
    (e) => e.id === entity.id,
  )!;
  expect(saved.body).toBe("Uma cena com voz própria.");
  expect(JSON.stringify(saved.attributes.richText)).toContain('"bold"');
  expect(saved.summary).toBe("O conflito começa aqui.");
  await page.getByRole("button", { name: "Cena", exact: true }).click();
  await expect(page.getByLabel("Título do texto")).toHaveValue(/Cena/);
  const childTitle = await page.getByLabel("Título do texto").inputValue();
  await text(page).fill("A segunda cena está viva.");
  await page
    .getByRole("button", { name: new RegExp(entity.title) })
    .first()
    .click();
  await expect(page.getByLabel("Título do texto")).toHaveValue(entity.title);
  const child = (await all(page.request)).entities.find(
    (e) => e.title === childTitle && e.attributes.writingParentId === entity.id,
  )!;
  expect(child.body).toBe("A segunda cena está viva.");
  expect(child.attributes.storyId).toBe("story-marginal");
  expect(child.published).toBe(false);
  await page.reload();
  await expect(text(page)).toContainText(saved.body);
  await expect(text(page).locator("strong")).toHaveText(saved.body);
  await page.getByRole("tab", { name: "Referências", exact: true }).click();
  await page.getByLabel("Buscar referência").fill("Arner");
  await page
    .getByRole("button", { name: "Personagens Arner", exact: true })
    .click();
  await expect(page.locator(".writing-reference")).toContainText("Arner");
  await page
    .getByRole("button", { name: "Vincular ao texto", exact: true })
    .click();
  await expect(page.locator(".writing-reference")).toContainText(
    "Ligada a este texto",
  );
  await page.getByRole("button", { name: "Foco", exact: true }).click();
  await expect(page.locator(".writing-desk")).toHaveClass(/is-focused/);
  await expect(page.locator(".studio-header")).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(page.locator(".writing-desk")).not.toHaveClass(/is-focused/);
  await page.screenshot({
    path: info.outputPath("writing-desk.png"),
    fullPage: true,
  });
});
test("digitação durante uma gravação lenta não é perdida e a próxima gravação usa a versão nova", async ({
  page,
}) => {
  const entity = await seed(page.request);
  await page.goto(base + "/studio/manuscritos?id=" + entity.id);
  await expect(text(page)).toBeVisible();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  let first = true;
  await page.route("**/api/studio/entities", async (route) => {
    if (route.request().method() === "PUT" && first) {
      first = false;
      await gate;
    }
    await route.continue();
  });
  await text(page).fill("Primeiro envio.");
  await expect(page.locator(".writing-save-state")).toContainText("Salvando");
  await text(page).fill("Continuei escrevendo durante o envio.");
  release();
  await expect(page.locator(".writing-save-state")).toContainText(
    "Salvo na nuvem",
  );
  expect(
    (await all(page.request)).entities.find((e) => e.id === entity.id)?.body,
  ).toBe("Continuei escrevendo durante o envio.");
  await expect(text(page)).toHaveText("Continuei escrevendo durante o envio.");
});
test("um conflito com outro cliente mantém o texto e bloqueia a troca de cena", async ({
  page,
  browser,
}) => {
  const entity = await seed(page.request);
  await page.goto(base + "/studio/manuscritos?id=" + entity.id);
  await expect(text(page)).toBeVisible();
  const other = await browser.newContext();
  await login(other.request);
  const payload = Object.fromEntries(
    Object.entries(entity).filter(([key]) => key !== "updatedAt"),
  );
  expect(
    (
      await other.request.put(base + "/api/studio/entities", {
        headers,
        data: { ...payload, body: "Versão de outro cliente" },
      })
    ).status(),
  ).toBe(200);
  await text(page).fill("Meu texto local permanece aqui.");
  await expect(page.locator(".writing-error")).toContainText(
    "Outra versão foi salva",
  );
  await expect(text(page)).toHaveText("Meu texto local permanece aqui.");
  await page.getByRole("button", { name: "Cena", exact: true }).click();
  await expect(page.getByLabel("Título do texto")).toHaveValue(entity.title);
  expect(
    (await all(other.request)).entities.find((e) => e.id === entity.id)?.body,
  ).toBe("Versão de outro cliente");
  await other.close();
});
test("falha de rede mantém rascunho e permite salvar quando a conexão volta", async ({
  page,
}) => {
  const entity = await seed(page.request);
  await page.goto(base + "/studio/manuscritos?id=" + entity.id);
  await expect(text(page)).toBeVisible();
  await page.route("**/api/studio/entities", (route) =>
    route.request().method() === "PUT" ? route.abort() : route.continue(),
  );
  await text(page).fill("Rascunho durante a falha de rede.");
  await expect(page.locator(".writing-error")).toContainText("Sem conexão");
  await expect(text(page)).toHaveText("Rascunho durante a falha de rede.");
  await page.unroute("**/api/studio/entities");
  await page
    .getByRole("button", { name: "Salvar manuscrito", exact: true })
    .click();
  await expect(page.locator(".writing-save-state")).toContainText(
    "Salvo na nuvem",
  );
  expect(
    (await all(page.request)).entities.find((e) => e.id === entity.id)?.body,
  ).toBe("Rascunho durante a falha de rede.");
});

test("servidor recusa cena em outro projeto e publicação de manuscrito; texto simples não reabre formatação antiga", async ({
  request,
}) => {
  const chapter = await seed(request);
  const scene = {
    ...blankEntity("document"),
    title: "Cena de validação",
    attributes: {
      storyId: "story-marginal",
      writingType: "scene",
      writingParentId: "document-rrh-0",
    },
  };
  expect(
    (
      await request.put(base + "/api/studio/entities", { headers, data: scene })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.put(base + "/api/studio/entities", {
        headers,
        data: {
          ...scene,
          published: true,
          attributes: { storyId: "story-marginal" },
        },
      })
    ).status(),
  ).toBe(400);
  const payload = Object.fromEntries(
    Object.entries(chapter).filter(([key]) => key !== "updatedAt"),
  );
  const formatted = await request.put(base + "/api/studio/entities", {
    headers,
    data: {
      ...payload,
      attributes: {
        ...chapter.attributes,
        richText: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: chapter.body }],
            },
          ],
        },
      },
    },
  });
  expect(formatted.status()).toBe(200);
  const current = await formatted.json();
  delete current.updatedAt;
  const plain = await request.put(base + "/api/studio/entities", {
    headers,
    data: { ...current, body: "Edição pelo catálogo simples." },
  });
  expect(plain.status()).toBe(200);
  expect((await plain.json()).attributes.richText).toBeUndefined();
});

test("restaurar uma versão conserva a edição anterior no histórico", async ({
  page,
}) => {
  const entity = await seed(page.request);
  await page.goto(base + "/studio/manuscritos?id=" + entity.id);
  await expect(text(page)).toBeVisible();
  await text(page).fill("Redação antes da restauração.");
  await expect(page.locator(".writing-save-state")).toContainText(
    "Salvo na nuvem",
  );
  await page
    .getByRole("tab", { name: "Histórico do manuscrito", exact: true })
    .click();
  await page.getByText(/^Versão 1 ·/).click();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Restaurar versão 1", exact: true })
    .click();
  await expect(text(page)).toContainText("Primeira linha.");
  await expect(page.locator(".writing-save-state")).toContainText(
    "Salvo na nuvem",
  );
  const saved = (await all(page.request)).entities.find(
    (e) => e.id === entity.id,
  )!;
  expect(saved.body).toBe(entity.body);
  expect(saved.version).toBeGreaterThan(2);
  const history = await (
    await page.request.get(base + "/api/studio/entities?id=" + entity.id)
  ).json();
  expect(
    history.some(
      (r: { snapshot: StudioEntity }) =>
        r.snapshot.body === "Redação antes da restauração.",
    ),
  ).toBe(true);
});
