import * as Sentry from "@sentry/nextjs";

export async function register() {
  const { assertProductionAuthSafe } = await import("@/lib/auth/production-guard");
  assertProductionAuthSafe();

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
