import { motion } from 'framer-motion';
import {
  CircleDot,
  FileStack,
  FolderTree,
  ListFilter,
  MapPin,
  Warehouse as WarehouseIcon,
  X,
} from 'lucide-react';
import { useMemo } from 'react';
import { FilterSelect, type FilterOption } from '@/components/common/FilterSelect';
import { categoryPaths } from '@/features/master/queries';
import type { Category, Location, Warehouse } from '@/lib/types';
import { DEFAULT_FILTERS, type DashboardFilters } from '../api';
import { fadeUp } from './primitives';

const TYPE_OPTIONS: FilterOption[] = [
  { value: 'receipt', label: 'Receipts' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'internal', label: 'Internal' },
  { value: 'adjustment', label: 'Adjustments' },
];

const STATUS_OPTIONS: FilterOption[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'ready', label: 'Ready' },
  { value: 'done', label: 'Done' },
  { value: 'canceled', label: 'Canceled' },
];

interface DashboardFilterBarProps {
  filters: DashboardFilters;
  onChange: (patch: Partial<DashboardFilters>) => void;
  warehouses: Warehouse[];
  locations: Location[];
  categories: Category[];
}

const getActiveFilterCount = (filters: DashboardFilters) =>
  (Object.keys(DEFAULT_FILTERS) as (keyof DashboardFilters)[]).filter(
    (key) => filters[key] !== '',
  ).length;

const getCategoryOptions = (categories: Category[]): FilterOption[] => {
  const paths = categoryPaths(categories);

  return categories
    .map((category) => ({
      value: category._id,
      label: paths.get(category._id) ?? category.name,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
};

export function DashboardFilterBar({
  filters,
  onChange,
  warehouses,
  locations,
  categories,
}: DashboardFilterBarProps) {
  const warehouseOptions = useMemo<FilterOption[]>(
    () =>
      warehouses.map((warehouse) => ({
        value: warehouse._id,
        label: warehouse.name,
        hint: warehouse.shortCode,
      })),
    [warehouses],
  );

  const locationOptions = useMemo<FilterOption[]>(
    () =>
      locations.map((location) => ({
        value: location._id,
        label: location.fullName || location.name,
        hint: filters.warehouse ? undefined : location.warehouse.shortCode,
        group: filters.warehouse ? undefined : location.warehouse.name,
      })),
    [locations, filters.warehouse],
  );

  const categoryOptions = useMemo(
    () => getCategoryOptions(categories),
    [categories],
  );

  const activeCount = getActiveFilterCount(filters);

  return (
    <motion.div
      variants={fadeUp}
      role="search"
      aria-label="Dashboard filters"
      className="flex min-w-0 items-center gap-3"
    >
      <span className="hidden shrink-0 items-center gap-1.5 text-[13px] font-medium text-muted-foreground sm:inline-flex">
        <ListFilter className="size-4" aria-hidden />
        Filters
      </span>

      <span
        className="hidden h-5 w-px shrink-0 bg-border sm:block"
        aria-hidden
      />

      <div className="-my-1 flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-1 [scrollbar-width:none] md:flex-wrap md:overflow-visible [&::-webkit-scrollbar]:hidden">
        <FilterSelect
          label="Document"
          icon={FileStack}
          value={filters.type}
          options={TYPE_OPTIONS}
          onChange={(value) =>
            onChange({ type: value as DashboardFilters['type'] })
          }
          className="shrink-0"
        />

        <FilterSelect
          label="Status"
          icon={CircleDot}
          value={filters.status}
          options={STATUS_OPTIONS}
          onChange={(value) =>
            onChange({ status: value as DashboardFilters['status'] })
          }
          className="shrink-0"
        />

        <FilterSelect
          label="Warehouse"
          icon={WarehouseIcon}
          value={filters.warehouse}
          options={warehouseOptions}
          onChange={(value) =>
            onChange({ warehouse: value, location: '' })
          }
          className="shrink-0"
        />

        <FilterSelect
          label="Location"
          icon={MapPin}
          value={filters.location}
          options={locationOptions}
          onChange={(value) => onChange({ location: value })}
          searchable
          className="shrink-0"
        />

        <FilterSelect
          label="Category"
          icon={FolderTree}
          value={filters.category}
          options={categoryOptions}
          onChange={(value) => onChange({ category: value })}
          className="shrink-0"
        />

        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => onChange({ ...DEFAULT_FILTERS })}
            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-2.5 text-[13px] font-medium text-muted-foreground transition-colors duration-micro hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-3.5" aria-hidden />
            Clear filters
            <span className="tabular ml-0.5 rounded-full bg-primary/15 px-1.5 text-[11px] text-primary">
              {activeCount}
            </span>
          </button>
        )}
      </div>
    </motion.div>
  );
}
