
import { motion } from "framer-motion";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { CommandPalette } from "@/components/common/CommandPalette";
import { TopNav } from "@/components/common/TopNav";
import { useHotkeys } from "@/hooks/useHotkeys";
import { useUiStore } from "@/store/ui";

export function AppLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const openCommand = useUiStore((state) => state.setCommandOpen);

  useHotkeys([
    {
      combo: "mod+k",
      handler: () => openCommand(true),
      allowInInputs: true,
    },
    {
      combo: "g d",
      handler: () => navigate("/dashboard"),
    },
    {
      combo: "g s",
      handler: () => navigate("/stock"),
    },
    {
      combo: "g m",
      handler: () => navigate("/move-history"),
    },
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <a
        href="#main-content"
        className="sr-only rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground
          focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
      >
        Skip to main content
      </a>

      <TopNav />

      <main id="main-content" className="flex-1">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.22,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-9"
        >
          <Outlet />
        </motion.div>
      </main>

      <CommandPalette />
    </div>
  );
}

