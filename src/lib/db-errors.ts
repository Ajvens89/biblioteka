/** Błędy Prisma przy martwej / zrestartowanej bazie (np. Prisma Dev). */
export function isPrismaConnectionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code?: string }).code) : "";
  if (code === "P1001" || code === "P1017") return true;
  const message = errorMessage(error);
  return (
    message.includes("Can't reach database server") ||
    message.includes("Server has closed the connection") ||
    message.includes("Connection terminated") ||
    message.includes("ECONNREFUSED")
  );
}

/** Przejściowe błędy silnika / poolera — retry lub null w dev (Prisma Dev + Turbopack). */
export function isPrismaTransientError(error: unknown): boolean {
  if (isPrismaConnectionError(error)) return true;
  const message = errorMessage(error);
  return (
    message.includes("Response from the Engine was empty") ||
    message.includes("Engine is not yet connected") ||
    message.includes("Client has already been released") ||
    message.includes("prepared statement") ||
    message.includes("Error in PostgreSQL connection") ||
    message.includes("UnexpectedMessage")
  );
}

function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: string }).message);
  }
  return String(error);
}
