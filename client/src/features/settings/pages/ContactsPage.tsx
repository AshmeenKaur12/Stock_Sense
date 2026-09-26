import type { ColumnDef } from '@tanstack/react-table';
import { Building2, Contact as ContactIcon, Mail, Phone, Plus, Truck, Users2 } from 'lucide-react';
import { useMemo } from 'react';
import { ContactAvatar } from '@/components/common/bits';
import { DataTable } from '@/components/common/DataTable';
import { Pagination } from '@/components/common/Pagination';
import { SearchInput } from '@/components/common/SearchInput';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUrlState } from '@/hooks/useUrlState';
import type { Contact } from '@/lib/types';
import { useHasRole } from '@/store/auth';
import { contactsApi } from '../api';
import { ContactSheet } from '../components/ContactSheet';
import { DeleteDialog } from '../components/DeleteDialog';
import { RowActions } from '../components/RowActions';
import { Segmented } from '../components/Segmented';
import { SettingsPage } from '../components/SettingsPage';
import { useEditor } from '../components/useEditor';
import { INVALIDATES, useContactList, useSettingsMutation } from '../queries';

const LIMIT = 20;
type TypeFilter = 'all' | 'vendor' | 'customer';

function TypeBadge({ type }: { type: Contact['type'] }) {
  return type === 'vendor' ? (
    <Badge variant="info">
      <Building2 className="size-3" aria-hidden />
      Vendor
    </Badge>
  ) : (
    <Badge variant="default">
      <Truck className="size-3" aria-hidden />
      Customer
    </Badge>
  );
}

function ContactLine({ icon: Icon, value, href }: { icon: typeof Mail; value: string; href: string }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  return (
    <a
      href={href}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded text-[13px] text-foreground/90 outline-none hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <span className="truncate">{value}</span>
    </a>
  );
}

export default function ContactsPage() {
  const canEdit = useHasRole('manager');
  const [state, setState] = useUrlState({ q: '', type: 'all', page: '1' });
  const type = (['vendor', 'customer'].includes(state.type) ? state.type : 'all') as TypeFilter;
  const page = Math.max(1, Number(state.page) || 1);
  const list = useContactList({ search: state.q, type: type === 'all' ? undefined : type, page, limit: LIMIT });
  const editor = useEditor<Contact>();
  const { edit: editItem, askRemove } = editor;
  const remove = useSettingsMutation((id: string) => contactsApi.remove(id), INVALIDATES.contacts);
  const filtering = Boolean(state.q);
  const noun = type === 'vendor' ? 'vendors' : type === 'customer' ? 'customers' : 'contacts';

  const columns = useMemo<ColumnDef<Contact, unknown>[]>(
    () => [
      {
        id: 'name',
        header: 'Contact',
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-3">
            <ContactAvatar name={row.original.name} size="md" />
            <div className="min-w-0">
              <div className="truncate font-medium">{row.original.name}</div>
              <div className="truncate text-[12px] text-muted-foreground lg:hidden">{row.original.email || row.original.phone || '—'}</div>
            </div>
          </div>
        ),
      },
      { id: 'type', header: 'Type', cell: ({ row }) => <TypeBadge type={row.original.type} /> },
      {
        id: 'email',
        header: 'Email',
        meta: { className: 'hidden lg:table-cell max-w-[240px]' },
        cell: ({ row }) => <ContactLine icon={Mail} value={row.original.email} href={`mailto:${row.original.email}`} />,
      },
      {
        id: 'phone',
        header: 'Phone',
        meta: { className: 'hidden lg:table-cell' },
        cell: ({ row }) => <ContactLine icon={Phone} value={row.original.phone} href={`tel:${row.original.phone.replace(/\s+/g, '')}`} />,
      },
      {
        id: 'address',
        header: 'Address',
        meta: { className: 'hidden xl:table-cell max-w-[260px]' },
        cell: ({ row }) => (
          <span className="line-clamp-1 text-[13px] text-muted-foreground" title={row.original.address}>
            {row.original.address || '—'}
          </span>
        ),
      },
      ...(canEdit
        ? [
            {
              id: 'actions',
              header: () => <span className="sr-only">Actions</span>,
              meta: { className: 'w-12' },
              cell: ({ row }) => <RowActions label={row.original.name} onEdit={() => editItem(row.original)} onDelete={() => askRemove(row.original)} />,
            } satisfies ColumnDef<Contact, unknown>,
          ]
        : []),
    ],
    [canEdit, editItem, askRemove],
  );

  const newButton = (
    <Button variant="gradient" onClick={editor.create}>
      <Plus />
      New {type === 'customer' ? 'customer' : type === 'vendor' ? 'vendor' : 'contact'}
    </Button>
  );
  const meta = list.data?.meta;

  return (
    <SettingsPage
      icon={ContactIcon}
      title="Contacts"
      description="Vendors you receive from and customers you deliver to — picked on receipts and delivery orders."
      writeRole="manager"
      action={newButton}
      toolbar={
        <>
          <Segmented
            aria-label="Contact type"
            value={type}
            onChange={(t) => setState({ type: t })}
            options={[
              { value: 'all', label: 'All', icon: Users2 },
              { value: 'vendor', label: 'Vendors', icon: Building2 },
              { value: 'customer', label: 'Customers', icon: Truck },
            ]}
          />
          <SearchInput value={state.q} onChange={(q) => setState({ q })} placeholder={`Search ${noun}…`} />
        </>
      }
    >
      <DataTable
        aria-label="Contacts"
        data={list.data?.items}
        columns={columns}
        isLoading={list.isLoading || list.isPlaceholderData}
        error={list.error}
        onRetry={() => void list.refetch()}
        getRowId={(c) => c._id}
        onRowClick={canEdit ? editor.edit : undefined}
        empty={{
          icon: ContactIcon,
          title: filtering ? `No ${noun} match` : `No ${noun} yet`,
          description: filtering ? 'Try a different name, email or phone.' : 'Add the vendors and customers you trade with to pick them on operations.',
          action: filtering ? (
            <Button variant="outline" onClick={() => setState({ q: '' })}>
              Clear search
            </Button>
          ) : canEdit ? (
            newButton
          ) : undefined,
        }}
        renderCard={(c) => (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <ContactAvatar name={c.name} size="md" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{c.name}</div>
                <div className="mt-1">
                  <TypeBadge type={c.type} />
                </div>
              </div>
              {canEdit && <RowActions label={c.name} onEdit={() => editItem(c)} onDelete={() => askRemove(c)} />}
            </div>
            {(c.email || c.phone) && (
              <div className="flex min-w-0 flex-col gap-1.5 border-t pt-3">
                {c.email && <ContactLine icon={Mail} value={c.email} href={`mailto:${c.email}`} />}
                {c.phone && <ContactLine icon={Phone} value={c.phone} href={`tel:${c.phone.replace(/\s+/g, '')}`} />}
              </div>
            )}
          </div>
        )}
        footer={meta && meta.total > LIMIT ? <Pagination page={page} limit={LIMIT} total={meta.total} onPageChange={(p) => setState({ page: String(p) })} noun={noun} /> : undefined}
      />

      <ContactSheet open={editor.open} onOpenChange={editor.setOpen} contact={editor.editing} defaultType={type === 'customer' ? 'customer' : 'vendor'} />
      <DeleteDialog
        open={Boolean(editor.removing)}
        onOpenChange={(o) => !o && editor.closeRemove()}
        title={`Delete ${editor.removing?.name ?? 'contact'}?`}
        description="Past operations keep their history. Contacts on open operations can't be deleted."
        successTitle="Contact deleted"
        loading={remove.isPending}
        onConfirm={() => remove.mutateAsync(editor.removing?._id ?? '')}
      />
    </SettingsPage>
  );
}
