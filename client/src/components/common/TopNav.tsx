import { motion } from 'framer-motion';
import { ChevronDown, LogOut, Menu, Search, UserRound } from 'lucide-react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { canSee, isEntryActive, TOP_NAV, type NavEntry, type NavLeaf } from '@/app/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Kbd } from '@/components/ui/kbd';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useLogout } from '@/features/auth/queries';
import { cn, initials, isMac } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { useUiStore } from '@/store/ui';
import { Logo } from './Logo';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';

const itemClass =
  'relative flex h-14 items-center gap-1 px-1.5 text-[13px] font-medium outline-none transition-colors duration-micro focus-visible:text-foreground';

function ActiveUnderline() {
  return (
    <motion.span
      layoutId="topnav-underline"
      className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-brand-gradient"
      transition={{ type: 'spring', stiffness: 480, damping: 38 }}
    />
  );
}

function RichMenuItem({ leaf, onSelect }: { leaf: NavLeaf; onSelect: () => void }) {
  const Icon = leaf.icon;
  return (
    <DropdownMenuItem onSelect={onSelect} className="items-start gap-3 rounded-lg p-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted/60 [&_svg]:!text-primary">
        <Icon />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-foreground">{leaf.label}</span>
        {leaf.description && <span className="block text-caption text-muted-foreground">{leaf.description}</span>}
      </span>
    </DropdownMenuItem>
  );
}

function DesktopEntry({ entry, active }: { entry: NavEntry; active: boolean }) {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);

  if (!entry.children) {
    return (
      <NavLink to={entry.to!} className={cn(itemClass, active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')}>
        <span className={cn('flex items-center gap-1.5 rounded-lg px-2 py-1 transition-colors duration-micro', active ? 'bg-accent/70' : 'group-hover:bg-accent/40')}>
          <entry.icon className={cn('size-4', active ? 'text-primary' : 'opacity-70')} />
          {entry.label}
        </span>
        {active && <ActiveUnderline />}
      </NavLink>
    );
  }

  const leaves = entry.children.filter((c) => canSee(c, role));
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn(itemClass, 'group', active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground data-[state=open]:text-foreground')}>
        <span className={cn('flex items-center gap-1.5 rounded-lg px-2 py-1 transition-colors duration-micro', active ? 'bg-accent/70' : '')}>
          <entry.icon className={cn('size-4', active ? 'text-primary' : 'opacity-70')} />
          {entry.label}
        </span>
        <ChevronDown className="size-3.5 opacity-60 transition-transform duration-micro group-data-[state=open]:rotate-180" />
        {active && <ActiveUnderline />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={4} className="w-72 p-1.5">
        {leaves.map((leaf) => (
          <RichMenuItem key={leaf.to} leaf={leaf} onSelect={() => navigate(leaf.to)} />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AvatarMenu() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const logoutMutation = useLogout();
  const logout = () => logoutMutation.mutate();

  const avatar = (size: string) => (
    <Avatar className={size}>
      {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
      <AvatarFallback>{initials(user?.name ?? user?.loginId)}</AvatarFallback>
    </Avatar>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Open profile menu"
        className="rounded-full bg-brand-gradient p-[2px] outline-none transition-shadow duration-micro hover:shadow-glow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span className="block rounded-full bg-background p-[1.5px]">{avatar('size-7')}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex items-center gap-2.5 py-2 font-normal">
          {avatar('size-8')}
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-medium text-foreground">{user?.name ?? user?.loginId ?? 'Guest'}</span>
            <span className="block truncate text-caption text-muted-foreground">
              {user ? (
                <>
                  <span className="font-mono">{user.loginId}</span> · <span className="capitalize">{user.role}</span>
                </>
              ) : (
                'Not signed in'
              )}
            </span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/profile')}>
          <UserRound /> My Profile
        </DropdownMenuItem>
        <DropdownMenuItem destructive onSelect={logout}>
          <LogOut /> Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileNav() {
  const open = useUiStore((s) => s.mobileNavOpen);
  const setOpen = useUiStore((s) => s.setMobileNavOpen);
  const role = useAuthStore((s) => s.user?.role);
  const { pathname } = useLocation();
  const close = () => setOpen(false);

  const linkClass = (active: boolean) =>
    cn(
      'flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors',
      active ? 'bg-accent text-foreground [&_svg]:text-primary' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
    );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" className="w-[280px] gap-0 p-0">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <div className="flex h-14 items-center border-b px-4">
          <Link to="/dashboard" onClick={close}>
            <Logo />
          </Link>
        </div>
        <nav aria-label="Main" className="flex-1 space-y-5 overflow-y-auto p-3">
          {TOP_NAV.map((entry) =>
            entry.children ? (
              <div key={entry.label} className="space-y-0.5">
                <div className="caption-label px-3 pb-1">{entry.label}</div>
                {entry.children
                  .filter((c) => canSee(c, role))
                  .map((leaf) => (
                    <NavLink key={leaf.to} to={leaf.to} onClick={close} className={({ isActive }) => linkClass(isActive)}>
                      <leaf.icon className="size-4" />
                      {leaf.label}
                    </NavLink>
                  ))}
              </div>
            ) : (
              <NavLink key={entry.to} to={entry.to!} onClick={close} className={() => linkClass(isEntryActive(entry, pathname))}>
                <entry.icon className="size-4" />
                {entry.label}
              </NavLink>
            ),
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

export function TopNav() {
  const { pathname } = useLocation();
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);
  const setCommandOpen = useUiStore((s) => s.setCommandOpen);

  return (
    <header className="glass sticky top-0 z-40 border-b">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-2 px-4 sm:px-6 lg:px-8">
        <Button variant="ghost" size="icon-sm" className="-ml-1 md:hidden" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}>
          <Menu />
        </Button>

        <Link to="/dashboard" aria-label="StockSense — dashboard" className="mr-3 rounded-lg focus-visible:ring-2 focus-visible:ring-ring">
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden h-14 items-center md:flex">
          {TOP_NAV.map((entry) => (
            <DesktopEntry key={entry.label} entry={entry} active={isEntryActive(entry, pathname)} />
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            aria-label="Search (command palette)"
            className="hidden h-8 items-center gap-2 rounded-full border bg-muted/40 pl-3 pr-1.5 text-[13px] text-muted-foreground transition-colors duration-micro hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring sm:flex"
          >
            <Search className="size-3.5" />
            <span className="pr-6">Search…</span>
            <span className="flex gap-0.5">
              <Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd>
              <Kbd>K</Kbd>
            </span>
          </button>
          <Button variant="ghost" size="icon-sm" className="text-muted-foreground sm:hidden" aria-label="Search" onClick={() => setCommandOpen(true)}>
            <Search />
          </Button>
          <NotificationBell />
          <ThemeToggle />
          <div className="ml-1.5">
            <AvatarMenu />
          </div>
        </div>
      </div>
      <MobileNav />
    </header>
  );
}
