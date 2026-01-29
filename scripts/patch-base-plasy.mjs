import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient(process.env.CONVEX_URL);

async function main() {
  console.log("🔎 Searching for base 'Plasy'");
  const bases = await client.query("bases:listAllBases", {});
  const match = bases.find((b) =>
    (b.name || "").toLowerCase().includes("plasy") || (b.slug || "").includes("plas")
  );
  if (!match) {
    console.error("❌ Base not found (expected Chata v Plasích)");
    process.exit(1);
  }
  console.log(`✅ Found base: ${match.name} (id ${match._id})`);

  const data = {
    pricing: {
      currencyCode: "CZK",
      perNight: 100,
      discountChildrenOrgs: 80,
      discountScouts: 70,
      minimumCharge: 400,
      description:
        "Osoba za noc - cena základní 100 Kč. Po slevě pro dětské organizace 80 Kč. Po slevě pro skauty 70 Kč. Minimální účtovaná částka je 400 Kč.",
    },
    location: {
      address: "Plasy ev.č. 136",
      city: "Plasy",
      postalCode: "33101",
      country: "Česká republika",
    },
    contacts: [
      {
        name: "Šlípek (Petr Vynáhlovský)",
        role: "správce",
        email: "slip@skaut.cz",
        phone: "608 916 319",
        website: "https://omahakralovice.skauting.cz/chata-v-plasich",
      },
    ],
    amenities: {
      accommodationType: "Ubytování",
      minCapacity: 10,
      maxCapacity: 13,
      absoluteMaxCapacity: 15,
      equipment: [
        "bez vody",
        "suchý záchod",
        "kuchyňka základně vybavená",
        "elektřina",
        "topení tuhými palivy",
        "matrace",
        "vlastní spacák",
      ],
      description:
        "V přízemí je zastřešená terasa a obytná místnost se stolem, židlemi a lavicí. Je zde také jedna postel. V přízemí je k dispozici základní kuch. vybavení, lednice a MW trouba s rychlovarnou konvicí. Do patra (podkroví) se vstupuje s přezůvkami. Spaní ve vlastním spacáku, v patře je pouze několik matrací, zbytek přespávajících bude potřebovat i vlastní karimatku.",
    },
    conditions: {
      accessibility: "Chata není bezbariérová – je dvoupodlažní.",
      heating:
        "topení tuhými palivy (kamna Petry). Vaření na kamnech, popř. plynovém vařiči",
      water: "Vodu (hlavně pitnou) je potřeba vždy dovézt, popř. koupit v Plasích (cca. 1 km daleko)",
      toilet: "Záchod (suchý) se nachází ve svahu nad chatou",
      kitchen: "Základní vybavení, lednice a MW trouba s rychlovarnou konvicí",
      bedding: "Matrace v patře. Vlastní spacák potřebný, karimatka pro některé",
      specialNotes:
        "Před chatou teče řeka Střela. Lesní pěšinou lze dojít jak do Nebřežin, tak po příjezdové cestě na druhou stranu do Plas. Dřevo je většinou připravené, při pobytu je potřeba spotřebované dřevo vždy doplnit.",
      restrictions: ["(V řece se objevují bobři.)"],
      language: "Čeština",
    },
    media: {
      photoGalleryUrl: "https://omahakralovice.skauting.cz/chata-v-plasich",
      description: "Ilustrační fotka: Chata v Plasích",
      photos: [],
    },
    availability: "Leden 2026",
  };

  const res = await client.mutation("bases:updateBaseDetails", {
    baseId: match._id,
    data,
  });
  console.log("✅ Updated base", res);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
