import { AnimatePresence, motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useId, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  EASE,
  Reveal,
  Section,
  SectionHeader,
} from '@/features/landing/components/primitives';

const FAQS = [
  {
    q: 'Can stock ever go negative?',
    a: 'No. Validating an operation runs inside a single database transaction: StockSense checks availability, writes the stock moves and updates quantities together. If there is not enough free stock, the whole operation is rejected and nothing changes.',
  },
  {
    q: 'What can each role do?',
    a: 'Admins manage everything, including users, warehouses and settings. Managers create and validate operations, run adjustments and view reports. Staff handle day-to-day receipts, picks and transfers within the permissions they are given.',
  },
  {
    q: 'Does it support multiple warehouses?',
    a: 'Yes. Create as many warehouses as you need, each with its own locations such as zones and racks. Stock is tracked per location, and internal transfers move it between them.',
  },
  {
    q: 'How “real time” is it?',
    a: 'When an operation is validated the change is pushed to every connected user, so dashboards, stock levels and alerts update in under a second without refreshing the page.',
  },
  {
    q: 'Can I export my data?',
    a: 'Yes. Stock levels, operations and the full move history can be exported to CSV for spreadsheets or to PDF for sharing and printing.',
  },
  {
    q: 'How do I reset a forgotten password?',
    a: 'Choose “Forgot password” on the sign-in page. StockSense emails you a one-time code (OTP); enter it to verify your identity and set a new password.',
  },
  {
    q: 'Does StockSense send low-stock alerts?',
    a: 'Yes. Each product can have a minimum quantity set. When stock drops to or below that number, StockSense automatically creates a notification and shows it on the dashboard in real time — no manual checking needed.',
  },
  {
    q: 'Can I track stock by location?',
    a: 'Yes. StockSense tracks quantities at the warehouse and location level, making it easy to see exactly where products are stored.',
  },
  {
    q: 'Can I transfer stock between warehouses?',
    a: 'Yes. Internal transfers allow you to move stock between warehouses or locations while keeping the inventory history updated automatically.',
  },
  {
    q: 'Can I see who changed the stock?',
    a: 'Yes. StockSense keeps a history of stock movements and operations so you can see what changed and when.',
  },
  {
    q: 'Can I create stock adjustments?',
    a: 'Yes. Authorized users can create adjustments when physical stock differs from the quantity recorded in the system. Adjustments are recorded in the move history.',
  },
  {
    q: 'Does StockSense keep an operation history?',
    a: 'Yes. Receipts, picks, transfers and adjustments are recorded so your team can review previous inventory activity whenever needed.',
  },
  {
    q: 'Can multiple users work at the same time?',
    a: 'Yes. Multiple users can work in the system simultaneously. Changes are synchronized so everyone connected sees updated stock and notifications.',
  },
  {
    q: 'Can I manage product information?',
    a: 'Yes. Products can be organized and maintained from the inventory management interface, including their stock settings and minimum quantities.',
  },
  {
    q: 'Is there a limit on the number of products?',
    a: 'StockSense is designed to support growing inventories, allowing you to manage a large product catalog across multiple warehouses and locations.',
  },
  {
    q: 'What happens when a stock operation fails?',
    a: 'The operation is rejected without partially applying its changes. This keeps quantities and stock movements consistent even when an operation cannot be completed.',
  },
  {
    q: 'Can managers access inventory reports?',
    a: 'Yes. Managers can view inventory information and reports to monitor stock levels, operations and movement history.',
  },
];

type FaqItemProps = {
  q: string;
  a: string;
  open: boolean;
  onToggle: () => void;
};
function FaqItem({ q, a, open, onToggle }: FaqItemProps) {
  const id = useId();
  const buttonId = `${id}-button`;
  const panelId = `${id}-panel`;

  const iconClassName = cn(
    'size-4 shrink-0 text-muted-foreground',
    'transition-transform duration-panel ease-brand',
    open && 'rotate-45',
  );

  return (
    <li className="border-b last:border-b-0">
      <h3>
        <button
          id={buttonId}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className={cn(
            'flex w-full items-center justify-between gap-4',
            'rounded-lg py-5 text-left text-[15px] font-medium',
            'transition-colors hover:text-foreground/80',
          )}
        >
          <span>{q}</span>

          <Plus aria-hidden className={iconClassName} />
        </button>
      </h3>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={panelId}
            role="region"
            aria-labelledby={buttonId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden"
          >
            <p className="max-w-2xl pb-5 text-sm leading-relaxed text-muted-foreground">
              {a}
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  );
}

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const handleToggle = (index: number) => {
    setOpenIndex((currentIndex) =>
      currentIndex === index ? null : index,
    );
  };

  return (
    <Section
      id="faq"
      labelledBy="faq-title"
      className="border-t bg-muted/30"
    >
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
        <SectionHeader
          id="faq-title"
          align="left"
          eyebrow="FAQ"
          title="Questions, answered."
          description="The short version of how StockSense keeps your inventory accurate and your team in sync."
        />

        <Reveal>
          <ul className="rounded-2xl border bg-card px-5 shadow-card sm:px-6">
            {FAQS.map(({ q, a }, index) => (
              <FaqItem
                key={q}
                q={q}
                a={a}
                open={openIndex === index}
                onToggle={() => handleToggle(index)}
              />
            ))}
          </ul>
        </Reveal>
      </div>
    </Section>
  );
}
