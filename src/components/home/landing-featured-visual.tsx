import { BookOpen, CalendarCheck, Dices, Layers, Scroll } from "lucide-react";

const stats = [
  { label: "Gier w katalogu", value: "446+", icon: Layers },
  { label: "Planszówki i RPG", value: "2 typy", icon: Dices },
  { label: "Rezerwacje online", value: "24/7", icon: CalendarCheck },
];

/** Wizualna karta hero — kostki, karty, książka RPG, statystyki biblioteki. */
export function LandingFeaturedVisual({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="landing-featured-card relative overflow-hidden rounded-2xl p-5 shadow-2xl md:p-6">
        <div className="landing-featured-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden />

        <div className="relative grid gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="rounded-xl bg-white/95 px-3 py-2 shadow-md">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/70">
                Katalog
              </p>
              <p className="font-display text-lg font-bold text-foreground">Zakątek Fantastyki</p>
            </div>
            <div className="flex gap-1.5" aria-hidden>
              <span className="landing-die landing-die--violet">6</span>
              <span className="landing-die landing-die--gold">20</span>
            </div>
          </div>

          <div className="grid grid-cols-[1.1fr_0.9fr] gap-3">
            <div className="landing-game-tile rounded-xl p-3">
              <div className="mb-2 flex items-center gap-2">
                <Dices className="h-4 w-4 text-amber-200" aria-hidden />
                <span className="text-xs font-semibold text-white/90">Gra tygodnia</span>
              </div>
              <div className="aspect-[4/3] rounded-lg bg-gradient-to-br from-violet-400/30 to-amber-300/20 p-3">
                <div className="flex h-full flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="h-2 w-3/4 rounded-full bg-white/50" />
                    <div className="h-2 w-1/2 rounded-full bg-white/30" />
                  </div>
                  <div className="flex gap-1">
                    <span className="h-6 w-6 rounded-md bg-emerald-400/70" />
                    <span className="h-6 w-6 rounded-md bg-rose-400/70" />
                    <span className="h-6 w-6 rounded-md bg-sky-400/70" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="landing-rpg-book flex flex-1 flex-col justify-between rounded-xl p-3">
                <Scroll className="h-5 w-5 text-amber-200/90" aria-hidden />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-amber-100/80">
                    RPG
                  </p>
                  <p className="font-display text-sm font-semibold text-white">Podręczniki</p>
                </div>
              </div>
              <div className="landing-token-row flex items-center justify-center gap-2 rounded-xl py-2">
                <span className="landing-token landing-token--red" />
                <span className="landing-token landing-token--blue" />
                <span className="landing-token landing-token--green" />
                <span className="landing-token landing-token--gold" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {stats.map(({ label, value, icon: Icon }) => (
              <div key={label} className="landing-stat-chip rounded-xl px-2 py-2.5 text-center">
                <Icon className="mx-auto mb-1 h-4 w-4 text-amber-200" aria-hidden />
                <p className="font-display text-sm font-bold text-white">{value}</p>
                <p className="text-[10px] leading-tight text-white/70">{label}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs text-white/85">
            <BookOpen className="h-4 w-4 shrink-0 text-amber-200" aria-hidden />
            <span>Wypożycz, zagraj, oddaj — prosto jak ruch pionkiem po planszy.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
