import { z } from "zod";

export const uuidSchema = z.string().uuid("Nieprawidłowy identyfikator.");

export const createReservationSchema = z.object({
  gameId: uuidSchema,
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
