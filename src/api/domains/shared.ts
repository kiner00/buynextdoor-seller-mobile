import type { ApiEnvelope, Paginated } from '../types';

/**
 * Helpers every domain module shares. Kept tiny on purpose: the point of a
 * per-domain module is that each one states its own verified contract.
 */
export const unwrap = <T>(envelope: ApiEnvelope<T>): T => envelope.data;

/**
 * Laravel's `{ data, meta }` → the flat page the app reads. Tolerant of the
 * `{ items }`-only lists (chat conversations, wallet ledger) that carry no
 * meta at all — those come back as a single page.
 */
export function adaptPage<T>(raw: unknown, rowsKey = 'data'): Paginated<T> {
  const row = (raw ?? {}) as Record<string, unknown>;
  const rows = (
    Array.isArray(row[rowsKey]) ? row[rowsKey] : Array.isArray(row.items) ? row.items : []
  ) as T[];
  const meta = (row.meta ?? {}) as Record<string, unknown>;
  return {
    data: rows,
    current_page: Number(meta.current_page ?? 1),
    last_page: Number(meta.last_page ?? 1),
    per_page: Number(meta.per_page ?? rows.length),
    total: Number(meta.total ?? rows.length),
  };
}

export const nextPage = <T>(last: Paginated<T>) =>
  last.current_page < last.last_page ? last.current_page + 1 : undefined;
