/**
 * Every BND endpoint answers in the same envelope. `status` is 1/0, not an
 * HTTP code — the HTTP status carries that.
 */
export interface ApiEnvelope<T> {
  status: number;
  message: string;
  data: T;
}

/** Laravel's paginator, as it appears inside `data`. */
export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface User {
  id: number;
  uuid: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string;
  contact_number: string | null;
  image: string | null;
  user_type: number;
  status: number;
  is_email_verified: number;
}

export interface SessionPayload {
  user: User;
  isAdmin: boolean;
  isHubOwner: boolean;
  isSupplier: boolean;
  isCustomer: boolean;
}

export function fullName(user: Pick<User, 'first_name' | 'last_name'> | null): string {
  if (!user) return '';
  return [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
}
