import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../client';
import type { ApiEnvelope } from '../types';
import { unwrap } from './shared';

/** `/hubowner/branches` → `{ branches }`, verified 2026-09-06. */
export interface Branch {
  id: number;
  uuid: string | null;
  name: string;
  code: string | null;
  address_one: string | null;
  address_two: string | null;
  barangay: string | null;
  city: string | null;
  province: string | null;
  region: string | null;
  country: string | null;
  postal_code: string | null;
  full_address: string | null;
  latitude: number | null;
  longitude: number | null;
  contact_number: string | null;
  is_main: boolean;
  status: number;
}

/** StoreBranchRequest: `name` required on POST, everything else optional. */
export interface BranchInput {
  name: string;
  code?: string | null;
  address_one?: string | null;
  address_two?: string | null;
  barangay?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
  contact_number?: string | null;
}

export const branchesApi = {
  list: () =>
    apiFetch<ApiEnvelope<{ branches: Branch[] }>>('/hubowner/branches')
      .then(unwrap)
      .then((raw) => raw.branches ?? []),
  create: (input: BranchInput) =>
    apiFetch<ApiEnvelope<unknown>>('/hubowner/branches', { method: 'POST', json: input }),
  update: (id: number, input: Partial<BranchInput>) =>
    apiFetch<ApiEnvelope<unknown>>(`/hubowner/branches/${id}`, { method: 'PATCH', json: input }),
  remove: (id: number) =>
    apiFetch<ApiEnvelope<unknown>>(`/hubowner/branches/${id}`, { method: 'DELETE' }),
};

export function useBranches() {
  return useQuery({ queryKey: ['branches'], queryFn: branchesApi.list });
}

function useBranchMutation<TInput>(mutationFn: (input: TInput) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['branches'] }),
  });
}
export const useCreateBranch = () => useBranchMutation(branchesApi.create);
export const useUpdateBranch = () =>
  useBranchMutation(({ id, ...input }: { id: number } & Partial<BranchInput>) =>
    branchesApi.update(id, input),
  );
export const useDeleteBranch = () => useBranchMutation((id: number) => branchesApi.remove(id));
