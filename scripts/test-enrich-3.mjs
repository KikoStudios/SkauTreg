import { ConvexHttpClient } from "convex/browser";
import { pathToFileURL } from "url";

const client = new ConvexHttpClient(process.env.CONVEX_URL);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function decodeHtmlEntities(text) {
  if (!text) return text;
  let decoded = text.replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => 
    String.fromCharCode(parseInt(hex, 16))
  );
  decoded = decoded
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
  return decoded;
}

async function enrichBase(base) {
  console.log(`\n  Enriching: ${base.name}`);
  const url = base.url || `https://zakladny.skaut.cz/detail/${base.zakladnyId}`;
  console.log(`  URL: ${url}`);

  try {
    console.time("  Fetch");
    const resp = await fetch(url);
    console.timeEnd("  Fetch");
    
    if (!resp.ok) return null;
    
    const html = await resp.text();
    console.log(`  HTML size: ${html.length} bytes`);

    // Extract __NEXT_DATA__ JSON
    const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!match) {
      console.log("  No __NEXT_DATA__ found");
      return null;
    }

    console.log(`  Parsing JSON...`);
    const nextData = JSON.parse(match[1]);
    const detail = nextData.props?.pageProps?.detail;
    
    if (!detail) {
      console.log("  No detail found");
      return null;
    }

    console.log(`  Detail keys: ${Object.keys(detail).slice(0, 5).join(", ")}...`);

    const result = {
      lastSyncedAt: new Date().toISOString(),
    };

    // Extract pricing
    if (detail.Prices && Array.isArray(detail.Prices)) {
      console.log(`  Found ${detail.Prices.length} price entries`);
      const priceEntry = detail.Prices[0];
      result.pricing = {};
      if (priceEntry.BasePrice) result.pricing.perNight = priceEntry.BasePrice;
      if (priceEntry.ScoutPrice) result.pricing.discountScouts = priceEntry.ScoutPrice;
      if (priceEntry.ChildPrice) result.pricing.discountChildrenOrgs = priceEntry.ChildPrice;
    }

    // Extract photos
    if (detail.Photos && Array.isArray(detail.Photos)) {
      console.log(`  Found ${detail.Photos.length} photos`);
      const photos = detail.Photos.map(p => ({
        url: `https://zamerice.skaut.cz/documents/${p.ID_Document}`,
        documentId: String(p.ID_Document),
        description: p.Description ? p.Description.trim() : ''
      }));
      result.media = { photos };
      console.log(`  Photo sample:`, photos[0]);
    }

    return Object.keys(result).length > 1 ? result : null;
  } catch (err) {
    console.log(`  Error: ${err.message}`);
    return null;
  }
}

async function main() {
  const bases = await client.query("bases:listAllBases", {});
  console.log(`Found ${bases.length} bases, testing first 3...\n`);

  const testBases = bases.slice(0, 3);

  for (const base of testBases) {
    const data = await enrichBase(base);
    
    if (data && Object.keys(data).length > 1) {
      console.log(`\n  Updating in DB...`);
      console.time("  Mutation");
      try {
        const result = await client.mutation("bases:updateBaseDetails", {
          baseId: base._id,
          data,
        });
        console.timeEnd("  Mutation");
        console.log(`  ✓ Updated`);
      } catch (err) {
        console.timeEnd("  Mutation");
        console.log(`  ✗ Error: ${err.message}`);
      }
    } else {
      console.log(`  No new data to save`);
    }

    await sleep(500);
  }

  console.log("\nTest complete!");
}

main().catch(console.error);
