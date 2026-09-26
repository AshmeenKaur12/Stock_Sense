import { Menu } from 'lucide-react';
import { useEffect, useState, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/common/Logo';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { AuthActions } from '@/features/landing/components/AuthActions';
import { NAV_LINKS, scrollToSection } from '@/features/landing/components/primitives';

/** Tracks which landing section is currently under the header (simple scroll-spy). */
function useActiveSection() {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const els = NAV_LINKS.map((l) => document.getElementById(l.id)).filter((el): el is HTMLElement => el !== null);
    if (!els.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: '-35% 0px -55% 0px', threshold: [0, 0.25, 0.5, 1] },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  return active;
}

function useScrolled(offset = 8) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > offset);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [offset]);
  return scrolled;
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const active = useActiveSection();
  const scrolled = useScrolled();

  const onAnchor = (id: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    scrollToSection(id);
  };

  const onMobileAnchor = (id: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setOpen(false);
    // Wait for the sheet to unmount so its scroll lock is released before scrolling.
    window.setTimeout(() => scrollToSection(id), 260);
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full border-b transition-colors duration-panel ease-brand',
        scrolled ? 'glass' : 'border-transparent bg-transparent',
      )}
    >
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link
          to="/"
          aria-label="StockSense home"
          className="rounded-lg"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
            window.history.replaceState(null, '', '/');
          }}
        >
          <Logo />
        </Link>

        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV_LINKS.map((l) => (
              <li key={l.id}>
                <a
                  href={`#${l.id}`}
                  onClick={onAnchor(l.id)}
                  aria-current={active === l.id ? 'location' : undefined}
                  className={cn(
                    'relative rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors duration-micro hover:text-foreground',
                    active === l.id && 'text-foreground',
                  )}
                >
                  {l.label}
                  {active === l.id && (
                    <span className="absolute inset-x-3 -bottom-[13px] h-px bg-foreground/70" aria-hidden />
                  )}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <AuthActions size="sm" className="hidden md:flex" />

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="md:hidden" aria-label="Open menu">
                <Menu aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[86%] max-w-xs gap-0 p-0">
              <SheetHeader className="px-5 py-4">
                <SheetTitle asChild>
                  <span>
                    <Logo />
                  </span>
                </SheetTitle>
                <SheetDescription className="sr-only">Site navigation</SheetDescription>
              </SheetHeader>
              <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-3 py-4">
                <ul className="flex flex-col gap-1">
                  {NAV_LINKS.map((l) => (
                    <li key={l.id}>
                      <a
                        href={`#${l.id}`}
                        onClick={onMobileAnchor(l.id)}
                        className="flex items-center rounded-lg px-3 py-2.5 text-[15px] font-medium text-foreground/90 transition-colors hover:bg-accent"
                      >
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="border-t p-4">
                <AuthActions block primaryFirst className="flex-col items-stretch" onNavigate={() => setOpen(false)} secondaryVariant="outline" />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
