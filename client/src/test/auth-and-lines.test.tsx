import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ErrorBanner } from '@/features/auth/components/FormBits';
import { PasswordChecklist } from '@/features/auth/components/PasswordChecklist';
import { loginErrorMessage } from '@/features/auth/types';
import { signupSchema } from '@/features/auth/schema';
import { ProductLines, type LineDraft } from '@/features/operations/components/ProductLines';


function wrap(ui: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TooltipProvider>
        <MemoryRouter>{ui}</MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

describe('login error message', () => {
  const axiosErr = (status: number, message: string) =>
    new AxiosError('fail', 'ERR_BAD_REQUEST', undefined, undefined, {
      status,
      statusText: '',
      data: { success: false, message, errors: [] },
      headers: {},
      config: { headers: new AxiosHeaders() },
    });

  it('maps a 401 to exactly "Invalid Login Id or Password"', () => {
    expect(loginErrorMessage(axiosErr(401, 'anything'))).toBe('Invalid Login Id or Password');
  });

  it('surfaces other server messages (e.g. rate limiting)', () => {
    expect(loginErrorMessage(axiosErr(429, 'Too many login attempts'))).toBe('Too many login attempts');
  });

  it('renders the message in an alert banner', () => {
    render(<ErrorBanner message="Invalid Login Id or Password" attempt={1} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid Login Id or Password');
  });
});

describe('sign-up validation', () => {
  const base = { loginId: 'newuser1', email: 'a@b.io', password: 'Str0ng@Pass', confirmPassword: 'Str0ng@Pass' };
  const issues = (v: object) => {
    const r = signupSchema.safeParse({ ...base, ...v });
    return r.success ? [] : r.error.issues.map((i) => i.path.join('.'));
  };

  it('accepts a valid form', () => expect(issues({})).toEqual([]));
  it('enforces login id length 6–12', () => {
    expect(issues({ loginId: 'abc' })).toContain('loginId');
    expect(issues({ loginId: 'thirteenchars' })).toContain('loginId');
  });
  it('enforces password rules and matching confirmation', () => {
    expect(issues({ password: 'short@A1', confirmPassword: 'short@A1' })).toContain('password');
    expect(issues({ password: 'nouppercase@1', confirmPassword: 'nouppercase@1' })).toContain('password');
    expect(issues({ password: 'NoSpecial1234', confirmPassword: 'NoSpecial1234' })).toContain('password');
    expect(issues({ confirmPassword: 'Other@12345' })).toContain('confirmPassword');
  });
});

describe('PasswordChecklist', () => {
  it('ticks each rule as it is met', () => {
    const { rerender } = render(<PasswordChecklist value="abc" />);
    expect(screen.getByText('A lowercase letter').textContent).toContain('(met)');
    expect(screen.getByText('An uppercase letter').textContent).toContain('(not met)');
    rerender(<PasswordChecklist value="Abcdefgh@1" />);
    for (const rule of ['More than 8 characters', 'A lowercase letter', 'An uppercase letter', 'A special character']) {
      expect(screen.getByText(rule).textContent).toContain('(met)');
    }
  });
});

describe('ProductLines (delivery shortage)', () => {
  it('marks a short line red with "Only N available"', () => {
    const line: LineDraft = {
      key: 'l1',
      product: { _id: 'p1', sku: 'DESK001', name: 'Desk', uom: 'Units', perUnitCost: 3000 },
      quantity: 10,
      saved: {
        _id: 'l1',
        product: { _id: 'p1', sku: 'DESK001', name: 'Desk', uom: 'Units', perUnitCost: 3000, salePrice: 4500 },
        quantity: 10,
        doneQty: 0,
        reservedQty: 0,
        isShort: true,
        availableQty: 3,
        recordedQty: null,
        countedQty: null,
        available: 3,
      },
    };
    wrap(<ProductLines lines={[line]} onChange={() => undefined} editable={false} showAvailability sourceLocation="loc1" />);
    expect(screen.getByRole('status')).toHaveTextContent('Short by 7 · Only 3 available');
    expect(screen.getByRole('listitem')).toHaveClass('bg-destructive/[0.05]');
  });

  it('shows a green available count when stock is sufficient', async () => {
    const line: LineDraft = {
      key: 'l2',
      product: { _id: 'p2', sku: 'TBL001', name: 'Table', uom: 'Units', perUnitCost: 3000 },
      quantity: 4,
      saved: {
        _id: 'l2',
        product: { _id: 'p2', sku: 'TBL001', name: 'Table', uom: 'Units', perUnitCost: 3000, salePrice: 4200 },
        quantity: 4,
        doneQty: 0,
        reservedQty: 0,
        isShort: false,
        availableQty: 50,
        recordedQty: null,
        countedQty: null,
        available: 50,
      },
    };
    wrap(<ProductLines lines={[line]} onChange={() => undefined} editable={false} showAvailability sourceLocation="loc1" />);
    await waitFor(() => expect(screen.getByText('available')).toBeInTheDocument());
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
