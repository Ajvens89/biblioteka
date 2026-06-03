import { z } from "zod";

const gameTypeEnum = z.enum([
  "BOARD",
  "CARD",
  "RPG",
  "WARGAME",
  "EDUCATIONAL",
  "PARTY",
  "FAMILY",
]);

const difficultyEnum = z.enum(["EASY", "MEDIUM", "HARD", "EXPERT"]);

export const gameSchema = z.object({
  title: z.string().min(2, "Tytuł jest wymagany"),
  slug: z.string().min(2).optional(),
  description: z.string().optional(),
  shortDescription: z.string().max(300).optional(),
  minPlayers: z.coerce.number().int().min(1),
  maxPlayers: z.coerce.number().int().min(1),
  minAge: z.coerce.number().int().min(0),
  minPlayTime: z.coerce.number().int().min(1),
  maxPlayTime: z.coerce.number().int().min(1),
  difficulty: difficultyEnum,
  type: gameTypeEnum,
  publisherId: z.string().optional().nullable(),
  designerId: z.string().optional().nullable(),
  yearPublished: z.coerce.number().int().optional().nullable(),
  coverImageUrl: z.string().url().optional().or(z.literal("")),
  instructionUrl: z.string().url().optional().or(z.literal("")),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  categoryIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
});

export const copySchema = z.object({
  gameId: z.string().uuid(),
  inventoryNumber: z.string().min(1, "Numer inwentarzowy jest wymagany"),
  barcode: z.string().optional(),
  status: z.enum([
    "AVAILABLE",
    "RESERVED",
    "BORROWED",
    "DAMAGED",
    "LOST",
    "REPAIR",
    "RETIRED",
  ]),
  condition: z.enum(["NEW", "GOOD", "FAIR", "POOR"]),
  location: z.string().optional(),
  notes: z.string().optional(),
});

export const gameFilterSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  type: gameTypeEnum.optional(),
  difficulty: difficultyEnum.optional(),
  minPlayers: z.coerce.number().optional(),
  maxPlayers: z.coerce.number().optional(),
  minAge: z.coerce.number().optional(),
  availability: z.enum(["available", "all"]).optional(),
  tag: z.string().optional(),
  publisher: z.string().optional(),
  designer: z.string().optional(),
  sort: z
    .enum(["title", "newest", "popular", "available"])
    .optional()
    .default("title"),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(48).optional().default(12),
});

export type GameInput = z.infer<typeof gameSchema>;
export type CopyInput = z.infer<typeof copySchema>;
export type GameFilterInput = z.infer<typeof gameFilterSchema>;
