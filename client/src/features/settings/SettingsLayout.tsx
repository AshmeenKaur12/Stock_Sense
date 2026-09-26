import { motion } from 'framer-motion';
import { Contact, FolderTree, MapPin, Package, RefreshCcw, Settings, Users, Warehouse, type LucideIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useHasRole } from '@/store/auth';
import { EASE } from './components/SettingsPage';

interface NavItem {
  slug: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { slug: 'warehouses', label: 'Warehouse', hint: 'Sites & short codes', icon: Warehouse },
  { slug: 'locations', label: 'Locations', hint: 'Rooms, racks, floors', icon: MapPin },
  { slug: 'products', label: 'Products', hint: 'Catalogue & costs', icon: Package },
  { slug: 'categories', label: 'Categories', hint: 'Product tree', icon: FolderTree },
  { slug: 'contacts', label: 'Contacts', hint: 'Vendors & customers', icon: Contact },
  { slug: 'users', label: 'Users', hint: 'Team & roles', icon: Users, adminOnly: true },
  { slug: 'reorder-rules', label: 'Reorder Rules', hint: 'Min / max alerts', icon: RefreshCcw },
];

const spring = { type: 'spring', stiffness: 520, damping: 40 } as const;

export default function SettingsLayout() {
  const isAdmin = useHasRole('admin');
  const { pathname } = useLocation();
  const items = NAV.filter((n) => !n.adminOnly || isAdmin);
  const pillsRef = useRef<HTMLDivElement>(null);

  // Keep the active pill visible in the horizontally scrolling mobile nav.
  useEffect(() => {
    const el = pillsRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (el && el.offsetParent !== null) el.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [pathname]);

  if (/^\/settings\/?$/.test(pathname)) return <Navigate to="/settings/warehouses" replace />;

  return (
    <div className="space-y-6 lg:space-y-8">
      <motion.header initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: EASE }} className="space-y-1.5">
        <div className="caption-label flex items-center gap-1.5">
          <Settings className="size-3.5" aria-hidden />
          Workspace
        </div>
        <h1 className="text-h1 sm:text-[26px] sm:leading-8">Settings</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">Configure warehouses, locations, your catalogue, partners, team access and reorder thresholds.</p>
      </motion.header>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[232px_minmax(0,1fr)] lg:gap-10">
        {/* Desktop: sticky vertical nav */}
        <nav aria-label="Settings" className="hidden lg:block">
          <ul className="sticky top-24 space-y-0.5">
            {items.map((item) => (
              <li key={item.slug}>
                <NavLink
                  to={`/settings/${item.slug}`}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex items-center gap-3 rounded-xl px-3 py-2 outline-none transition-colors duration-micro focus-visible:ring-2 focus-visible:ring-ring',
                      isActive ? 'text-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.span layoutId="settings-nav-active" transition={spring} className="absolute inset-0 rounded-xl border bg-card shadow-card" aria-hidden>
                          <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-brand-gradient" />
                        </motion.span>
                      )}
                      <item.icon className={cn('relative size-4 shrink-0 transition-colors', isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} aria-hidden />
                      <span className="relative min-w-0">
                        <span className="block truncate text-[13.5px] font-medium">{item.label}</span>
                        <span className="block truncate text-[11.5px] text-muted-foreground">{item.hint}</span>
                      </span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Mobile / tablet: horizontally scrollable pills */}
        <nav aria-label="Settings sections" className="-mx-4 min-w-0 sm:-mx-6 lg:hidden">
          <div ref={pillsRef} className="flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden">
            {items.map((item) => (
              <NavLink
                key={item.slug}
                to={`/settings/${item.slug}`}
                className={({ isActive }) =>
                  cn(
                    'relative flex h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium outline-none transition-colors duration-micro focus-visible:ring-2 focus-visible:ring-ring',
                    isActive ? 'border-primary/30 text-foreground' : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <motion.span layoutId="settings-pill-active" transition={spring} className="absolute inset-0 rounded-full bg-primary/10" aria-hidden />}
                    <item.icon className={cn('relative size-4', isActive && 'text-primary')} aria-hidden />
                    <span className="relative">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
