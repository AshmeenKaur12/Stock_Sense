import type { MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/common/Logo';
import { useAuthStore } from '@/store/auth';
import { NAV_LINKS, scrollToSection } from '@/features/landing/components/primitives';

const linkClass = 'rounded text-sm text-muted-foreground transition-colors hover:text-foreground';

export function Footer() {
  const authenticated = useAuthStore((s) => s.status) === 'authenticated';
  const onAnchor = (id: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    scrollToSection(id);
  };

  return (
    <footer className="border-t">
      <div className="container grid gap-10 py-12 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <Logo />
          <p className="mt-3 text-sm text-muted-foreground">Inventory, in real time.</p>
        </div>
        <nav aria-label="Footer">
          <h2 className="caption-label">Product</h2>
          <ul className="mt-3 space-y-2">
            {NAV_LINKS.map((l) => (
              <li key={l.id}>
                <a href={`#${l.id}`} onClick={onAnchor(l.id)} className={linkClass}>
                  {l.label}
                </a>
              </li>
            ))}
            <li>
              <a href="#faq" onClick={onAnchor('faq')} className={linkClass}>
                FAQ
              </a>
            </li>
          </ul>
        </nav>
        <div>
          <h2 className="caption-label">Account</h2>
          <ul className="mt-3 space-y-2">
            {authenticated ? (
              <li>
                <Link to="/dashboard" className={linkClass}>
                  Open Dashboard
                </Link>
              </li>
            ) : (
              <>
                <li>
                  <Link to="/login" className={linkClass}>
                    Login
                  </Link>
                </li>
                <li>
                  <Link to="/signup" className={linkClass}>
                    Get Started
                  </Link>
                </li>
              </>
            )}
            <li>
              <a href="mailto:hello@stocksense.io" className={linkClass}>
                hello@stocksense.io
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t">
        <div className="container flex flex-col gap-2 py-6 text-caption text-muted-foreground xs:flex-row xs:items-center xs:justify-between">
          <p>© {new Date().getFullYear()} StockSense. All rights reserved.</p>
          <p>Inventory, in real time.</p>
        </div>
      </div>
    </footer>
  );
}
