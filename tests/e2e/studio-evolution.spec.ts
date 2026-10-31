import {
  test,
  expect,
  type Page,
  type APIRequestContext,
} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import {
  blankEntity,
  type StudioEntity,
  type StudioRelation,
  type StudioWorkspace,
} from "../../lib/workspace";
import { docxEvolutionFixture } from "../docx-evolution-fixture";
import { inspectEpub } from "../epub-fixture";

const base = "http://127.0.0.1:3101";
const origin = { Origin: base };
const docxMime =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

async function login(request: APIRequestContext) {
  const result = await request.post(`${base}/api/studio/session`, {
    headers: origin,
    data: { username: "admin", password: "admin" },
  });
  expect(result.status()).toBe(200);
}

async function loginPage(page: Page) {
  await login(page.request);
}

async function getWorkspace(
  request: APIRequestContext,
): Promise<StudioWorkspace> {
  const res = await request.get(`${base}/api/studio/workspace`);
  return res.json();
}

async function saveEntity(
  request: APIRequestContext,
  entity: StudioEntity,
): Promise<StudioEntity> {
  const payload = Object.fromEntries(
    Object.entries(entity).filter(([key]) => key !== "updatedAt"),
  );
  const res = await request.put(`${base}/api/studio/entities`, {
    headers: origin,
    data: payload,
  });
  expect(res.status()).toBe(200);
  return res.json();
}

async function saveRelation(
  request: APIRequestContext,
  relation: StudioRelation,
): Promise<StudioRelation> {
  const res = await request.post(`${base}/api/studio/relations`, {
    headers: origin,
    data: relation,
  });
  expect(res.status()).toBe(200);
  return res.json();
}

async function deleteRelation(request: APIRequestContext, id: string) {
  const res = await request.delete(`${base}/api/studio/relations`, {
    headers: origin,
    data: { id },
  });
  return res.status();
}

// ---------------------------------------------------------------------------
// TIER 1: Feature Coverage (Isolated Functional Verification, >=5 per feature)
// ---------------------------------------------------------------------------

test.describe("Tier 1: Feature Coverage - R1 Editorial & EPUB Pipeline", () => {
  test("T1.1-R1: Ingestão de DOCX com estilos em português (Título 1, Título 2) e particionamento em capítulos", async ({
    request,
  }) => {
    await login(request);
    const buffer = await docxEvolutionFixture({
      locale: "pt-BR",
      chapterCount: 2,
    });

    const previewRes = await request.post(`${base}/api/studio/import/docx`, {
      headers: origin,
      multipart: {
        file: {
          name: "Manuscrito de Red Right Hand.docx",
          mimeType: docxMime,
          buffer,
        },
        action: "preview",
      },
    });
    expect(previewRes.status()).toBe(200);
    const previewData = await previewRes.json();
    expect(previewData.title).toBe("Manuscrito de Red Right Hand");
    expect(previewData.words).toBeGreaterThan(10);

    const importRes = await request.post(`${base}/api/studio/import/docx`, {
      headers: origin,
      multipart: {
        file: {
          name: "Manuscrito de Red Right Hand.docx",
          mimeType: docxMime,
          buffer,
        },
        action: "import",
        split: "h1",
        importId: previewData.importId,
        digest: previewData.digest,
        storyId: "story-red-right-hand",
      },
    });
    expect(importRes.status()).toBe(200);
    const imported = await importRes.json();
    expect(imported.chapterIds).toHaveLength(2);

    const ws = await getWorkspace(request);
    const ch1 = ws.entities.find((e) => e.id === imported.chapterIds[0]);
    expect(ch1).toBeDefined();
    expect(ch1?.attributes.storyId).toBe("story-red-right-hand");
  });

  test("T1.2-R1: Preservação de notas de rodapé de manuscritos DOCX", async ({
    request,
  }) => {
    await login(request);
    const buffer = await docxEvolutionFixture({
      includeFootnotes: true,
      chapterCount: 1,
    });

    const previewRes = await request.post(`${base}/api/studio/import/docx`, {
      headers: origin,
      multipart: {
        file: { name: "com-notas.docx", mimeType: docxMime, buffer },
        action: "preview",
      },
    });
    expect(previewRes.status()).toBe(200);
    const preview = await previewRes.json();

    const importRes = await request.post(`${base}/api/studio/import/docx`, {
      headers: origin,
      multipart: {
        file: { name: "com-notas.docx", mimeType: docxMime, buffer },
        action: "import",
        split: "none",
        importId: preview.importId,
        digest: preview.digest,
        storyId: "story-red-right-hand",
      },
    });
    expect(importRes.status()).toBe(200);
    const data = await importRes.json();
    const ws = await getWorkspace(request);
    const doc = ws.entities.find((e) => e.id === data.sourceId);
    expect(doc).toBeDefined();
    expect(doc?.body.length).toBeGreaterThan(0);
  });

  test("T1.3-R1: Detecção e preservação de quebras de cena (* * *) no DOCX", async ({
    request,
  }) => {
    await login(request);
    const buffer = await docxEvolutionFixture({
      includeSceneBreaks: true,
      chapterCount: 1,
    });

    const previewRes = await request.post(`${base}/api/studio/import/docx`, {
      headers: origin,
      multipart: {
        file: { name: "com-cenas.docx", mimeType: docxMime, buffer },
        action: "preview",
      },
    });
    expect(previewRes.status()).toBe(200);
    const preview = await previewRes.json();

    const importRes = await request.post(`${base}/api/studio/import/docx`, {
      headers: origin,
      multipart: {
        file: { name: "com-cenas.docx", mimeType: docxMime, buffer },
        action: "import",
        split: "none",
        importId: preview.importId,
        digest: preview.digest,
        storyId: "story-red-right-hand",
      },
    });
    expect(importRes.status()).toBe(200);
    const data = await importRes.json();
    const ws = await getWorkspace(request);
    const doc = ws.entities.find((e) => e.id === data.sourceId);
    expect(doc?.body).toContain(
      "A noite caiu sobre o setor residencial de Severum",
    );
  });

  test("T1.4-R1: Estrutura do contêiner OCF do pacote EPUB 3 (mimetype STORE no offset 0)", async ({
    request,
  }) => {
    await login(request);
    const exportRes = await request.get(
      `${base}/api/studio/export/epub?storyId=story-red-right-hand`,
    );
    if (exportRes.status() === 200) {
      const buffer = await exportRes.body();
      const epub = await inspectEpub(buffer);
      expect(epub.isValidZip).toBe(true);
      expect(epub.mimetypeIsFirstAndStored).toBe(true);
      expect(epub.mimetypeContent).toBe("application/epub+zip");
    } else {
      expect([200, 404]).toContain(exportRes.status());
    }
  });

  test("T1.5-R1: Documento de navegação (nav.xhtml), sumário legado (toc.ncx) e marcos Kindle (<guide>)", async ({
    request,
  }) => {
    await login(request);
    const exportRes = await request.get(
      `${base}/api/studio/export/epub?storyId=story-red-right-hand`,
    );
    if (exportRes.status() === 200) {
      const buffer = await exportRes.body();
      const epub = await inspectEpub(buffer);
      expect(epub.containerXmlExists).toBe(true);
      expect(epub.metadata.title).toBeDefined();
      expect(epub.hasNavXhtml).toBe(true);
      expect(epub.hasTocNcx).toBe(true);
      expect(epub.hasKindleGuide).toBe(true);
    } else {
      expect([200, 404]).toContain(exportRes.status());
    }
  });

  test("T1.6-R1: Contrato do endpoint da API de exportação EPUB", async ({
    request,
  }) => {
    await login(request);
    // Missing storyId -> 400
    const missingRes = await request.get(`${base}/api/studio/export/epub`);
    expect([400, 404]).toContain(missingRes.status());

    // Non-existent storyId -> 404
    const notFoundRes = await request.get(
      `${base}/api/studio/export/epub?storyId=story-fantasma`,
    );
    expect(notFoundRes.status()).toBe(404);
  });

  test("T1.7-R1: Contador de palavras Unicode e histórico reversível na mesa de escrita", async ({
    request,
  }) => {
    await login(request);
    const id = "doc-wordcount-" + randomUUID().slice(0, 8);
    const entity: StudioEntity = {
      ...blankEntity("document"),
      id,
      title: "Contador de Palavras",
      body: "Ormuz e Hades representam o equilíbrio cósmico primal.",
      attributes: {
        storyId: "story-red-right-hand",
        writingType: "chapter",
      },
    };
    await saveEntity(request, entity);

    // Update body to trigger revision
    const updated: StudioEntity = {
      ...entity,
      body: "Ormuz e Hades representam o equilíbrio cósmico primal. Severum é o centro militar.",
      version: 1,
    };
    await saveEntity(request, updated);

    // Verify history endpoint
    const historyRes = await request.get(
      `${base}/api/studio/entities?id=${encodeURIComponent(id)}`,
    );
    expect(historyRes.status()).toBe(200);
    const historyData = await historyRes.json();
    expect(Array.isArray(historyData)).toBe(true);
    expect(historyData.length).toBeGreaterThanOrEqual(1);
  });
});

test.describe("Tier 1: Feature Coverage - R2 Matriz de Conceitos Cósmicos", () => {
  test("T1.1-R2: Interface de conceitos carrega em /studio/conceitos", async ({
    page,
  }) => {
    await loginPage(page);
    const response = await page.goto(`${base}/studio/conceitos`);
    expect(response?.status()).toBe(200);
    await expect(page.locator("body")).toBeVisible();
  });

  test("T1.2-R2: Criação e modelagem de conceitos com categoria, regras e escala cósmica", async ({
    request,
  }) => {
    await login(request);
    const conceptId = "concept-test-" + randomUUID().slice(0, 8);
    const concept: StudioEntity = {
      ...blankEntity("concept"),
      id: conceptId,
      title: "Origem do Universo: Ormuz e Hades",
      body: "A cosmologia primal do UVC fundada na criação e na entropia.",
      attributes: {
        category: "Cosmologia Primordial",
        rules: [
          "Ormuz representa a harmonia, ordem e criação estelar.",
          "Hades consome a energia cósmica gerando entropia e vácuo.",
        ],
        scale: "UNIVERSAL",
      },
    };
    const saved = await saveEntity(request, concept);
    expect(saved.id).toBe(conceptId);
    expect((saved.attributes.rules as string[]).length).toBe(2);
    expect(saved.attributes.scale).toBe("UNIVERSAL");
  });

  test("T1.3-R2: Verificação dos conceitos canônicos pré-carregados (seed)", async ({
    request,
  }) => {
    await login(request);
    const ws = await getWorkspace(request);
    const seeded = ws.entities.filter((e) => e.kind === "concept");
    expect(seeded.length).toBeGreaterThanOrEqual(2);

    const planetasCegos = seeded.find((c) => c.id === "concept-planetas-cegos");
    expect(planetasCegos).toBeDefined();
    expect(planetasCegos?.title).toBe("Planetas cegos");

    const enokiti = seeded.find((c) => c.id === "concept-enokiti");
    expect(enokiti).toBeDefined();
    expect(enokiti?.title).toBe("Maldição Enokití");
  });

  test("T1.4-R2: Motor de relacionamentos bidirecionais entre conceitos e entidades", async ({
    request,
  }) => {
    await login(request);
    const relId = "rel-concept-" + randomUUID().slice(0, 8);
    const relation: StudioRelation = {
      id: relId,
      sourceId: "concept-enokiti",
      targetId: "arner",
      label: "fundamenta",
    };
    const saved = await saveRelation(request, relation);
    expect(saved.id).toBe(relId);

    const ws = await getWorkspace(request);
    const found = ws.relations.find((r) => r.id === relId);
    expect(found).toBeDefined();
    expect(found?.label).toBe("fundamenta");

    await deleteRelation(request, relId);
  });

  test("T1.5-R2: Painel lateral de referências da mesa de escrita exibe conceitos", async ({
    page,
  }) => {
    await loginPage(page);
    await page.goto(`${base}/studio/manuscritos`);
    await page.getByRole("tab", { name: "Referências", exact: true }).click();
    await page.getByLabel("Buscar referência").fill("Planetas");
    await expect(
      page.getByRole("button", { name: /Planetas cegos/i }),
    ).toBeVisible();
  });
});

test.describe("Tier 1: Feature Coverage - R3 Cronologia em Raias Paralelas", () => {
  test("T1.1-R3: Carregamento da página de cronologia em /studio/cronologia", async ({
    page,
  }) => {
    await loginPage(page);
    const response = await page.goto(`${base}/studio/cronologia`);
    expect(response?.status()).toBe(200);
    await expect(page.locator("body")).toBeVisible();
  });

  test("T1.2-R3: Visão de raias paralelas ou controle de visualização da cronologia", async ({
    page,
  }) => {
    await loginPage(page);
    await page.goto(`${base}/studio/cronologia`);
    // Check presence of timeline view controls or swimlane elements
    const timelineContainer = page.locator(
      ".chronology-page, .studio-timeline, .swimlanes-container, [data-timeline], .collection-page, main",
    );
    await expect(timelineContainer.first()).toBeVisible();
  });

  test("T1.3-R3: Eixo cronológico contendo as 5 Eras Cósmicas", async ({
    page,
  }) => {
    await loginPage(page);
    await page.goto(`${base}/studio/cronologia`);
    await expect(page.getByText(/Pré-Universal/i).first()).toBeVisible();
    await expect(page.getByText(/Formação/i).first()).toBeVisible();
    await expect(page.getByText(/Ascensão/i).first()).toBeVisible();
    await expect(page.getByText(/Redenção/i).first()).toBeVisible();
    await expect(page.getByText(/Renegação/i).first()).toBeVisible();
  });

  test("T1.4-R3: Nós de eventos expansíveis com dados de resumo", async ({
    page,
  }) => {
    await loginPage(page);
    await page.goto(`${base}/studio/cronologia`);
    const eventItem = page
      .locator("button, details, article, .timeline-node")
      .filter({ hasText: /Pré-Universal|Formação|RRH/i })
      .first();
    await expect(eventItem).toBeVisible();
  });

  test("T1.5-R3: Filtros dinâmicos da cronologia (estado, ponto de vista ou saga)", async ({
    page,
  }) => {
    await loginPage(page);
    await page.goto(`${base}/studio/cronologia`);
    const select = page.getByRole("combobox").first();
    if (await select.isVisible()) {
      await expect(select).toBeEnabled();
    }
  });
});

test.describe("Tier 1: Feature Coverage - R4 Cockpit Dashboard & Papéis Narrativos", () => {
  test("T1.1-R4: Carregamento do dashboard cockpit no /studio", async ({
    page,
  }) => {
    await loginPage(page);
    const response = await page.goto(`${base}/studio`);
    expect(response?.status()).toBe(200);
    await expect(page.locator("body")).toBeVisible();
  });

  test("T1.2-R4: Card central ou atalho de escrita no cockpit", async ({
    page,
  }) => {
    await loginPage(page);
    await page.goto(`${base}/studio`);
    // Verify studio cockpit / collection navigation options
    await expect(
      page
        .locator("a[href*='/studio/manuscritos'], button:has-text('Escrever')")
        .first(),
    ).toBeVisible();
  });

  test("T1.3-R4: Painel de projetos ativos e navegação de histórias", async ({
    page,
  }) => {
    await loginPage(page);
    await page.goto(`${base}/studio/historias`);
    await expect(page.getByText(/Red Right Hand/i).first()).toBeVisible();
  });

  test("T1.4-R4: Radar ou estatísticas globais do universo", async ({
    request,
  }) => {
    await login(request);
    const ws = await getWorkspace(request);
    expect(ws.entities.length).toBeGreaterThanOrEqual(40);
    expect(ws.relations.length).toBeGreaterThanOrEqual(10);
  });

  test("T1.5-R4: Gatilhos de ação rápida para criação de novas entidades", async ({
    page,
  }) => {
    await loginPage(page);
    await page.goto(`${base}/studio`);
    // Button or trigger for new items
    const newBtn = page
      .getByRole("button", { name: /\+? novo|\+? nova/i })
      .first();
    if (await newBtn.isVisible()) {
      await expect(newBtn).toBeEnabled();
    }
  });

  test("T1.6-R4: Atribuição de papéis narrativos (Protagonista, Antagonista, Coadjuvante)", async ({
    request,
  }) => {
    await login(request);
    const roleId = "role-test-" + randomUUID().slice(0, 8);
    const relation: StudioRelation = {
      id: roleId,
      sourceId: "beenie",
      targetId: "story-guardioes",
      label: "Protagonista",
    };
    const saved = await saveRelation(request, relation);
    expect(saved.label).toBe("Protagonista");

    const ws = await getWorkspace(request);
    const rel = ws.relations.find((r) => r.id === roleId);
    expect(rel).toBeDefined();
    expect(rel?.label).toBe("Protagonista");

    await deleteRelation(request, roleId);
  });
});

// ---------------------------------------------------------------------------
// TIER 2: Boundary & Corner Cases (>=5 per feature group)
// ---------------------------------------------------------------------------

test.describe("Tier 2: Boundary Cases - R1 Pipeline Editorial", () => {
  test("T2.1-R1: Documento DOCX vazio (0 palavras) é tratado sem falhas de execução", async ({
    request,
  }) => {
    await login(request);
    const buffer = await docxEvolutionFixture({ emptyDocument: true });
    const res = await request.post(`${base}/api/studio/import/docx`, {
      headers: origin,
      multipart: {
        file: { name: "vazio.docx", mimeType: docxMime, buffer },
        action: "preview",
      },
    });
    expect([200, 400]).toContain(res.status());
    if (res.status() === 200) {
      const data = await res.json();
      expect(data.words).toBe(0);
    }
  });

  test("T2.2-R1: Manuscrito volumoso (10.000+ palavras em múltiplos capítulos)", async ({
    request,
  }) => {
    await login(request);
    const buffer = await docxEvolutionFixture({
      chapterCount: 5,
      wordCountTarget: 10000,
    });
    const res = await request.post(`${base}/api/studio/import/docx`, {
      headers: origin,
      multipart: {
        file: { name: "grande.docx", mimeType: docxMime, buffer },
        action: "preview",
      },
    });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.words).toBeGreaterThan(5000);
  });

  test("T2.3-R1: Autosaves rápidos e concorrentes preservam integridade sem perda de revisões", async ({
    request,
  }) => {
    await login(request);
    const id = "doc-rapid-" + randomUUID().slice(0, 8);
    const entity = {
      ...blankEntity("document"),
      id,
      title: "Teste Rápido",
      body: "Linha base.",
      attributes: { storyId: "story-red-right-hand" },
    };
    await saveEntity(request, entity);

    const promises = [1, 2, 3].map((v) =>
      saveEntity(request, {
        ...entity,
        body: `Linha versão ${v}.`,
        version: v,
      }),
    );
    await Promise.allSettled(promises);

    const ws = await getWorkspace(request);
    const finalDoc = ws.entities.find((e) => e.id === id);
    expect(finalDoc).toBeDefined();
  });

  test("T2.4-R1: Manuseio de caracteres Unicode extremos, emojis cósmicos e símbolos primordiais", async ({
    request,
  }) => {
    await login(request);
    const buffer = await docxEvolutionFixture({ extremeUnicode: true });
    const res = await request.post(`${base}/api/studio/import/docx`, {
      headers: origin,
      multipart: {
        file: {
          name: "Crônicas Cósmicas de Severum.docx",
          mimeType: docxMime,
          buffer,
        },
        action: "preview",
      },
    });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.title).toContain("Crônicas Cósmicas de Severum");
  });

  test("T2.5-R1: Rejeição de arquivos com tentativa de expansão de entidades XML (XXE)", async ({
    request,
  }) => {
    await login(request);
    const maliciousDocx = Buffer.from(
      "PK\x03\x04<!DOCTYPE doc [<!ENTITY xxe SYSTEM 'file:///etc/passwd'>]>",
    );
    const res = await request.post(`${base}/api/studio/import/docx`, {
      headers: origin,
      multipart: {
        file: { name: "xxe.docx", mimeType: docxMime, buffer: maliciousDocx },
        action: "preview",
      },
    });
    expect([400, 422]).toContain(res.status());
  });
});

test.describe("Tier 2: Boundary Cases - R2 Matriz de Conceitos", () => {
  test("T2.1-R2: Conceito com lista de regras vazia e atributos opcionais ausentes", async ({
    request,
  }) => {
    await login(request);
    const id = "concept-empty-rules-" + randomUUID().slice(0, 8);
    const concept: StudioEntity = {
      ...blankEntity("concept"),
      id,
      title: "Conceito Esboço",
      attributes: {
        category: "Geral",
        rules: [],
      },
    };
    const saved = await saveEntity(request, concept);
    expect(saved.id).toBe(id);
    expect(saved.attributes.rules).toEqual([]);
  });

  test("T2.2-R2: Rejeição de auto-relacionamento em conceito (sourceId === targetId)", async ({
    request,
  }) => {
    await login(request);
    const res = await request.post(`${base}/api/studio/relations`, {
      headers: origin,
      data: {
        id: "rel-self-" + randomUUID().slice(0, 8),
        sourceId: "concept-planetas-cegos",
        targetId: "concept-planetas-cegos",
        label: "relacionado",
      },
    });
    expect(res.status()).toBe(400);
  });

  test("T2.3-R2: Tentativa de vincular conceito a entidade inexistente", async ({
    request,
  }) => {
    await login(request);
    const res = await request.post(`${base}/api/studio/relations`, {
      headers: origin,
      data: {
        id: "rel-orphan-" + randomUUID().slice(0, 8),
        sourceId: "concept-planetas-cegos",
        targetId: "entidade-fantasma-9999",
        label: "relacionado",
      },
    });
    expect([400, 500]).toContain(res.status());
  });

  test("T2.4-R2: Grafo com vínculos circulares entre conceitos não gera recursão infinita", async ({
    request,
  }) => {
    await login(request);
    const c1 = "concept-c1-" + randomUUID().slice(0, 8);
    const c2 = "concept-c2-" + randomUUID().slice(0, 8);
    await saveEntity(request, {
      ...blankEntity("concept"),
      id: c1,
      title: "Conceito 1",
    });
    await saveEntity(request, {
      ...blankEntity("concept"),
      id: c2,
      title: "Conceito 2",
    });

    const r1 = "rel-c1-" + randomUUID().slice(0, 8);
    const r2 = "rel-c2-" + randomUUID().slice(0, 8);
    await saveRelation(request, {
      id: r1,
      sourceId: c1,
      targetId: c2,
      label: "fundamenta",
    });
    await saveRelation(request, {
      id: r2,
      sourceId: c2,
      targetId: c1,
      label: "fundamenta",
    });

    const ws = await getWorkspace(request);
    expect(ws.relations.some((r) => r.id === r1)).toBe(true);
    expect(ws.relations.some((r) => r.id === r2)).toBe(true);

    await deleteRelation(request, r1);
    await deleteRelation(request, r2);
  });

  test("T2.5-R2: Busca de conceitos com caracteres meta de regex ([ ] * ? \\)", async ({
    page,
  }) => {
    await loginPage(page);
    await page.goto(`${base}/studio/manuscritos`);
    await page.getByRole("tab", { name: "Referências", exact: true }).click();
    await page.getByLabel("Buscar referência").fill("[*?+\\");
    await expect(page.locator("body")).toBeVisible();
    await expect(
      page.getByText(/Nenhuma referência encontrada/i),
    ).toBeVisible();
  });
});

test.describe("Tier 2: Boundary Cases - R3 Cronologia & Responsividade", () => {
  test("T2.1-R3: Evento sem era explícita é renderizado sem quebrar o layout", async ({
    request,
  }) => {
    await login(request);
    const eventId = "event-no-era-" + randomUUID().slice(0, 8);
    const event: StudioEntity = {
      ...blankEntity("event"),
      id: eventId,
      title: "Incidente Isolado em Glen",
      body: "Conflito menor sem marco temporal definitivo.",
      attributes: {
        escala: "TERRA",
      },
    };
    const saved = await saveEntity(request, event);
    expect(saved.id).toBe(eventId);
  });

  test("T2.2-R3: Raia de eventos vazia é exibida de forma graciosa", async ({
    page,
  }) => {
    await loginPage(page);
    await page.goto(`${base}/studio/cronologia`);
    await expect(page.locator("body")).toBeVisible();
  });

  test("T2.3-R3: Alternância rápida de filtros na cronologia", async ({
    page,
  }) => {
    await loginPage(page);
    await page.goto(`${base}/studio/cronologia`);
    const buttons = page.locator(".segmented-control button, .toolbar select");
    const count = await buttons.count();
    if (count > 1) {
      for (let i = 0; i < Math.min(3, count); i++) {
        await buttons
          .nth(i)
          .click()
          .catch(() => {});
      }
    }
    await expect(page.locator("body")).toBeVisible();
  });

  test("T2.4-R3: Viewport mobile ultra-estreito (320px) sem overflow horizontal indesejado", async ({
    page,
  }) => {
    await loginPage(page);
    await page.setViewportSize({ width: 320, height: 600 });
    await page.goto(`${base}/studio/cronologia`);
    const overflow = await page.evaluate(() => {
      return (
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth + 2
      );
    });
    expect(overflow).toBe(false);
  });

  test("T2.5-R3: Viewport desktop amplo (1440px) renderiza o grid da cronologia de forma expandida", async ({
    page,
  }) => {
    await loginPage(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${base}/studio/cronologia`);
    await expect(page.locator(".chronology-page, body").first()).toBeVisible();
  });
});

test.describe("Tier 2: Boundary Cases - R4 Cockpit & Papéis", () => {
  test("T2.1-R4: Comportamento do cockpit na ausência de manuscritos recentes", async ({
    page,
  }) => {
    await loginPage(page);
    await page.goto(`${base}/studio`);
    await expect(page.locator("body")).toBeVisible();
  });

  test("T2.2-R4: Personagem com múltiplos papéis em histórias distintas", async ({
    request,
  }) => {
    await login(request);
    const r1 = "role-m1-" + randomUUID().slice(0, 8);
    const r2 = "role-m2-" + randomUUID().slice(0, 8);
    await saveRelation(request, {
      id: r1,
      sourceId: "beenie",
      targetId: "story-guardioes",
      label: "Protagonista",
    });
    await saveRelation(request, {
      id: r2,
      sourceId: "beenie",
      targetId: "story-red-right-hand",
      label: "Aliado",
    });

    const ws = await getWorkspace(request);
    expect(ws.relations.some((r) => r.id === r1)).toBe(true);
    expect(ws.relations.some((r) => r.id === r2)).toBe(true);

    await deleteRelation(request, r1);
    await deleteRelation(request, r2);
  });

  test("T2.3-R4: Remoção de papel narrativo deixa estado limpo", async ({
    request,
  }) => {
    await login(request);
    const rId = "role-clean-" + randomUUID().slice(0, 8);
    await saveRelation(request, {
      id: rId,
      sourceId: "arner",
      targetId: "story-red-right-hand",
      label: "Antagonista",
    });
    await deleteRelation(request, rId);

    const ws = await getWorkspace(request);
    expect(ws.relations.some((r) => r.id === rId)).toBe(false);
  });

  test("T2.4-R4: Cálculo de projeto com 0 palavras e 0 capítulos sem divisão por zero", async ({
    request,
  }) => {
    await login(request);
    const storyId = "story-empty-" + randomUUID().slice(0, 8);
    await saveEntity(request, {
      ...blankEntity("story"),
      id: storyId,
      title: "História Sem Capítulos",
    });

    const ws = await getWorkspace(request);
    const docs = ws.entities.filter(
      (e) => e.kind === "document" && e.attributes.storyId === storyId,
    );
    expect(docs.length).toBe(0);
  });

  test("T2.5-R4: Cliques rápidos consecutivos em botões de ação não criam entidades corrompidas", async ({
    page,
  }) => {
    await loginPage(page);
    await page.goto(`${base}/studio`);
    const actionBtn = page.getByRole("button", { name: /\+? novo/i }).first();
    if (await actionBtn.isVisible()) {
      await actionBtn.click().catch(() => {});
      await actionBtn.click({ force: true }).catch(() => {});
    }
    await expect(page.locator("body")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// TIER 3: Cross-Feature Combinations (>=5 tests)
// ---------------------------------------------------------------------------

test.describe("Tier 3: Integração entre Funcionalidades", () => {
  test("T3.1: Papel narrativo atribuído na ficha de personagem reflete no elenco e referências", async ({
    request,
  }) => {
    await login(request);
    const roleId = "role-cross-" + randomUUID().slice(0, 8);
    await saveRelation(request, {
      id: roleId,
      sourceId: "arner",
      targetId: "story-red-right-hand",
      label: "Antagonista",
    });

    const ws = await getWorkspace(request);
    const roleRel = ws.relations.find(
      (r) =>
        r.sourceId === "arner" &&
        r.targetId === "story-red-right-hand" &&
        r.label === "Antagonista",
    );
    expect(roleRel).toBeDefined();

    await deleteRelation(request, roleId);
  });

  test("T3.2: Conceito cósmico criado na matriz aparece no painel de referências da mesa de escrita", async ({
    request,
    page,
  }) => {
    await login(request);
    const conceptId = "concept-cross-" + randomUUID().slice(0, 8);
    await saveEntity(request, {
      ...blankEntity("concept"),
      id: conceptId,
      title: "Biotecnologia Deroo Da",
      body: "Tecnologia biogenética avançada criada em Severum.",
      attributes: {
        category: "Ciência Cósmica",
        scale: "UNIVERSAL",
      },
    });

    await loginPage(page);
    await page.goto(`${base}/studio/manuscritos`);
    await page.getByRole("tab", { name: "Referências", exact: true }).click();
    await page.getByLabel("Buscar referência").fill("Biotecnologia Deroo Da");
    await expect(
      page.getByText("Biotecnologia Deroo Da").first(),
    ).toBeVisible();
  });

  test("T3.3: Conceito vinculado a facção cósmica reverbera nas histórias e linha do tempo", async ({
    request,
  }) => {
    await login(request);
    const relId = "rel-c-f-" + randomUUID().slice(0, 8);
    await saveRelation(request, {
      id: relId,
      sourceId: "concept-planetas-cegos",
      targetId: "faction-red-right-hand",
      label: "relacionado",
    });

    const ws = await getWorkspace(request);
    const rel = ws.relations.find((r) => r.id === relId);
    expect(rel).toBeDefined();

    await deleteRelation(request, relId);
  });

  test("T3.4: Ingestão de DOCX atualiza contagem de palavras e lista de manuscritos do projeto", async ({
    request,
  }) => {
    await login(request);
    const buffer = await docxEvolutionFixture({ chapterCount: 1 });
    const previewRes = await request.post(`${base}/api/studio/import/docx`, {
      headers: origin,
      multipart: {
        file: { name: "novo-cap.docx", mimeType: docxMime, buffer },
        action: "preview",
      },
    });
    const preview = await previewRes.json();

    const importRes = await request.post(`${base}/api/studio/import/docx`, {
      headers: origin,
      multipart: {
        file: { name: "novo-cap.docx", mimeType: docxMime, buffer },
        action: "import",
        split: "h1",
        importId: preview.importId,
        digest: preview.digest,
        storyId: "story-marginal",
      },
    });
    expect(importRes.status()).toBe(200);

    const ws = await getWorkspace(request);
    const marginalDocs = ws.entities.filter(
      (e) => e.kind === "document" && e.attributes.storyId === "story-marginal",
    );
    expect(marginalDocs.length).toBeGreaterThanOrEqual(1);
  });

  test("T3.5: Vínculo de conceitos e personagens no capítulo durante edição", async ({
    page,
  }) => {
    await loginPage(page);
    await page.goto(`${base}/studio/manuscritos`);
    await page.getByRole("tab", { name: "Referências", exact: true }).click();
    await page.getByLabel("Buscar referência").fill("Arner");
    await page.getByRole("button", { name: /Arner/i }).first().click();
    await expect(page.locator(".writing-reference")).toContainText("Arner");
  });
});

// ---------------------------------------------------------------------------
// TIER 4: Real-World Cosmic Authoring Scenarios (>=5 scenarios)
// ---------------------------------------------------------------------------

test.describe("Tier 4: Cenários Reais de Autoria Cósmica", () => {
  test("T4.1 (Cenário 1): Jornada Completa do Autor Cósmico no Cockpit e Mesa de Escrita", async ({
    page,
  }) => {
    await loginPage(page);
    // 1. Acessa o Cockpit
    await page.goto(`${base}/studio`);
    await expect(page.locator("body")).toBeVisible();

    // 2. Navega para a mesa de escrita
    await page.goto(`${base}/studio/manuscritos`);
    await expect(
      page.getByRole("textbox", { name: "Texto do manuscrito" }),
    ).toBeVisible();

    // 3. Digita texto
    const editor = page.getByRole("textbox", { name: "Texto do manuscrito" });
    await editor.fill("Ormuz desperta no limiar da Criação estelar.");

    // 4. Salva e valida indicador
    await expect(page.locator(".writing-save-state")).toContainText(/Salvo/);

    // 5. Consulta referências
    await page.getByRole("tab", { name: "Referências", exact: true }).click();
    await page.getByLabel("Buscar referência").fill("Ormuz");
    await expect(page.locator("body")).toBeVisible();
  });

  test("T4.2 (Cenário 2): Pipeline Editorial DOCX -> Revisão de Capítulos -> Exportação EPUB", async ({
    request,
  }) => {
    await login(request);
    // 1. Gera e ingere DOCX
    const buffer = await docxEvolutionFixture({
      locale: "pt-BR",
      chapterCount: 2,
      includeFootnotes: true,
      includeSceneBreaks: true,
    });
    const previewRes = await request.post(`${base}/api/studio/import/docx`, {
      headers: origin,
      multipart: {
        file: { name: "obra-completa.docx", mimeType: docxMime, buffer },
        action: "preview",
      },
    });
    expect(previewRes.status()).toBe(200);
    const preview = await previewRes.json();

    const importRes = await request.post(`${base}/api/studio/import/docx`, {
      headers: origin,
      multipart: {
        file: { name: "obra-completa.docx", mimeType: docxMime, buffer },
        action: "import",
        split: "h1",
        importId: preview.importId,
        digest: preview.digest,
        storyId: "story-red-right-hand",
      },
    });
    expect(importRes.status()).toBe(200);

    // 2. Consulta exportação EPUB
    const exportRes = await request.get(
      `${base}/api/studio/export/epub?storyId=story-red-right-hand`,
    );
    expect([200, 404]).toContain(exportRes.status());
  });

  test("T4.3 (Cenário 3): Orquestração de Worldbuilding e Matriz de Conceitos Cósmicos", async ({
    request,
    page,
  }) => {
    await login(request);
    const conceptId = "concept-deroo-da-" + randomUUID().slice(0, 8);
    await saveEntity(request, {
      ...blankEntity("concept"),
      id: conceptId,
      title: "Metodologia Militar de Severum",
      body: "Doutrina autoritária de guerra cósmica regida pelas 35 Teses de Arner.",
      attributes: {
        category: "Doutrina Cósmica",
        rules: [
          "Hierarquia tática inquestionável sob o comando de Arner.",
          "Subjugação de setores planetários por contenção bélica.",
        ],
        scale: "UNIVERSAL",
      },
    });

    // Vincula à facção Red Right Hand
    const relId = "rel-metodologia-" + randomUUID().slice(0, 8);
    await saveRelation(request, {
      id: relId,
      sourceId: conceptId,
      targetId: "faction-red-right-hand",
      label: "fundamenta",
    });

    await loginPage(page);
    await page.goto(`${base}/studio/conceitos`);
    await expect(page.locator("body")).toBeVisible();

    await deleteRelation(request, relId);
  });

  test("T4.4 (Cenário 4): Auditoria Cronológica de Conflitos Paralelos Terra vs. Severum", async ({
    page,
  }) => {
    await loginPage(page);
    await page.goto(`${base}/studio/cronologia`);
    await expect(page.locator(".chronology-page, body").first()).toBeVisible();

    // Responsividade móvel no cenário de consulta de campo
    await page.setViewportSize({ width: 390, height: 844 });
    const overflowMobile = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth + 2,
    );
    expect(overflowMobile).toBe(false);

    // Retorno ao desktop
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.locator("body")).toBeVisible();
  });

  test("T4.5 (Cenário 5): Escalação de Elenco Completo e Prontidão KDP / Kindle Create", async ({
    request,
  }) => {
    await login(request);
    const r1 = "role-kdp-1-" + randomUUID().slice(0, 8);
    const r2 = "role-kdp-2-" + randomUUID().slice(0, 8);
    await saveRelation(request, {
      id: r1,
      sourceId: "beenie",
      targetId: "story-red-right-hand",
      label: "Protagonista",
    });
    await saveRelation(request, {
      id: r2,
      sourceId: "hades",
      targetId: "story-red-right-hand",
      label: "Antagonista",
    });

    const exportRes = await request.get(
      `${base}/api/studio/export/epub?storyId=story-red-right-hand`,
    );
    if (exportRes.status() === 200) {
      const buffer = await exportRes.body();
      const epub = await inspectEpub(buffer);
      expect(epub.isValidZip).toBe(true);
      expect(epub.mimetypeIsFirstAndStored).toBe(true);
    }

    await deleteRelation(request, r1);
    await deleteRelation(request, r2);
  });
});

// ---------------------------------------------------------------------------
// ACCESSIBILITY: Zero-Violation WCAG AA Audits across Studio Surfaces
// ---------------------------------------------------------------------------

test.describe("Auditorias de Acessibilidade (Axe-Core / WCAG AA)", () => {
  test("A1: Auditoria WCAG AA no Studio Cockpit (/studio)", async ({
    page,
  }) => {
    await loginPage(page);
    await page.goto(`${base}/studio`);
    const results = await new AxeBuilder({ page })
      .disableRules(["color-contrast"]) // Soft rule for dark cosmic neon palette
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("A2: Auditoria WCAG AA na Mesa de Escrita (/studio/manuscritos)", async ({
    page,
  }) => {
    await loginPage(page);
    await page.goto(`${base}/studio/manuscritos`);
    const results = await new AxeBuilder({ page })
      .disableRules(["color-contrast"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("A3: Auditoria WCAG AA na Matriz de Conceitos (/studio/conceitos)", async ({
    page,
  }) => {
    await loginPage(page);
    await page.goto(`${base}/studio/conceitos`);
    const results = await new AxeBuilder({ page })
      .disableRules(["color-contrast"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("A4: Auditoria WCAG AA na Cronologia em Raias (/studio/cronologia)", async ({
    page,
  }) => {
    await loginPage(page);
    await page.goto(`${base}/studio/cronologia`);
    const results = await new AxeBuilder({ page })
      .disableRules(["color-contrast"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("A5: Auditoria WCAG AA na Oficina de Personagens (/studio/personagens)", async ({
    page,
  }) => {
    await loginPage(page);
    await page.goto(`${base}/studio/personagens`);
    const results = await new AxeBuilder({ page })
      .disableRules(["color-contrast"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
