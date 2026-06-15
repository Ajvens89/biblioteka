import { z } from "zod";
import { validateCoverImageUrl } from "@/lib/services/ean-providers/image-utils";

const safeCoverUrl = z
  .string()
  .optional()
  .or(z.literal(""))
  .transform((v) => {
    if (!v) return "";
    return validateCoverImageUrl(v) ?? "";
  });

const gameTypeEnum = z.enum([
  "BOARD",
  "CARD",
  "RPG",
  "WARGAME",
  "EDUCATIONAL",
  "PARTY",
  "FAMILY",
]);

const collectionTypeEnum = z.enum(["BOARD_GAME", "RPG"]);

const difficultyEnum = z.enum(["EASY", "MEDIUM", "HARD", "EXPERT"]);

const baseGameFields = {
  title: z.string().min(2, "Tytuł jest wymagany"),
  slug: z.string().min(2).optional(),
  ean: z.string().optional().nullable(),
  collectionType: collectionTypeEnum.optional().default("BOARD_GAME"),
  description: z.string().optional(),
  shortDescription: z.string().max(300).optional(),
  difficulty: difficultyEnum.default("MEDIUM"),
  type: gameTypeEnum,
  publisherId: z.string().optional().nullable(),
  designerId: z.string().optional().nullable(),
  yearPublished: z.coerce.number().int().optional().nullable(),
  coverImageUrl: safeCoverUrl,
  coverImageSource: z.string().max(64).optional().nullable(),
  coverImageExternalId: z.string().max(128).optional().nullable(),
  instructionUrl: z.string().url().optional().or(z.literal("")),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  categoryIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  skipEanChecksum: z.boolean().optional(),
  addCopy: z.boolean().optional(),
  copyInventoryNumber: z.string().optional(),
  copyBarcode: z.string().optional(),
  copyLocation: z.string().optional(),
  copyCondition: z.enum(["NEW", "GOOD", "FAIR", "POOR"]).optional(),
};

export const gameSchema = z
  .object({
    ...baseGameFields,
    minPlayers: z.coerce.number().int().min(0).optional(),
    maxPlayers: z.coerce.number().int().min(0).optional(),
    minAge: z.coerce.number().int().min(0).optional(),
    minPlayTime: z.coerce.number().int().min(0).optional(),
    maxPlayTime: z.coerce.number().int().min(0).optional(),
  })
  .superRefine((data, ctx) => {
    const isRpg = data.collectionType === "RPG";
    if (!isRpg) {
      if (data.minPlayers == null || data.minPlayers < 1) {
        ctx.addIssue({ code: "custom", message: "Min graczy jest wymagane (co najmniej 1)", path: ["minPlayers"] });
      }
      if (data.maxPlayers == null || data.maxPlayers < 1) {
        ctx.addIssue({ code: "custom", message: "Max graczy jest wymagane (co najmniej 1)", path: ["maxPlayers"] });
      }
      if (data.minAge == null) {
        ctx.addIssue({ code: "custom", message: "Wiek jest wymagany", path: ["minAge"] });
      }
      if (data.minPlayTime == null || data.minPlayTime < 1) {
        ctx.addIssue({ code: "custom", message: "Min czas jest wymagany (co najmniej 1 min)", path: ["minPlayTime"] });
      }
      if (data.maxPlayTime == null || data.maxPlayTime < 1) {
        ctx.addIssue({ code: "custom", message: "Max czas jest wymagany (co najmniej 1 min)", path: ["maxPlayTime"] });
      }
    }
  })
  .transform((data) => {
    const isRpg = data.collectionType === "RPG";
    return {
      ...data,
      minPlayers: data.minPlayers ?? (isRpg ? 1 : 2),
      maxPlayers: data.maxPlayers ?? (isRpg ? 6 : 4),
      minAge: data.minAge ?? (isRpg ? 0 : 10),
      minPlayTime: data.minPlayTime ?? (isRpg ? 0 : 30),
      maxPlayTime: data.maxPlayTime ?? (isRpg ? 0 : 60),
    };
  });

export const lookupEanSchema = z.object({
  ean: z.string().min(1, "Podaj kod EAN lub ISBN"),
  titleHint: z.string().max(200).optional(),
  collectionType: collectionTypeEnum.optional(),
});

export const lookupEanByTitleSchema = z.object({
  title: z.string().min(2, "Podaj tytuł gry (min. 2 znaki)").max(200),
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
  ean: z.string().optional(),
  category: z.string().optional(),
  type: gameTypeEnum.optional(),
  collectionType: collectionTypeEnum.optional(),
  difficulty: difficultyEnum.optional(),
  minPlayers: z.coerce.number().optional(),
  maxPlayers: z.coerce.number().optional(),
  minAge: z.coerce.number().optional(),
  maxPlayTime: z.coerce.number().optional(),
  availability: z.enum(["available", "all"]).optional(),
  tag: z.string().optional(),
  publisher: z.string().optional(),
  designer: z.string().optional(),
  sort: z
    .enum([
      "title",
      "newest",
      "popular",
      "available",
      "playtime_asc",
      "playtime_desc",
    ])
    .optional()
    .default("title"),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(48).optional().default(12),
});

export type GameInput = z.infer<typeof gameSchema>;
export type CopyInput = z.infer<typeof copySchema>;
export type GameFilterInput = z.infer<typeof gameFilterSchema>;
