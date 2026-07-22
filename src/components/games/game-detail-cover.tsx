import Image from "next/image";
import type { GameCollectionType } from "@prisma/client";
import { GameCover } from "@/components/ui/game-cover";

type GalleryImage = { id: string; url: string; alt: string | null };

type Props = {
  title: string;
  coverImageUrl: string | null;
  collectionType: GameCollectionType;
  isBoard: boolean;
  images: GalleryImage[];
};

export function GameDetailCover({
  title,
  coverImageUrl,
  collectionType,
  isBoard,
  images,
}: Props) {
  return (
    <div className="zf-game-cover-col space-y-4">
      <div className="zf-game-cover-frame">
        <GameCover
          src={coverImageUrl}
          alt={`Okładka gry ${title}`}
          collectionType={collectionType}
          aspect={isBoard ? "square" : "portrait"}
          priority
          className="rounded-xl"
          sizes="(max-width: 1024px) 100vw, 352px"
        />
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-2" aria-label="Galeria zdjęć">
          {images.map((img) => (
            <div key={img.id} className="relative aspect-square overflow-hidden rounded-lg bg-muted">
              <Image
                src={img.url}
                alt={img.alt ?? `Zdjęcie gry ${title}`}
                fill
                className="object-cover"
                sizes="80px"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
