"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "fade-up" | "fade" | "scale-soft" | "stagger-container";

type Props = {
  children: ReactNode;
  variant?: Variant;
  className?: string;
  delay?: number;
  as?: ElementType;
};

export function MotionReveal({
  children,
  variant = "fade-up",
  className,
  delay = 0,
  as: Tag = "div",
}: Props) {
  const ref = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -5% 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={cn(
        "motion-reveal",
        `motion-reveal--${variant}`,
        !revealed && "motion-reveal--pending",
        revealed && "motion-reveal--visible",
        className,
      )}
      style={delay > 0 ? ({ ["--motion-delay" as string]: `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </Tag>
  );
}

type StaggerItemProps = {
  children: ReactNode;
  index: number;
  className?: string;
  as?: ElementType;
};

export function MotionStaggerItem({
  children,
  index,
  className,
  as: Tag = "div",
}: StaggerItemProps) {
  const delay = Math.min(index * 45, 360);
  return (
    <Tag
      className={cn("motion-stagger-item", className)}
      style={{ ["--stagger-delay" as string]: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}
