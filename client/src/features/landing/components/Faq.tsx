import { AnimatePresence, motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useId, useState } from 'react';
import { cn } from '@/lib/utils';
import { EASE, Reveal, Section, SectionHeader } from '@/features/landing/components/primitives';

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
];

function FaqItem({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  const id = useId();
  const buttonId = `${id}-button`;
  const panelId = `${id}-panel`;
  return (
    <li className="border-b last:border-b-0">
      <h3>
        <button
          id={buttonId}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-4 rounded-lg py-5 text-left text-[15px] font-medium transition-colors hover:text-foreground/80"
        >
          {q}
          <Plus
            aria-hidden
            className={cn('size-4 shrink-0 text-muted-foreground transition-transform duration-panel ease-brand', open && 'rotate-45')}
          />
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
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
            <p className="max-w-2xl pb-5 text-sm leading-relaxed text-muted-foreground">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Section id="faq" labelledBy="faq-title" className="border-t bg-muted/30">
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
            {FAQS.map((f, i) => (
              <FaqItem key={f.q} q={f.q} a={f.a} open={open === i} onToggle={() => setOpen(open === i ? null : i)} />
            ))}
          </ul>
        </Reveal>
      </div>
    </Section>
  );
}
