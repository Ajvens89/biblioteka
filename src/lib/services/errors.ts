/** Błąd logiki biznesowej (mapowany na ActionResult w Server Actions, na FlowError w verify). */
export class ServiceError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export function isServiceError(e: unknown): e is ServiceError {
  return e instanceof ServiceError;
}
