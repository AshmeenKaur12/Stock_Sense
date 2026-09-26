import { isToday } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Bell, BellOff, CheckCheck, Clock3, PackageX, Timer, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { useMarkAllRead, useMarkRead, useNotifications } from '@/features/notifications/queries';
import { formatRelative } from '@/lib/format';
import type { AppNotification, NotificationType } from '@/lib/types';
import { cn } from '@/lib/utils';

const TYPE_STYLE: Record<NotificationType, { icon: LucideIcon; tone: string }> = {
  low_stock: { icon: AlertTriangle, tone: 'bg-warning/10 text-warning ring-warning/25' },
  out_of_stock: { icon: PackageX, tone: 'bg-destructive/10 text-destructive ring-destructive/25' },
  waiting: { icon: Clock3, tone: 'bg-warning/10 text-warning ring-warning/25' },
  late: { icon: Timer, tone: 'bg-destructive/10 text-destructive ring-destructive/25' },
};

function Item({ n, onOpen }: { n: AppNotification; onOpen: (n: AppNotification) => void }) {
  const s = TYPE_STYLE[n.type];
  return (
    <button
      type="button"
      onClick={() => onOpen(n)}
      className={cn('group flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-micro hover:bg-accent focus-visible:bg-accent focus-visible:outline-none', !n.readAt && 'bg-primary/[0.04]')}
    >
      <span className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset', s.tone)}>
        <s.icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className={cn('line-clamp-1 text-[13px]', n.readAt ? 'font-medium text-foreground/80' : 'font-semibold')}>{n.title}</span>
          {!n.readAt && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
        </span>
        {n.body && <span className="mt-0.5 line-clamp-2 block text-caption text-muted-foreground">{n.body}</span>}
        <span className="mt-1 block text-[11px] text-muted-foreground/80">{formatRelative(n.createdAt)}</span>
      </span>
    </button>
  );
}

/** Bell with unread badge; dropdown grouped Today / Earlier; click → related record. */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data, isLoading } = useNotifications();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const items = data?.items ?? [];
  const unread = data?.meta.unread ?? 0;
  const today = items.filter((n) => isToday(new Date(n.createdAt)));
  const earlier = items.filter((n) => !isToday(new Date(n.createdAt)));

  const openItem = (n: AppNotification) => {
    if (!n.readAt) markRead.mutate(n._id);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'} className="relative text-muted-foreground hover:text-foreground">
          <Bell />
          <AnimatePresence>
            {unread > 0 && (
              <motion.span
                key={unread}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0 }}
                className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold tabular text-white ring-2 ring-background"
              >
                {unread > 9 ? '9+' : unread}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(380px,calc(100vw-1.5rem))] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="text-[13px] font-semibold">Notifications</p>
            <p className="text-caption text-muted-foreground">{unread ? `${unread} unread` : 'All caught up'}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => markAll.mutate()} disabled={!unread || markAll.isPending}>
            <CheckCheck /> Mark all read
          </Button>
        </div>
        <div className="max-h-[min(460px,70dvh)] overflow-y-auto p-1.5">
          {isLoading ? (
            <div className="space-y-2 p-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <span className="flex size-10 items-center justify-center rounded-xl border bg-muted/50">
                <BellOff className="size-4 text-muted-foreground" />
              </span>
              <p className="text-[13px] font-medium">No notifications</p>
              <p className="text-caption text-muted-foreground">Low-stock, waiting and late alerts appear here in real time.</p>
            </div>
          ) : (
            [
              ['Today', today],
              ['Earlier', earlier],
            ].map(([label, list]) =>
              (list as AppNotification[]).length ? (
                <div key={label as string} className="py-1">
                  <p className="caption-label px-3 pb-1 pt-1.5">{label as string}</p>
                  {(list as AppNotification[]).map((n) => (
                    <Item key={n._id} n={n} onOpen={openItem} />
                  ))}
                </div>
              ) : null,
            )
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
