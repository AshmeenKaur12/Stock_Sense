import { deleteData, getData, getPaged, patchData, postData } from '@/lib/api';
import type { Category, Contact, Location, Product, PublicUser, Role, Warehouse } from '@/lib/types';

/** REST calls for the Settings area (master data + users). */

// ── Warehouses ──────────────────────────────────────────────────────────────

export interface WarehouseBody {
  name: string;
  shortCode: string;
  address: string;
}

export const warehousesApi = {
  create: (body: WarehouseBody) => postData<Warehouse>('/warehouses', body),
  update: (id: string, body: Partial<WarehouseBody>) => patchData<Warehouse>(`/warehouses/${id}`, body),
  remove: (id: string) => deleteData(`/warehouses/${id}`),
};

// ── Locations ───────────────────────────────────────────────────────────────

export interface LocationBody {
  name: string;
  shortCode: string;
  warehouse: string;
}

export const locationsApi = {
  create: (body: LocationBody) => postData<Location>('/locations', body),
  update: (id: string, body: Omit<LocationBody, 'warehouse'>) => patchData<Location>(`/locations/${id}`, body),
  remove: (id: string) => deleteData(`/locations/${id}`),
};

// ── Products ────────────────────────────────────────────────────────────────

export const UOMS = ['Units', 'pcs', 'kg', 'g', 'L', 'mL', 'm', 'cm', 'box', 'pack'] as const;
export type Uom = (typeof UOMS)[number];

export interface ProductListParams {
  search?: string;
  category?: string;
  active?: string;
  page?: number;
  limit?: number;
}

export interface ProductBody {
  name: string;
  sku: string;
  category: string | null;
  uom: Uom;
  perUnitCost: number;
  salePrice: number;
  isActive: boolean;
  initialStock?: { quantity: number; location: string } | null;
}

export const productsApi = {
  list: (params: ProductListParams) => getPaged<Product>('/products', { ...params }),
  get: (id: string) => getData<Product>(`/products/${id}`),
  create: (body: ProductBody) => postData<Product>('/products', body),
  update: (id: string, body: Partial<Omit<ProductBody, 'initialStock'>>) => patchData<Product>(`/products/${id}`, body),
  remove: (id: string) => deleteData(`/products/${id}`),
};

// ── Categories ──────────────────────────────────────────────────────────────

export interface CategoryBody {
  name: string;
  parent: string | null;
  description: string;
}

export const categoriesApi = {
  create: (body: CategoryBody) => postData<Category>('/categories', body),
  update: (id: string, body: Partial<CategoryBody>) => patchData<Category>(`/categories/${id}`, body),
  remove: (id: string) => deleteData(`/categories/${id}`),
};

// ── Contacts ────────────────────────────────────────────────────────────────

export interface ContactListParams {
  search?: string;
  type?: string;
  page?: number;
  limit?: number;
}

export interface ContactBody {
  name: string;
  type: 'vendor' | 'customer';
  email: string;
  phone: string;
  address: string;
}

export const contactsApi = {
  list: (params: ContactListParams) => getPaged<Contact>('/contacts', { ...params }),
  create: (body: ContactBody) => postData<Contact>('/contacts', body),
  update: (id: string, body: Partial<ContactBody>) => patchData<Contact>(`/contacts/${id}`, body),
  remove: (id: string) => deleteData(`/contacts/${id}`),
};

// ── Users ───────────────────────────────────────────────────────────────────

export interface UserListParams {
  search?: string;
  role?: string;
  page?: number;
  limit?: number;
}

export interface UserCreateBody {
  loginId: string;
  email: string;
  name?: string;
  password: string;
  role: Role;
}

export interface UserPatchBody {
  name?: string;
  email?: string;
  role?: Role;
  isActive?: boolean;
}

export const usersApi = {
  list: (params: UserListParams) => getPaged<PublicUser>('/users', { ...params }),
  create: (body: UserCreateBody) => postData<PublicUser>('/users', body),
  update: (id: string, body: UserPatchBody) => patchData<PublicUser>(`/users/${id}`, body),
  deactivate: (id: string) => deleteData(`/users/${id}`),
};

// ── Reorder rules ───────────────────────────────────────────────────────────

/** Reorder rule as returned by the list endpoint (product + warehouse populated). */
export interface ReorderRuleRow {
  _id: string;
  product: { _id: string; sku: string; name: string; uom: string } | null;
  warehouse: { _id: string; shortCode: string; name: string } | null;
  minQty: number;
  maxQty: number;
}

export interface ReorderRuleListParams {
  product?: string;
  warehouse?: string;
  page?: number;
  limit?: number;
}

export interface ReorderRuleBody {
  product: string;
  warehouse: string;
  minQty: number;
  maxQty: number;
}

export const reorderRulesApi = {
  list: (params: ReorderRuleListParams) => getPaged<ReorderRuleRow>('/reorder-rules', { ...params }),
  create: (body: ReorderRuleBody) => postData<ReorderRuleRow>('/reorder-rules', body),
  update: (id: string, body: Pick<ReorderRuleBody, 'minQty' | 'maxQty'>) => patchData<ReorderRuleRow>(`/reorder-rules/${id}`, body),
  remove: (id: string) => deleteData(`/reorder-rules/${id}`),
};
