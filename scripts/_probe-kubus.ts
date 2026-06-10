import { probeImageUrl } from "../src/lib/services/ean-providers/image-utils";

async function main() {
  const base =
    "https://ksiegarniainternetowa.co.uk/img/product_images_new/440/233440_01_klocki_cubes_12_kubus_puchatek";
  for (const suffix of [".300.jpg", ".jpg", ".800.jpg", ".1000.jpg", "_01.jpg"]) {
    const url = base + suffix;
    console.log(suffix, await probeImageUrl(url));
  }
}

main().catch(console.error);
