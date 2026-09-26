import { Mail } from 'lucide-react';
import { AuthActions } from '@/features/landing/components/AuthActions';
import { Reveal } from '@/features/landing/components/primitives';

const TOPICS = ['Product questions', 'Setting up your warehouses', 'Importing existing stock', 'Reporting a bug'];

export function CtaContact() {
  return (
    <section id="contact" aria-labelledby="contact-title" tabIndex={-1} className="relative scroll-mt-20 py-20 focus-visible:ring-0 focus-visible:ring-offset-0 sm:py-28">
      <div className="container">
        <Reveal>
          <div className="relative isolate overflow-hidden rounded-3xl border bg-card shadow-lift">
            <div className="bg-grid mask-radial pointer-events-none absolute inset-0 -z-10 opacity-70" aria-hidden />
            <div
              className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-64 w-[min(640px,90%)] -translate-x-1/2 rounded-full bg-primary/15 blur-[100px]"
              aria-hidden
            />
            <div className="grid gap-10 p-6 xs:p-8 sm:p-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-center lg:gap-16 lg:p-16">
              <div>
                <h2 id="contact-title" className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                  Ready to trust your stock numbers?
                </h2>
                <p className="mt-4 max-w-lg text-pretty text-base leading-relaxed text-muted-foreground">
                  Set up your warehouses, receive your first shipment and watch stock update live — or explore the seeded demo first.
                </p>
                <AuthActions
                  primaryFirst
                  size="lg"
                  secondaryLabel="View Demo"
                  secondaryVariant="outline"
                  className="mt-8 flex-col items-stretch gap-3 xs:flex-row xs:items-center"
                />
              </div>

              <div className="rounded-2xl border bg-background/70 p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl border bg-card text-primary">
                    <Mail className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold">Talk to the team</h3>
                    <a
                      href="mailto:hello@stocksense.io"
                      className="block truncate rounded text-sm text-primary underline-offset-4 hover:underline"
                    >
                      hello@stocksense.io
                    </a>
                  </div>
                </div>
                <p className="mt-4 text-caption text-muted-foreground">We&apos;re happy to help with:</p>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {TOPICS.map((t) => (
                    <li key={t} className="flex items-center gap-2">
                      <span className="size-1 rounded-full bg-muted-foreground" aria-hidden />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
