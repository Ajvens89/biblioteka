import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { downloadCoverToPublic } from "../src/lib/services/cover-download";

const PATCHES: Array<{
  ean: string;
  description: string;
  shortDescription?: string;
  coverUrl?: string;
}> = [
  {
    ean: "9788395802034",
    shortDescription: "Marcin Mortka, Marcin Blacha, Michał Oracz",
    description:
      "Neuroshima: Miami to ósmy dodatek (nationbook) do gry fabularnej Neuroshima. 196 stron opisujących postapokaliptyczne Miami i Florydę: setki lokacji, bohaterów niezależnych, frakcji, sprzętu i pomysłów na przygody. Autorzy: Marcin Mortka, Marcin Blacha, Michał Oracz. Wydawnictwo Portal Games.",
    coverUrl: "https://sklep.portalgames.pl/environment/cache/images/productGfx_2280_500_500/miami.png",
  },
  {
    ean: "9788393057122",
    shortDescription: "Rafał Olszak · Cyfrografia",
    description:
      "Afterbomb Madness – druga edycja to postapokaliptyczna gra fabularna osadzona w zrujnowanych Stanach Zjednoczonych po wojnie nuklearnej, inwazji obcych i anomaliach. Gracze wcielają się w ocalałych walczących o przetrwanie w Wojnie Totalnej. Podręcznik (250 stron, oprawa twarda) zawiera zasady, opis świata, społeczności i bestiariusz. Autor: Rafał Olszak. Wydawca: Cyfrografia.",
    coverUrl: "https://static.polter.pl/sub/Afterbomb-Madness-druga-edycja-bn45995.jpg",
  },
  {
    ean: "9788364198342",
    shortDescription: "Chaosium · wyd. Galakta",
    description:
      "Pulp Cthulhu to wariant Zewu Cthulhu osadzony w latach 30. XX wieku – era gangsterów, detektywów i mrocznych tajemnic. Uproszczone zasady i klimat noir sprawiają, że to idealny wstęp do Mitologii Cthulhu. Wydawnictwo Galakta (Chaosium).",
  },
  {
    ean: "9788364198533",
    shortDescription: "Chaosium · wyd. Galakta",
    description:
      "Dwie z Tysiąca to kampania i zbiór scenariuszy do Zewu Cthulhu – opowieść o losach badaczy w latach 20. i 30. XX wieku, pełna intryg, kultów i spotkań z kosmicznym horrorsem. Wydawnictwo Galakta (Chaosium).",
  },
  {
    ean: "9788364198144",
    shortDescription: "Chaosium · wyd. Galakta",
    description:
      "Usłysz Zew Cthulhu to podstawowy podręcznik gry fabularnej Call of Cthulhu w polskim wydaniu Galakty. Zawiera komplet zasad, tworzenie badaczy, mechanikę San i Sanity oraz wprowadzenie do Mitologii Cthulhu H.P. Lovecrafta.",
    coverUrl: "https://static.polter.pl/sub/Zew-Cthulhu-Uslysz-Zew-Cthulhu-bn51219.jpg",
  },
  {
    ean: "9788364198410",
    shortDescription: "Chaosium · wyd. Galakta",
    description:
      "Twarzą w Twarz to suplement do Zewu Cthulhu zawierający gotowe postacie badaczy, pomocne tabele i materiały ułatwiające szybki start w grę – idealny dla nowych grup i mistrzów gry. Wydawnictwo Galakta (Chaosium).",
  },
  {
    ean: "9788395672002",
    shortDescription: "World of Darkness · Alis Games",
    description:
      "Wampir: Maskarada (5. edycja) to podstawowy podręcznik gry fabularnej o wampirach w mrocznym świecie Mroku. Piąta edycja wprowadza odświeżone zasady, klanowe archetypy i narzędzia do opowiadania historii o polityce, głodzie i wiecznej nocy. Wydawca: Alis Games.",
  },
  {
    ean: "9788396134837",
    shortDescription: "World of Darkness · Alis Games",
    description:
      "Wampir: Sabat – Czarna Ręka to suplement do Wampira: Maskarady opisujący fanatyczny Sabat – sektę wampirów walczących z innymi i z samymi sobą w imię apokaliptycznej wizji Gehenny. Wydawca: Alis Games.",
    coverUrl: "https://static.polter.pl/sub/Wampir-Sabat-Czarna-Reka-bn54559.jpg",
  },
  {
    ean: "9788396566362",
    shortDescription: "World of Darkness · Alis Games",
    description:
      "Wampir: Druga Inkwizycja to suplement do linii World of Darkness opisujący tajne organizacje łowców nadnaturalnych – Inkwizycję – oraz ich metody, cele i konflikt z wampirami i innymi istotami nocy. Wydawca: Alis Games.",
  },
];

async function main() {
  const prisma = new PrismaClient();
  for (const patch of PATCHES) {
    const game = await prisma.game.findFirst({
      where: { ean: patch.ean, deletedAt: null },
      select: { id: true, title: true, coverImageUrl: true, description: true },
    });
    if (!game) {
      console.log(`⏭  ${patch.ean} — brak w bazie`);
      continue;
    }

    let coverImageUrl = game.coverImageUrl;
    if (patch.coverUrl) {
      const local = await downloadCoverToPublic(patch.coverUrl, game.title);
      if (local) coverImageUrl = local;
    }

    await prisma.game.update({
      where: { id: game.id },
      data: {
        description: patch.description,
        shortDescription: patch.shortDescription ?? undefined,
        coverImageUrl: coverImageUrl ?? undefined,
        coverImageSource: coverImageUrl && patch.coverUrl ? "manual" : undefined,
      },
    });

    console.log(
      `✓  ${patch.ean} — opis: tak, okładka: ${coverImageUrl ? "tak" : "nie"}`,
    );
  }
  await prisma.$disconnect();
}

main();
