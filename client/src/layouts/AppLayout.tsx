import { motion } from 'framer-motion';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { CommandPalette } from '@/components/common/CommandPalette';
import { TopNav } from '@/components/common/TopNav';
import { useHotkeys } from '@/hooks/useHotkeys';
import { useUiStore } from '@/store/ui';

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const setCommandOpen = useUiStore((s) => s.setCommandOpen);

  useHotkeys([
    { combo: 'mod+k', handler: () => setCommandOpen(true), allowInInputs: true },
    { combo: 'g d', handler: () => navigate('/dashboard') },
    { combo: 'g s', handler: () => navigate('/stock') },
    { combo: 'g m', handler: () => navigate('/move-history') },
  ]);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>
      <TopNav />
      <main id="main" className="flex-1">
        {/* Keyed wrapper replays the fade + 8px rise on every route change. */}
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
        >
          <Outlet />
        </motion.div>
      </main>
      <CommandPalette />
    </div>
  );
}
