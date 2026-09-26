import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatNumber } from '@/lib/format';

interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  noun?: string;
}

export function Pagination({ page, limit, total, onPageChange, noun = 'records' }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 text-[13px]">
      <p className="text-muted-foreground">
        <span className="tabular font-medium text-foreground">
          {formatNumber(from)}–{formatNumber(to)}
        </span>{' '}
        of <span className="tabular font-medium text-foreground">{formatNumber(total)}</span> {noun}
      </p>
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="icon-sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <ChevronLeft />
        </Button>
        <span className="tabular min-w-[4.5rem] text-center text-muted-foreground">
          {page} / {pages}
        </span>
        <Button variant="outline" size="icon-sm" onClick={() => onPageChange(page + 1)} disabled={page >= pages} aria-label="Next page">
          <ChevronRight />
        </Button>
      </div>
    </nav>
  );
}
