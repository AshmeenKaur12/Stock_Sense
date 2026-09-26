import { DashboardPreview } from '@/features/landing/components/DashboardPreview';
import { Section, SectionHeader } from '@/features/landing/components/primitives';
import { Stats } from '@/features/landing/components/Stats';

export function PreviewSection() {
  return (
    <Section id="preview" labelledBy="preview-title" className="overflow-hidden">
      <SectionHeader
        id="preview-title"
        eyebrow="Dashboard"
        title="Your whole operation, at a glance."
        description="Receipts to process, deliveries that are late, stock running low — the dashboard shows what needs attention the moment it changes."
      />
      <div className="mt-14">
        <DashboardPreview />
      </div>
      <div className="relative mt-10">
        <Stats />
      </div>
    </Section>
  );
}
