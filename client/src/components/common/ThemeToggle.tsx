import { AnimatePresence, motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme !== 'light';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="relative overflow-hidden text-muted-foreground hover:text-foreground"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={isDark ? 'moon' : 'sun'}
              initial={{ y: -14, opacity: 0, rotate: -45 }}
              animate={{ y: 0, opacity: 1, rotate: 0 }}
              exit={{ y: 14, opacity: 0, rotate: 45 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="flex"
            >
              {isDark ? <Moon /> : <Sun />}
            </motion.span>
          </AnimatePresence>
        </Button>
      </TooltipTrigger>
      <TooltipContent>Toggle theme</TooltipContent>
    </Tooltip>
  );
}
