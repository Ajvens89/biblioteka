import { headers } from "next/headers";
import { clientKeyFromHeaders, hashRateLimitKey } from "@/lib/rate-limit/pg-rate-limit";

export async function getRequestClientKey(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const realIp = h.get("x-real-ip");
  return clientKeyFromHeaders(forwarded, realIp);
}

export function emailRateLimitKey(email: string, clientKey: string): string {
  return hashRateLimitKey(`${email.toLowerCase()}:${clientKey}`);
}
