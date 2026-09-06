import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../client';
import { listQuery } from '../wire';
import type { ApiEnvelope, Paginated } from '../types';

/**
 * The seller's wallet — `/hubowner/wallet/*`.
 *
 * Three endpoints, three different response shapes, all verified against the
 * API on 2026-09-06. This is not a guess and it is not tidy:
 *
 *   /wallet             { balance, income_balance }        plain object
 *   /wallet/ledgers     { items: [...] }                   NO pagination
 *   /wallet/topups      { data: [...], meta: {...} }       real paginator
 *   /wallet/withdrawals { data: [...], meta: {...} }       real paginator
 *
 * The ledger one matters most: `WalletService::ledgerFor` does
 * `->limit($perPage)->get()`, so `page` is accepted and ignored. Asking for
 * page 2 returns page 1 again. Anything built on infinite scroll here would
 * append the same rows forever, so the ledger is a plain capped list.
 */

export interface WalletBalance {
  balance: number;
  income_balance: number | null;
}

/** `type` is 1 for credit, 0 for debit. */
export interface LedgerEntry {
  id: number;
  amount: number;
  before_amount: number;
  reference_number: string | null;
  remarks: string | null;
  type: number;
  created_at: string | null;
}

/** 0 pending, 1 approved, 2 rejected — WalletTopupStatus on the API. */
export type RequestStatus = 0 | 1 | 2;

export interface TopupRequest {
  id: number;
  amount: number;
  status: RequestStatus;
  reference_number: string | null;
  payment_receipt_number: string | null;
  remarks: string | null;
  proof_of_payment: string | null;
  created_at: string | null;
}

export interface WithdrawalRequest {
  id: number;
  amount: number;
  status: RequestStatus;
  reference_number: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  remarks: string | null;
  created_at: string | null;
}

export interface CreateWithdrawalInput {
  amount: number;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  remarks?: string;
}

export interface CreateTopupInput {
  amount: number;
  payment_receipt_number?: string;
  remarks?: string;
  /** A photo of the deposit slip, from the camera or the library. */
  proof?: { uri: string; name: string; mimeType: string };
}

const unwrap = <T>(envelope: ApiEnvelope<T>): T => envelope.data;

/** `{ data, meta }` → the flat shape the app reads. */
function adaptPage<T>(raw: unknown): Paginated<T> {
  const row = (raw ?? {}) as Record<string, unknown>;
  const rows = (Array.isArray(row.data) ? row.data : []) as T[];
  const meta = (row.meta ?? {}) as Record<string, unknown>;
  return {
    data: rows,
    current_page: Number(meta.current_page ?? 1),
    last_page: Number(meta.last_page ?? 1),
    per_page: Number(meta.per_page ?? rows.length),
    total: Number(meta.total ?? rows.length),
  };
}

/**
 * React Native's FormData takes `{ uri, name, type }` for a file rather than a
 * File/Blob — there is no filesystem File object on a phone. Typed through
 * `unknown` because the DOM lib's FormData signature does not describe it.
 */
function topupFormData(input: CreateTopupInput): FormData {
  const form = new FormData();
  form.append('amount', String(input.amount));
  if (input.payment_receipt_number) {
    form.append('payment_receipt_number', input.payment_receipt_number);
  }
  if (input.remarks) form.append('remarks', input.remarks);
  if (input.proof) {
    form.append('proof_of_payment', {
      uri: input.proof.uri,
      name: input.proof.name,
      type: input.proof.mimeType,
    } as unknown as Blob);
  }
  return form;
}

export const walletApi = {
  balance: () => apiFetch<ApiEnvelope<WalletBalance>>('/hubowner/wallet').then(unwrap),

  // No `page` param on purpose — the endpoint ignores it. `perPage` is really
  // "how many of the most recent to return".
  ledger: (perPage = 50) =>
    apiFetch<ApiEnvelope<{ items: LedgerEntry[] }>>('/hubowner/wallet/ledgers', {
      query: { per_page: perPage },
    })
      .then(unwrap)
      .then((data) => data.items ?? []),

  topups: (params: { page?: number; perPage?: number } = {}) =>
    apiFetch<ApiEnvelope<unknown>>('/hubowner/wallet/topups', { query: listQuery(params) })
      .then(unwrap)
      .then((raw) => adaptPage<TopupRequest>(raw)),

  withdrawals: (params: { page?: number; perPage?: number } = {}) =>
    apiFetch<ApiEnvelope<unknown>>('/hubowner/wallet/withdrawals', { query: listQuery(params) })
      .then(unwrap)
      .then((raw) => adaptPage<WithdrawalRequest>(raw)),

  createTopup: (input: CreateTopupInput) =>
    apiFetch<ApiEnvelope<{ id: number; reference_number: string | null }>>(
      '/hubowner/wallet/topups/create',
      // No Content-Type header: fetch has to set it itself so the multipart
      // boundary is included. Setting it by hand produces a body the server
      // cannot parse.
      { method: 'POST', raw: topupFormData(input) },
    ).then(unwrap),

  createWithdrawal: (input: CreateWithdrawalInput) =>
    apiFetch<ApiEnvelope<{ id: number; reference_number: string | null }>>(
      '/hubowner/wallet/withdrawals/create',
      { method: 'POST', json: input },
    ).then(unwrap),
};

export const walletKeys = {
  all: ['wallet'] as const,
  balance: ['wallet', 'balance'] as const,
  ledger: ['wallet', 'ledger'] as const,
  topups: ['wallet', 'topups'] as const,
  withdrawals: ['wallet', 'withdrawals'] as const,
};

export function useWalletBalance() {
  return useQuery({ queryKey: walletKeys.balance, queryFn: walletApi.balance });
}

export function useLedger() {
  return useQuery({ queryKey: walletKeys.ledger, queryFn: () => walletApi.ledger() });
}

export function useTopups() {
  return useQuery({
    queryKey: walletKeys.topups,
    queryFn: () => walletApi.topups({ perPage: 20 }),
  });
}

export function useWithdrawals() {
  return useQuery({
    queryKey: walletKeys.withdrawals,
    queryFn: () => walletApi.withdrawals({ perPage: 20 }),
  });
}

/**
 * Both requests are admin-approved, so neither changes the balance now — but
 * both add a row the seller expects to see immediately, and the balance is
 * invalidated anyway in case an approval landed while they were typing.
 */
function useWalletMutation<TInput>(mutationFn: (input: TInput) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: walletKeys.all });
    },
  });
}

export function useCreateTopup() {
  return useWalletMutation(walletApi.createTopup);
}

export function useCreateWithdrawal() {
  return useWalletMutation(walletApi.createWithdrawal);
}
