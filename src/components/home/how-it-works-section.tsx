"use client";

import type { LucideIcon } from "lucide-react";
import { BookOpen, Mail, MapPin } from "lucide-react";
import { MotionReveal, MotionStaggerItem } from "@/components/ui/motion-reveal";
import { FOUNDATION_LOAN_EMAIL } from "@/lib/constants";

type Step = {
  icon: LucideIcon;
  title: string;
  text: string;
};

const steps: Step[] = [
  {
    icon: BookOpen,
    title: "Przeglądaj katalog",
    text: "Szukaj planszówek i podręczników RPG — okładki, opisy i parametry są dostępne bez konta.",
  },
  {
    icon: Mail,
    title: "Napisz do fundacji",
    text: `W sprawie wypożyczenia napisz na ${FOUNDATION_LOAN_EMAIL} — podaj tytuł gry.`,
  },
  {
    icon: MapPin,
    title: "Odbierz na miejscu",
    text: "Po ustaleniu szczegółów odbierzesz grę w siedzibie Fundacji Zakątek Fantastyki.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="zf-section-steps py-16 md:py-24" aria-labelledby="how-it-works-heading">
      <div className="mx-auto max-w-7xl px-4">
        <MotionReveal variant="fade-up">
          <div className="mb-12 max-w-xl border-b border-border pb-8">
            <p className="text-eyebrow">Jak korzystać</p>
            <h2 id="how-it-works-heading" className="text-h2 mt-2 text-foreground">
              Katalog w trybie poglądu
            </h2>
            <p className="text-body mt-3 text-muted-foreground">
              Online przeglądasz zbiór. Wypożyczenie ustalisz mailowo z fundacją.
            </p>
          </div>
        </MotionReveal>

        <MotionReveal variant="stagger-container" className="zf-steps-track relative">
          <div className="zf-steps-line hidden lg:block" aria-hidden />
          <div className="grid gap-4 sm:grid-cols-3">
            {steps.map(({ icon: Icon, title, text }, i) => (
              <MotionStaggerItem key={title} index={i} as="article" className="zf-step-card relative flex flex-col p-5">
                <span className="zf-step-number mb-4 flex h-8 w-8 items-center justify-center rounded-full text-xs">
                  {i + 1}
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
