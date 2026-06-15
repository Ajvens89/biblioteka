import { PrismaClient } from "@prisma/client";
import { lookupGameByEanWithFallback } from "../src/lib/services/ean-providers";

const ean = process.argv[2] ?? "9788394726607";

async function main() {
  const prisma = new PrismaClient();
  try {
    const result = await lookupGameByEanWithFallback(prisma, ean);
    console.log(
      JSON.stringify(
        {
          status: result.status,
          title: result.selectedCandidate?.title,
          cover: result.selectedCandidate?.coverImageUrl,
          source: result.selectedCandidate?.source,
          message: result.message,
          candidateCount: result.candidates.length,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main();
