"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type ComboboxOption = { value: string; label: string };

type Props = {
  options: ComboboxOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  ariaLabel?: string;
  id?: string;
  className?: string;
  testId?: string;
};

/**
 * Wyszukiwalny combobox oparty na Radix Popover (bez nowej zależności).
 * Obsługa klawiatury: strzałki, Enter, Escape; stan pusty; czyszczenie wyboru.
 */
export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Wybierz…",
  searchPlaceholder = "Szukaj…",
  emptyText = "Brak wyników",
  ariaLabel,
  id,
  className,
  testId,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const listRef = React.useRef<HTMLUListElement>(null);
  const listId = React.useId();

  const selected = options.find((o) => o.value === value) ?? null;

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  // Clamp instead of resetting via useEffect (avoids setState-in-effect lint).
  const safeActiveIndex =
    filtered.length === 0 ? 0 : Math.min(activeIndex, filtered.length - 1);

  const commit = (next: string) => {
    onChange(next);
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) setActiveIndex(0);
    else setQuery("");
  };

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[safeActiveIndex];
      if (opt) commit(opt.value);
    }
  };

  React.useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${safeActiveIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [safeActiveIndex, open]);

  return (
    <div className={cn("flex items-stretch gap-1", className)}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            id={id}
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-label={ariaLabel}
            data-testid={testId}
            className={cn(
              "flex h-10 min-w-0 flex-1 items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 text-left text-sm",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
              "hover:border-border-strong",
            )}
          >
            <span className={cn("truncate", !selected && "text-muted-foreground")}>
              {selected ? selected.label : placeholder}
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent className="p-0">
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={onInputKeyDown}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              aria-controls={listId}
              aria-activedescendant={
                filtered[safeActiveIndex] ? `${listId}-opt-${safeActiveIndex}` : undefined
              }
              className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={ariaLabel}
            className="max-h-60 overflow-y-auto py-1"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground" role="presentation">
                {emptyText}
              </li>
            ) : (
              filtered.map((opt, index) => {
                const isSelected = opt.value === value;
                const isActive = index === safeActiveIndex;
                return (
                  <li key={opt.value} role="presentation">
                    <button
                      type="button"
                      role="option"
                      id={`${listId}-opt-${index}`}
                      data-index={index}
                      aria-selected={isSelected}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => commit(opt.value)}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2 text-left text-sm",
                        isActive && "bg-muted",
                        isSelected && "font-medium text-foreground",
                      )}
                    >
                      <Check
                        className={cn("h-4 w-4 shrink-0", isSelected ? "opacity-100 text-primary" : "opacity-0")}
                        aria-hidden
                      />
                      <span className="truncate">{opt.label}</span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </PopoverContent>
      </Popover>
      {selected && (
        <button
          type="button"
          onClick={() => commit("")}
          aria-label={`Wyczyść wybór: ${selected.label}`}
          className="flex h-10 w-9 shrink-0 items-center justify-center rounded-lg border border-input bg-background text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}
    </div>
  );
}
