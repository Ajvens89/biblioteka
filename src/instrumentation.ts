export async function register() {
  const { assertProductionAuthSafe } = await import("@/lib/auth/production-guard");
  assertProductionAuthSafe();
}
