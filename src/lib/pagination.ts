import { z } from "zod";

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export const pageParamsSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).optional().default(DEFAULT_PAGE_SIZE),
});

export type PageParams = z.infer<typeof pageParamsSchema>;

export function parsePageParams(
  searchParams: Record<string, string | undefined>,
  options?: { defaultPageSize?: number },
): PageParams {
  return pageParamsSchema.parse({
    page: searchParams.page,
    pageSize: searchParams.pageSize ?? options?.defaultPageSize,
  });
}

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function totalPagesFromCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function dbSkipTake(page: number, pageSize: number): { skip: number; take: number } {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

/** Paginacja tablicy w pamięci (testy, małe zbiory). */
export function paginate<T>(items: T[], page: number, pageSize: number): PaginatedResult<T> {
  const total = items.length;
  const totalPages = totalPagesFromCount(total, pageSize);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const skip = (safePage - 1) * pageSize;
  return {
    items: items.slice(skip, skip + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

export async function paginateQuery<T>(
  countFn: () => Promise<number>,
  findFn: (skip: number, take: number) => Promise<T[]>,
  page: number,
  pageSize: number,
): Promise<PaginatedResult<T>> {
  const { skip, take } = dbSkipTake(page, pageSize);
  const [total, items] = await Promise.all([countFn(), findFn(skip, take)]);
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: totalPagesFromCount(total, pageSize),
  };
}

export function buildPageQueryString(
  params: Record<string, string | undefined>,
  page: number,
): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "page") sp.set(key, value);
  }
  sp.set("page", String(page));
  return sp.toString();
}
