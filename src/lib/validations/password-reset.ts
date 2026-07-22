import { z } from "zod";

export const passwordResetRequestSchema = z.object({
  email: z.string().email("Podaj poprawny adres e-mail"),
});

export const passwordResetConfirmSchema = z
  .object({
    token: z.string().min(16, "Nieprawidłowy token"),
    password: z
      .string()
      .min(12, "Hasło musi mieć co najmniej 12 znaków")
      .regex(/[A-Za-z]/, "Hasło musi zawierać literę")
      .regex(/[0-9]/, "Hasło musi zawierać cyfrę"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Hasła muszą być identyczne",
    path: ["confirmPassword"],
  });

export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>;
