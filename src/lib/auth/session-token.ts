export const SESSION_COOKIE = "biblioteka_session";

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

/** Cookie zawiera tylko profileId + HMAC — bez e-maila, roli ani hasła. */
export async function signProfileSession(profileId: string): Promise<string> {
  const sig = await hmacSha256Hex(getSecret(), profileId);
  return `${profileId}.${sig}`;
}

export async function verifyProfileSession(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const profileId = token.slice(0, dot);
  if (!/^[0-9a-f-]{36}$/i.test(profileId)) return null;
  const sig = token.slice(dot + 1);
  const expected = await hmacSha256Hex(getSecret(), profileId);
  if (!timingSafeEqualHex(sig, expected)) return null;
  return profileId;
}
