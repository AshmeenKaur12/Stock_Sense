import { act, fireEvent, render, screen } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it, vi } from 'vitest';
import { ErrorState } from '@/components/common/ErrorState';
import { SearchInput } from '@/components/common/SearchInput';
import { DELIVERY_STEPS, RECEIPT_STEPS, StatusStepper } from '@/components/common/StatusStepper';
import { ViewToggle } from '@/components/common/ViewToggle';
import { TooltipProvider } from '@/components/ui/tooltip';

const stepStates = () => screen.getAllByRole('listitem').map((li) => `${li.textContent?.replace(/\(.*\)/, '').trim()}:${li.getAttribute('data-state') ?? 'marker'}`);

describe('StatusStepper', () => {
  it('marks earlier steps done and the current step as the aria-current step', () => {
    render(<StatusStepper steps={RECEIPT_STEPS} current="ready" />);
    expect(stepStates()).toEqual(['Draft:done', 'Ready:current', 'Done:todo']);
    expect(screen.getByText('Ready').closest('li')).toHaveAttribute('aria-current', 'step');
  });

  it('shows all four delivery steps with Waiting current', () => {
    render(<StatusStepper steps={DELIVERY_STEPS} current="waiting" />);
    expect(stepStates()).toEqual(['Draft:done', 'Waiting:current', 'Ready:todo', 'Done:todo']);
  });

  it('keeps a gradient fill on the current step of each stepper when several are on screen', () => {
    render(
      <>
        <StatusStepper steps={RECEIPT_STEPS} current="ready" />
        <StatusStepper steps={DELIVERY_STEPS} current="waiting" />
      </>,
    );
    const fills = screen.getAllByTestId('stepper-current-fill');
    expect(fills).toHaveLength(2);
    expect(fills.map((f) => f.closest('li')?.textContent?.replace(/\(.*\)/, '').trim())).toEqual(['Ready', 'Waiting']);
  });

  it('adds a canceled marker and leaves every step upcoming when canceled', () => {
    render(<StatusStepper steps={RECEIPT_STEPS} current="canceled" />);
    expect(stepStates()).toEqual(['Draft:todo', 'Ready:todo', 'Done:todo', 'Canceled:marker']);
  });
});

describe('ErrorState', () => {
  const withStatus = (status: number) =>
    new AxiosError('fail', 'ERR_BAD_REQUEST', undefined, undefined, {
      status,
      statusText: '',
      data: { success: false, message: 'Server said no', errors: [] },
      headers: {},
      config: { headers: new AxiosHeaders() },
    });

  it('offers Retry for network errors and calls it', () => {
    const onRetry = vi.fn();
    render(<ErrorState error={new AxiosError('Network Error', 'ERR_NETWORK')} onRetry={onRetry} />);
    expect(screen.getByText('Network error')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('shows Forbidden without a retry button for 403', () => {
    render(<ErrorState error={withStatus(403)} onRetry={() => undefined} />);
    expect(screen.getByText('Forbidden')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });

  it('surfaces the server message for 5xx errors', () => {
    render(<ErrorState error={withStatus(500)} onRetry={() => undefined} />);
    expect(screen.getByText('Server said no')).toBeInTheDocument();
  });
});

describe('SearchInput', () => {
  it('debounces onChange and trims the value', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(<SearchInput value="" onChange={onChange} debounceMs={300} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '  WH/IN  ' } });
    expect(onChange).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(300));
    expect(onChange).toHaveBeenCalledWith('WH/IN');
    vi.useRealTimers();
  });

  it('clears immediately via the clear button', () => {
    const onChange = vi.fn();
    render(<SearchInput value="desk" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /clear search/i }));
    expect(onChange).toHaveBeenCalledWith('');
  });
});

describe('ViewToggle', () => {
  const renderToggle = (value: 'list' | 'kanban', onChange = vi.fn()) => {
    render(
      <TooltipProvider>
        <ViewToggle value={value} onChange={onChange} />
      </TooltipProvider>,
    );
    return onChange;
  };

  it('exposes radio semantics with the active view checked', () => {
    renderToggle('list');
    expect(screen.getByRole('radio', { name: 'List view' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Kanban view' })).toHaveAttribute('aria-checked', 'false');
  });

  it('switches on click and on the V shortcut', () => {
    const onChange = renderToggle('list');
    fireEvent.click(screen.getByRole('radio', { name: 'Kanban view' }));
    expect(onChange).toHaveBeenLastCalledWith('kanban');
    fireEvent.keyDown(window, { key: 'v' });
    expect(onChange).toHaveBeenLastCalledWith('kanban');
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});
