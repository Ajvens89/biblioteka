import Link from "next/link";
import { ArrowRight, Heart, MapPin } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Button } from "@/components/ui/button";
import { MotionReveal } from "@/components/ui/motion-reveal";
import { getAppSettings } from "@/lib/settings";

export async function FoundationSection() {
  const settings = await getAppSettings();

  return (
    <section className="zf-section-foundation py-16 md:py-20" aria-labelledby="foundation-heading">
      <div className="zf-section-foundation-glow" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-4">
        <MotionReveal variant="fade-up">
          <div className="zf-foundation-panel grid gap-10 md:grid-cols-[1fr_1.2fr] md:items-center md:gap-12">
            <div className="space-y-5">
              <BrandLogo showSubtitle subtitle="Fundacja Zakątek Fantastyki" size="md" />
              <p className="text-eyebrow">Społeczność i kultura fantastyki</p>
              <h2 id="foundation-heading" className="text-h2">
                Więcej niż katalog gier
              </h2>
              <p className="text-body text-muted-foreground">
                Biblioteka jest częścią działalności fundacji promującej kulturę fantastyki, gier planszowych
                i RPG. Katalog możesz przeglądać online — o wypożyczeniu napisz do fundacji.
              </p>
              <p className="text-small inline-flex items-start gap-2 text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span>{settings.foundationAddress}</span>
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap md:justify-end">
              <Button variant="default" asChild>
                <a href="https://zakatekfantastyki.pl/" target="_blank" rel="noopener noreferrer">
                  Odwiedź stronę Fundacji
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </a>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/kontakt">Kontakt</Link>
              </Button>
              <Button variant="secondary" asChild>
                <Link href="/regulamin">
                  <Heart className="h-4 w-4" aria-hidden />
                  Regulamin biblioteki
                </Link>
              </Button>
            </div>
          </div>
        </MotionReveal>
      </div>
    </section>
  );
}
