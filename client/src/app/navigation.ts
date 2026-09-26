import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Boxes,
  Contact,
  FolderTree,
  History,
  LayoutDashboard,
  MapPin,
  Package,
  RefreshCcw,
  Settings,
  SlidersHorizontal,
  UserRound,
  Users,
  Warehouse,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '@/store/auth';

export interface NavLeaf {
  label: string;
  to: string;
  icon: LucideIcon;
  description?: string;
  roles?: Role[];
  /** Extra search terms for the command palette. */
  keywords?: string[];
}

export interface NavEntry {
  label: string;
  icon: LucideIcon;
  /** Direct link (leaf entries). */
  to?: string;
  /** Path prefix that marks a dropdown entry as active. */
  match?: string;
  children?: NavLeaf[];
}

export const TOP_NAV: NavEntry[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  {
    label: 'Operations',
    icon: Workflow,
    match: '/operations',
    children: [
      { label: 'Receipt', to: '/operations/receipts', icon: ArrowDownToLine, description: 'Incoming stock from vendors', keywords: ['in', 'incoming', 'vendor'] },
      { label: 'Delivery', to: '/operations/deliveries', icon: ArrowUpFromLine, description: 'Pick, pack and ship to customers', keywords: ['out', 'outgoing', 'ship'] },
      { label: 'Internal Transfer', to: '/operations/transfers', icon: ArrowLeftRight, description: 'Move stock between locations', keywords: ['int', 'move', 'rack'] },
      { label: 'Adjustment', to: '/operations/adjustments', icon: SlidersHorizontal, description: 'Reconcile counted vs recorded stock', keywords: ['adj', 'count', 'damaged'] },
    ],
  },
  { label: 'Stock', to: '/stock', icon: Boxes },
  { label: 'Move History', to: '/move-history', icon: History },
  {
    label: 'Settings',
    icon: Settings,
    match: '/settings',
    children: [
      { label: 'Warehouse', to: '/settings/warehouses', icon: Warehouse, description: 'Sites and reference short codes' },
      { label: 'Locations', to: '/settings/locations', icon: MapPin, description: 'Rooms, racks and floors per warehouse', keywords: ['rack', 'bin'] },
      { label: 'Products', to: '/settings/products', icon: Package, description: 'Catalogue, SKUs and unit costs', keywords: ['sku', 'catalog', 'item'] },
      { label: 'Categories', to: '/settings/categories', icon: FolderTree, description: 'Product category tree' },
      { label: 'Contacts', to: '/settings/contacts', icon: Contact, description: 'Vendors and customers', keywords: ['vendor', 'customer', 'partner'] },
      { label: 'Users', to: '/settings/users', icon: Users, description: 'Team members and roles', roles: ['admin'] },
      { label: 'Reorder Rules', to: '/settings/reorder-rules', icon: RefreshCcw, description: 'Min / max thresholds for alerts', keywords: ['min', 'max', 'low stock'] },
    ],
  },
];

/** Every routable page, flattened (used by the palette and page titles). */
export const ALL_PAGES: (NavLeaf & { group?: string })[] = [
  ...TOP_NAV.flatMap((e) =>
    e.children ? e.children.map((c) => ({ ...c, group: e.label })) : [{ label: e.label, to: e.to!, icon: e.icon }],
  ),
  { label: 'My Profile', to: '/profile', icon: UserRound, keywords: ['account', 'password', 'avatar'] },
];

export function canSee(item: { roles?: Role[] }, role: Role | undefined) {
  return !item.roles || (role !== undefined && item.roles.includes(role));
}

export function isEntryActive(entry: NavEntry, pathname: string) {
  const prefix = entry.match ?? entry.to;
  return !!prefix && (pathname === prefix || pathname.startsWith(`${prefix}/`));
}
