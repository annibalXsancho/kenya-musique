import { z } from 'zod';

/** Schémas = source unique des types (CLAUDE.md §7). */

export const ID_RE = /^[a-z0-9]{15}$/;

const idSchema = z.string().regex(ID_RE);
const day = z.iso.date();
const dateTime = z.iso.datetime({ offset: true, local: true });
const ts = z.iso.datetime({ offset: true });

const base = {
  id: idSchema,
  createdAt: ts,
  updatedAt: ts,
  deleted: z.boolean().default(false),
};

const sprintStatut = z.enum(['backlog', 'planifie', 'en_cours', 'termine']);

export const schemas = {
  vision: z.object({
    ...base,
    texte: z.string().default(''),
    horizon: z.string().default(''),
    piliers: z.array(z.string()).default([]),
  }),
  objectifs: z.object({
    ...base,
    titre: z.string().min(1),
    periode: z.string(),
    ordre: z.number().int().default(0),
  }),
  krs: z.object({
    ...base,
    objectifId: idSchema,
    libelle: z.string().min(1),
    unite: z.string().default(''),
    cible: z.number(),
    mode: z.enum(['sessions', 'manuel']).default('sessions'),
    valeurManuelle: z.number().optional(),
  }),
  phases: z.object({
    ...base,
    nom: z.string().min(1),
    debut: day,
    fin: day,
    ordre: z.number().int().default(0),
  }),
  sprints: z.object({
    ...base,
    phaseId: idSchema,
    numero: z.number().int(),
    sujet: z.string().min(1),
    objectif: z.string().default(''),
    debut: day,
    fin: day,
    debutInitial: day.optional(),
    finInitial: day.optional(),
    statut: sprintStatut.default('backlog'),
    krIds: z.array(idSchema).default([]),
  }),
  etapes: z.object({
    ...base,
    sprintId: idSchema,
    titre: z.string().min(1),
    ordre: z.number().int().default(0),
    debut: day.optional(),
    fin: day.optional(),
    statut: sprintStatut.default('backlog'),
    estimationMin: z.number().int().optional(),
    taches: z
      .array(z.object({ id: idSchema, texte: z.string(), fait: z.boolean().default(false) }))
      .default([]),
  }),
  creneaux: z.object({
    ...base,
    debut: dateTime,
    fin: dateTime,
    sprintId: idSchema.optional(),
    etapeId: idSchema.optional(),
    titre: z.string().default(''),
    intention: z.string().default(''),
    doneQuand: z.string().default(''),
    contrainte: z.string().default(''),
    krIds: z.array(idSchema).default([]),
    statut: z.enum(['planifie', 'valide', 'non_atteint']).default('planifie'),
    sessionId: idSchema.optional(),
  }),
  sessions: z.object({
    ...base,
    date: day,
    dureeMin: z.number().int().positive(),
    sprintId: idSchema.optional(),
    etapeId: idSchema.optional(),
    creneauId: idSchema.optional(),
    type: z.string().min(1),
    intention: z.string().default(''),
    conditionAtteinte: z.boolean().default(true),
    plus: z.array(z.string()).default([]),
    moins: z.array(z.string()).default([]),
    livrables: z
      .array(
        z.object({ label: z.string(), url: z.string().optional(), fichier: z.string().optional() }),
      )
      .default([]),
    contributions: z.array(z.object({ krId: idSchema, n: z.number() })).default([]),
    note: z.string().default(''),
  }),
  indisponibilites: z.object({
    ...base,
    libelle: z.string().min(1),
    debut: day,
    fin: day,
    type: z.enum(['cours', 'autre']).default('autre'),
  }),
  reglages: z.object({
    ...base,
    cibleHebdoMin: z.number().default(300),
    cibleHebdoMax: z.number().default(540),
    partPratiqueCible: z.number().default(0.8),
    typesSession: z.array(z.string()).default([]),
    typesPratique: z.array(z.string()).default([]),
    ordreCartesAccueil: z.array(z.string()).default([]),
  }),
} as const;

export type CollectionName = keyof typeof schemas;
export type Doc<C extends CollectionName> = z.output<(typeof schemas)[C]>;
export type CreateInput<C extends CollectionName> = Omit<
  z.input<(typeof schemas)[C]>,
  'id' | 'createdAt' | 'updatedAt' | 'deleted'
>;

export type Session = Doc<'sessions'>;
export type Reglages = Doc<'reglages'>;

export const COLLECTIONS = Object.keys(schemas) as CollectionName[];

export const DEFAULT_TYPES_SESSION = ['pratique', 'production', 'étude', 'veille', 'stratégie'];
export const DEFAULT_REGLAGES = {
  cibleHebdoMin: 300,
  cibleHebdoMax: 540,
  partPratiqueCible: 0.8,
  typesSession: DEFAULT_TYPES_SESSION,
  typesPratique: ['pratique', 'production'],
  ordreCartesAccueil: [] as string[],
};
