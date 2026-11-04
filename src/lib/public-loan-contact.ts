type BorrowContact = {
  gameTitle: string;
  gameUrl?: string;
  email: string;
};

/** Shared by the mail link and its clipboard/manual-copy fallback. */
export function buildBorrowContact({ gameTitle, gameUrl, email }: BorrowContact) {
  const subject = `Wypożyczenie: ${gameTitle}`;
  const body = [
    "Dzień dobry,",
    "",
    `interesuje mnie wypożyczenie gry „${gameTitle}”.`,
    ...(gameUrl ? [`Karta gry: ${gameUrl}`] : []),
    "",
    "Proponowany termin odbioru: …",
    "",
    "Proszę o potwierdzenie dostępności i terminu odbioru.",
    "",
    "Pozdrawiam",
  ].join("\n");

  return {
    mailto: `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    message: `Do: ${email}\nTemat: ${subject}\n\n${body}`,
  };
}
