import { zodResolver } from '@hookform/resolvers/zod';
import { FolderTree } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { categoryPaths, useCategories } from '@/features/master/queries';
import type { Category } from '@/lib/types';
import { categoriesApi } from '../api';
import { INVALIDATES, useSettingsMutation } from '../queries';
import { categorySchema, type CategoryForm } from '../schemas';
import { handleSaveError, toastSaved } from './feedback';
import { fieldA11y, FormRow, FormSheet } from './FormSheet';

const FIELDS = ['name', 'parent', 'description'] as const;
const ROOT = '__root__';

/** Ids of `id` and everything beneath it (a category can't move under itself). */
function descendantsOf(id: string, all: Category[]) {
  const out = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of all) {
      if (c.parent && out.has(c.parent) && !out.has(c._id)) {
        out.add(c._id);
        grew = true;
      }
    }
  }
  return out;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  defaultParent?: string;
}

export function CategorySheet({ open, onOpenChange, category, defaultParent }: Props) {
  const isEdit = Boolean(category);
  const { data: categories = [] } = useCategories();
  const { register, handleSubmit, reset, setError, control, formState } = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', parent: '', description: '' },
  });
  const errors = formState.errors;

  useEffect(() => {
    if (open) reset({ name: category?.name ?? '', parent: category?.parent ?? defaultParent ?? '', description: category?.description ?? '' });
  }, [open, category, defaultParent, reset]);

  const options = useMemo(() => {
    const paths = categoryPaths(categories);
    const blocked = category ? descendantsOf(category._id, categories) : new Set<string>();
    return categories
      .filter((c) => !blocked.has(c._id))
      .map((c) => ({ id: c._id, path: paths.get(c._id) ?? c.name }))
      .sort((a, b) => a.path.localeCompare(b.path));
  }, [categories, category]);

  const save = useSettingsMutation((v: CategoryForm) => {
    const body = { name: v.name, parent: v.parent || null, description: v.description };
    return category ? categoriesApi.update(category._id, body) : categoriesApi.create(body);
  }, INVALIDATES.categories);

  const onSubmit = handleSubmit((values) =>
    save.mutate(values, {
      onSuccess: () => {
        toastSaved(isEdit ? 'Category saved' : 'Category created', values.name);
        onOpenChange(false);
      },
      onError: (err) => handleSaveError(err, setError, FIELDS),
    }),
  );

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      icon={FolderTree}
      title={isEdit ? 'Edit category' : 'New category'}
      description="Group products for filtering, reporting and stock valuation."
      onSubmit={onSubmit}
      submitting={save.isPending}
      submitLabel={isEdit ? 'Save changes' : 'Create category'}
    >
      <FormRow id="cat-name" label="Name" required error={errors.name?.message}>
        <Input {...fieldA11y('cat-name', errors.name?.message)} placeholder="Office furniture" autoComplete="off" {...register('name')} />
      </FormRow>

      <FormRow id="cat-parent" label="Parent category" optional error={errors.parent?.message} hint="Leave empty for a top-level category.">
        <Controller
          control={control}
          name="parent"
          render={({ field }) => (
            <Select value={field.value || ROOT} onValueChange={(v) => field.onChange(v === ROOT ? '' : v)}>
              <SelectTrigger {...fieldA11y('cat-parent', errors.parent?.message, 'hint')} ref={field.ref} onBlur={field.onBlur}>
                <SelectValue placeholder="Top level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ROOT}>
                  <span className="text-muted-foreground">None — top level</span>
                </SelectItem>
                {options.length > 0 && <SelectSeparator />}
                {options.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.path}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormRow>

      <FormRow id="cat-desc" label="Description" optional error={errors.description?.message}>
        <Textarea {...fieldA11y('cat-desc', errors.description?.message)} rows={3} placeholder="What belongs in this category?" {...register('description')} />
      </FormRow>
    </FormSheet>
  );
}
