import { MoreHorizontal, Pencil, Trash2, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface RowActionsProps {
  label: string;
  onEdit?: () => void;
  onDelete?: () => void;
  deleteLabel?: string;
  deleteIcon?: LucideIcon;
  className?: string;
}

/** "⋯" menu for a row or card: Edit and a destructive action. */
export function RowActions({ label, onEdit, onDelete, deleteLabel = 'Delete', deleteIcon: DeleteIcon = Trash2, className }: RowActionsProps) {
  if (!onEdit && !onDelete) return null;
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Actions for ${label}`}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          className={cn('text-muted-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground', className)}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        {onEdit && (
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil />
            Edit
          </DropdownMenuItem>
        )}
        {onEdit && onDelete && <DropdownMenuSeparator />}
        {onDelete && (
          <DropdownMenuItem destructive onSelect={onDelete}>
            <DeleteIcon />
            {deleteLabel}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
