import { AxiosError, AxiosHeaders } from 'axios';
import { ArrowDownToLine, Boxes, PackageOpen, Plus, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { KpiCard } from '@/components/common/KpiCard';
import { LoadingState } from '@/components/common/LoadingState';
import { SearchInput } from '@/components/common/SearchInput';
import { DELIVERY_STEPS, RECEIPT_STEPS, StatusStepper } from '@/components/common/StatusStepper';
import { StatusBadge, StockStatusBadge, type OperationStatus } from '@/components/common/StatusBadge';
import { ViewToggle, type ViewMode } from '@/components/common/ViewToggle';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

/** Dev-only living style guide (mounted at /design only in development builds). */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="caption-label">{title}</h2>
      {children}
    </section>
  );
}

const networkError = new AxiosError('Network Error', 'ERR_NETWORK');
const forbiddenError = new AxiosError('Forbidden', 'ERR_BAD_REQUEST', undefined, undefined, {
  status: 403,
  statusText: 'Forbidden',
  data: { success: false, message: 'Forbidden', errors: [] },
  headers: {},
  config: { headers: new AxiosHeaders() },
});

export default function DesignPage() {
  const [search, setSearch] = useState('');
  const [view, setView] = useState<ViewMode>('list');
  const [receipt, setReceipt] = useState<OperationStatus>('draft');
  const [delivery, setDelivery] = useState<OperationStatus>('waiting');
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="space-y-10">
      <div className="space-y-1">
        <div className="caption-label">Development</div>
        <h1 className="text-h1">Design system</h1>
        <p className="text-sm text-muted-foreground">Tokens and shared components. Not included in production builds.</p>
      </div>

      <Section title="List header (mockup pattern)">
        <Card className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Button variant="gradient" size="sm">
                <Plus /> NEW
              </Button>
              <h2 className="text-h2">
                Receipts <span className="tabular text-muted-foreground">12</span>
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <SearchInput value={search} onChange={setSearch} placeholder="Search reference or contact…" />
              <ViewToggle value={view} onChange={setView} />
            </div>
          </div>
          <p className="mt-3 text-caption text-muted-foreground">
            search = “{search}” · view = {view}
          </p>
        </Card>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap gap-2">
          <Button variant="gradient">Validate</Button>
          <Button>Primary</Button>
          <Button variant="outline">Print</Button>
          <Button variant="ghost-danger">Cancel</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Destructive</Button>
          <Button loading>Saving</Button>
        </div>
      </Section>

      <Section title="Status badges">
        <div className="flex flex-wrap gap-2">
          {(['draft', 'waiting', 'ready', 'done', 'canceled'] as const).map((s) => (
            <StatusBadge key={s} status={s} />
          ))}
          {(['in', 'low', 'out'] as const).map((s) => (
            <StockStatusBadge key={s} status={s} />
          ))}
        </div>
      </Section>

      <Section title="Status stepper (click a status)">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <StatusStepper steps={RECEIPT_STEPS} current={receipt} className="w-full max-w-sm" />
            {(['draft', 'ready', 'done', 'canceled'] as const).map((s) => (
              <Button key={s} size="sm" variant={receipt === s ? 'secondary' : 'ghost'} onClick={() => setReceipt(s)}>
                {s}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusStepper steps={DELIVERY_STEPS} current={delivery} className="w-full max-w-md" />
            {(['draft', 'waiting', 'ready', 'done'] as const).map((s) => (
              <Button key={s} size="sm" variant={delivery === s ? 'secondary' : 'ghost'} onClick={() => setDelivery(s)}>
                {s}
              </Button>
            ))}
          </div>
        </div>
      </Section>

      <Section title="KPI tiles">
        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard label="Total Products in Stock" value={1248} icon={Boxes} delta={4.2} sparkline={[4, 6, 5, 8, 7, 9, 11]} />
          <KpiCard label="Pending Receipts" value={4} icon={ArrowDownToLine} tone="success" delta={-12.5} sparkline={[6, 5, 7, 4, 5, 3, 4]} />
          <KpiCard label="Low / Out of Stock" value={6} icon={TriangleAlert} tone="warning" delta={-8} invertDelta sparkline={[9, 8, 8, 7, 7, 6, 6]} />
        </div>
      </Section>

      <Section title="Confirm dialog">
        <Button variant="outline" onClick={() => setConfirmOpen(true)}>
          Open confirm dialog
        </Button>
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Validate WH/IN/0001?"
          description="Stock will increase at WH/Stock1. Done operations are locked."
          confirmLabel="Validate"
          onConfirm={() => setConfirmOpen(false)}
        />
      </Section>

      <Section title="Loading states">
        <div className="space-y-4">
          <LoadingState variant="table" rows={3} />
          <LoadingState variant="cards" rows={3} />
          <LoadingState variant="kanban" />
        </div>
      </Section>

      <Section title="Empty & error states">
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <EmptyState icon={PackageOpen} title="No operations found" description="Try another filter or create a new receipt." action={<Button variant="gradient" size="sm"><Plus /> New Receipt</Button>} />
          </Card>
          <ErrorState error={networkError} onRetry={() => undefined} />
          <ErrorState error={forbiddenError} />
        </div>
      </Section>
    </div>
  );
}
