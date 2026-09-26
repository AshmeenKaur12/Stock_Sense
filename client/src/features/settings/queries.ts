import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
  contactsApi,
  productsApi,
  reorderRulesApi,
  usersApi,
  type ContactListParams,
  type ProductListParams,
  type ReorderRuleListParams,
  type UserListParams,
} from './api';

/** Paged lists for the settings tables (lookups live in `features/master/queries`). */

export function useProductList(params: ProductListParams) {
  return useQuery({
    queryKey: queryKeys.products.list({ scope: 'settings', ...params }),
    queryFn: () => productsApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useProductDetail(id: string | null) {
  return useQuery({
    queryKey: [...queryKeys.products.all, 'detail', id],
    queryFn: () => productsApi.get(id as string),
    enabled: Boolean(id),
  });
}

export function useContactList(params: ContactListParams) {
  return useQuery({
    queryKey: queryKeys.contacts.list({ scope: 'settings', ...params }),
    queryFn: () => contactsApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useUserList(params: UserListParams) {
  return useQuery({
    queryKey: [...queryKeys.users.all, 'list', params],
    queryFn: () => usersApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useReorderRuleList(params: ReorderRuleListParams) {
  return useQuery({
    queryKey: [...queryKeys.reorderRules.all, 'list', params],
    queryFn: () => reorderRulesApi.list(params),
    placeholderData: keepPreviousData,
  });
}

/** Keys refreshed after a write to each entity (dependent views included). */
export const INVALIDATES = {
  warehouses: [queryKeys.warehouses.all, queryKeys.locations.all],
  locations: [queryKeys.locations.all, queryKeys.warehouses.all],
  products: [queryKeys.products.all, queryKeys.stock.all, queryKeys.reorderRules.all],
  categories: [queryKeys.categories.all, queryKeys.products.all],
  contacts: [queryKeys.contacts.all],
  users: [queryKeys.users.all],
  reorderRules: [queryKeys.reorderRules.all, queryKeys.stock.all, queryKeys.products.all],
} satisfies Record<string, readonly QueryKey[]>;

/** Mutation that invalidates the given query keys when it succeeds. */
export function useSettingsMutation<TVars, TData>(mutationFn: (vars: TVars) => Promise<TData>, invalidate: readonly QueryKey[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => Promise.all(invalidate.map((queryKey) => qc.invalidateQueries({ queryKey }))),
  });
}
