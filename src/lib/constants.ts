import type {
  CopyStatus,
  Difficulty,
  GameCollectionType,
  GameType,
  LoanStatus,
  ReservationStatus,
  UserRole,
} from "@prisma/client";

export const APP_NAME = "Biblioteka Zakątka Fantastyki";
export const APP_DESCRIPTION =
  "Przeglądaj, rezerwuj i wypożyczaj gry z naszej biblioteki";

export const ROLE_LABELS: Record<UserRole, string> = {
  GUEST: "Gość",
  USER: "Użytkownik",
  LIBRARIAN: "Bibliotekarz",
  ADMIN: "Administrator",
};

export const COLLECTION_TYPE_LABELS: Record<GameCollectionType, string> = {
  BOARD_GAME: "Gry planszowe",
  RPG: "Gry fabularne",
};

export const GAME_SORT_LABELS: Record<string, string> = {
  title: "Tytuł A–Z",
  newest: "Od najnowszych",
  popular: "Najczęściej rezerwowane",
  available: "Dostępne najpierw",
  playtime_asc: "Czas rozgrywki (krótsze)",
  playtime_desc: "Czas rozgrywki (dłuższe)",
};

/** Etykiety filtrów i hero — krótkie, jednoznaczne. */
export const CATALOG_COLLECTION_LABELS: Record<GameCollectionType, string> = {
  BOARD_GAME: "Planszówki",
  RPG: "RPG podręczniki",
};

export const GAME_TYPE_LABELS: Record<GameType, string> = {
  BOARD: "Planszowa",
  CARD: "Karciana",
  RPG: "RPG",
  WARGAME: "Bitewna",
  EDUCATIONAL: "Edukacyjna",
  PARTY: "Imprezowa",
  FAMILY: "Rodzinna",
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  EASY: "Łatwa",
  MEDIUM: "Średnia",
  HARD: "Trudna",
  EXPERT: "Ekspercka",
};

export const COPY_STATUS_LABELS: Record<CopyStatus, string> = {
  AVAILABLE: "Dostępny",
  RESERVED: "Zarezerwowany",
  BORROWED: "Wypożyczony",
  DAMAGED: "Uszkodzony",
  LOST: "Zgubiony",
  REPAIR: "W naprawie",
  RETIRED: "Wycofany",
};

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  PENDING: "Oczekuje",
  APPROVED: "Zatwierdzona",
  READY_FOR_PICKUP: "Gotowa do odbioru",
  BORROWED: "Wypożyczona",
  RETURNED: "Zwrócona",
  CANCELLED: "Anulowana",
  EXPIRED: "Wygasła",
};

export const LOAN_STATUS_LABELS: Record<LoanStatus, string> = {
  ACTIVE: "Aktywne",
  RETURNED: "Zwrócone",
  OVERDUE: "Przeterminowane",
  LOST: "Zgubione",
  DAMAGED: "Uszkodzone",
};

export const DEFAULT_SETTINGS = {
  maxActiveReservations: "3",
  defaultLoanDays: "14",
  reservationValidityDays: "3",
  maxLoanExtensions: "2",
  contactEmail: "kontakt@zakatki-fantastyki.pl",
  contactPhone: "+48 000 000 000",
  foundationAddress: "Fundacja Zakątek Fantastyki",
  termsText: "Regulamin wypożyczeń biblioteki gier. Prosimy o terminowy zwrot egzemplarzy.",
} as const;

export const STORAGE_BUCKET = "game-images";
