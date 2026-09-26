```tsx
import type { MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/common/Logo';
import { useAuthStore } from '@/store/auth';
import {
  NAV_LINKS,
  scrollToSection,
} from '@/features/landing/components/primitives';

const footerLinkClass =
  'rounded text-sm text-muted-foreground transition-colors hover:text-foreground';

export function Footer() {
  const isAuthenticated =
    useAuthStore((state) => state.status) === 'authenticated';

  const handleAnchorClick =
    (sectionId: string) => (event: MouseEvent<HTMLAnchorElement>) => {
      const isModifiedClick =
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.button !== 0;

      if (isModifiedClick) return;

      event.preventDefault();
      scrollToSection(sectionId);
    };

  return (
    <footer className="border-t">
      <div className="container grid gap-10 py-12 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <Logo />
          <p className="mt-3 text-sm text-muted-foreground">
            Inventory, in real time.
          </p>
        </div>

        <nav aria-label="Footer">
          <h2 className="caption-label">Product</h2>

          <ul className="mt-3 space-y-2">
            {NAV_LINKS.map((link) => (
              <li key={link.id}>
                <a
                  href={`#${link.id}`}
                  onClick={handleAnchorClick(link.id)}
                  className={footerLinkClass}
                >
                  {link.label}
                </a>
              </li>
            ))}

            <li>
              <a
                href="#faq"
                onClick={handleAnchorClick('faq')}
                className={footerLinkClass}
              >
                FAQ
              </a>
            </li>
          </ul>
        </nav>

        <div>
          <h2 className="caption-label">Account</h2>

          <ul className="mt-3 space-y-2">
            {isAuthenticated ? (
              <li>
                <Link to="/dashboard" className={footerLinkClass}>
                  Open Dashboard
                </Link>
              </li>
            ) : (
              <>
                <li>
                  <Link to="/login" className={footerLinkClass}>
                    Login
                  </Link>
                </li>

                <li>
                  <Link to="/signup" className={footerLinkClass}>
```
