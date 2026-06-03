import { isServiceError } from "@/lib/services/errors";

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export function ok<T>(data?: T): ActionResult<T> {
  return { success: true, data };
}

export function fail(error: string): ActionResult<never> {
  return { success: false, error };
}

/** Mapuje ServiceError na ActionResult; inne błędy propaguje dalej. */
export function fromServiceError<T = void>(e: unknown): ActionResult<T> {
  if (isServiceError(e)) return fail(e.message);
  throw e;
}
