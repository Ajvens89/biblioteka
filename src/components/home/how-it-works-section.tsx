"use client";

import type { LucideIcon } from "lucide-react";
import { BookOpen, Mail, MapPin } from "lucide-react";
import { MotionReveal, MotionStaggerItem } from "@/components/ui/motion-reveal";

type Step = {
  icon: LucideIcon;
  title: string;
  text: string;
};

const steps: Step[] = [
  {
    icon: BookOpen,
    title: "Znajdź tytuł",
    text: "Filtruj po liczbie graczy, czasie i wieku albo zeskanuj kod EAN z pudełka.",
  },
  {
    icon: Mail,
    title: "Napisz do nas",
    text: "Z karty gry wyślesz gotową wiadomość rezerwacyjną na adres fundacji.",
  },
  {
    icon: MapPin,
    title: "Odbierz i graj",
    text: "Grę odbierzesz w siedzibie Zakątka przy ul. Partyzantów 44 w Bielsku-Białej.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="zf-section-steps py-16 md:py-24" aria-labelledby="how-it-works-heading">
      <div className="mx-auto max-w-7xl px-4">
        <MotionReveal variant="fade-up">
          <div className="mb-12 max-w-2xl border-b border-border pb-8">
            <p className="text-eyebrow">Manifest</p>
            <h2 id="how-it-works-heading" className="text-h2 mt-2 text-foreground">
              Nikt nie gra solo. Wypożyczasz pudełko, wynosisz wieczór z ludźmi.
            </h2>
          </div>
        </MotionReveal>

        <MotionReveal variant="stagger-container" className="zf-steps-track relative">
          <div className="zf-steps-line hidden lg:block" aria-hidden />
          <div className="grid gap-4 sm:grid-cols-3">
            {steps.map(({ icon: Icon, title, text }, i) => (
              <MotionStaggerItem
                key={title}
                index={i}
                as="article"
                className="zf-step-card relative flex flex-col p-5"
              >
                <span className="zf-step-number mb-4 flex h-8 w-8 items-center justify-center rounded-full text-xs">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="zf-step-icon mb-4 flex h-11 w-11 items-center justify-center rounded-md border border-border/80 bg-surface-elevated">
                  <Icon className="h-5 w-5 text-primary" strokeWidth={1.75} aria-hidden />
                </div>
                <h3 className="font-display text-base font-medium text-foreground">{title}</h3>
                <p className="text-small mt-2 leading-relaxed text-muted-foreground">{text}</p>
              </MotionStaggerItem>
            ))}
          </div>
        </MotionReveal>
      </div>
    </section>
  );
}
