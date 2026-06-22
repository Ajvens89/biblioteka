import Link from "next/link";
import { ArrowRight, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FoundationSection() {
  return (
    <section className="border-t border-border bg-card py-14 md:py-16" aria-labelledby="foundation-heading">
      <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="max-w-2xl space-y-3">
          <p className="text-eyebrow">Fundacja Zakątek Fantastyki</p>
          <h2 id="foundation-heading" className="text-h2">
            Więcej niż katalog gier
          </h2>
          <p className="text-body text-muted-foreground">
            Biblioteka jest częścią działalności fundacji promującej kulturę fantastyki, gier planszowych
            i RPG. Wypożyczając u nas, wspierasz społeczność graczy i czytelników.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" asChild>
            <Link href="/kontakt">
              Kontakt
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/regulamin">
              <Heart className="h-4 w-4" aria-hidden />
              Regulamin biblioteki
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
