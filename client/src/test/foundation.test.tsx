import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatCurrency, formatDate, formatSigned } from '@/lib/format';
import { hasRole } from '@/store/auth';

describe('format', () => {
  it('formats currency as ₹ with Indian grouping', () => {
    expect(formatCurrency(3000)).toBe('₹3,000');
    expect(formatCurrency(1250000)).toBe('₹12,50,000');
  });

  it('formats dates as dd/MM/yyyy', () => {
    expect(formatDate('2026-03-07T10:00:00')).toBe('07/03/2026');
    expect(formatDate(null)).toBe('—');
  });

  it('signs ledger quantities with + and a true minus', () => {
    expect(formatSigned(50)).toBe('+50');
    expect(formatSigned(-10)).toBe('−10');
  });
});

describe('StatusBadge', () => {
  it('renders each status label', () => {
    render(
      <>
        <StatusBadge status="draft" />
        <StatusBadge status="waiting" />
        <StatusBadge status="ready" />
        <StatusBadge status="done" />
        <StatusBadge status="canceled" />
      </>,
    );
    for (const label of ['Draft', 'Waiting', 'Ready', 'Done', 'Canceled']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('strikes through canceled operations', () => {
    render(<StatusBadge status="canceled" />);
    expect(screen.getByText('Canceled').closest('span')).toHaveClass('line-through');
  });
});

describe('hasRole', () => {
  it('respects the staff < manager < admin hierarchy', () => {
    expect(hasRole('admin', 'manager')).toBe(true);
    expect(hasRole('manager', 'manager')).toBe(true);
    expect(hasRole('staff', 'manager')).toBe(false);
    expect(hasRole(undefined, 'staff')).toBe(false);
  });
});
