import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Dices,
  HelpCircle,
  Layers,
  LogIn,
  MapPin,
  RotateCcw,
  Scroll,
  Sparkles,
} from "lucide-react";
import { HomeHeroSearch } from "@/components/games/home-hero-search";
import { GameSection } from "@/components/games/game-section";
import { PageShell } from "@/components/ui/page-shell";
import { Button } from "@/components/ui/button";
import { DbUnavailableBanner } from "@/components/db-unavailable-banner";
import { APP_NAME } from "@/lib/constants";
import { isDatabaseAvailable } from "@/lib/db";
import {
  fetchAvailableNow,
  fetchNewestGames,
  fetchPopularGames,
  fetchRpgGames,
  type GameListItem,
} from "@/lib/games/queries";

const steps = [
  { icon: BookOpen, title: "Wybierz", text: "Przeglądaj katalog planszówek i RPG." },
  { icon: Layers, title: "Zarezerwuj", text: "Zaloguj się i zarezerwuj wolny egzemplarz." },
  { icon: MapPin, title: "Odbierz", text: "Odbierz grę w siedzibie Fundacji." },
  { icon: Dices, title: "Graj", text: "Ciesz się sesją z przyjaciółmi." },
  { icon: RotateCcw, title: "Zwróć", text: "Oddaj grę w terminie dla innych." },
];

const faq = [
  {
    q: "Czy trzeba mieć konto?",
    a: "Tak — rezerwacja online wymaga bezpłatnej rejestracji. Przeglądanie katalogu jest dostępne dla wszystkich.",
  },
  {
    q: "Na ile można wypożyczyć?",
    a: "Standardowy okres wypożyczenia wynosi 14 dni (zgodnie z regulaminem biblioteki). Możliwe jest przedłużenie po kontakcie z bibliotekarzem.",
  },
  {
    q: "Czy można zarezerwować RPG?",
    a: "Tak. Gry fabularne (książki, podręczniki) są w katalogu oznaczone jako „Gry fabularne” i rezerwujesz je tak samo jak planszówki.",
  },
  {
    q: "Co jeśli gra jest niedostępna?",
    a: "Możesz sprawdzić katalog później lub zapytać w bibliotece. Status „Dostępna” oznacza wolny egzemplarz do rezerwacji.",
  },
];

export default async function HomePage() {
  const empty: GameListItem[] = [];
  const dbOk = await isDatabaseAvailable();
  const [available, newest, rpg, popular] = dbOk
    ? await Promise.all([
        fetchAvailableNow(6),
        fetchNewestGames(6),
        fetchRpgGames(6),
        fetchPopularGames(6),
      ])
    : [empty, empty, empty, empty];

  return (
    <div className="overflow-x-hidden">
      <section className="gradient-hero relative overflow-hidden px-4 py-14 text-primary-foreground md:py-20">
        <div className="pattern-dots pointer-events-none absolute inset-0 opacity-40" aria-hidden />
        <div className="relative mx-auto max-w-4xl space-y-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm backdrop-blur">
            <Sparkles className="h-4 w-4" aria-hidden />
            Fundacja Zakątek Fantastyki
          </div>
          <h1 className="text-display">{APP_NAME}</h1>
          <p className="text-body mx-auto max-w-2xl text-lg opacity-95">
            Znajdź grę, zarezerwuj i odbierz w naszej siedzibie
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/katalog">
                Przeglądaj katalog
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="min-h-11 border-white/40 bg-white/10 text-primary-foreground hover:bg-white/20"
              asChild
            >
              <Link href="/login">
                <LogIn className="h-4 w-4" />
                Zaloguj się
              </Link>
            </Button>
          </div>
          <div className="flex justify-center gap-6 opacity-70" aria-hidden>
            <Dices className="h-8 w-8 rotate-12" />
            <Layers className="h-8 w-8 -rotate-6" />
            <Scroll className="h-8 w-8 rotate-6" />
          </div>
        </div>
      </section>

      <PageShell className="space-y-16">
        {!dbOk && <DbUnavailableBanner />}
        <section className="card-elevated -mt-8 p-4 md:-mt-12 md:p-6">
          <h2 className="text-h3 mb-4 text-center">Szybkie wyszukiwanie</h2>
          <HomeHeroSearch />
        </section>

        <GameSection
          title="Dostępne teraz"
          description="Gry, które możesz od razu zarezerwować."
          href="/katalog?availability=available"
          games={available}
          showReserve
        />
        <GameSection
          title="Nowości"
          description="Ostatnio dodane do biblioteki."
          href="/katalog?sort=newest"
          games={newest}
          showReserve
        />
        <GameSection
          title="Gry RPG"
          description="Podręczniki i światy fabularne."
          href="/katalog?collectionType=RPG"
          games={rpg}
          showReserve
        />
        <GameSection
          title="Najpopularniejsze"
          description="Często wybierane przez graczy."
          href="/katalog?sort=popular"
          games={popular}
          showReserve
        />

        <section className="space-y-8">
          <div className="text-center">
            <h2 className="text-h2">Jak to działa?</h2>
            <p className="text-body mx-auto mt-2 max-w-xl text-muted-foreground">
              Od wyboru gry do zwrotu — kilka prostych kroków.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {steps.map(({ icon: Icon, title, text }) => (
              <div key={title} className="card-elevated p-4 text-center">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-small mt-1 text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-primary" aria-hidden />
            <h2 className="text-h2">Najczęstsze pytania</h2>
          </div>
          <div className="space-y-3">
            {faq.map(({ q, a }) => (
              <details key={q} className="card-elevated group p-4">
                <summary className="cursor-pointer font-medium marker:content-none list-none [&::-webkit-details-marker]:hidden">
                  {q}
                </summary>
                <p className="text-body mt-3 text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
          <p className="text-small text-muted-foreground">
            Więcej informacji w{" "}
            <Link href="/regulamin" className="text-primary underline">
              regulaminie
            </Link>{" "}
            i na stronie{" "}
            <Link href="/kontakt" className="text-primary underline">
              kontakt
            </Link>
            .
          </p>
        </section>
      </PageShell>
    </div>
  );
}
