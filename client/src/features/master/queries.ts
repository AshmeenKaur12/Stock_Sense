import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getData, getPaged } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import type { Category, Contact, Location, Product, Warehouse } from '@/lib/types';

/** Shared lookups used across features (selectors, filters, comboboxes). */

export function useWarehouses() {
  return useQuery({ queryKey: queryKeys.warehouses.all, queryFn: () => getData<Warehouse[]>('/warehouses'), staleTime: 5 * 60_000 });
}

export function useLocations(opts: { warehouse?: string; type?: 'internal' | 'all' } = {}) {
  return useQuery({
    queryKey: [...queryKeys.locations.all, opts],
    queryFn: () => getData<Location[]>('/locations', opts),
    staleTime: 5 * 60_000,
  });
}

export function useCategories() {
  return useQuery({ queryKey: queryKeys.categories.all, queryFn: () => getData<Category[]>('/categories'), staleTime: 5 * 60_000 });
}

export function useContacts(params: { type?: 'vendor' | 'customer'; search?: string; limit?: number } = {}) {
  return useQuery({
    queryKey: queryKeys.contacts.list(params),
    queryFn: () => getPaged<Contact>('/contacts', { limit: 100, ...params }),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useProductSearch(search: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.products.list({ search, active: true }),
    queryFn: () => getPaged<Product>('/products', { search, active: true, limit: 30 }),
    placeholderData: keepPreviousData,
    enabled,
    staleTime: 30_000,
  });
}

/** Builds a category id → "Parent / Child" path map for labels and trees. */
export function categoryPaths(categories: Category[] = []) {
  const byId = new Map(categories.map((c) => [c._id, c]));
  const path = (c: Category, depth = 0): string => {
    const parent = c.parent ? byId.get(c.parent) : undefined;
    return parent && depth < 10 ? `${path(parent, depth + 1)} / ${c.name}` : c.name;
  };
  return new Map(categories.map((c) => [c._id, path(c)]));
}
