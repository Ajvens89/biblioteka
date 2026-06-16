import * as Sentry from "@sentry/nextjs";

type ErrorContext = Record<string, unknown>;

function isSentryEnabled(): boolean {
  return Boolean(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN);
}

export function reportError(error: unknown, context?: ErrorContext): void {
  const message = error instanceof Error ? error.message : String(error);

  if (process.env.NODE_ENV !== "production") {
    console.error("[Biblioteka]", message, context ?? {});
  } else {
    console.error("[Biblioteka]", JSON.stringify({ message, ...context }));
  }

  if (isSentryEnabled()) {
    Sentry.captureException(error, { extra: context });
  }
}

export function reportMessage(message: string, context?: ErrorContext): void {
  console.warn("[Biblioteka]", message, context ?? {});
  if (isSentryEnabled()) {
    Sentry.captureMessage(message, { extra: context, level: "warning" });
  }
}
