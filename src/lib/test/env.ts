/** Mutable view of process.env for unit tests (avoids TS read-only NODE_ENV). */
export const mutableEnv = process.env as Record<string, string | undefined>;

export function setTestEnv(key: string, value: string | undefined) {
  if (value === undefined) delete mutableEnv[key];
  else mutableEnv[key] = value;
}
