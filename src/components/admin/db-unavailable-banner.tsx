import { DbUnavailableBanner as DbUnavailableNotice } from "@/components/db-unavailable-banner";
import { SectionCard } from "@/components/ui/section-card";

export function DbUnavailableBanner() {
  return (
    <SectionCard title="Baza danych niedostępna">
      <DbUnavailableNotice compact />
    </SectionCard>
  );
}
