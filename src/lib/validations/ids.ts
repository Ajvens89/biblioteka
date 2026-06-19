import { z } from "zod";

export const uuidSchema = z.string().uuid("Nieprawidłowy identyfikator.");

export const createReservationSchema = z.object({
  gameId: uuidSchema,
});

export const createReservationAsStaffSchema = z.object({
  gameId: uuidSchema,
  targetUserId: uuidSchema,
  reason: z
    .string()
    .trim()
    .min(3, "Podaj powód obejścia limitów (min. 3 znaki).")
    .max(500, "Powód jest zbyt długi."),
  bypassLimits: z.boolean().optional().default(false),
});

export const reservationIdSchema = z.object({
  reservationId: uuidSchema,
});

export const loanIdSchema = z.object({
  loanId: uuidSchema,
});

export const copyIdSchema = z.object({
  copyId: uuidSchema,
});

export const updateCopyStatusSchema = z.object({
  copyId: uuidSchema,
  status: z.enum([
    "AVAILABLE",
    "RESERVED",
    "BORROWED",
    "DAMAGED",
    "LOST",
    "REPAIR",
    "RETIRED",
  ]),
});

export const updateUserRoleSchema = z.object({
  profileId: uuidSchema,
  role: z.enum(["USER", "LIBRARIAN", "ADMIN"]),
});

export const gameIdSchema = z.object({
  id: uuidSchema,
});
