import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, ExternalLink, Users } from "lucide-react";
import { ReserveButton } from "@/components/games/reserve-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth/session";
import {
  DIFFICULTY_LABELS,
  GAME_TYPE_LABELS,
  RESERVATION_STATUS_LABELS,
} from "@/lib/constants";
import { countAvailableCopies, getAvailabilityLabel } from "@/lib/games/availability";
import { fetchGameBySlug } from "@/lib/games/queries";
import { formatDate } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const game = await fetchGameBySlug(slug);
  return { title: game?.title ?? "Gra" };
}

export default async function GameDetailPage({ params }: Props) {
  const { slug } = await params;
  const game = await fetchGameBySlug(slug);
  if (!game) notFound();

  const user = await getSessionUser();
  const available = countAvailableCopies(game.copies);
  const avail = getAvailabilityLabel(available, game.copies.length);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
            <Image
              src={game.coverImageUrl || "/placeholder-game.svg"}
              alt={game.title}
              fill
              className="object-cover"
              priority
            />
          </div>
          {game.images.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {game.images.map((img) => (
                <div key={img.id} className="relative aspect-square rounded-md bg-muted">
                  <Image src={img.url} alt={img.alt ?? ""} fill className="object-cover rounded-md" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <Badge variant={avail.variant} className="mb-2">
              {avail.label} · {available}/{game.copies.length} egzemplarzy
            </Badge>
            <h1 className="text-3xl font-bold">{game.title}</h1>
            <p className="mt-2 text-muted-foreground">
              {game.publisher?.name}
              {game.designer ? ` · ${game.designer.name}` : ""}
              {game.yearPublished ? ` · ${game.yearPublished}` : ""}
            </p>
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {game.minPlayers}–{game.maxPlayers} graczy
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {game.minPlayTime}–{game.maxPlayTime} min
            </span>
            <span>Wiek: {game.minAge}+</span>
            <span>{DIFFICULTY_LABELS[game.difficulty]}</span>
            <span>{GAME_TYPE_LABELS[game.type]}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {game.categories.map((c) => (
              <Badge key={c.categoryId} variant="secondary">
                {c.category.name}
              </Badge>
            ))}
            {game.tags.map((t) => (
              <Badge key={t.tagId} variant="outline">
                {t.tag.name}
              </Badge>
            ))}
          </div>

          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p>{game.description}</p>
          </div>

          {game.instructionUrl && (
            <Button variant="outline" asChild>
              <a href={game.instructionUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Instrukcja
              </a>
            </Button>
          )}

          <Card>
            <CardContent className="space-y-4 pt-6">
              {user ? (
                available > 0 ? (
                  <ReserveButton gameId={game.id} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Wszystkie egzemplarze są zajęte. Sprawdź ponownie później lub skontaktuj się z
                    biblioteką.
                  </p>
                )
              ) : (
                <p className="text-sm">
                  <Link href="/login" className="font-medium text-primary underline">
                    Zaloguj się
                  </Link>
                  , aby zarezerwować tę grę.
                </p>
              )}
            </CardContent>
          </Card>

          {game.reservations.length > 0 && (
            <div>
              <h2 className="mb-2 font-semibold">Aktywne rezerwacje</h2>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {game.reservations.map((r) => (
                  <li key={r.id}>
                    {RESERVATION_STATUS_LABELS[r.status]} — {formatDate(r.createdAt)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
