import type { CopyStatus } from "@prisma/client";

export function copyStatusCounts(copies: { status: CopyStatus }[]) {
  const count = (s: CopyStatus) => copies.filter((c) => c.status === s).length;
  return {
    total: copies.length,
    available: count("AVAILABLE"),
    reserved: count("RESERVED"),
    borrowed: count("BORROWED"),
    other: copies.length - count("AVAILABLE") - count("RESERVED") - count("BORROWED"),
  };
}
