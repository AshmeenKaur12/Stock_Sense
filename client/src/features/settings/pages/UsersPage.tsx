import type { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Pencil, Shield, UserCheck, UserPlus, UserX, Users } from 'lucide-react';
import { useMemo } from 'react';
import { toast } from 'sonner';
import { ContactAvatar } from '@/components/common/bits';
import { DataTable } from '@/components/common/DataTable';
import { FilterSelect } from '@/components/common/FilterSelect';
import { Pagination } from '@/components/common/Pagination';
import { SearchInput } from '@/components/common/SearchInput';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUrlState } from '@/hooks/useUrlState';
import { getErrorMessage } from '@/lib/axios';
import { formatDateTime, formatRelative } from '@/lib/format';
import type { PublicUser } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { usersApi } from '../api';
import { DeleteDialog } from '../components/DeleteDialog';
import { RoleBadge, ROLE_META } from '../components/RoleBadge';
import { SettingsPage } from '../components/SettingsPage';
import { useEditor } from '../components/useEditor';
import { UserSheet } from '../components/UserSheet';
import { INVALIDATES, useSettingsMutation, useUserList } from '../queries';

const LIMIT = 20;

function ActiveState({ active }: { active: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[13px]', active ? 'text-foreground' : 'text-muted-foreground')}>
      <span className={cn('size-1.5 rounded-full', active ? 'bg-success' : 'bg-muted-foreground/50')} aria-hidden />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function LastLogin({ at }: { at: string | null }) {
  if (!at) return <span className="text-[13px] text-muted-foreground">Never</span>;
  return (
    <time dateTime={at} title={formatDateTime(at)} className="text-[13px] text-muted-foreground">
      {formatRelative(at)}
    </time>
  );
}

function UserIdentity({ user, isSelf }: { user: PublicUser; isSelf: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <ContactAvatar name={user.name || user.loginId} src={user.avatarUrl} size="md" className={cn(!user.isActive && 'opacity-50 grayscale')} />
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className={cn('truncate font-medium', !user.isActive && 'text-muted-foreground')}>{user.name || user.loginId}</span>
          {isSelf && <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-px text-[10.5px] font-semibold text-primary">You</span>}
        </div>
        <div className="truncate font-mono text-[11.5px] text-muted-foreground">@{user.loginId}</div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const me = useAuthStore((s) => s.user?._id);
  const [state, setState] = useUrlState({ q: '', role: '', page: '1' });
  const page = Math.max(1, Number(state.page) || 1);
  const list = useUserList({ search: state.q, role: state.role, page, limit: LIMIT });
  const editor = useEditor<PublicUser>();
  const { edit: editItem, askRemove } = editor;
  const deactivate = useSettingsMutation((id: string) => usersApi.deactivate(id), INVALIDATES.users);
  const reactivate = useSettingsMutation((id: string) => usersApi.update(id, { isActive: true }), INVALIDATES.users);
  const reactivateUser = reactivate.mutate;
  const filtering = Boolean(state.q || state.role);

  const columns = useMemo<ColumnDef<PublicUser, unknown>[]>(() => {
    const actions = (u: PublicUser) => (
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${u.loginId}`} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} className="text-muted-foreground">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          <DropdownMenuItem onSelect={() => editItem(u)}>
            <Pencil />
            Edit
          </DropdownMenuItem>
          {u._id !== me && (
            <>
              <DropdownMenuSeparator />
              {u.isActive ? (
                <DropdownMenuItem destructive onSelect={() => askRemove(u)}>
                  <UserX />
                  Deactivate
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onSelect={() =>
                    reactivateUser(u._id, {
                      onSuccess: () => toast.success('User reactivated', { description: `${u.loginId} can sign in again.` }),
                      onError: (err) => toast.error('Could not reactivate', { description: getErrorMessage(err) }),
                    })
                  }
                >
                  <UserCheck />
                  Reactivate
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
    return [
      { id: 'user', header: 'User', cell: ({ row }) => <UserIdentity user={row.original} isSelf={row.original._id === me} /> },
      {
        id: 'email',
        header: 'Email',
        meta: { className: 'hidden lg:table-cell max-w-[260px]' },
        cell: ({ row }) => <span className="block truncate text-[13px]">{row.original.email}</span>,
      },
      { id: 'role', header: 'Role', cell: ({ row }) => <RoleBadge role={row.original.role} /> },
      { id: 'status', header: 'Status', cell: ({ row }) => <ActiveState active={row.original.isActive} /> },
      { id: 'last', header: 'Last login', meta: { className: 'hidden lg:table-cell' }, cell: ({ row }) => <LastLogin at={row.original.lastLoginAt} /> },
      { id: 'actions', header: () => <span className="sr-only">Actions</span>, meta: { className: 'w-12' }, cell: ({ row }) => actions(row.original) },
    ];
  }, [me, editItem, askRemove, reactivateUser]);

  const newButton = (
    <Button variant="gradient" onClick={editor.create}>
      <UserPlus />
      New user
    </Button>
  );
  const meta = list.data?.meta;

  return (
    <SettingsPage
      icon={Users}
      title="Users"
      description="Who can sign in to StockSense and what they can change. Deactivated users keep their history but can't log in."
      writeRole="admin"
      action={newButton}
      toolbar={
        <>
          <SearchInput value={state.q} onChange={(q) => setState({ q })} placeholder="Search name, login or email…" />
          <FilterSelect
            label="Role"
            icon={Shield}
            value={state.role}
            onChange={(role) => setState({ role })}
            options={(['admin', 'manager', 'staff'] as const).map((r) => ({ value: r, label: ROLE_META[r].label }))}
          />
        </>
      }
    >
      <DataTable
        aria-label="Users"
        data={list.data?.items}
        columns={columns}
        isLoading={list.isLoading || list.isPlaceholderData}
        error={list.error}
        onRetry={() => void list.refetch()}
        getRowId={(u) => u._id}
        onRowClick={editor.edit}
        rowClassName={(u) => (u.isActive ? undefined : 'bg-muted/20')}
        empty={{
          icon: Users,
          title: filtering ? 'No users match' : 'No users yet',
          description: filtering ? 'Try a different name, login ID or role.' : 'Invite your team so everyone works from the same live stock.',
          action: filtering ? (
            <Button variant="outline" onClick={() => setState({ q: '', role: '' })}>
              Clear filters
            </Button>
          ) : (
            newButton
          ),
        }}
        renderCard={(u) => (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <UserIdentity user={u} isSelf={u._id === me} />
              <RoleBadge role={u.role} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
              <ActiveState active={u.isActive} />
              <span className="text-caption text-muted-foreground">
                Last login <LastLogin at={u.lastLoginAt} />
              </span>
            </div>
          </div>
        )}
        footer={meta && meta.total > LIMIT ? <Pagination page={page} limit={LIMIT} total={meta.total} onPageChange={(p) => setState({ page: String(p) })} noun="users" /> : undefined}
      />

      <UserSheet open={editor.open} onOpenChange={editor.setOpen} user={editor.editing} isSelf={editor.editing?._id === me} />
      <DeleteDialog
        open={Boolean(editor.removing)}
        onOpenChange={(o) => !o && editor.closeRemove()}
        title={`Deactivate ${editor.removing?.name || editor.removing?.loginId || 'user'}?`}
        description="They'll be signed out and won't be able to log in. Their operations and history stay intact, and you can reactivate them later."
        confirmLabel="Deactivate"
        successTitle="User deactivated"
        loading={deactivate.isPending}
        onConfirm={() => deactivate.mutateAsync(editor.removing?._id ?? '')}
      />
    </SettingsPage>
  );
}
