/**
 * Central query-key factory. Keys are hierarchical so invalidating a prefix
 * (e.g. `queryKeys.operations.all`) refreshes every list and detail beneath it.
 */
type Params = Record<string, unknown> | undefined;

export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    summary: (p?: Params) => ['dashboard', 'summary', p ?? {}] as const,
    charts: (p?: Params) => ['dashboard', 'charts', p ?? {}] as const,
    recent: ['dashboard', 'recent'] as const,
  },
  operations: {
    all: ['operations'] as const,
    list: (p?: Params) => ['operations', 'list', p ?? {}] as const,
    kanban: (p?: Params) => ['operations', 'kanban', p ?? {}] as const,
    detail: (id: string) => ['operations', 'detail', id] as const,
  },
  stock: {
    all: ['stock'] as const,
    list: (p?: Params) => ['stock', 'list', p ?? {}] as const,
    locations: (productId: string) => ['stock', 'locations', productId] as const,
  },
  moves: {
    all: ['moves'] as const,
    list: (p?: Params) => ['moves', 'list', p ?? {}] as const,
  },
  products: { all: ['products'] as const, list: (p?: Params) => ['products', 'list', p ?? {}] as const },
  categories: { all: ['categories'] as const },
  contacts: { all: ['contacts'] as const, list: (p?: Params) => ['contacts', 'list', p ?? {}] as const },
  warehouses: { all: ['warehouses'] as const },
  locations: { all: ['locations'] as const },
  reorderRules: { all: ['reorder-rules'] as const },
  users: { all: ['users'] as const },
  notifications: { all: ['notifications'] as const },
} as const;
