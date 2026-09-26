import { AnimatePresence, motion } from 'framer-motion';
import { CircleAlert } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { getErrorMessage } from '@/lib/axios';

interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  /** Performs the delete; rejects with the API error (e.g. 409 "holds stock"). */
  onConfirm: () => Promise<unknown>;
  successTitle: string;
  loading?: boolean;
}

/** Destructive confirm that keeps the dialog open and shows the server's reason on failure. */
export function DeleteDialog({ open, onOpenChange, title, description, confirmLabel = 'Delete', onConfirm, successTitle, loading }: DeleteDialogProps) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  const confirm = async () => {
    setError(null);
    try {
      await onConfirm();
      toast.success(successTitle);
      onOpenChange(false);
    } catch (err) {
      const message = getErrorMessage(err, 'This record could not be removed.');
      setError(message);
      toast.error('Action blocked', { description: message });
    }
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      tone="destructive"
      loading={loading}
      onConfirm={() => void confirm()}
    >
      <AnimatePresence initial={false}>
        {error && (
          <motion.div
            key="error"
            role="alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-[13px] font-medium text-destructive">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmDialog>
  );
}
