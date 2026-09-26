import { Analytics } from '@/features/landing/components/Analytics';
import { CtaContact } from '@/features/landing/components/CtaContact';
import { Faq } from '@/features/landing/components/Faq';
import { Features } from '@/features/landing/components/Features';
import { Footer } from '@/features/landing/components/Footer';
import { Hero } from '@/features/landing/components/Hero';
import { HowItWorks } from '@/features/landing/components/HowItWorks';
import { InventorySection } from '@/features/landing/components/InventorySection';
import { Navbar } from '@/features/landing/components/Navbar';
import { OperationsSection } from '@/features/landing/components/OperationsSection';
import { PreviewSection } from '@/features/landing/components/PreviewSection';

export default function LandingPage() {
  return (
    <div className="relative min-h-dvh overflow-x-clip bg-background text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:shadow-lift"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main" tabIndex={-1} className="focus-visible:ring-0 focus-visible:ring-offset-0">
        <Hero />
        <Features />
        <HowItWorks />
        <PreviewSection />
        <OperationsSection />
        <InventorySection />
        <Analytics />
        <Faq />
        <CtaContact />
      </main>
      <Footer />
    </div>
  );
}
