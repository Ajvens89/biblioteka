import bcrypt from "bcryptjs";

/** Koszt bcrypt (sól generowana automatycznie w prefiksie $2a$...). */
const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!hash.startsWith("$2")) return false;
  return bcrypt.compare(password, hash);
}
