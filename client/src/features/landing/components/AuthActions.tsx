import { ArrowRight, LayoutDashboard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

interface AuthActionsProps {
  primaryLabel?: string;
  secondaryLabel?: string;
  size?: ButtonProps['size'];
  secondaryVariant?: 'ghost' | 'outline';
  className?: string;
  /** Stretch buttons to full width (mobile menu). */
  block?: boolean;
  onNavigate?: () => void;
  /** Render the gradient CTA before the sign-in link. */
  primaryFirst?: boolean;
}

/** Sign-in / sign-up pair, collapsing to a single "Open Dashboard" button for signed-in users. */
export function AuthActions({
  primaryLabel = 'Get Started',
  secondaryLabel = 'Login',
  size = 'default',
  secondaryVariant = 'ghost',
  className,
  block = false,
  onNavigate,
  primaryFirst = false,
}: AuthActionsProps) {
  const status = useAuthStore((s) => s.status);

  if (status === 'authenticated') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Button asChild variant="gradient" size={size} className={cn(block && 'w-full')}>
          <Link to="/dashboard" onClick={onNavigate}>
            <LayoutDashboard aria-hidden />
            Open Dashboard
          </Link>
        </Button>
      </div>
    );
  }

  const secondary = (
    <Button key="secondary" asChild variant={secondaryVariant} size={size} className={cn(block && 'w-full')}>
      <Link to="/login" onClick={onNavigate}>
        {secondaryLabel}
      </Link>
    </Button>
  );
  const primary = (
    <Button key="primary" asChild variant="gradient" size={size} className={cn('group', block && 'w-full')}>
      <Link to="/signup" onClick={onNavigate}>
        {primaryLabel}
        <ArrowRight aria-hidden className="transition-transform duration-micro ease-brand group-hover:translate-x-0.5" />
      </Link>
    </Button>
  );

  return <div className={cn('flex items-center gap-2', className)}>{primaryFirst ? [primary, secondary] : [secondary, primary]}</div>;
}
