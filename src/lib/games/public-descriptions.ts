type GameDescriptions = {
  title: string;
  description?: string | null;
  shortDescription?: string | null;
};

/** Hide only the two exact seed templates; keep stored data and real prose intact. */
export function getPublicGameDescriptions(game: GameDescriptions) {
  const title = game.title.trim();
  const seedDescriptions = new Set([
    `${title} — przykładowa gra w bibliotece Zakątka Fantastyki.`,
    `Popularna gra planszowa: ${title}.`,
  ]);
  const publicText = (value?: string | null) => {
    const text = value?.trim();
    return text && !seedDescriptions.has(text) ? text : null;
  };

  return {
    description: publicText(game.description),
    shortDescription: publicText(game.shortDescription),
  };
}
