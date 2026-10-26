import test from "node:test";
import assert from "node:assert/strict";
import {
  bookSchema,
  charactersSchema,
  timelineSchema,
  seriesSchema,
  publicationSchema,
  mediaSchema,
} from "../../lib/schemas";
import book from "../../books/red-right-hand/book.json";
import characters from "../../data/characters.json";
import timeline from "../../data/timeline.json";
import series from "../../data/series_and_solos.json";
import publication from "../../data/publication.json";
import media from "../../data/media.json";
import { getChapter } from "../../lib/chapters";
test("canon atual e política de publicação obedecem aos contratos", () => {
  for (const [schema, value] of [
    [bookSchema, book],
    [charactersSchema, characters],
    [timelineSchema, timeline],
    [seriesSchema, series],
    [publicationSchema, publication],
    [mediaSchema, media],
  ] as const)
    assert.equal(schema.safeParse(value).success, true);
});
test("rejeita IDs duplicados e registros incompletos", () => {
  assert.equal(
    charactersSchema.safeParse([...characters, characters[0]]).success,
    false,
  );
  assert.equal(
    seriesSchema.safeParse([{ ...series[0], id: undefined }]).success,
    false,
  );
});
test("não aceita capítulo fora do diretório permitido ou número duplicado", () => {
  assert.equal(
    bookSchema.safeParse({
      ...book,
      capitulos: [{ ...book.capitulos[0], arquivo: "../../segredo.md" }],
    }).success,
    false,
  );
  assert.equal(
    bookSchema.safeParse({
      ...book,
      capitulos: [book.capitulos[0], book.capitulos[0]],
    }).success,
    false,
  );
});
test("rejeita referências de eras e séries inexistentes", () => {
  const bad = structuredClone(timeline);
  bad.livros[0].beats[0].eraId = "inexistente";
  assert.equal(timelineSchema.safeParse(bad).success, false);
  bad.livros[0].serieId = "inexistente";
  assert.equal(timelineSchema.safeParse(bad).success, false);
});
test("não aprova crédito/licença inventados ou ausentes", () => {
  assert.equal(
    mediaSchema.safeParse([
      { ...media[0], rightsStatus: "verified", credit: null },
    ]).success,
    false,
  );
});
test("manifesta capítulo exato, falha em ausente e calcula estatísticas reais", async () => {
  const chapter = await getChapter(0);
  assert.equal(chapter.arquivo, book.capitulos[0].arquivo);
  assert.match(chapter.text, /A Reunião/);
  assert.ok(chapter.words > 0);
  await assert.rejects(getChapter(99));
});

test("origem pública só aceita origem HTTP(S) válida e não inventa domínio", async () => {
  const { getSiteUrl } = await import("../../lib/site-url");
  assert.equal(getSiteUrl(""), undefined);
  assert.equal(
    getSiteUrl("https://uvc.example")?.origin,
    "https://uvc.example",
  );
  for (const value of [
    "javascript:alert(1)",
    "https://user:pass@uvc.example",
    "https://uvc.example/subpath",
    "http://uvc.example",
    "https://uvc.example?q=1",
  ])
    assert.throws(() => getSiteUrl(value));
});

test("sitemap só usa origem configurada e destinos de leitura explícitos", async () => {
  const original = process.env.UVC_SITE_URL;
  try {
    const { default: sitemap } = await import("../../app/sitemap");
    delete process.env.UVC_SITE_URL;
    assert.deepEqual(sitemap(), []);
    process.env.UVC_SITE_URL = "https://uvc.example";
    const urls = sitemap().map((item) => item.url);
    assert.ok(urls.includes("https://uvc.example/ler/0"));
    assert.ok(urls.includes("https://uvc.example/historias/red-right-hand"));
    assert.equal(
      urls.some((url) => url.includes("studio")),
      false,
    );
    assert.equal(
      urls.some((url) => url.includes("localhost")),
      false,
    );
  } finally {
    if (original === undefined) delete process.env.UVC_SITE_URL;
    else process.env.UVC_SITE_URL = original;
  }
});

test("snapshot público bloqueia material explicitamente reservado", async () => {
  const { publishedCharactersSchema } = await import("../../lib/schemas");
  assert.equal(publishedCharactersSchema.safeParse(characters).success, true);
  assert.equal(
    publishedCharactersSchema.safeParse([
      { ...characters[0], statusVisibilidade: "RESERVADO" },
    ]).success,
    false,
  );
});
