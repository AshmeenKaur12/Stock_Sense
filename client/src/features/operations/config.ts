import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, SlidersHorizontal, type LucideIcon } from 'lucide-react';
import { DELIVERY_STEPS, RECEIPT_STEPS, type StepDef } from '@/components/common/StatusStepper';
import type { OperationStatus, OperationType } from '@/lib/types';

export type OperationSegment = 'receipts' | 'deliveries' | 'transfers' | 'adjustments';

export interface OperationConfig {
  segment: OperationSegment;
  type: OperationType;
  title: string;
  singular: string;
  description: string;
  icon: LucideIcon;
  code: string;
  steps: StepDef[];
  /** Status tabs / kanban columns, in order. */
  statuses: OperationStatus[];
  contactType?: 'vendor' | 'customer';
  contactLabel?: string;
  hasKanban: boolean;
  emptyTitle: string;
  emptyDescription: string;
}

export const OPERATION_CONFIG: Record<OperationSegment, OperationConfig> = {
  receipts: {
    segment: 'receipts',
    type: 'receipt',
    title: 'Receipts',
    singular: 'Receipt',
    description: 'Incoming stock from vendors into your warehouse locations.',
    icon: ArrowDownToLine,
    code: 'IN',
    steps: RECEIPT_STEPS,
    statuses: ['draft', 'ready', 'done', 'canceled'],
    contactType: 'vendor',
    contactLabel: 'Receive From',
    hasKanban: true,
    emptyTitle: 'No receipts yet',
    emptyDescription: 'Create your first receipt to start tracking incoming inventory.',
  },
  deliveries: {
    segment: 'deliveries',
    type: 'delivery',
    title: 'Delivery',
    singular: 'Delivery',
    description: 'Outgoing orders — check availability, pick, pack and ship.',
    icon: ArrowUpFromLine,
    code: 'OUT',
    steps: DELIVERY_STEPS,
    statuses: ['draft', 'waiting', 'ready', 'done', 'canceled'],
    contactType: 'customer',
    contactLabel: 'Customer',
    hasKanban: true,
    emptyTitle: 'No deliveries yet',
    emptyDescription: 'Create a delivery order to ship stock to a customer.',
  },
  transfers: {
    segment: 'transfers',
    type: 'internal',
    title: 'Internal Transfers',
    singular: 'Internal Transfer',
    description: 'Move stock between locations and warehouses — totals stay the same.',
    icon: ArrowLeftRight,
    code: 'INT',
    steps: RECEIPT_STEPS,
    statuses: ['draft', 'ready', 'done', 'canceled'],
    hasKanban: true,
    emptyTitle: 'No transfers yet',
    emptyDescription: 'Move stock from one location to another, e.g. Main Store → Production Rack.',
  },
  adjustments: {
    segment: 'adjustments',
    type: 'adjustment',
    title: 'Inventory Adjustments',
    singular: 'Adjustment',
    description: 'Reconcile counted stock with recorded stock — every change is logged.',
    icon: SlidersHorizontal,
    code: 'ADJ',
    steps: [{ status: 'done', label: 'Done' }],
    statuses: ['done'],
    hasKanban: false,
    emptyTitle: 'No adjustments yet',
    emptyDescription: 'Record damaged, lost or expired stock, or correct a cycle count.',
  },
};

export const SEGMENT_FOR_TYPE: Record<OperationType, OperationSegment> = {
  receipt: 'receipts',
  delivery: 'deliveries',
  internal: 'transfers',
  adjustment: 'adjustments',
};

export const operationPath = (type: OperationType, id: string) => `/operations/${SEGMENT_FOR_TYPE[type]}/${id}`;

/** Kanban drag targets allowed from each status (server enforces the same rules). */
export function allowedTargets(type: OperationType, from: OperationStatus): OperationStatus[] {
  if (from === 'done' || from === 'canceled') return [];
  if (type === 'delivery') {
    if (from === 'draft' || from === 'waiting') return ['ready', 'canceled'];
    return ['done', 'canceled'];
  }
  if (from === 'draft') return ['ready', 'canceled'];
  return ['done', 'canceled'];
}
