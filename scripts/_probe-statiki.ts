import { probeImageUrl } from "../src/lib/services/ean-providers/image-utils";

const EANS = [
  "6416739594620", "9788396341679", "5666816442127", "5902983491996", "5902983492009",
  "5902983493761", "5902983492207", "5609288361183", "5902560386981", "4005556268122",
  "5036905042086", "8005125411658", "5902768336429", "5904262950187", "5905794220151",
  "5902983493617", "5902983493839", "9788365773531", "3760175518263", "9788366762374",
  "5902983493792", "5902983493785", "5902983491842", "5902983491835", "5902983493204",
  "5902983493808", "5902983493846", "5902983490807", "5902983490791", "5411068842733",
  "5906018013467", "8719075976371", "5900511182538", "5609288361190",
];

const FOLDERS = ["5FC", "2A0", "32D", "EAB", "113", "FF9", "130", "2B0", "3A1"];
const BASES = [
  "https://cf-bee.statiki.pl/images/popups",
  "https://cf-tk.statiki.pl/images/popups",
  "https://bigimg.bee.pl/images/popups",
  "https://bigimg.taniaksiazka.pl/images/popups",
];

async function main() {
  for (const ean of EANS) {
    let found = false;
    for (const base of BASES) {
      for (const folder of FOLDERS) {
        for (const ext of ["webp", "jpg"]) {
          const url = `${base}/${folder}/${ean}.${ext}`;
          if (await probeImageUrl(url)) {
            console.log(`${ean} OK ${url}`);
            found = true;
            break;
          }
        }
        if (found) break;
      }
      if (found) break;
    }
    if (!found) console.log(`${ean} FAIL`);
  }
}

main().catch(console.error);
