import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const url = process.env.DATABASE_URL?.replace(/[?&]pgbouncer=true/gi, "");
const prisma = url
  ? new PrismaClient({ datasources: { db: { url } } })
  : new PrismaClient();

prisma
  .$queryRaw`SELECT 1`
  .then(() => {
    console.log("DB OK");
    process.exit(0);
  })
  .catch((e) => {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Can't reach database server") || msg.includes("ECONNREFUSED")) {
      console.error("DB niedostępna. Uruchom: npx prisma dev --detach   lub   docker compose up -d");
      console.error(msg.split("\n")[0]);
    } else {
      console.error(msg);
    }
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
