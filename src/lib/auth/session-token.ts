export const SESSION_COOKIE = "biblioteka_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;

const SESSION_VERSION = "v1";
const PROFILE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET musi mieć co najmniej 32 znaki w produkcji.");
    }
    return "dev-local-auth-secret-min-32-chars!!";
  }
  return secret;
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** The signed expiry is enforced on the server, independently of the browser cookie. */
export async function signProfileSession(profileId: string, now = Date.now()): Promise<string> {
  if (!PROFILE_ID.test(profileId) || !Number.isSafeInteger(now) || now < 0) {
    throw new Error("Nieprawidłowe dane sesji.");
  }
  const expiresAt = Math.floor(now / 1000) + SESSION_TTL_SECONDS;
  const payload = `${SESSION_VERSION}.${profileId}.${expiresAt}`;
  const sig = await hmacSha256Hex(getSecret(), payload);
  return `${payload}.${sig}`;
}

export async function verifyProfileSession(
  token: string | undefined,
  now = Date.now(),
): Promise<string | null> {
  if (!token || token.length > 160 || !Number.isSafeInteger(now) || now < 0) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [version, profileId, expiry, sig] = parts;
  if (version !== SESSION_VERSION || !PROFILE_ID.test(profileId)) return null;
  if (!/^[1-9]\d{0,12}$/.test(expiry) || !/^[0-9a-f]{64}$/.test(sig)) return null;
  const expiresAt = Number(expiry);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(now / 1000)) return null;
  const expected = await hmacSha256Hex(getSecret(), `${version}.${profileId}.${expiry}`);
  if (!timingSafeEqualHex(sig, expected)) return null;
  return profileId;
}
