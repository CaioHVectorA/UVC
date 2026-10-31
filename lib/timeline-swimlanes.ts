import { z } from "zod";
import type { StudioEntity } from "@/lib/workspace";
import timelineData from "@/data/timeline.json";

// ============================================================================
// Tipos e Schemas Fundamentais da Cronologia em Raias Paralelas (UVC Studio)
// ============================================================================

export const cosmicEraIds = [
  "pre-universal",
  "formacao",
  "ascensao",
  "redencao",
  "renegacao",
] as const;

export type CosmicEraId = (typeof cosmicEraIds)[number];

export const swimlaneIds = ["earth", "severum"] as const;
export type SwimlaneId = (typeof swimlaneIds)[number];
export type TimelineSwimlane = SwimlaneId;

export const eventScales = ["TERRA", "UNIVERSAL", "HÍBRIDA"] as const;
export type EventScale = (typeof eventScales)[number];

export const eventCanonStatuses = [
  "CANONE_TRAVADO",
  "EM_REVISAO",
  "RASCUNHO",
] as const;
export type EventCanonStatus = (typeof eventCanonStatuses)[number];

export const syncConnectionTypes = [
  "causal",
  "resonance",
  "thematic-contrast",
  "temporal-echo",
  "allied-convergence",
  "synchronized-invasion",
] as const;
export type SyncConnectionType = (typeof syncConnectionTypes)[number];

export interface CosmicEra {
  id: CosmicEraId;
  nome: string;
  ordem: number;
  resumo: string;
  descricao: string;
  cor: string;
}

export interface SwimlaneConfig {
  id: SwimlaneId;
  nome: string;
  subtitulo: string;
  descricao: string;
  corBorda: string;
  corAccent: string;
  icone: "globe" | "orbit";
  sagas: string[];
  faccoesPrincipais: string[];
}

export const timelineEventSchema = z.object({
  id: z.string().min(1),
  titulo: z.string().trim().min(1),
  resumo: z.string(),
  descricao: z.string().optional(),
  eraId: z.enum(cosmicEraIds),
  swimlane: z.enum(swimlaneIds),
  scale: z.enum(eventScales),
  order: z.number().int().nonnegative(),
  local: z.string().trim().min(1),
  pov: z.string().trim().min(1),
  personagens: z.array(z.string().trim().min(1)),
  status: z.enum(eventCanonStatuses),
  sagaId: z.string().optional(),
  livroId: z.string().optional(),
  capitulo: z.number().int().nonnegative().optional(),
  notas: z.string().optional(),
  syncAnchorId: z.string().optional(),
  syncTargetEventId: z.string().optional(),
  source: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type TimelineEvent = z.infer<typeof timelineEventSchema>;

export const syncAnchorSchema = z.object({
  id: z.string().min(1),
  eraId: z.enum(cosmicEraIds),
  earthEventId: z.string().min(1),
  severumEventId: z.string().min(1),
  title: z.string().trim().min(1),
  description: z.string(),
  connectionType: z.enum(syncConnectionTypes),
});

export type SyncAnchor = z.infer<typeof syncAnchorSchema>;

export interface TimelineFilterOptions {
  eraId?: CosmicEraId | "all";
  swimlane?: SwimlaneId | "all";
  scale?: EventScale | "all";
  character?: string | "all";
  characterId?: string | "all";
  sagaId?: string | "all";
  storyId?: string | "all";
  status?: EventCanonStatus | "all";
  searchQuery?: string;
}

export interface EraSwimlaneMatrix {
  era: CosmicEra;
  earthEvents: TimelineEvent[];
  severumEvents: TimelineEvent[];
}

export interface TimelineStats {
  totalEvents: number;
  earthCount: number;
  severumCount: number;
  ratioEarthPercent: number;
  ratioSeverumPercent: number;
  byEra: Record<CosmicEraId, { total: number; earth: number; severum: number }>;
  lockedCount: number;
  inReviewCount: number;
  draftCount: number;
  lockedPercent: number;
  syncAnchorsCount: number;
}

// ============================================================================
// Metadados Canônicos das 5 Eras Cósmicas e Configuração das Raias
// ============================================================================

export const cosmicEras: readonly CosmicEra[] = [
  {
    id: "pre-universal",
    nome: "Pré-Universal",
    ordem: 1,
    resumo:
      "Formação do Universo: os planetas começam a se formar e a vida cósmica floresce a partir da luz de Ormuz.",
    descricao:
      "O período primordial da criação. A Mente de Ormuz tece as leis da física, as dimensões e a casualidade cósmica.",
    cor: "#00F2FE",
  },
  {
    id: "formacao",
    nome: "Formação",
    ordem: 2,
    resumo:
      "Formação da Terra, criação da dicotomia Beenie-Kevin e o início do cataclismo universal.",
    descricao:
      "A esfera planetária da Terra começa a se conectar às energias cósmicas. Surge a rivalidade seminal que ecoará pelos séculos.",
    cor: "#3B82F6",
  },
  {
    id: "ascensao",
    nome: "Ascensão",
    ordem: 3,
    resumo:
      "Sodoma e Gomorra Cósmica: civilizações alcançam o ápice de riqueza e corrupção moral.",
    descricao:
      "Mundos florescem através do comércio interestelar e da tirania. As brechas espirituais começam a se alargar.",
    cor: "#FFB800",
  },
  {
    id: "redencao",
    nome: "Redenção",
    ordem: 4,
    resumo:
      "Redenção — A Grande Guerra Cósmica e os sacrifícios por liberdade.",
    descricao:
      "Revoltas de mundos escravizados, surgimento dos primeiros mártires e a união de rebeldes contra grandes impérios.",
    cor: "#10B981",
  },
  {
    id: "renegacao",
    nome: "Renegação",
    ordem: 5,
    resumo:
      "Apresentação do conflito que dita o universo e a encarnação do maior antagonista: Hades.",
    descricao:
      "Hades assume forma corpórea, forja o Lampião para consumir a energia dos astros e marchar em direção ao trono de Ormuz.",
    cor: "#FF2A54",
  },
] as const;

export const swimlaneConfigs: Record<SwimlaneId, SwimlaneConfig> = {
  earth: {
    id: "earth",
    nome: "Raia 1: Terra / Glen",
    subtitulo: "Conflitos Urbanos, Despertar Heróico & Defesa Planetária",
    descricao:
      "Os Guardiões (Beenie, Inera, Alero), Menino Resiliente (Larry), Kerry e a luta contra a máfia dos Tineros e a infiltração demoníaca.",
    corBorda: "#3B82F6",
    corAccent: "#91e3dc",
    icone: "globe",
    sagas: ["guardioes", "menino-resiliente", "kerry", "marginal"],
    faccoesPrincipais: ["guardioes", "tineros", "alianca-demoniaca"],
  },
  severum: {
    id: "severum",
    nome: "Raia 2: Severum / Espaço Profundo",
    subtitulo: "Geopolítica Cósmica, Expansão Mercantil & Cruzada Rebelde",
    descricao:
      "Red Right Hand (Arner, Deroo Da, Delimitador, Fingers), Congregadores (Ciecon, Rex, Naok) e a marcha entrópica de Hades.",
    corBorda: "#FF2A54",
    corAccent: "#ff746a",
    icone: "orbit",
    sagas: [
      "red-right-hand",
      "congregadores",
      "punho-mortal",
      "deroo-da-no-espaco",
      "ciecon",
      "hades",
    ],
    faccoesPrincipais: ["red-right-hand", "congregadores", "fingers"],
  },
};

// ============================================================================
// Catálogo Canônico de Eventos Base (Para População Integral das 5 Eras)
// ============================================================================

export const canonicalBaselineEvents: readonly TimelineEvent[] = [
  // --- ERA 1: PRÉ-UNIVERSAL ---
  {
    id: "event-cosmic-pre-01",
    titulo: "A Luz de Ormuz & O Abismo Primordial de Hades",
    resumo:
      "A Mente de Ormuz tece as leis físicas, as dimensões e a causalidade do cosmos. No vácuo exterior, Hades emerge como a entropia pura e inicia o planejamento d'O Lampião.",
    eraId: "pre-universal",
    swimlane: "severum",
    scale: "UNIVERSAL",
    order: 10,
    local: "Cosmos Primordial",
    pov: "Ormuz",
    personagens: ["Ormuz", "Hades"],
    status: "CANONE_TRAVADO",
    sagaId: "hades",
    source: "docs/lore/cosmology.md",
    syncAnchorId: "sync-anchor-genesis",
    syncTargetEventId: "event-earth-pre-01",
  },
  {
    id: "event-earth-pre-01",
    titulo: "Gênese Planetária Terrestre & Campo Causal de Glen",
    resumo:
      "Sob a regência de Ormuz, a esfera da Terra solidifica seu núcleo. O vale de Glen se estabelece como nó de convergência energética e espiritual planetária.",
    eraId: "pre-universal",
    swimlane: "earth",
    scale: "TERRA",
    order: 15,
    local: "Terra / Glen",
    pov: "Ormuz",
    personagens: ["Ormuz"],
    status: "CANONE_TRAVADO",
    sagaId: "guardioes",
    source: "docs/lore/world-building.md",
    syncAnchorId: "sync-anchor-genesis",
    syncTargetEventId: "event-cosmic-pre-01",
  },

  // --- ERA 2: FORMAÇÃO ---
  {
    id: "event-cosmic-form-01",
    titulo: "A Descoberta do Bracelete Divino por Ciecon",
    resumo:
      "Ciecon ouve a voz cósmica de Dizz em seu subconsciente e encontra o lendário Bracelete Divino de Ormuz, abrindo as primeiras dobras espaciais para desafiar tiranos galácticos.",
    eraId: "formacao",
    swimlane: "severum",
    scale: "UNIVERSAL",
    order: 20,
    local: "Espaço Profundo",
    pov: "Ciecon",
    personagens: ["Ciecon", "Dizz", "Ormuz"],
    status: "CANONE_TRAVADO",
    sagaId: "ciecon",
    source: "docs/characters/ciecon.md",
    syncAnchorId: "sync-anchor-awakening",
    syncTargetEventId: "event-earth-form-01",
  },
  {
    id: "event-earth-form-01",
    titulo: "As Primeiras Anomalias e a Dicotomia Beenie-Kevin",
    resumo:
      "Manifestação das primeiras correntes sobrenaturais em Glen. Kevin é corrompido pela influência espiritual de Hades, enquanto Paw Froz inicia sua infiltração sob o disfarce de comerciante idoso.",
    eraId: "formacao",
    swimlane: "earth",
    scale: "TERRA",
    order: 25,
    local: "Glen",
    pov: "Beenie",
    personagens: ["Beenie", "Kevin", "Paw Froz"],
    status: "CANONE_TRAVADO",
    sagaId: "guardioes",
    source: "data/characters.json",
    syncAnchorId: "sync-anchor-awakening",
    syncTargetEventId: "event-cosmic-form-01",
  },

  // --- ERA 3: ASCENSÃO (Eventos Terrestres Simultâneos a RRH e Punho Mortal) ---
  {
    id: "event-earth-asc-01",
    titulo: "O Massacre dos Tineros e o Despertar da Pele de Aço",
    resumo:
      "A máfia dos Tineros, chefiada por Luy, assassina os pais de Kerry na sua frente. Resgatado por um mestre misterioso, Kerry suporta o doloroso endurecimento de sua pele em aço puro e jura vingança implacável.",
    eraId: "ascensao",
    swimlane: "earth",
    scale: "TERRA",
    order: 30,
    local: "Subúrbios de Glen",
    pov: "Kerry",
    personagens: ["Kerry", "Kin", "Clara", "Luy"],
    status: "CANONE_TRAVADO",
    sagaId: "kerry",
    source: "legacy/uvc-1.0/txt/S_KER.txt",
    syncAnchorId: "sync-anchor-trauma-mercantile",
    syncTargetEventId: "event-rrh1-b01",
  },
  {
    id: "event-earth-asc-02",
    titulo: "O Acidente de Larry e o Despertar do Menino Resiliente",
    resumo:
      "Larry sofre um terrível acidente fabril em Glen. Após cirurgia experimental de alto risco, seus tecidos adquirem elasticidade e absorção de impacto extraordinárias, consagrando-o como protetor da cidade.",
    eraId: "ascensao",
    swimlane: "earth",
    scale: "TERRA",
    order: 35,
    local: "Centro Industrial de Glen",
    pov: "Larry",
    personagens: ["Larry/MR"],
    status: "CANONE_TRAVADO",
    sagaId: "menino-resiliente",
    source: "docs/characters/larry-mr.md",
    syncAnchorId: "sync-anchor-heroes-invasion",
    syncTargetEventId: "event-pm-b02",
  },
  {
    id: "event-earth-asc-03",
    titulo: "A Manifestação da Telecinese e a Fundação dos Guardiões",
    resumo:
      "Após o desaparecimento de seus pais no falso mercado de Paw Froz, Beenie manifesta telecinese destrutiva. Inera canaliza chamas vivas e Alero bioeletricidade, fundando a equipe dos Guardiões em Glen.",
    eraId: "ascensao",
    swimlane: "earth",
    scale: "TERRA",
    order: 40,
    local: "Bairro dos Guardiões / Glen",
    pov: "Beenie",
    personagens: ["Beenie", "Inera", "Alero", "Paw Froz"],
    status: "CANONE_TRAVADO",
    sagaId: "guardioes",
    source: "docs/characters/beenie.md",
  },

  // --- ERA 4: REDENÇÃO ---
  {
    id: "event-cosmic-red-01",
    titulo: "A Formação dos Congregadores & O Resgate de Rex e Naok",
    resumo:
      "Ciecon intercepta comboios de escravos de Severum, resgata o guerreiro mutante Rex e forja aliança sagrada com Naok, consolidando a armada rebelde dos Congregadores contra o império mercantil da RRH.",
    eraId: "redencao",
    swimlane: "severum",
    scale: "UNIVERSAL",
    order: 50,
    local: "Espaço Profundo / Campos de Severum",
    pov: "Ciecon",
    personagens: ["Ciecon", "Rex", "Naok", "Delimitador"],
    status: "CANONE_TRAVADO",
    sagaId: "congregadores",
    source: "docs/lore/canon-timeline.md",
    syncAnchorId: "sync-anchor-allied-resistance",
    syncTargetEventId: "event-earth-red-01",
  },
  {
    id: "event-earth-red-01",
    titulo: "A Aliança de Glen & O Glacial Fim do Mundo",
    resumo:
      "Cole Froz e Yeti ameaçam congelar a biosfera a partir da Antártida. O General Dawmnes apela aos Guardiões, que se unem a Kerry e ao Menino Resiliente para conter a catástrofe planetária.",
    eraId: "redencao",
    swimlane: "earth",
    scale: "TERRA",
    order: 55,
    local: "Glen & Antártida",
    pov: "Beenie",
    personagens: [
      "Beenie",
      "Larry/MR",
      "Kerry",
      "Cole Froz",
      "Yeti",
      "General Dawmnes",
    ],
    status: "CANONE_TRAVADO",
    sagaId: "guardioes",
    source: "legacy/uvc-1.0/txt/S_GLAC.txt",
    syncAnchorId: "sync-anchor-allied-resistance",
    syncTargetEventId: "event-cosmic-red-01",
  },

  // --- ERA 5: RENEGAÇÃO ---
  {
    id: "event-cosmic-ren-01",
    titulo: "A Marcha d'O Lampião de Hades contra o Trono de Ormuz",
    resumo:
      "Hades empunha O Lampião abastecido com a energia de centenas de estrelas devoradas e marcha até o Trono de Ormuz. As forças de Severum e a frota dos Congregadores colidem no vácuo cósmico final.",
    eraId: "renegacao",
    swimlane: "severum",
    scale: "UNIVERSAL",
    order: 60,
    local: "Vácuo Cósmico Superior",
    pov: "Hades",
    personagens: ["Hades", "Ormuz", "Ciecon", "Arner"],
    status: "CANONE_TRAVADO",
    sagaId: "hades",
    source: "docs/lore/cosmology.md",
    syncAnchorId: "sync-anchor-cosmic-apocalypse",
    syncTargetEventId: "event-earth-ren-01",
  },
  {
    id: "event-earth-ren-01",
    titulo: "O Apocalipse de Glen: Incursão Terrestre de Hades",
    resumo:
      "A Aliança Demoníaca lança investida total contra Glen. Kevin e Paw Froz desmantelam defesas enquanto a manifestação de Hades projeta sua sombra sobre a Terra para colher as almas humanas.",
    eraId: "renegacao",
    swimlane: "earth",
    scale: "TERRA",
    order: 65,
    local: "Glen",
    pov: "Beenie",
    personagens: ["Beenie", "Kevin", "Paw Froz", "Hades", "Kerry", "Larry/MR"],
    status: "CANONE_TRAVADO",
    sagaId: "guardioes",
    source: "docs/characters/hades.md",
    syncAnchorId: "sync-anchor-cosmic-apocalypse",
    syncTargetEventId: "event-cosmic-ren-01",
  },
] as const;

// ============================================================================
// Âncoras de Sincronização entre as Raias (Cross-Swimlane Sync Anchors)
// ============================================================================

export const canonicalSyncAnchors: readonly SyncAnchor[] = [
  {
    id: "sync-anchor-genesis",
    eraId: "pre-universal",
    earthEventId: "event-earth-pre-01",
    severumEventId: "event-cosmic-pre-01",
    title: "Causalidade Primordial vs Entropia Cósmica",
    description:
      "A Mente de Ormuz tece as leis físicas que ancoram a Terra e o vale de Glen no mesmo ciclo em que Hades desperta nas bordas do abismo forjando O Lampião.",
    connectionType: "causal",
  },
  {
    id: "sync-anchor-awakening",
    eraId: "formacao",
    earthEventId: "event-earth-form-01",
    severumEventId: "event-cosmic-form-01",
    title: "Ressonância dos Campeões: Bracelete e Anomalias",
    description:
      "A ativação do Bracelete Divino de Ormuz no cosmos reverbera pela malha dimensional, despertando as primeiras mutações latentes em Glen e a corrupção de Kevin.",
    connectionType: "resonance",
  },
  {
    id: "sync-anchor-trauma-mercantile",
    eraId: "ascensao",
    earthEventId: "event-earth-asc-01",
    severumEventId: "event-rrh1-b01",
    title: "Eco do Sangue: A Rocha de Severum e o Luto de Kerry",
    description:
      "Enquanto Arner transforma Severum em um polo bélico e submete Masin e Tsuuya a lâminas dérmicas, os Tineros assassinam a família de Kerry nos subúrbios de Glen.",
    connectionType: "temporal-echo",
  },
  {
    id: "sync-anchor-heroes-invasion",
    eraId: "ascensao",
    earthEventId: "event-earth-asc-02",
    severumEventId: "event-pm-b02",
    title: "Contraste Moral: O Menino Resiliente vs A Queda de Iutania",
    description:
      "No exato período em que Larry renasce como símbolo de superação e proteção em Glen, o Delimitador esmaga a civilização de Iutania, forçando Naok a forjar o Punho Mortal.",
    connectionType: "thematic-contrast",
  },
  {
    id: "sync-anchor-allied-resistance",
    eraId: "redencao",
    earthEventId: "event-earth-red-01",
    severumEventId: "event-cosmic-red-01",
    title: "Convergência Aliada: Guardiões e Congregadores",
    description:
      "A união heróica de Beenie, Larry e Kerry para defender a Terra contra o congelamento global espelha a frota rebelde de Ciecon, Rex e Naok libertando mundos oprimidos.",
    connectionType: "allied-convergence",
  },
  {
    id: "sync-anchor-cosmic-apocalypse",
    eraId: "renegacao",
    earthEventId: "event-earth-ren-01",
    severumEventId: "event-cosmic-ren-01",
    title: "A Dupla Ofensiva de Hades: Terra e Trono de Ormuz",
    description:
      "Hades executa sua pinça cósmica: avança com O Lampião para destronar Ormuz no vácuo superior enquanto seus generais Kevin e Paw Froz conflagam as ruas de Glen.",
    connectionType: "synchronized-invasion",
  },
] as const;

// ============================================================================
// Heurística Pura de Classificação de Raias
// ============================================================================

const EARTH_SAGAS = new Set([
  "guardioes",
  "menino-resiliente",
  "kerry",
  "marginal",
  "o-glacial-fim-do-mundo",
]);

const SEVERUM_SAGAS = new Set([
  "red-right-hand",
  "congregadores",
  "punho-mortal",
  "deroo-da-no-espaco",
  "ciecon",
  "hades",
]);

const EARTH_CHARACTERS = new Set([
  "beenie",
  "inera",
  "alero",
  "larry",
  "larry-mr",
  "mr",
  "kerry",
  "luy",
  "kin",
  "clara",
  "kevin",
  "paw froz",
  "paw-froz",
  "cole froz",
  "cole-froz",
  "yeti",
  "general dawmnes",
  "general-dawmnes",
  "marginal",
]);

const SEVERUM_CHARACTERS = new Set([
  "arner",
  "deroo da",
  "deroo-da",
  "delimitador",
  "tarlin",
  "curtin",
  "mylon",
  "chin",
  "ellis",
  "masin",
  "tsuuya",
  "masin yaa",
  "tsuuya yaa",
  "irmaos-yaa",
  "ciecon",
  "rex",
  "naok",
  "naok-pm",
  "lamproy",
  "firn",
  "tay",
  "dizz",
]);

export type CandidateEvent = {
  id?: string;
  titulo?: string;
  title?: string;
  resumo?: string;
  summary?: string;
  descricao?: string;
  body?: string;
  eraId?: string;
  swimlane?: string;
  scale?: string;
  escala?: string;
  order?: number;
  local?: string;
  pov?: string;
  personagens?: string[];
  characters?: string[];
  status?: string;
  sagaId?: string;
  storyId?: string;
  livroId?: string;
  capitulo?: number;
  notas?: string;
  syncAnchorId?: string;
  syncTargetEventId?: string;
  source?: string;
  tags?: string[];
  attributes?: Record<string, unknown> | null;
  [key: string]: unknown;
};

export type SwimlaneClassificationResult = SwimlaneId | "unclassified";

export function classifySwimlane(
  candidate: CandidateEvent,
  options: { allowUnclassified?: boolean; fallback?: SwimlaneId } = {},
): SwimlaneId {
  const result = classifyEventSwimlaneInternal(candidate);
  if (result === "unclassified") {
    return options.fallback ?? "severum";
  }
  return result;
}

export function classifyEventSwimlane(
  candidate: CandidateEvent,
): SwimlaneClassificationResult {
  return classifyEventSwimlaneInternal(candidate);
}

function classifyEventSwimlaneInternal(
  candidate: CandidateEvent,
): SwimlaneClassificationResult {
  if (!candidate) return "unclassified";

  // 1. Tag explícita ou atributo configurado
  if (candidate.swimlane === "earth" || candidate.swimlane === "severum") {
    return candidate.swimlane;
  }
  const rawSwimlane = candidate.attributes?.swimlane;
  if (rawSwimlane === "earth" || rawSwimlane === "severum") {
    return rawSwimlane as SwimlaneId;
  }

  // 2. Saga ou Livro vinculado
  const saga = (
    candidate.sagaId ||
    (typeof candidate.attributes?.serieId === "string"
      ? candidate.attributes.serieId
      : "") ||
    (typeof candidate.attributes?.storyId === "string"
      ? candidate.attributes.storyId
      : "")
  ).toLowerCase();

  if (saga) {
    for (const s of EARTH_SAGAS) {
      if (saga.includes(s)) return "earth";
    }
    for (const s of SEVERUM_SAGAS) {
      if (saga.includes(s)) return "severum";
    }
  }

  // 3. Local / Cenário
  const loc = (
    candidate.local ||
    (typeof candidate.attributes?.local === "string"
      ? candidate.attributes.local
      : "")
  ).toLowerCase();

  if (loc) {
    if (
      loc.includes("glen") ||
      loc.includes("terra") ||
      loc.includes("antártida") ||
      loc.includes("antartida") ||
      loc.includes("subúrbio") ||
      loc.includes("suburbio")
    ) {
      return "earth";
    }
    if (
      loc.includes("severum") ||
      loc.includes("iutania") ||
      loc.includes("lamproi") ||
      loc.includes("espaço") ||
      loc.includes("espaco") ||
      loc.includes("cosmos") ||
      loc.includes("vácuo") ||
      loc.includes("vacuo") ||
      loc.includes("torre rrh")
    ) {
      return "severum";
    }
  }

  // 4. Personagens e Ponto de Vista (POV)
  const candidateCharacters = Array.isArray(candidate.personagens)
    ? candidate.personagens
    : [];
  const attrCharacters = Array.isArray(candidate.attributes?.personagens)
    ? (candidate.attributes?.personagens as string[])
    : [];
  const povStr =
    typeof candidate.pov === "string"
      ? candidate.pov
      : typeof candidate.attributes?.pov === "string"
        ? candidate.attributes.pov
        : "";

  const cast: string[] = [...candidateCharacters, ...attrCharacters, povStr]
    .filter(Boolean)
    .map((c) => String(c).toLowerCase());

  for (const c of cast) {
    for (const ec of EARTH_CHARACTERS) {
      if (c.includes(ec)) return "earth";
    }
    for (const sc of SEVERUM_CHARACTERS) {
      if (c.includes(sc)) return "severum";
    }
  }

  // 5. Escala como fallback
  const scale =
    candidate.scale ||
    candidate.escala ||
    (typeof candidate.attributes?.escala === "string"
      ? candidate.attributes.escala
      : undefined);

  if (scale === "TERRA") return "earth";
  if (scale === "UNIVERSAL") return "severum";

  return "unclassified";
}

// ============================================================================
// Particionamento de Raias (para testes unitários e visualizações dedicadas)
// ============================================================================

export function partitionSwimlanes<T extends CandidateEvent>(
  events: T[],
): {
  earthLane: T[];
  severumLane: T[];
  unclassified: T[];
} {
  const earthLane: T[] = [];
  const severumLane: T[] = [];
  const unclassified: T[] = [];

  for (const event of events) {
    const classification = classifyEventSwimlaneInternal(event);
    if (classification === "earth") {
      earthLane.push(event);
    } else if (classification === "severum") {
      severumLane.push(event);
    } else {
      unclassified.push(event);
    }
  }

  return { earthLane, severumLane, unclassified };
}

// ============================================================================
// Ordenação Cronológica Segura das 5 Eras
// ============================================================================

export function sortTimelineEvents<T extends CandidateEvent & { id?: string }>(
  events: T[],
  eras: readonly { id: string; ordem?: number }[] = cosmicEras,
): T[] {
  const eraOrderMap = new Map<string, number>(
    eras.map((e, index) => [
      e.id,
      typeof e.ordem === "number" ? e.ordem : index + 1,
    ]),
  );

  return [...events].sort((a, b) => {
    const aEraId = a.eraId || (a.attributes?.eraId as string) || "";
    const bEraId = b.eraId || (b.attributes?.eraId as string) || "";

    const aEraOrder = eraOrderMap.get(aEraId) ?? 999;
    const bEraOrder = eraOrderMap.get(bEraId) ?? 999;

    if (aEraOrder !== bEraOrder) {
      return aEraOrder - bEraOrder;
    }

    const aOrder =
      typeof a.order === "number"
        ? a.order
        : typeof a.attributes?.order === "number"
          ? (a.attributes.order as number)
          : 100;
    const bOrder =
      typeof b.order === "number"
        ? b.order
        : typeof b.attributes?.order === "number"
          ? (b.attributes.order as number)
          : 100;

    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }

    const aTitle = a.title || a.titulo || a.id || "";
    const bTitle = b.title || b.titulo || b.id || "";
    return aTitle.localeCompare(bTitle);
  });
}

// ============================================================================
// Normalização Unificada de Eventos (Workspace + JSON + Baseline)
// ============================================================================

export function normalizeTimelineEvents(
  workspaceEntities: StudioEntity[] = [],
  canonTimelineBeats?: {
    id: string;
    capitulo?: number;
    titulo: string;
    eraId: string;
    local: string;
    pov: string;
    personagens: string[];
    status: string;
    resumo: string;
    notas?: string;
    serieId?: string;
    livroId?: string;
  }[],
): TimelineEvent[] {
  const eventMap = new Map<string, TimelineEvent>();

  const beats =
    canonTimelineBeats && canonTimelineBeats.length > 0
      ? canonTimelineBeats
      : timelineData.livros.flatMap((b) =>
          b.beats.map((beat) => ({
            ...beat,
            serieId: b.serieId,
            livroId: b.id,
          })),
        );

  // 1. Carregar catálogo base canônico das 5 eras
  for (const base of canonicalBaselineEvents) {
    eventMap.set(base.id, { ...base });
  }

  // 2. Processar beats vindos de data/timeline.json
  for (const beat of beats) {
    const eventId = beat.id.startsWith("event-") ? beat.id : `event-${beat.id}`;
    const swimlane = classifySwimlane(
      {
        sagaId: beat.serieId,
        local: beat.local,
        pov: beat.pov,
        personagens: beat.personagens,
      },
      { fallback: "severum" },
    );

    const eraId = (
      cosmicEraIds.includes(beat.eraId as CosmicEraId) ? beat.eraId : "ascensao"
    ) as CosmicEraId;

    const status: EventCanonStatus =
      beat.status === "CANONE_TRAVADO" ||
      beat.status === "EM_REVISAO" ||
      beat.status === "RASCUNHO"
        ? beat.status
        : "EM_REVISAO";

    const normalized: TimelineEvent = {
      id: eventId,
      titulo: beat.titulo,
      resumo: beat.resumo,
      eraId,
      swimlane,
      scale: swimlane === "earth" ? "TERRA" : "UNIVERSAL",
      order: 100 + (beat.capitulo ?? 0) * 10,
      local: beat.local,
      pov: beat.pov,
      personagens: beat.personagens,
      status,
      sagaId: beat.serieId,
      livroId: beat.livroId,
      capitulo: beat.capitulo,
      notas: beat.notas,
      source: "data/timeline.json",
    };

    eventMap.set(eventId, normalized);
  }

  // 3. Processar entidades do tipo "event" cadastradas no Workspace Studio
  for (const ent of workspaceEntities) {
    if (ent.kind !== "event") continue;
    const attrs = ent.attributes || {};
    if (attrs.era === true) continue; // Pular entidades representativas de Eras Cósmicas

    const eraId = (
      cosmicEraIds.includes(attrs.eraId as CosmicEraId)
        ? attrs.eraId
        : "ascensao"
    ) as CosmicEraId;

    const swimlane = classifySwimlane(
      {
        swimlane: attrs.swimlane as SwimlaneId,
        sagaId: typeof attrs.sagaId === "string" ? attrs.sagaId : undefined,
        local: typeof attrs.local === "string" ? attrs.local : undefined,
        pov: typeof attrs.pov === "string" ? attrs.pov : undefined,
        personagens: Array.isArray(attrs.personagens)
          ? (attrs.personagens as string[])
          : undefined,
        attributes: attrs,
      },
      { fallback: "severum" },
    );

    const status: EventCanonStatus =
      attrs.status === "CANONE_TRAVADO" ||
      attrs.status === "EM_REVISAO" ||
      attrs.status === "RASCUNHO"
        ? (attrs.status as EventCanonStatus)
        : ent.status === "done" || ent.status === "ready"
          ? "CANONE_TRAVADO"
          : ent.status === "review"
            ? "EM_REVISAO"
            : "RASCUNHO";

    const existing = eventMap.get(ent.id);

    const merged: TimelineEvent = {
      id: ent.id,
      titulo: ent.title,
      resumo: ent.summary || existing?.resumo || ent.body.slice(0, 500),
      descricao: ent.body || existing?.descricao,
      eraId,
      swimlane,
      scale:
        attrs.scale === "TERRA" ||
        attrs.scale === "UNIVERSAL" ||
        attrs.scale === "HÍBRIDA"
          ? (attrs.scale as EventScale)
          : existing?.scale || (swimlane === "earth" ? "TERRA" : "UNIVERSAL"),
      order:
        typeof attrs.order === "number"
          ? attrs.order
          : (existing?.order ?? 200),
      local:
        typeof attrs.local === "string"
          ? attrs.local
          : existing?.local || "Glen",
      pov:
        typeof attrs.pov === "string" ? attrs.pov : existing?.pov || "Narrador",
      personagens: Array.isArray(attrs.personagens)
        ? (attrs.personagens as string[])
        : existing?.personagens || [],
      status,
      sagaId:
        typeof attrs.sagaId === "string" ? attrs.sagaId : existing?.sagaId,
      livroId:
        typeof attrs.livroId === "string" ? attrs.livroId : existing?.livroId,
      capitulo:
        typeof attrs.capitulo === "number"
          ? attrs.capitulo
          : existing?.capitulo,
      notas: typeof attrs.notas === "string" ? attrs.notas : existing?.notas,
      syncAnchorId:
        typeof attrs.syncAnchorId === "string"
          ? attrs.syncAnchorId
          : existing?.syncAnchorId,
      syncTargetEventId:
        typeof attrs.syncTargetEventId === "string"
          ? attrs.syncTargetEventId
          : existing?.syncTargetEventId,
      source: "uvc_entities",
      tags: ent.tags,
    };

    eventMap.set(ent.id, merged);
  }

  // Ordenar cronologicamente por ordem de Era e ordem interna do evento
  const eraOrderMap = new Map<CosmicEraId, number>(
    cosmicEras.map((e) => [e.id, e.ordem]),
  );

  return Array.from(eventMap.values()).sort((a, b) => {
    const eraDiff =
      (eraOrderMap.get(a.eraId) ?? 99) - (eraOrderMap.get(b.eraId) ?? 99);
    if (eraDiff !== 0) return eraDiff;
    return a.order - b.order;
  });
}

// ============================================================================
// Filtragem e Busca em Tempo Real
// ============================================================================

function removeAccents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function filterTimelineEvents(
  events: TimelineEvent[],
  options: TimelineFilterOptions = {},
): TimelineEvent[] {
  const {
    eraId = "all",
    swimlane = "all",
    scale = "all",
    character = "all",
    characterId = "all",
    sagaId = "all",
    storyId = "all",
    status = "all",
    searchQuery = "",
  } = options;

  const targetCharacter = character !== "all" ? character : characterId;
  const targetSaga = sagaId !== "all" ? sagaId : storyId;

  const q = removeAccents(searchQuery.trim().toLowerCase());

  return events.filter((ev) => {
    // 1. Filtro por Era
    if (eraId !== "all" && ev.eraId !== eraId) {
      return false;
    }

    // 2. Filtro por Raia (Swimlane)
    if (swimlane !== "all" && ev.swimlane !== swimlane) {
      return false;
    }

    // 3. Filtro por Escala
    if (scale !== "all" && ev.scale !== scale) {
      return false;
    }

    // 4. Filtro por Estado Canônico
    if (status !== "all" && ev.status !== status) {
      return false;
    }

    // 5. Filtro por Saga / História
    if (targetSaga !== "all") {
      const sagaNormalized = removeAccents(targetSaga.toLowerCase());
      const evSaga = removeAccents((ev.sagaId || "").toLowerCase());
      const evLivro = removeAccents((ev.livroId || "").toLowerCase());
      if (
        !evSaga.includes(sagaNormalized) &&
        !evLivro.includes(sagaNormalized)
      ) {
        return false;
      }
    }

    // 6. Filtro por Personagem
    if (targetCharacter !== "all") {
      const charLower = removeAccents(targetCharacter.toLowerCase());
      const inCast = ev.personagens.some((p) =>
        removeAccents(p.toLowerCase()).includes(charLower),
      );
      const isPov = removeAccents(ev.pov.toLowerCase()).includes(charLower);
      if (!inCast && !isPov) {
        return false;
      }
    }

    // 7. Busca Textual por Termo
    if (q) {
      const corpus = removeAccents(
        `${ev.titulo} ${ev.resumo} ${ev.local} ${ev.pov} ${ev.personagens.join(" ")} ${ev.notas || ""}`,
      ).toLowerCase();
      if (!corpus.includes(q)) {
        return false;
      }
    }

    return true;
  });
}

// ============================================================================
// Agrupamento Matricial (Era x Swimlane) para Renderização Paralela
// ============================================================================

export function groupEventsByEraAndSwimlane(
  events: TimelineEvent[],
  eras: readonly CosmicEra[] = cosmicEras,
): EraSwimlaneMatrix[] {
  return eras.map((era) => {
    const eraEvents = events.filter((ev) => ev.eraId === era.id);
    return {
      era,
      earthEvents: eraEvents.filter((ev) => ev.swimlane === "earth"),
      severumEvents: eraEvents.filter((ev) => ev.swimlane === "severum"),
    };
  });
}

export function groupEventsByEra<T extends CandidateEvent>(
  events: T[],
  eras: readonly CosmicEra[] = cosmicEras,
): Record<string, { era: CosmicEra; earthEvents: T[]; severumEvents: T[] }> {
  const result: Record<
    string,
    { era: CosmicEra; earthEvents: T[]; severumEvents: T[] }
  > = {};

  for (const era of eras) {
    result[era.id] = {
      era,
      earthEvents: [],
      severumEvents: [],
    };
  }

  for (const ev of events) {
    const eraId = ev.eraId || (ev.attributes?.eraId as string);
    if (!eraId || !result[eraId]) continue;

    const classification = classifySwimlane(ev);
    if (classification === "earth") {
      result[eraId].earthEvents.push(ev);
    } else {
      result[eraId].severumEvents.push(ev);
    }
  }

  return result;
}

// ============================================================================
// Consultas e Resolução de Sincronicidade (Sync Anchors)
// ============================================================================

export function getSyncAnchors(): SyncAnchor[] {
  return [...canonicalSyncAnchors];
}

export function getSyncLinksForEvent(
  eventId: string,
  anchors: readonly SyncAnchor[] = canonicalSyncAnchors,
): SyncAnchor[] {
  return anchors.filter(
    (a) => a.earthEventId === eventId || a.severumEventId === eventId,
  );
}

export function getPairedEventId(
  eventId: string,
  anchors: readonly SyncAnchor[] = canonicalSyncAnchors,
): string | undefined {
  const anchor = anchors.find(
    (a) => a.earthEventId === eventId || a.severumEventId === eventId,
  );
  if (!anchor) return undefined;
  return anchor.earthEventId === eventId
    ? anchor.severumEventId
    : anchor.earthEventId;
}

export interface ConcurrentEventPair {
  id: string;
  earthEventId: string;
  severumEventId: string;
  syncMarker?: string;
  title?: string;
  description?: string;
}

export function findConcurrentEventPairs<
  T extends CandidateEvent & { id?: string },
>(
  events: T[],
  anchors: readonly SyncAnchor[] = canonicalSyncAnchors,
): ConcurrentEventPair[] {
  const pairs: ConcurrentEventPair[] = [];
  const processedKeys = new Set<string>();

  // 1. Verificar pares definidos em canonicalSyncAnchors
  const eventIds = new Set(events.map((e) => e.id).filter(Boolean) as string[]);
  for (const anchor of anchors) {
    if (
      eventIds.has(anchor.earthEventId) &&
      eventIds.has(anchor.severumEventId)
    ) {
      const key = `${anchor.earthEventId}::${anchor.severumEventId}`;
      if (!processedKeys.has(key)) {
        pairs.push({
          id: anchor.id,
          earthEventId: anchor.earthEventId,
          severumEventId: anchor.severumEventId,
          title: anchor.title,
          description: anchor.description,
        });
        processedKeys.add(key);
      }
    }
  }

  // 2. Verificar sincronia baseada em syncMarker ou syncWithId/syncTargetEventId
  const markerMap = new Map<
    string,
    {
      earth?: string;
      severum?: string;
    }
  >();

  for (const ev of events) {
    if (!ev.id) continue;
    const marker =
      (ev.attributes?.syncMarker as string) ||
      (ev.syncAnchorId as string) ||
      "";
    if (marker) {
      const current = markerMap.get(marker) || {};
      const swimlane = classifySwimlane(ev);
      if (swimlane === "earth") current.earth = ev.id;
      else current.severum = ev.id;
      markerMap.set(marker, current);
    }

    const directTarget =
      (ev.syncTargetEventId as string) ||
      (ev.attributes?.syncWithId as string) ||
      (ev.attributes?.syncTargetEventId as string);

    if (directTarget && eventIds.has(directTarget)) {
      const swimlane = classifySwimlane(ev);
      const earthId = swimlane === "earth" ? ev.id : directTarget;
      const severumId = swimlane === "earth" ? directTarget : ev.id;
      const key = `${earthId}::${severumId}`;
      if (!processedKeys.has(key)) {
        pairs.push({
          id: `pair-${key}`,
          earthEventId: earthId,
          severumEventId: severumId,
        });
        processedKeys.add(key);
      }
    }
  }

  for (const [marker, pair] of markerMap.entries()) {
    if (pair.earth && pair.severum) {
      const key = `${pair.earth}::${pair.severum}`;
      if (!processedKeys.has(key)) {
        pairs.push({
          id: `marker-${marker}`,
          earthEventId: pair.earth,
          severumEventId: pair.severum,
          syncMarker: marker,
        });
        processedKeys.add(key);
      }
    }
  }

  return pairs;
}

// ============================================================================
// Métricas Estatísticas do Universo (Cockpit & Universe Radar)
// ============================================================================

export function computeTimelineStats(events: CandidateEvent[]): TimelineStats {
  const totalEvents = events.length;
  let earthCount = 0;
  let severumCount = 0;
  let lockedCount = 0;
  let inReviewCount = 0;
  let draftCount = 0;

  const byEra: Record<
    CosmicEraId,
    { total: number; earth: number; severum: number }
  > = {
    "pre-universal": { total: 0, earth: 0, severum: 0 },
    formacao: { total: 0, earth: 0, severum: 0 },
    ascensao: { total: 0, earth: 0, severum: 0 },
    redencao: { total: 0, earth: 0, severum: 0 },
    renegacao: { total: 0, earth: 0, severum: 0 },
  };

  for (const ev of events) {
    const swimlane = classifySwimlane(ev);
    if (swimlane === "earth") earthCount++;
    else severumCount++;

    const status = ev.status || (ev.attributes?.status as string) || "RASCUNHO";

    if (
      status === "CANONE_TRAVADO" ||
      status === "ready" ||
      status === "done"
    ) {
      lockedCount++;
    } else if (status === "EM_REVISAO" || status === "review") {
      inReviewCount++;
    } else {
      draftCount++;
    }

    const eraId = (ev.eraId || ev.attributes?.eraId) as CosmicEraId;

    if (eraId && byEra[eraId]) {
      byEra[eraId].total++;
      if (swimlane === "earth") byEra[eraId].earth++;
      else byEra[eraId].severum++;
    }
  }

  const ratioEarthPercent = totalEvents
    ? Math.round((earthCount / totalEvents) * 100)
    : 50;
  const ratioSeverumPercent = totalEvents
    ? Math.round((severumCount / totalEvents) * 100)
    : 50;
  const lockedPercent = totalEvents
    ? Math.round((lockedCount / totalEvents) * 100)
    : 0;

  return {
    totalEvents,
    earthCount,
    severumCount,
    ratioEarthPercent,
    ratioSeverumPercent,
    byEra,
    lockedCount,
    inReviewCount,
    draftCount,
    lockedPercent,
    syncAnchorsCount: canonicalSyncAnchors.length,
  };
}

export const calculateTimelineMetrics = computeTimelineStats;
