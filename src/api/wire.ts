import type { QueryParams } from './client';

/**
 * Canonical list params in, Laravel wire params out.
 *
 * The web client carries a second branch here for the legacy AdonisJS API,
 * which spells rows-per-page `pageSize`. This app was never pointed at Adonis,
 * so only the Laravel spelling exists. Kept as a function anyway because the
 * failure mode it guards against is silent: Laravel drops an unknown query key
 * rather than erroring, so a misspelled filter renders a full, unfiltered list
 * with the filter chips lit up.
 */
export interface ListParams {
  page?: number;
  perPage?: number;
  statuses?: readonly (number | string)[];
  status?: number | string;
  search?: string;
}

export interface ListWireOptions {
  /**
   * How Laravel spells the status filter on THIS endpoint. Most take a
   * `statuses` array; admin hub-owners and the wallet queues read a single
   * `status`.
   */
  statusStyle?: 'array' | 'scalar';
}

export function listQuery<T extends ListParams>(
  params: T,
  options: ListWireOptions = {},
): QueryParams {
  const { perPage, statuses, status, ...rest } = params;

  const wire: Record<string, unknown> = { ...rest };
  if (perPage !== undefined) wire.per_page = perPage;

  const selected = statuses ?? (status !== undefined && status !== '' ? [status] : undefined);
  if (selected && selected.length > 0) {
    // A scalar endpoint takes one value; sending the rest would misreport what
    // was filtered, so multi-select needs the array form or its own call.
    if (options.statusStyle === 'scalar') wire.status = selected[0];
    else wire.statuses = [...selected];
  }

  return wire;
}
