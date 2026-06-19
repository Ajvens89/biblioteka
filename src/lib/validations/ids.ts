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

export const editCopySchema = z.object({
  copyId: uuidSchema,
  inventoryNumber: z.string().min(1, "Numer inwentarzowy jest wymagany"),
  barcode: z.string().optional(),
  status: updateCopyStatusSchema.shape.status,
  condition: z.enum(["NEW", "GOOD", "FAIR", "POOR"]),
  location: z.string().optional(),
  notes: z.string().optional(),
});

export const walkInLoanSchema = z.object({
  userId: uuidSchema,
  copyId: uuidSchema,
});

export const circulationLookupSchema = z.object({
  query: z.string().trim().min(1, "Podaj kod lub adres e-mail."),
});

export const rejectReservationSchema = z.object({
  reservationId: uuidSchema,
  reason: z
    .string()
    .trim()
    .min(3, "Podaj powód odrzucenia (min. 3 znaki).")
    .max(500, "Powód jest zbyt długi."),
});

export const extendPickupSchema = z.object({
  reservationId: uuidSchema,
  days: z.coerce.number().int().min(1).max(30).optional().default(3),
});

export const updateUserRoleSchema = z.object({
  profileId: uuidSchema,
  role: z.enum(["USER", "LIBRARIAN", "ADMIN"]),
});

export const gameIdSchema = z.object({
  id: uuidSchema,
});
