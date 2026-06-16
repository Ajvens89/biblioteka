type ErrorContext = Record<string, unknown>;

/**
 * Centralne raportowanie błędów (konsola). Aby włączyć Sentry, dodaj @sentry/nextjs
 * i ustaw SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN w .env.
 */
export function reportError(error: unknown, context?: ErrorContext): void {
  const message = error instanceof Error ? error.message : String(error);
  const payload = { message, stack: error instanceof Error ? error.stack : undefined, ...context };

  if (process.env.NODE_ENV === "production") {
    console.error("[Biblioteka]", JSON.stringify(payload));
  } else {
    console.error("[Biblioteka]", message, context ?? {});
  }
}

export function reportMessage(message: string, context?: ErrorContext): void {
  console.warn("[Biblioteka]", message, context ?? {});
}
