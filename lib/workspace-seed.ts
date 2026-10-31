import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import book from "@/books/red-right-hand/book.json";
import characters from "@/data/characters.json";
import factions from "@/data/factions.json";
import series from "@/data/series_and_solos.json";
import timeline from "@/data/timeline.json";
import media from "@/data/media.json";
import assets from "@/data/studio-assets.json";
import type { StudioEntity, StudioRelation } from "./workspace";
function entity(
  id: string,
  kind: StudioEntity["kind"],
  title: string,
  body: string,
  attributes: Record<string, unknown> = {},
  published = false,
): StudioEntity {
  return {
    id,
    kind,
    title,
    body,
    summary: body.slice(0, 1000),
    status: "review",
    published,
    tags: [],
    attributes,
    version: 0,
  };
}
export const seedEntities: StudioEntity[] = [
  ...book.capitulos.map((chapter) =>
    entity(
      `document-rrh-${chapter.numero}`,
      "document",
      `RRH · ${String(chapter.numero).padStart(2, "0")} · ${chapter.titulo}`,
      readFileSync(`books/red-right-hand/${chapter.arquivo}`, "utf8"),
      {
        source: `books/red-right-hand/${chapter.arquivo}`,
        order: chapter.numero,
        storyId: "story-red-right-hand",
      },
    ),
  ),
  ...characters.map((c) =>
    entity(
      c.id,
      "character",
      c.nome,
      c.desc,
      {
        equipe: c.equipe,
        alinhamento: c.alinhamento,
        escala: c.escala,
        poderes: c.poderes,
        aparicoes: c.aparicoes,
        source: "data/characters.json",
      },
      true,
    ),
  ),
  ...factions.map((f) =>
    entity(`faction-${f.id}`, "faction", f.nome, f.desc, {
      base: f.base,
      lider: f.lider,
      membros: f.membros,
      source: "data/factions.json",
    }),
  ),
  ...series.map((s) =>
    entity(`story-${s.id}`, "story", s.titulo, s.sinopse, {
      ...s,
      source: "data/series_and_solos.json",
    }),
  ),
  entity(
    "concept-planetas-cegos",
    "concept",
    "Planetas cegos",
    "Mundos velados no vácuo espacial profundo, situados fora do alcance da luz de Ormuz e das rotas mapeadas de Severum. Envoltos em penumbra gravitacional e anomalias de dobra, esses corpos celestes abrigam relíquias cósmicas primordiais, civilizações esquecidas e refúgios inacessíveis às frotas intergalácticas.",
    {
      category: "cosmologia",
      scale: "UNIVERSAL",
      rules: [
        "Invisibilidade Cartográfica: Planetas cegos não emitem radiação estelar comum e são imperceptíveis a radares convencionais, exigindo telemetria quântica.",
        "Vácuo Profundo: Orbitam pontos neutros no abismo interestelar, fora da jurisdição ou do patrulhamento da Red Right Hand e dos Congregadores.",
        "Preservação Primordial: Qualquer bioma ou civilização existente em um planeta cego evolui em isolamento extremo, imune a interferências cósmicas normais.",
      ],
      visualAssetId: "c8f2c9fc90e20837f585",
      source: "Indicação do autor",
      definitionPending: true,
    },
    false,
  ),
  entity(
    "concept-dualidade-ormuz-hades",
    "concept",
    "A Origem do Universo e a Dualidade Ormuz/Hades",
    "A gênese do cosmos fundamentada no choque eterno entre Ormuz — a Mente Criadora, guardião da ordem, causalidades e equilíbrio vital — e Hades — a antítese primordial, soberano da entropia cósmica e da aniquilação estelar. Enquanto Ormuz tece o destino e abençoa campeões através de relíquias como o Bracelete Divino, Hades materializa sua ruína através do Lampião, artefato capaz de drenar a essência de estrelas e civilizações inteiras para destronar a ordem universal.",
    {
      category: "cosmologia",
      scale: "UNIVERSAL",
      rules: [
        "Causalidade Criadora: Ormuz não intervém fisicamente de forma direta, tecendo leis de harmonia e abençoando campeões portadores de relíquias divinas.",
        "Entropia Predatória: Hades consome a energia vital de estrelas e planetas através d'O Lampião, acumulando essência para corromper a criação.",
        "Inviolabilidade Primordial: Nenhuma força mortal pode destruir Hades ou Ormuz definitivamente; apenas conter, aprisionar ou selar suas manifestações.",
      ],
      visualAssetId: "8651398f2883f1cc0309",
      source: "docs/lore/cosmology.md",
    },
    true,
  ),
  entity(
    "concept-metodologia-severum",
    "concept",
    "Metodologia Corporativo-Militar de Severum",
    "Doutrina hegemônica formulada pelo líder e estrategista supremo Arner, consolidando a cidade-estado espacial de Severum como o maior polo bélico, financeiro e industrial do cosmos. A metodologia unifica mercantilismo agressivo, neutralidade calculada diante de conflitos divinos, padronização militar draconiana através da Red Right Hand e do Esquadrão Fingers, e exploração científica pragmática de novos mercados planetários.",
    {
      category: "geopolitica",
      scale: "SETOR",
      rules: [
        "Rentabilidade Bélica: Toda intervenção armada da Red Right Hand deve produzir retorno estratégico, expansão comercial ou vantagem territorial para Severum.",
        "Comando Compartimentalizado: Células e divisões como o Esquadrão Fingers atuam com autonomia tática local sob diretrizes sigilosas de Arner.",
        "Pragmatismo Cósmico: Alianças e tratados de neutralidade são temporários e subordinados à soberania econômica e industrial de Severum.",
      ],
      visualAssetId: "fb91a9ad8dfe38591285",
      source: "docs/lore/world-building.md",
    },
    true,
  ),
  entity(
    "concept-biotecnologia-deroo-da",
    "concept",
    "Biotecnologia Deroo Da",
    "Vanguarda de bioengenharia, síntese de cibernética orgânica e enxertos biomecânicos avançados desenvolvidos nos laboratórios privados de Deroo Da em Severum. Essa tecnologia transcende as limitações biológicas convencionais, capacitando organismos vivos com exoesqueletos integrados, próteses neurais autônomas, regeneração celular acelerada e interfaces de combate que operam no limiar entre a máquina e a carne viva.",
    {
      category: "biologia",
      scale: "SETOR",
      rules: [
        "Integração Neuro-Cibernética: Próteses e enxertos ligam-se diretamente às sinapses do hospedeiro, exigindo estabilização neural para prevenir choque biomecânico.",
        "Modularidade de Combate: Sistemas de blindagem celular e armamentos integrados adaptam-se dinamicamente ao vácuo espacial e ambientes hostis.",
        "Monopólio Tecnológico: Apenas Deroo Da detém os códigos genéticos e algoritmos de sincronia sináptica dos enxertos mais letais de Severum.",
      ],
      visualAssetId: "2a14a0ec2c6a9ed44ab2",
      source: "docs/characters/deroo-da.md",
    },
    true,
  ),
  entity(
    "place-glen",
    "place",
    "Glen",
    "Metrópole central das histórias na Terra.",
    { source: "docs/lore/world-building.md" },
    true,
  ),
  entity(
    "place-severum",
    "place",
    "Severum",
    "Cidade-estado espacial governada por Arner. Sede dos laboratórios de Deroo Da e da Red Right Hand.",
    { source: "docs/lore/world-building.md" },
    true,
  ),
  entity(
    "artifact-bracelete",
    "artifact",
    "Bracelete Divino",
    "Artefato ligado a Ormuz e usado por Ciecon.",
    { source: "docs/lore/cosmology.md" },
    true,
  ),
  entity(
    "artifact-lampiao",
    "artifact",
    "O Lampião",
    "Artefato de Hades para extrair energia dos astros.",
    { source: "docs/lore/cosmology.md" },
    true,
  ),
  entity(
    "concept-enokiti",
    "concept",
    "Maldição Enokití",
    "Maldição ancestral e espiritual herdada pela linhagem dos Irmãos Yaa (Masin e Tsuuya). Concede aos portadores a capacidade de materializar e projetar lâminas afiadas de pura bioenergia sólida a partir de seus próprios corpos, multiplicando reflexos e potência física em combate sincronizado, mas cobrando um severo desgaste anímico e tributo de sangue dos usuários.",
    {
      category: "misticismo",
      scale: "TERRA",
      rules: [
        "Materialização Bioenergética: Lâminas de energia pura são conjuradas instantaneamente a partir da bioenergia do portador, cortando matérias convencionais.",
        "Custo Vital: O uso prolongado drena reservas vitais, provocando fadiga celular severa e desgaste anímico nos portadores.",
        "Vínculo de Linhagem: Apenas descendentes com a assinatura de sangue da linhagem Yaa manifestam a maldição sem rejeição fatal.",
      ],
      visualAssetId: "71f6e588b0fb73e2047a",
      source: "docs/characters/irmaos-yaa.md",
      alias: "concept-maldicao-enokiti",
    },
    true,
  ),
  entity(
    "place-antartida",
    "place",
    "Antártida",
    "Continente terrestre onde se passam os acontecimentos de Cole Froz e Yeti no relato legado.",
    { source: "legacy/uvc-1.0/txt/S_GLAC.txt" },
    true,
  ),
  entity(
    "place-lamprois",
    "place",
    "Planeta dos Lamprois",
    "Local das missões de Masin e Tsuuya no relato legado de Red Right Hand.",
    { source: "legacy/uvc-1.0/txt/SE_RRH/3.txt" },
    true,
  ),
  ...timeline.erasCosmicas.map((e) =>
    entity(`era-${e.id}`, "event", e.nome, e.descricao, {
      order: e.ordem,
      era: true,
      source: "data/timeline.json",
    }),
  ),
  ...timeline.livros.flatMap((b) =>
    b.beats.map((beat, index) =>
      entity(`event-${beat.id}`, "event", beat.titulo, beat.resumo, {
        ...beat,
        order: 100 + index,
        source: "data/timeline.json",
      }),
    ),
  ),
  ...assets.map((a) => {
    const original = media.find((item) => item.source === a.source);
    const selected = [
      "rrh-art",
      "guardioes",
      "congregadores",
      "mr",
      "ciecon",
      "deroo-art",
      "tarlin",
      "delimitador",
      "city",
      "space",
      "congregadores-logo",
      "uvc",
    ];
    const category =
      original?.kind === "scenery"
        ? "Cenários"
        : original?.kind === "symbol"
          ? "Símbolos"
          : original?.kind === "cover"
            ? "Estudos"
            : "Artes";
    return entity(
      `visual-${a.id}`,
      "visual",
      a.name,
      "",
      { assetId: a.id, source: a.source, category },
      Boolean(original && selected.includes(original.id)),
    );
  }),
  entity(
    "task-revisar-marginal",
    "task",
    "Revisar Marginal",
    "Organizar o manuscrito, as fichas e as cenas antes da próxima revisão.",
    { priority: "normal" },
  ),
];
const pairs: [string, string, string][] = book.capitulos.map((chapter) => [
  `document-rrh-${chapter.numero}`,
  "story-red-right-hand",
  "capítulo de",
]);
pairs.push(
  ["arner", "place-severum", "governa"],
  ["deroo-da", "place-severum", "trabalha em"],
  ["ciecon", "artifact-bracelete", "usa"],
  ["hades", "artifact-lampiao", "usa"],
  ["ormuz", "artifact-bracelete", "ligado a"],
  ["kin", "kerry", "pai de"],
  ["clara", "kerry", "mãe de"],
  ["dizz", "ciecon", "orienta"],
  ["cole-froz", "yeti", "encontra"],
  ["story-marginal", "place-glen", "ambientado em"],
  ["task-revisar-marginal", "story-marginal", "trabalha em"],
);
pairs.push(
  ["general-dawmnes", "cole-froz", "enfrenta"],
  ["tay", "delimitador", "enfrenta"],
  ["masin", "irmaos-yaa", "integra"],
  ["tsuuya", "irmaos-yaa", "integra"],
  ["masin", "concept-enokiti", "porta"],
  ["tsuuya", "concept-enokiti", "porta"],
  ["cole-froz", "place-antartida", "atua em"],
  ["yeti", "place-antartida", "habita"],
  ["masin", "place-lamprois", "atua em"],
  ["tsuuya", "place-lamprois", "atua em"],
);
pairs.push(
  // Dualidade Ormuz/Hades
  ["concept-dualidade-ormuz-hades", "ormuz", "fundamenta"],
  ["concept-dualidade-ormuz-hades", "hades", "fundamenta"],
  ["concept-dualidade-ormuz-hades", "artifact-lampiao", "fundamenta"],
  ["concept-dualidade-ormuz-hades", "artifact-bracelete", "fundamenta"],
  ["concept-dualidade-ormuz-hades", "faction-congregadores", "relacionado"],
  ["concept-dualidade-ormuz-hades", "faction-alianca-demoniaca", "relacionado"],

  // Metodologia Corporativo-Militar de Severum
  ["concept-metodologia-severum", "arner", "fundamenta"],
  ["concept-metodologia-severum", "place-severum", "fundamenta"],
  ["concept-metodologia-severum", "faction-red-right-hand", "fundamenta"],
  ["concept-metodologia-severum", "story-red-right-hand", "fundamenta"],
  ["concept-metodologia-severum", "deroo-da", "relacionado"],

  // Biotecnologia Deroo Da
  ["concept-biotecnologia-deroo-da", "deroo-da", "fundamenta"],
  ["concept-biotecnologia-deroo-da", "place-severum", "relacionado"],
  ["concept-biotecnologia-deroo-da", "faction-red-right-hand", "relacionado"],
  ["concept-biotecnologia-deroo-da", "story-red-right-hand", "relacionado"],

  // Maldição Enokití
  ["concept-enokiti", "masin", "fundamenta"],
  ["concept-enokiti", "tsuuya", "fundamenta"],
  ["concept-enokiti", "faction-red-right-hand", "relacionado"],
  ["concept-enokiti", "story-red-right-hand", "relacionado"],

  // Planetas Cegos
  ["concept-planetas-cegos", "place-severum", "relacionado"],
  ["concept-planetas-cegos", "faction-congregadores", "relacionado"],
  ["concept-planetas-cegos", "story-red-right-hand", "relacionado"],
);
for (const c of characters)
  for (const s of series)
    if (c.aparicoes.some((a) => a.includes(s.titulo) || s.titulo.includes(a)))
      pairs.push([c.id, `story-${s.id}`, "aparece em"]);
export const seedRelations: StudioRelation[] = pairs.map(
  ([sourceId, targetId, label]) => ({
    id: `seed-${createHash("sha256").update(`${sourceId}:${targetId}:${label}`).digest("hex").slice(0, 24)}`,
    sourceId,
    targetId,
    label,
  }),
);
