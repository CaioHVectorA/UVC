import { z } from "zod";
const text = z.string().trim().min(1);
const id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const status = z.enum(["CANONE_TRAVADO", "EM_REVISAO", "RASCUNHO"]);
const unique = (items: readonly { id: string }[]) =>
  new Set(items.map((item) => item.id)).size === items.length;
export const characterSchema = z
  .object({
    id,
    nome: text,
    equipe: text,
    alinhamento: text,
    escala: z.enum(["TERRA", "UNIVERSAL", "UNIVERSAL / TERRA"]),
    desc: text,
    poderes: z.array(text).min(1),
    aparicoes: z.array(text).min(1),
    img: z.string().optional(),
    livroIds: z.array(id).optional(),
    statusVisibilidade: z
      .enum(["PUBLICO", "RESERVADO", "NAO_CLASSIFICADO"])
      .optional(),
  })
  .strict();
export const charactersSchema = z
  .array(characterSchema)
  .min(1)
  .refine(unique, "IDs de personagens duplicados");
export const factionsSchema = z
  .array(
    z
      .object({
        id,
        nome: text,
        base: text,
        lider: text,
        membros: z.array(text).min(1),
        desc: text,
      })
      .strict(),
  )
  .min(1)
  .refine(unique, "IDs de facções duplicados");
export const seriesSchema = z
  .array(
    z
      .object({
        id,
        titulo: text,
        tipo: z.enum(["SÉRIE", "SOLO"]),
        local: z.enum(["TERRA", "UNIVERSAL"]),
        sinopse: text,
        arcos: z.array(text).optional(),
      })
      .strict(),
  )
  .min(1)
  .refine(unique, "IDs de histórias duplicados");
export const chapterSchema = z
  .object({
    numero: z.number().int().nonnegative(),
    titulo: text,
    arquivo: z.string().regex(/^capitulos\/\d{2}-[a-z0-9-]+\.md$/),
    status,
    palavrasAprox: z.number().int().positive(),
  })
  .strict();
export const bookSchema = z
  .object({
    id,
    titulo: text,
    subtitulo: text,
    autor: text,
    genero: text,
    idioma: z.literal("pt-BR"),
    status: z.enum(["EM_REVISAO", "EM_ESCRITA", "PUBLICADO", "RASCUNHO"]),
    isbn: z.string(),
    asin: z.string(),
    editora: text,
    sinopse: text,
    frontMatter: z
      .object({ dedicatoria: text, epigrafe: text, fichaCatalografica: text })
      .strict(),
    capitulos: z.array(chapterSchema).min(1),
  })
  .strict()
  .superRefine((book, ctx) => {
    for (const chapter of book.capitulos)
      if (
        !chapter.arquivo.startsWith(
          `capitulos/${String(chapter.numero).padStart(2, "0")}-`,
        )
      )
        ctx.addIssue({
          code: "custom",
          message: "Número e arquivo de capítulo não correspondem",
        });
    if (
      new Set(book.capitulos.map((c) => c.numero)).size !==
      book.capitulos.length
    )
      ctx.addIssue({
        code: "custom",
        message: "Números de capítulos duplicados",
      });
    if (
      new Set(book.capitulos.map((c) => c.arquivo)).size !==
      book.capitulos.length
    )
      ctx.addIssue({
        code: "custom",
        message: "Arquivos de capítulos duplicados",
      });
  });
const beatSchema = z
  .object({
    id,
    capitulo: z.number().int().nonnegative(),
    titulo: text,
    eraId: id,
    local: text,
    pov: text,
    personagens: z.array(text).min(1),
    status,
    resumo: text,
    notas: text.optional(),
  })
  .strict();
export const timelineSchema = z
  .object({
    erasCosmicas: z
      .array(
        z
          .object({
            id,
            nome: text,
            ordem: z.number().int().positive(),
            resumo: text,
            descricao: text,
            cor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
          })
          .strict(),
      )
      .min(1),
    seriesParalelas: z.array(
      z
        .object({
          id,
          titulo: text,
          escala: z.enum(["TERRA", "UNIVERSAL", "HÍBRIDA"]),
          localPrincipal: text,
          protagonista: text,
          descricao: text,
          cor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        })
        .strict(),
    ),
    livros: z.array(
      z
        .object({
          id,
          serieId: id,
          titulo: text,
          autor: text,
          status: z.enum(["EM_REVISAO", "EM_ESCRITA", "PUBLICADO", "RASCUNHO"]),
          sinopse: text,
          beats: z.array(beatSchema),
        })
        .strict(),
    ),
  })
  .strict()
  .superRefine((timeline, ctx) => {
    const eras = new Set(timeline.erasCosmicas.map((e) => e.id));
    const series = new Set(timeline.seriesParalelas.map((s) => s.id));
    for (const group of [
      timeline.erasCosmicas,
      timeline.seriesParalelas,
      timeline.livros,
    ])
      if (!unique(group))
        ctx.addIssue({
          code: "custom",
          message: "IDs da cronologia duplicados",
        });
    const beats = timeline.livros.flatMap((b) => b.beats);
    if (!unique(beats))
      ctx.addIssue({ code: "custom", message: "IDs de cenas duplicados" });
    if (
      new Set(timeline.erasCosmicas.map((e) => e.ordem)).size !==
      timeline.erasCosmicas.length
    )
      ctx.addIssue({ code: "custom", message: "Ordem das eras duplicada" });
    for (const book of timeline.livros) {
      if (!series.has(book.serieId))
        ctx.addIssue({
          code: "custom",
          message: `Série desconhecida: ${book.serieId}`,
        });
      for (const beat of book.beats)
        if (!eras.has(beat.eraId))
          ctx.addIssue({
            code: "custom",
            message: `Era desconhecida: ${beat.eraId}`,
          });
    }
  });
export const publicationSchema = z
  .object({
    mode: z.literal("git-static"),
    studioAccess: z.literal("author-only"),
    workInProgress: z
      .array(id)
      .refine(
        (ids) => new Set(ids).size === ids.length,
        "Séries em andamento duplicadas",
      ),
    catalog: z
      .array(
        z
          .object({
            id,
            seriesId: id,
            titulo: text,
            subtitulo: text.optional(),
            formato: z.literal("Kindle"),
            cover: z.string().regex(/^\/covers\/[a-z0-9-]+\.jpg$/),
            coverSource: z
              .url()
              .refine(
                (value) =>
                  new URL(value).origin === "https://m.media-amazon.com",
              ),
            amazonUrl: z.url().refine((value) => {
              const url = new URL(value);
              return (
                url.protocol === "https:" &&
                url.hostname === "www.amazon.com" &&
                !url.username &&
                !url.password &&
                /\/dp\/[A-Z0-9]{10}$/.test(url.pathname)
              );
            }, "Link Amazon inválido"),
          })
          .strict(),
      )
      .refine(unique, "IDs de edições duplicados"),
    books: z.record(
      id,
      z
        .object({
          chapters: z
            .array(z.number().int().nonnegative())
            .refine(
              (values) => new Set(values).size === values.length,
              "Capítulos públicos duplicados",
            ),
        })
        .strict(),
    ),
  })
  .strict();
export type Character = z.infer<typeof characterSchema>;
export type Timeline = z.infer<typeof timelineSchema>;
export type CanonicalBook = z.infer<typeof bookSchema>;
export const mediaSchema = z
  .array(
    z
      .object({
        id,
        source: z
          .string()
          .regex(
            /^assets\/(?:characters|logos|backgrounds)\/[^/]+\.(?:jpg|png)$/,
          )
          .refine((p) => !p.includes(".."), "Caminho de mídia inválido"),
        kind: z.enum(["scenery", "cover", "illustration", "symbol"]),
        description: text,
        width: z.number().int().positive(),
        height: z.number().int().positive(),
        credit: text.nullable(),
        license: text.nullable(),
        rightsStatus: z.enum(["review-needed", "verified"]),
      })
      .strict(),
  )
  .refine(unique, "IDs de mídia duplicados")
  .superRefine((items, ctx) => {
    for (const item of items)
      if (item.rightsStatus === "verified" && (!item.credit || !item.license))
        ctx.addIssue({
          code: "custom",
          message: `Crédito/licença ausente na mídia verificada: ${item.id}`,
        });
  });
// A public snapshot must never silently publish an explicitly reserved record.
export const publishedCharactersSchema = charactersSchema.refine(
  (items) =>
    !items.some((character) => character.statusVisibilidade === "RESERVADO"),
  "Conteúdo marcado como RESERVADO não pode entrar no snapshot público. Use uma fonte privada e autenticação para material confidencial.",
);
