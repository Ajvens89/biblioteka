"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { Category, Designer, Publisher, Tag } from "@prisma/client";
import type { CoverCandidate, EanLookupResult } from "@/lib/services/ean-providers/types";
import type { TitleToEanCandidate, TitleToEanResult } from "@/lib/services/ean-providers/title-to-ean-types";
import { createGame, lookupEanAction, lookupEanByTitleAction } from "@/lib/actions/games";
import { EanScanner } from "@/components/barcode/ean-scanner";
import { EanCoverLookupPanel } from "@/components/admin/ean-cover-lookup-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SectionCard } from "@/components/ui/section-card";
import { GameCover } from "@/components/ui/game-cover";
import { DIFFICULTY_LABELS, GAME_TYPE_LABELS } from "@/lib/constants";

type Props = {
  publishers: Publisher[];
  designers: Designer[];
  categories: Category[];
  tags: Tag[];
  initialSource?: "ean" | "manual";
  openScanner?: boolean;
};

type FormMode = "ean" | "manual";

const WIZARD_STEPS = [
  { id: 1, label: "Źródło" },
  { id: 2, label: "EAN" },
  { id: 3, label: "Dane gry" },
  { id: 4, label: "Okładka" },
  { id: 5, label: "Egzemplarz" },
  { id: 6, label: "Podsumowanie" },
] as const;

function applyCandidateToForm(
  c: CoverCandidate,
  setters: {
    setTitle: (v: string) => void;
    setDescription: (v: string) => void;
    setShortDescription: (v: string) => void;
    setCoverImageUrl: (v: string) => void;
    setYearPublished: (v: string) => void;
    setCollectionType: (v: "BOARD_GAME" | "RPG") => void;
    setCoverSource: (v: string) => void;
    setCoverExternalId: (v: string) => void;
  },
) {
  if (c.title) setters.setTitle(c.title);
  if (c.description) setters.setDescription(c.description);
  if (c.authors?.length) setters.setShortDescription(c.authors.join(", "));
  if (c.coverImageUrl) setters.setCoverImageUrl(c.coverImageUrl);
  if (c.year) setters.setYearPublished(String(c.year));
  if (c.collectionTypeSuggestion) setters.setCollectionType(c.collectionTypeSuggestion);
  setters.setCoverSource(c.source);
  setters.setCoverExternalId(c.externalId ?? "");
}

export function AdminGameWizard({
  publishers,
  designers,
  categories,
  tags,
  initialSource = "ean",
  openScanner = false,
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<FormMode>(initialSource);
  const [scannerOpen, setScannerOpen] = useState(openScanner);

  const [ean, setEan] = useState("");
  const [titleHint, setTitleHint] = useState("");
  const [collectionType, setCollectionType] = useState<"BOARD_GAME" | "RPG">("BOARD_GAME");
  const [lookupResult, setLookupResult] = useState<EanLookupResult | null>(null);
  const [titleToEanResult, setTitleToEanResult] = useState<TitleToEanResult | null>(null);
  const [existingGame, setExistingGame] = useState<{ id: string; title: string; slug: string } | null>(null);
  const [selectedCover, setSelectedCover] = useState<CoverCandidate | null>(null);
  const [checksumWarning, setChecksumWarning] = useState(false);
  const [skipChecksum, setSkipChecksum] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [coverImageSource, setCoverImageSource] = useState("");
  const [coverImageExternalId, setCoverImageExternalId] = useState("");
  const [yearPublished, setYearPublished] = useState("");
  const [addCopy, setAddCopy] = useState(false);
  const [copyInventory, setCopyInventory] = useState("");
  const [copyBarcode, setCopyBarcode] = useState("");
  const [copyLocation, setCopyLocation] = useState("");
  const [copyCondition, setCopyCondition] = useState<"NEW" | "GOOD" | "FAIR" | "POOR">("GOOD");

  const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD" | "EXPERT">("MEDIUM");
  const [gameType, setGameType] = useState<
    "BOARD" | "CARD" | "RPG" | "WARGAME" | "EDUCATIONAL" | "PARTY" | "FAMILY"
  >("BOARD");
  const [minPlayers, setMinPlayers] = useState(2);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [minAge, setMinAge] = useState(10);
  const [minPlayTime, setMinPlayTime] = useState(30);
  const [maxPlayTime, setMaxPlayTime] = useState(60);
  const [publisherId, setPublisherId] = useState("");
  const [designerId, setDesignerId] = useState("");
  const [instructionUrl, setInstructionUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const isRpg = collectionType === "RPG";
  const skipEanStep = mode === "manual";

  const onCollectionTypeChange = (value: "BOARD_GAME" | "RPG") => {
    setCollectionType(value);
    if (value === "RPG") {
      setGameType("RPG");
      setMinPlayers(1);
      setMaxPlayers(6);
      setMinAge(0);
      setMinPlayTime(0);
      setMaxPlayTime(0);
    } else {
      setGameType("BOARD");
      setMinPlayers(2);
      setMaxPlayers(4);
      setMinAge(10);
      setMinPlayTime(30);
      setMaxPlayTime(60);
    }
  };

  const handleLookupResult = (data: EanLookupResult) => {
    setLookupResult(data);
    setChecksumWarning(!data.checksumValid);
    setExistingGame(null);
    setSelectedCover(null);

    if (data.status === "invalid") {
      toast.error(data.message);
      return;
    }

    if (data.status === "exists" && data.game) {
      setExistingGame({ id: data.game.id, title: data.game.title, slug: data.game.slug });
      setSelectedCover(data.selectedCandidate ?? null);
      toast.info(data.message);
      return;
    }

    if (data.collectionTypeSuggestion) {
      onCollectionTypeChange(data.collectionTypeSuggestion);
    }

    if (data.selectedCandidate) {
      setSelectedCover(data.selectedCandidate);
      applyCandidateToForm(data.selectedCandidate, {
        setTitle,
        setDescription,
        setShortDescription,
        setCoverImageUrl,
        setYearPublished,
        setCollectionType: onCollectionTypeChange,
        setCoverSource: setCoverImageSource,
        setCoverExternalId: setCoverImageExternalId,
      });
    }

    toast.message(data.message);
  };

  const lookup = () => {
    if (!ean.trim()) {
      toast.error("Wpisz kod EAN lub ISBN.");
      return;
    }
    start(async () => {
      const result = await lookupEanAction(ean, titleHint, collectionType);
      if (!result.success || !result.data) {
        toast.error(result.success ? "Brak danych." : result.error);
        return;
      }
      if (result.data.normalizedEan) setEan(result.data.normalizedEan);
      handleLookupResult(result.data);
    });
  };

  const lookupEanByTitle = () => {
    const searchTitle = titleHint.trim() || title.trim();
    if (!searchTitle) {
      toast.error("Wpisz tytuł gry.");
      return;
    }
    if (!titleHint.trim()) setTitleHint(searchTitle);
    start(async () => {
      const result = await lookupEanByTitleAction(searchTitle);
      if (!result.success || !result.data) {
        toast.error(result.success ? "Brak danych." : result.error);
        return;
      }
      setTitleToEanResult(result.data);
      if (result.data.status === "exists" && result.data.game) {
        setExistingGame({
          id: result.data.game.id,
          title: result.data.game.title,
          slug: result.data.game.slug,
        });
      }
      toast.message(result.data.message);
    });
  };

  const applyTitleEan = (candidate: TitleToEanCandidate) => {
    setEan(candidate.ean);
    if (candidate.title && !title.trim()) setTitle(candidate.title);
    start(async () => {
      const result = await lookupEanAction(candidate.ean, candidate.title ?? titleHint, collectionType);
      if (!result.success || !result.data) {
        toast.error(result.success ? "Brak danych." : result.error);
        return;
      }
      if (result.data.normalizedEan) setEan(result.data.normalizedEan);
      handleLookupResult(result.data);
      toast.success(`Ustawiono EAN ${candidate.ean} — sprawdź dane przed zapisem.`);
    });
  };

  const onSelectCover = (c: CoverCandidate) => {
    setSelectedCover(c);
    applyCandidateToForm(c, {
      setTitle,
      setDescription,
      setShortDescription,
      setCoverImageUrl,
      setYearPublished,
      setCollectionType,
      setCoverSource: setCoverImageSource,
      setCoverExternalId: setCoverImageExternalId,
    });
    toast.success("Wybrano okładkę — sprawdź podgląd przed zapisem.");
  };

  const submit = () => {
    const input = {
      title,
      ean: ean || null,
      collectionType,
      description,
      shortDescription,
      minPlayers,
      maxPlayers,
      minAge,
      minPlayTime,
      maxPlayTime,
      difficulty,
      type: gameType,
      publisherId: publisherId || null,
      designerId: designerId || null,
      yearPublished: yearPublished ? Number(yearPublished) : null,
      coverImageUrl: coverImageUrl || "",
      coverImageSource: coverImageSource || null,
      coverImageExternalId: coverImageExternalId || null,
      instructionUrl,
      isActive,
      isFeatured,
      categoryIds: selectedCategoryIds,
      tagIds: selectedTagIds,
      skipEanChecksum: skipChecksum,
      addCopy,
      copyInventoryNumber: addCopy ? copyInventory : undefined,
      copyBarcode: addCopy ? copyBarcode : undefined,
      copyLocation: addCopy ? copyLocation : undefined,
      copyCondition: addCopy ? copyCondition : undefined,
    };

    start(async () => {
      const result = await createGame(input);
      if (result.success) {
        toast.success("Utworzono grę.");
        router.push("/admin/gry");
        router.refresh();
      } else toast.error(result.error);
    });
  };

  const goNext = () => {
    if (step === 1) {
      setStep(skipEanStep ? 3 : 2);
      return;
    }
    if (step === 2 && existingGame) {
      toast.info("Ta gra już istnieje — dodaj egzemplarz zamiast tworzyć duplikat.");
      return;
    }
    setStep((s) => Math.min(6, s + 1));
  };

  const goBack = () => {
    if (step === 3 && skipEanStep) setStep(1);
    else setStep((s) => Math.max(1, s - 1));
  };

  return (
    <div className="relative pb-24" data-testid="game-wizard">
      <nav className="mb-6 flex flex-wrap gap-2" aria-label="Kroki kreatora">
        {WIZARD_STEPS.map((s) => {
          const hidden = s.id === 2 && skipEanStep;
          if (hidden) return null;
          return (
            <button
              key={s.id}
              type="button"
              data-testid={`wizard-step-${s.id}`}
              onClick={() => setStep(s.id === 2 && skipEanStep ? 3 : s.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                step === s.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {s.id}. {s.label}
            </button>
          );
        })}
      </nav>

      {step === 1 && (
        <SectionCard title="Krok 1 — Źródło" description="Wybierz sposób dodania gry do biblioteki.">
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant={mode === "manual" ? "default" : "outline"} onClick={() => setMode("manual")}>
              Dodaj ręcznie
            </Button>
            <Button type="button" variant={mode === "ean" ? "default" : "outline"} onClick={() => setMode("ean")}>
              Dodaj przez EAN
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/admin/import">Import z products.json</Link>
            </Button>
          </div>
          <div className="mt-6 flex gap-2">
            <Button type="button" onClick={goNext}>Dalej</Button>
          </div>
        </SectionCard>
      )}

      {step === 2 && !skipEanStep && (
        <SectionCard title="Krok 2 — EAN" description="Sprawdź kod — gra nie zostanie utworzona bez Twojego zatwierdzenia na końcu.">
        <EanCoverLookupPanel
          ean={ean}
          setEan={setEan}
          titleHint={titleHint}
          setTitleHint={setTitleHint}
          collectionType={collectionType}
          setCollectionType={onCollectionTypeChange}
          lookupResult={lookupResult}
          existingGame={existingGame}
          selectedCover={selectedCover}
          onSelectCover={onSelectCover}
          customCoverUrl={coverImageUrl}
          setCustomCoverUrl={(url) => {
            setCoverImageUrl(url);
            if (url) setCoverImageSource("manual");
          }}
          coverSource={coverImageSource}
          checksumWarning={checksumWarning}
          skipChecksum={skipChecksum}
          setSkipChecksum={setSkipChecksum}
          onLookup={lookup}
          onLookupEanByTitle={lookupEanByTitle}
          onSelectTitleEan={applyTitleEan}
          titleToEanResult={titleToEanResult}
          onScanOpen={() => setScannerOpen(true)}
          pending={pending}
          gameTitle={title}
        />
          <div className="mt-4 flex gap-2">
            <Button type="button" variant="outline" onClick={goBack}>Wstecz</Button>
            <Button type="button" onClick={goNext} disabled={!!existingGame}>Dalej</Button>
          </div>
        </SectionCard>
      )}

      <EanScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScan={(code) => {
          setEan(code);
          setMode("ean");
        }}
      />

      <form
        className="max-w-3xl space-y-6"
        data-testid="game-form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {step === 3 && (
        <SectionCard title="Krok 3 — Dane gry">
        <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Tytuł</Label>
          <Input
            id="title"
            name="title"
            data-testid="game-form-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shortDescription">Krótki opis</Label>
          <Input
            id="shortDescription"
            name="shortDescription"
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Opis</Label>
          <Textarea
            id="description"
            name="description"
            data-testid="game-form-description"
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        </div>
          <div className="mt-4 flex gap-2">
            <Button type="button" variant="outline" onClick={goBack}>Wstecz</Button>
            <Button type="button" onClick={() => setStep(4)}>Dalej</Button>
          </div>
        </SectionCard>
        )}

        {step === 4 && (
        <SectionCard title="Krok 4 — Okładka">
          <input type="hidden" name="coverImageUrl" value={coverImageUrl} />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <GameCover src={coverImageUrl} alt={title || "Podgląd okładki"} className="w-full max-w-[200px]" />
            <p className="text-small text-muted-foreground">
              Okładkę wybierz w sekcji EAN powyżej lub wklej URL w panelu propozycji.
              {coverImageSource && (
                <span className="mt-1 block">Źródło: {coverImageSource}</span>
              )}
            </p>
          </div>
          {(mode === "ean" || ean) && !existingGame && (
            <div className="mt-4">
              <EanCoverLookupPanel
                ean={ean}
                setEan={setEan}
                titleHint={titleHint}
                setTitleHint={setTitleHint}
                collectionType={collectionType}
                setCollectionType={onCollectionTypeChange}
                lookupResult={lookupResult}
                existingGame={existingGame}
                selectedCover={selectedCover}
                onSelectCover={onSelectCover}
                customCoverUrl={coverImageUrl}
                setCustomCoverUrl={(url) => {
                  setCoverImageUrl(url);
                  if (url) setCoverImageSource("manual");
                }}
                coverSource={coverImageSource}
                checksumWarning={checksumWarning}
                skipChecksum={skipChecksum}
                setSkipChecksum={setSkipChecksum}
                onLookup={lookup}
                onLookupEanByTitle={lookupEanByTitle}
                onSelectTitleEan={applyTitleEan}
                titleToEanResult={titleToEanResult}
                onScanOpen={() => setScannerOpen(true)}
                pending={pending}
                gameTitle={title}
              />
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(3)}>Wstecz</Button>
            <Button type="button" onClick={() => setStep(5)}>Dalej</Button>
          </div>
        </SectionCard>
        )}

        {step === 5 && (
        <>
        <SectionCard title="Krok 5 — Parametry i typ">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="minPlayers">Min graczy{isRpg ? " (opcj.)" : ""}</Label>
            <Input id="minPlayers" name="minPlayers" type="number" value={minPlayers} onChange={(e) => setMinPlayers(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxPlayers">Max graczy{isRpg ? " (opcj.)" : ""}</Label>
            <Input id="maxPlayers" name="maxPlayers" type="number" value={maxPlayers} onChange={(e) => setMaxPlayers(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="minPlayTime">Min czas{isRpg ? " (opcj.)" : ""}</Label>
            <Input id="minPlayTime" name="minPlayTime" type="number" value={minPlayTime} onChange={(e) => setMinPlayTime(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxPlayTime">Max czas{isRpg ? " (opcj.)" : ""}</Label>
            <Input id="maxPlayTime" name="maxPlayTime" type="number" value={maxPlayTime} onChange={(e) => setMaxPlayTime(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="minAge">Wiek{isRpg ? " (opcj.)" : ""}</Label>
            <Input id="minAge" name="minAge" type="number" value={minAge} onChange={(e) => setMinAge(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="yearPublished">Rok wydania</Label>
            <Input
              id="yearPublished"
              name="yearPublished"
              type="number"
              value={yearPublished}
              onChange={(e) => setYearPublished(e.target.value)}
            />
          </div>
        </div>
        </SectionCard>

        <SectionCard title="Typ i kategorie">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="difficulty">Trudność</Label>
            <select
              id="difficulty"
              name="difficulty"
              className="h-10 w-full rounded-md border px-2"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
            >
              {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Rodzaj gry</Label>
            <select
              id="type"
              name="type"
              className="h-10 w-full rounded-md border px-2"
              value={gameType}
              onChange={(e) => setGameType(e.target.value as typeof gameType)}
            >
              {Object.entries(GAME_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="publisherId">Wydawca</Label>
            <select
              id="publisherId"
              name="publisherId"
              className="h-10 w-full rounded-md border px-2"
              value={publisherId}
              onChange={(e) => setPublisherId(e.target.value)}
            >
              <option value="">—</option>
              {publishers.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="designerId">Autor</Label>
            <select
              id="designerId"
              name="designerId"
              className="h-10 w-full rounded-md border px-2"
              value={designerId}
              onChange={(e) => setDesignerId(e.target.value)}
            >
              <option value="">—</option>
              {designers.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="instructionUrl">URL instrukcji</Label>
          <Input id="instructionUrl" name="instructionUrl" value={instructionUrl} onChange={(e) => setInstructionUrl(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-4 pt-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isActive" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Aktywna w katalogu
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isFeatured" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
            Wyróżniona
          </label>
        </div>
        <div className="space-y-3 pt-2">
          <p className="text-small font-medium text-muted-foreground">Kategorie</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {categories.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name={`cat_${c.id}`}
                  checked={selectedCategoryIds.includes(c.id)}
                  onChange={(e) => {
                    setSelectedCategoryIds((prev) =>
                      e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id),
                    );
                  }}
                />
                {c.name}
              </label>
            ))}
          </div>
          <p className="text-small font-medium text-muted-foreground">Tagi</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {tags.map((t) => (
              <label key={t.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name={`tag_${t.id}`}
                  checked={selectedTagIds.includes(t.id)}
                  onChange={(e) => {
                    setSelectedTagIds((prev) =>
                      e.target.checked ? [...prev, t.id] : prev.filter((id) => id !== t.id),
                    );
                  }}
                />
                {t.name}
              </label>
            ))}
          </div>
        </div>
        </SectionCard>

        <SectionCard title="Egzemplarz startowy" description="Opcjonalnie utwórz pierwszy egzemplarz przy zapisie gry.">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={addCopy} onChange={(e) => setAddCopy(e.target.checked)} />
            Od razu dodać egzemplarz?
          </label>
          {addCopy && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="copyInventory">Numer inwentarzowy</Label>
                <Input
                  id="copyInventory"
                  value={copyInventory}
                  onChange={(e) => setCopyInventory(e.target.value)}
                  required={addCopy}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="copyBarcode">Kod egzemplarza</Label>
                <Input
                  id="copyBarcode"
                  data-testid="copy-form-barcode"
                  value={copyBarcode}
                  onChange={(e) => setCopyBarcode(e.target.value)}
                  placeholder="Nie EAN produktu"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="copyLocation">Lokalizacja</Label>
                <Input
                  id="copyLocation"
                  value={copyLocation}
                  onChange={(e) => setCopyLocation(e.target.value)}
                  placeholder="np. Regał A3"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="copyCondition">Stan</Label>
                <select
                  id="copyCondition"
                  className="h-10 w-full rounded-md border px-2"
                  value={copyCondition}
                  onChange={(e) => setCopyCondition(e.target.value as typeof copyCondition)}
                >
                  <option value="NEW">Nowy</option>
                  <option value="GOOD">Dobry</option>
                  <option value="FAIR">Średni</option>
                  <option value="POOR">Słaby</option>
                </select>
              </div>
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(4)}>Wstecz</Button>
            <Button type="button" onClick={() => setStep(6)}>Dalej</Button>
          </div>
        </SectionCard>
        </>
        )}

        {step === 6 && (
        <SectionCard title="Krok 6 — Podsumowanie" description="Sprawdź dane przed zapisem. Gra nie powstanie automatycznie po skanie EAN.">
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div><dt className="text-muted-foreground">Tytuł</dt><dd className="font-medium">{title || "—"}</dd></div>
            <div><dt className="text-muted-foreground">EAN</dt><dd className="font-mono">{ean || "—"}</dd></div>
            <div><dt className="text-muted-foreground">Typ zbioru</dt><dd>{collectionType}</dd></div>
            <div><dt className="text-muted-foreground">Okładka</dt><dd>{coverImageUrl ? "Tak" : "Brak"}</dd></div>
            <div><dt className="text-muted-foreground">Egzemplarz</dt><dd>{addCopy ? copyInventory || "Tak (bez numeru)" : "Nie"}</dd></div>
          </dl>
          {existingGame && (
            <p className="mt-4 text-sm text-destructive">Nie można zapisać — gra z tym EAN już istnieje.</p>
          )}
        </SectionCard>
        )}

        {step === 6 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 px-4 py-3 backdrop-blur md:left-60">
          <div className="mx-auto flex max-w-3xl gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(5)}>
              Wstecz
            </Button>
            <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>
              Anuluj
            </Button>
            <Button type="submit" className="flex-1" disabled={pending || !!existingGame} data-testid="game-form-submit">
              {pending ? "Zapisywanie…" : "Zapisz grę"}
            </Button>
          </div>
        </div>
        )}
      </form>
    </div>
  );
}

/** @deprecated Użyj AdminGameWizard */
export const AdminNewGameForm = AdminGameWizard;
