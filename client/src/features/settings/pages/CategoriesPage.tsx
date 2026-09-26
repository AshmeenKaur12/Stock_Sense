import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, Folder, FolderOpen, FolderPlus, FolderTree, Plus } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { SearchInput } from '@/components/common/SearchInput';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useCategories } from '@/features/master/queries';
import { useUrlState } from '@/hooks/useUrlState';
import { formatNumber } from '@/lib/format';
import type { Category } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useHasRole } from '@/store/auth';
import { categoriesApi } from '../api';
import { CategorySheet } from '../components/CategorySheet';
import { DeleteDialog } from '../components/DeleteDialog';
import { RowActions } from '../components/RowActions';
import { EASE, SettingsPage } from '../components/SettingsPage';
import { useEditor } from '../components/useEditor';
import { INVALIDATES, useSettingsMutation } from '../queries';

interface Node {
  category: Category;
  children: Node[];
  /** Products in this category and all of its descendants. */
  total: number;
}

function buildTree(categories: Category[], query: string): Node[] {
  const q = query.toLowerCase();
  const byParent = new Map<string | null, Category[]>();
  const ids = new Set(categories.map((c) => c._id));
  for (const c of categories) {
    const key = c.parent && ids.has(c.parent) ? c.parent : null;
    byParent.set(key, [...(byParent.get(key) ?? []), c]);
  }
  const build = (parent: string | null, depth: number): Node[] =>
    (byParent.get(parent) ?? [])
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((category) => {
        const children = depth < 12 ? build(category._id, depth + 1) : [];
        const total = category.productCount + children.reduce((s, n) => s + n.total, 0);
        return { category, children, total };
      });
  const prune = (nodes: Node[]): Node[] =>
    nodes.flatMap((n) => {
      const kids = prune(n.children);
      const hit = `${n.category.name} ${n.category.description}`.toLowerCase().includes(q);
      return hit || kids.length ? [{ ...n, children: hit ? n.children : kids }] : [];
    });
  const tree = build(null, 0);
  return q ? prune(tree) : tree;
}

interface TreeProps {
  nodes: Node[];
  depth: number;
  collapsed: Set<string>;
  forceOpen: boolean;
  canEdit: boolean;
  onToggle: (id: string) => void;
  onAddChild: (c: Category) => void;
  onEdit: (c: Category) => void;
  onDelete: (c: Category) => void;
}

function CategoryTree({ nodes, depth, collapsed, forceOpen, canEdit, onToggle, onAddChild, onEdit, onDelete }: TreeProps) {
  return (
    <ul aria-label={depth === 0 ? 'Categories' : undefined} className={cn(depth > 0 && 'relative ml-[21px] border-l pl-3')}>
      {nodes.map((n) => {
        const hasKids = n.children.length > 0;
        const open = hasKids && (forceOpen || !collapsed.has(n.category._id));
        const FolderIcon = open ? FolderOpen : Folder;
        return (
          <li key={n.category._id}>
            <div className="group flex min-h-[48px] items-center gap-2 rounded-xl pr-2 transition-colors hover:bg-accent/40">
              {hasKids ? (
                <button
                  type="button"
                  onClick={() => onToggle(n.category._id)}
                  aria-expanded={open}
                  aria-label={`${open ? 'Collapse' : 'Expand'} ${n.category.name}`}
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ChevronRight className={cn('size-4 transition-transform duration-panel ease-brand', open && 'rotate-90')} aria-hidden />
                </button>
              ) : (
                <span className="size-8 shrink-0" aria-hidden />
              )}
              <FolderIcon className={cn('size-4 shrink-0', depth === 0 ? 'text-primary' : 'text-muted-foreground')} aria-hidden />
              <div className="min-w-0 flex-1 py-1.5">
                <div className="truncate text-sm font-medium">{n.category.name}</div>
                {n.category.description && <div className="truncate text-[12.5px] text-muted-foreground">{n.category.description}</div>}
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    tabIndex={0}
                    className="tabular inline-flex shrink-0 items-center gap-1 rounded-full border bg-muted/50 px-2 py-0.5 text-[11.5px] font-medium text-foreground/85 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {formatNumber(n.category.productCount)}
                    {hasKids && n.total !== n.category.productCount && <span className="text-muted-foreground">/ {formatNumber(n.total)}</span>}
                    <span className="sr-only">products</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {formatNumber(n.category.productCount)} directly{hasKids ? ` · ${formatNumber(n.total)} including subcategories` : ''}
                </TooltipContent>
              </Tooltip>
              {canEdit && (
                <>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onAddChild(n.category)}
                    aria-label={`Add subcategory to ${n.category.name}`}
                    className="hidden text-muted-foreground opacity-0 focus-visible:opacity-100 group-hover:opacity-100 sm:inline-flex"
                  >
                    <FolderPlus />
                  </Button>
                  <RowActions label={n.category.name} onEdit={() => onEdit(n.category)} onDelete={() => onDelete(n.category)} />
                </>
              )}
            </div>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: EASE }} className="overflow-hidden">
                  <CategoryTree
                    nodes={n.children}
                    depth={depth + 1}
                    collapsed={collapsed}
                    forceOpen={forceOpen}
                    canEdit={canEdit}
                    onToggle={onToggle}
                    onAddChild={onAddChild}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}

export default function CategoriesPage() {
  const canEdit = useHasRole('manager');
  const [state, setState] = useUrlState({ q: '' });
  const { data, isLoading, error, refetch, isRefetching } = useCategories();
  const editor = useEditor<Category>();
  const [parentFor, setParentFor] = useState<string | undefined>();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const remove = useSettingsMutation((id: string) => categoriesApi.remove(id), INVALIDATES.categories);

  const tree = useMemo(() => buildTree(data ?? [], state.q), [data, state.q]);
  const totalProducts = useMemo(() => (data ?? []).reduce((s, c) => s + c.productCount, 0), [data]);

  const openCreate = (parent?: string) => {
    setParentFor(parent);
    editor.create();
  };
  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const newButton = (
    <Button variant="gradient" onClick={() => openCreate()}>
      <Plus />
      New category
    </Button>
  );

  let content: ReactNode;
  if (error) content = <ErrorState error={error} onRetry={() => void refetch()} retrying={isRefetching} />;
  else if (isLoading)
    content = (
      <div role="status" className="space-y-3 rounded-2xl border bg-card p-5">
        <span className="sr-only">Loading…</span>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className={cn('flex items-center gap-3', i % 2 === 1 && 'pl-10')}>
            <Skeleton className="size-4 rounded" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="ml-auto h-5 w-10 rounded-full" />
          </div>
        ))}
      </div>
    );
  else if (!data?.length)
    content = (
      <div className="rounded-2xl border bg-card shadow-card">
        <EmptyState icon={FolderTree} title="No categories yet" description="Organise your catalogue into a tree, e.g. Furniture → Desks." action={canEdit ? newButton : undefined} />
      </div>
    );
  else if (!tree.length)
    content = (
      <div className="rounded-2xl border bg-card shadow-card">
        <EmptyState
          icon={FolderTree}
          title="No matching categories"
          description={`Nothing matches “${state.q}”.`}
          action={
            <Button variant="outline" onClick={() => setState({ q: '' })}>
              Clear search
            </Button>
          }
        />
      </div>
    );
  else
    content = (
      <div className="rounded-2xl border bg-card shadow-card">
        <div className="flex items-center justify-between gap-3 border-b px-5 py-3 text-[12.5px] text-muted-foreground">
          <span>
            <span className="tabular font-medium text-foreground">{formatNumber(data.length)}</span> categories
          </span>
          <span>
            <span className="tabular font-medium text-foreground">{formatNumber(totalProducts)}</span> products assigned
          </span>
        </div>
        <div className="p-2 sm:p-3">
          <CategoryTree
            nodes={tree}
            depth={0}
            collapsed={collapsed}
            forceOpen={Boolean(state.q)}
            canEdit={canEdit}
            onToggle={toggle}
            onAddChild={(c) => openCreate(c._id)}
            onEdit={editor.edit}
            onDelete={editor.askRemove}
          />
        </div>
      </div>
    );

  return (
    <SettingsPage
      icon={FolderTree}
      title="Categories"
      description="A nested tree for your catalogue. Counts show products assigned directly, plus the total including subcategories."
      writeRole="manager"
      action={newButton}
      toolbar={<SearchInput value={state.q} onChange={(q) => setState({ q })} placeholder="Search categories…" />}
    >
      {content}

      <CategorySheet open={editor.open} onOpenChange={editor.setOpen} category={editor.editing} defaultParent={parentFor} />
      <DeleteDialog
        open={Boolean(editor.removing)}
        onOpenChange={(o) => !o && editor.closeRemove()}
        title={`Delete ${editor.removing?.name ?? 'category'}?`}
        description="Categories with subcategories or products can't be deleted — move those first."
        successTitle="Category deleted"
        loading={remove.isPending}
        onConfirm={() => remove.mutateAsync(editor.removing?._id ?? '')}
      />
    </SettingsPage>
  );
}
