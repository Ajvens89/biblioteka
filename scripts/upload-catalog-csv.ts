/**
 * Upload catalog CSV files to Firebase Storage via REST API.
 * Requires: firebase login (uses refresh token from ~/.config/configstore/firebase-tools.json)
 * Usage: npx tsx scripts/upload-catalog-csv.ts
 */
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { request as httpsRequest } from "node:https";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PROJECT = "bibl-2c364";
const BUCKET = `${PROJECT}.appspot.com`;
const PREFIX = "catalog";

function firebaseConfigPath(): string {
  const home = process.env.USERPROFILE ?? process.env.HOME ?? "";
  return join(home, ".config", "configstore", "firebase-tools.json");
}

async function getAccessToken(): Promise<string> {
  const configPath = firebaseConfigPath();
  if (!existsSync(configPath)) {
    throw new Error(`Brak ${configPath} — uruchom: firebase login`);
  }
  const config = JSON.parse(readFileSync(configPath, "utf8")) as {
    tokens?: { refresh_token?: string };
  };
  const refreshToken = config.tokens?.refresh_token;
  if (!refreshToken) {
    throw new Error("Brak refresh_token — uruchom ponownie: firebase login");
  }

  const body = new URLSearchParams({
    client_id:
      "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com",
    client_secret: "j9iVZfS8kkCEFUPaAeJV0sAi",
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`OAuth token error: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("Brak access_token w odpowiedzi OAuth");
  return data.access_token;
}

function uploadFile(
  accessToken: string,
  localPath: string,
  objectName: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const encodedName = encodeURIComponent(objectName);
    const url = new URL(
      `https://storage.googleapis.com/upload/storage/v1/b/${BUCKET}/o?uploadType=media&name=${encodedName}`,
    );

    const stream = createReadStream(localPath);
    const req = httpsRequest(
      url,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "text/csv",
          "Content-Length": statSync(localPath).size,
          "Cache-Control": "public, max-age=3600",
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
            return;
          }
          reject(new Error(`Upload ${objectName} failed: ${res.statusCode} ${data}`));
        });
      },
    );
    req.on("error", reject);
    stream.on("error", reject);
    stream.pipe(req);
  });
}

async function makeObjectPublic(accessToken: string, objectName: string): Promise<void> {
  const encodedName = encodeURIComponent(objectName);
  const url = `https://storage.googleapis.com/storage/v1/b/${BUCKET}/o/${encodedName}/acl`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ entity: "allUsers", role: "READER" }),
  });
  if (!res.ok && res.status !== 409) {
    const text = await res.text();
    console.warn(`ACL warning for ${objectName}: ${res.status} ${text}`);
  }
}

async function ensureBucket(accessToken: string): Promise<void> {
  const check = await fetch(`https://storage.googleapis.com/storage/v1/b/${BUCKET}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (check.ok) return;

  const create = await fetch("https://storage.googleapis.com/storage/v1/b?project=bibl-2c364", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: BUCKET,
      location: "EU",
      storageClass: "STANDARD",
    }),
  });
  if (!create.ok) {
    const text = await create.text();
    throw new Error(`Nie udalo sie utworzyc bucketu ${BUCKET}: ${create.status} ${text}`);
  }
  console.log(`Utworzono bucket gs://${BUCKET}`);
}

async function main() {
  const root = join(__dirname, "..");
  const files = [
    { local: join(root, "data", "hurt.csv"), remote: `${PREFIX}/hurt.csv` },
    { local: join(root, "data", "rebel-images.csv"), remote: `${PREFIX}/rebel-images.csv` },
  ];

  for (const f of files) {
    if (!existsSync(f.local)) {
      throw new Error(`Brak pliku: ${f.local}`);
    }
  }

  console.log(`Upload do gs://${BUCKET}/${PREFIX}/ ...`);
  const token = await getAccessToken();
  await ensureBucket(token);

  for (const f of files) {
    const mb = (statSync(f.local).size / (1024 * 1024)).toFixed(1);
    process.stdout.write(`  ${f.remote} (${mb} MB)... `);
    await uploadFile(token, f.local, f.remote);
    await makeObjectPublic(token, f.remote);
    console.log("OK");
  }

  const hurtUrl = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/catalog%2Fhurt.csv?alt=media`;
  const rebelUrl = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/catalog%2Frebel-images.csv?alt=media`;

  console.log("\nPublic URLs:");
  console.log(`  HURT_CSV_URL=${hurtUrl}`);
  console.log(`  REBEL_IMAGES_CSV_URL=${rebelUrl}`);
  console.log("\nNext: firebase deploy --only apphosting:bookshelf");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
