import "dotenv/config";
import { lookupEanByTitle } from "../src/lib/services/ean-providers/title-to-ean";
import { prisma } from "../src/lib/db";

async function main() {
  const title = process.argv[2] ?? "Messina 1347";
  const result = await lookupEanByTitle(prisma, title);
  console.log(JSON.stringify(result, null, 2));
}

main()
  .finally(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
