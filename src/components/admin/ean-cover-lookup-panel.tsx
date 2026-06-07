"use client";

import Image from "next/image";
import Link from "next/link";
import type { CoverCandidate, EanLookupResult } from "@/lib/services/ean-providers";
import {
  bggSearchUrl,
  googleImagesSearchUrl,
  planszeoSearchUrl,
} from "@/lib/services/ean-providers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COLLECTION_TYPE_LABELS } from "@/lib/constants";

const SOURCE_LABEL: Record<string, string> = {
  local: "Biblioteka lokalna",
  planszeo: "Planszeo (serwer)",
  google_books: "Google Books",
  open_library: "Open Library",
  bgg: "BoardGameGeek",
  upcitemdb: "UPCitemdb",
  google_images: "Google Grafika",
  manual: "Ręcznie",
};

type Props = {
  ean: string;
  setEan: (v: string) => void;
  titleHint: string;
  setTitleHint: (v: string) => void;
  collectionType: "BOARD_GAME" | "RPG";
  setCollectionType: (v: "BOARD_GAME" | "RPG") => void;
  lookupResult: EanLookupResult | null;
  existingGame: { id: string; title: string; slug: string } | null;
  selectedCover: CoverCandidate | null;
  onSelectCover: (c: CoverCandidate) => void;
  customCoverUrl: string;
  setCustomCoverUrl: (v: string) => void;
  coverSource: string;
  checksumWarning: boolean;
  skipChecksum: boolean;
  setSkipChecksum: (v: boolean) => void;
  onLookup: () => void;
  onScanOpen: () => void;
  pending: boolean;
  gameTitle: string;
};

export function EanCoverLookupPanel({
  ean,
  setEan,
  titleHint,
  setTitleHint,
  collectionType,
  setCollectionType,
  lookupResult,
  existingGame,
  selectedCover,
  onSelectCover,
  customCoverUrl,
  setCustomCoverUrl,
  coverSource,
  checksumWarning,
  skipChecksum,
  setSkipChecksum,
  onLookup,
  onScanOpen,
  pending,
  gameTitle,
}: Props) {
  const searchTitle = titleHint.trim() || gameTitle.trim();
  const previewUrl = selectedCover?.coverImageUrl || customCoverUrl;
  const showTitleHint =
    lookupResult?.needsTitleHintForBgg ||
    (lookupResult?.status === "not_found" && collectionType === "BOARD_GAME");

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="space-y-2">
        <Label htmlFor="ean">EAN / ISBN produktu (gra)</Label>
        <p className="text-xs text-muted-foreground">
          Kod z pudełka lub książki — nie kod egzemplarza w bibliotece.
        </p>
        <Input
          id="ean"
          data-testid="ean-input"
          value={ean}
          onChange={(e) => setEan(e.target.value)}
          placeholder="np. 5901234123457 lub 978..."
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" data-testid="ean-scan-button" variant="outline" onClick={onScanOpen}>
          Skanuj kod
        </Button>
        <Button type="button" data-testid="ean-lookup-button" variant="secondary" onClick={onLookup} disabled={pending}>
          Sprawdź kod
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="collectionType">Typ zbioru</Label>
        <select
          id="collectionType"
          data-testid="collection-type-select"
          className="h-10 w-full rounded-md border px-2"
          value={collectionType}
          onChange={(e) => setCollectionType(e.target.value as "BOARD_GAME" | "RPG")}
        >
          {Object.entries(COLLECTION_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {(showTitleHint || lookupResult?.candidates.some((c) => c.source === "bgg")) && (
        <div className="space-y-2">
          <Label htmlFor="titleHint">Tytuł do wyszukania okładki</Label>
          <Input
            id="titleHint"
            data-testid="title-hint-input"
            value={titleHint}
            onChange={(e) => setTitleHint(e.target.value)}
            placeholder="Wpisz tytuł planszówki — BGG szuka po tytule, nie po EAN"
          />
        </div>
      )}

      {checksumWarning && (
        <div className="space-y-2 rounded-md bg-amber-500/10 p-3 text-sm">
          <p>Suma kontrolna kodu może być nieprawidłowa.</p>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={skipChecksum}
              onChange={(e) => setSkipChecksum(e.target.checked)}
            />
            Zapisz mimo ostrzeżenia
          </label>
        </div>
      )}

      {lookupResult && (
        <p className="rounded-md bg-muted/60 p-3 text-sm" data-testid="ean-source-banner">
          {lookupResult.message}
        </p>
      )}

      {existingGame && lookupResult?.game && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
          <p className="font-medium">Ta gra już jest w bibliotece</p>
          <p>{existingGame.title}</p>
          {lookupResult.game.coverImageUrl && (
            <div className="relative mt-2 h-32 w-24 overflow-hidden rounded border bg-muted">
              <Image
                src={lookupResult.game.coverImageUrl}
                alt={existingGame.title}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          )}
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link href={`/admin/gry/${existingGame.id}`}>Edytuj grę</Link>
            </Button>
            <Button size="sm" asChild data-testid="ean-add-copy-button">
              <Link href={`/admin/egzemplarze?gameId=${existingGame.id}`}>Dodaj kolejny egzemplarz</Link>
            </Button>
          </div>
        </div>
      )}

      {!existingGame && lookupResult && lookupResult.candidates.length > 0 && (
        <div className="space-y-3" data-testid="cover-candidates">
          <p className="text-sm font-medium">Znalezione propozycje</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {lookupResult.candidates.map((c, i) => (
              <div
                key={`${c.source}-${c.externalId ?? i}`}
                className="flex gap-3 rounded-lg border p-3"
                data-testid="cover-candidate-card"
              >
                <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded bg-muted">
                  {(c.thumbnailUrl || c.coverImageUrl) ? (
                    <Image
                      src={c.thumbnailUrl || c.coverImageUrl || ""}
                      alt={c.title ?? "Okładka"}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
                      brak
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-xs text-muted-foreground">{SOURCE_LABEL[c.source] ?? c.source}</p>
                  <p className="line-clamp-2 text-sm font-medium">{c.title ?? "—"}</p>
                  {c.year && <p className="text-xs">{c.year}</p>}
                  <Button
                    type="button"
                    size="sm"
                    variant={selectedCover === c ? "default" : "outline"}
                    onClick={() => onSelectCover(c)}
                  >
                    Użyj tej okładki
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!existingGame && (
        <>
          <div className="space-y-2" data-testid="cover-preview">
            <Label>Podgląd wybranej okładki</Label>
            <div className="relative aspect-[3/4] max-w-[200px] overflow-hidden rounded-lg border bg-muted">
              {previewUrl ? (
                <Image src={previewUrl} alt="Podgląd okładki" fill className="object-cover" unoptimized />
              ) : (
                <span className="flex h-full min-h-[160px] items-center justify-center p-4 text-center text-xs text-muted-foreground">
                  Brak okładki — wybierz propozycję lub wklej URL
                </span>
              )}
            </div>
            {coverSource && (
              <p className="text-xs text-muted-foreground" data-testid="cover-source">
                Źródło okładki: {SOURCE_LABEL[coverSource] ?? coverSource}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="customCover">Własny URL okładki</Label>
            <Input
              id="customCover"
              data-testid="custom-cover-url"
              value={customCoverUrl}
              onChange={(e) => setCustomCoverUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>

          <div className="space-y-2 rounded-md border border-dashed p-3 text-sm">
            <p className="font-medium">Pomocnicze źródła (ręcznie)</p>
            <p className="text-xs text-muted-foreground">
              Planszeo — tylko link do wyszukiwania, bez automatycznego pobierania danych.
            </p>
            <div className="flex flex-wrap gap-2">
              {searchTitle && (
                <>
                  <Button type="button" variant="outline" size="sm" asChild data-testid="planszeo-search-link">
                    <a href={planszeoSearchUrl(searchTitle)} target="_blank" rel="noopener noreferrer">
                      Szukaj w Planszeo
                    </a>
                  </Button>
                  <Button type="button" variant="outline" size="sm" asChild data-testid="bgg-search-link">
                    <a href={bggSearchUrl(searchTitle)} target="_blank" rel="noopener noreferrer">
                      Szukaj w BGG
                    </a>
                  </Button>
                  <Button type="button" variant="outline" size="sm" asChild>
                    <a href={googleImagesSearchUrl(searchTitle)} target="_blank" rel="noopener noreferrer">
                      Google Grafika (ręcznie)
                    </a>
                  </Button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
