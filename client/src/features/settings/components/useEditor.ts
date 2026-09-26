import { useMemo, useState } from 'react';

/** Open/close state for a create/edit sheet plus a pending delete target. */
export function useEditor<T>() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [removing, setRemoving] = useState<T | null>(null);

  // Stable callbacks so column definitions can memoise on them.
  const actions = useMemo(
    () => ({
      create: () => {
        setEditing(null);
        setOpen(true);
      },
      edit: (item: T) => {
        setEditing(item);
        setOpen(true);
      },
      setOpen,
      askRemove: (item: T) => setRemoving(item),
      closeRemove: () => setRemoving(null),
    }),
    [],
  );

  return { open, editing, removing, ...actions };
}
