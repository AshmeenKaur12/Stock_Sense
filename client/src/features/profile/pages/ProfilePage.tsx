import { motion } from 'framer-motion';
import { CalendarClock, Fingerprint, Mail, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/bits';
import { RoleBadge, ROLE_META } from '@/features/settings/components/RoleBadge';
import { formatDateTime, formatRelative } from '@/lib/format';
import { useAuthStore } from '@/store/auth';
import { AccountDetailsCard } from '../components/AccountDetailsCard';
import { ActivityTimeline } from '../components/ActivityTimeline';
import { AvatarUploader } from '../components/AvatarUploader';
import { PasswordCard } from '../components/PasswordCard';

const EASE = [0.22, 1, 0.36, 1] as const;

function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE, delay }} className={className}>
      {children}
    </motion.div>
  );
}

function DetailRow({ icon: Icon, label, children }: { icon: typeof Mail; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted/40 text-muted-foreground" aria-hidden>
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <dt className="caption-label">{label}</dt>
        <dd className="mt-0.5 min-w-0 break-words text-sm">{children}</dd>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;
  const displayName = user.name || user.loginId;
  const role = ROLE_META[user.role];

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader title="My Profile" description="Your account, sign-in security and what you've been working on." />

      {/* Identity hero */}
      <Reveal>
        <section aria-label="Profile summary" className="relative overflow-hidden rounded-2xl border bg-card shadow-card">
          <div aria-hidden className="absolute inset-x-0 top-0 h-24 bg-brand-gradient-soft">
            <div className="bg-grid mask-fade-b absolute inset-0 opacity-60" />
          </div>
          <div className="relative flex flex-col items-center gap-5 px-5 pb-6 pt-10 sm:flex-row sm:items-end sm:gap-6 sm:px-6">
            <AvatarUploader name={displayName} src={user.avatarUrl} />
            <div className="min-w-0 flex-1 text-center sm:pb-9 sm:text-left">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <h2 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">{displayName}</h2>
                <RoleBadge role={user.role} />
                {!user.isActive && <span className="rounded-full border border-destructive/25 bg-destructive/10 px-2 py-0.5 text-[11.5px] font-medium text-destructive">Inactive</span>}
              </div>
              <p className="mt-1 flex flex-wrap items-center justify-center gap-x-2 text-sm text-muted-foreground sm:justify-start">
                <span className="font-mono text-[13px]">@{user.loginId}</span>
                <span aria-hidden>·</span>
                <span className="break-all">{user.email}</span>
              </p>
            </div>
          </div>
        </section>
      </Reveal>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <Reveal delay={0.05}>
            <AccountDetailsCard user={user} />
          </Reveal>
          <Reveal delay={0.1}>
            <PasswordCard />
          </Reveal>
        </div>

        <div className="min-w-0 space-y-6">
          <Reveal delay={0.08}>
            <SectionCard title="Member details">
              <dl className="divide-y">
                <DetailRow icon={ShieldCheck} label="Role">
                  <span className="font-medium">{role.label}</span>
                  <span className="block text-caption text-muted-foreground">{role.description}</span>
                </DetailRow>
                <DetailRow icon={CalendarClock} label="Last login">
                  {user.lastLoginAt ? (
                    <time dateTime={user.lastLoginAt} title={formatDateTime(user.lastLoginAt)}>
                      {formatRelative(user.lastLoginAt)}
                      <span className="block text-caption text-muted-foreground">{formatDateTime(user.lastLoginAt)}</span>
                    </time>
                  ) : (
                    <span className="text-muted-foreground">This is your first session</span>
                  )}
                </DetailRow>
                <DetailRow icon={Mail} label="Email">
                  {user.email}
                </DetailRow>
                <DetailRow icon={Fingerprint} label="User ID">
                  <span className="font-mono text-[12.5px] text-muted-foreground">{user._id}</span>
                </DetailRow>
              </dl>
            </SectionCard>
          </Reveal>
          <Reveal delay={0.12}>
            <SectionCard title="Recent activity" description="Operations you created or handled, and your stock moves.">
              <ActivityTimeline />
            </SectionCard>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
