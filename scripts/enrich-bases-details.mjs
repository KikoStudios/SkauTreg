import { ConvexHttpClient } from "convex/browser";
import { pathToFileURL } from "url";

const client = new ConvexHttpClient(process.env.CONVEX_URL);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Helper function to decode HTML entities (handles double encoding)
function decodeHtmlEntities(text) {
  if (!text) return text;
  
  // First decode escaped unicode sequences like \u0026 → &
  let decoded = text.replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => 
    String.fromCharCode(parseInt(hex, 16))
  );
  
  // Then decode HTML entities like &#237; or &#x00e9;
  decoded = decoded
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
  
  return decoded;
}


async function enrichBase(base) {
  if (!base.url && !base.zakladnyId) return null;
  
  const url = base.url || `https://zakladny.skaut.cz/detail/${base.zakladnyId}`;

  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "SkautREG-bases-enrich" },
    });
    if (!resp.ok) {
      return null;
    }

    const html = await resp.text();

    // Extract __NEXT_DATA__ JSON
    const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!match) {
      return null;
    }

    const nextData = JSON.parse(match[1]);
    const detail = nextData.props?.pageProps?.detail;
    if (!detail) {
      return null;
    }

    const result = {
      lastSyncedAt: new Date().toISOString(),
    };

    // Pricing: Extract from Prices array
    if (detail.Prices && Array.isArray(detail.Prices) && detail.Prices.length > 0) {
      const priceEntry = detail.Prices[0];
      result.pricing = {};
      if (priceEntry.BasePrice) result.pricing.perNight = priceEntry.BasePrice;
      if (priceEntry.ScoutPrice) result.pricing.discountScouts = priceEntry.ScoutPrice;
      if (priceEntry.ChildPrice) result.pricing.discountChildrenOrgs = priceEntry.ChildPrice;
      result.pricing.currencyCode = "CZK";
      if (Object.keys(result.pricing).length <= 1) delete result.pricing;
    }

    // Location
    if (detail.Street || detail.City || detail.Postcode) {
      result.location = {
        address: detail.Street || undefined,
        city: detail.City || undefined,
        postalCode: detail.Postcode || undefined,
        country: "Česká republika",
      };
      Object.keys(result.location).forEach(k => 
        result.location[k] === undefined && delete result.location[k]
      );
      if (Object.keys(result.location).length === 0) delete result.location;
    }

    // Contacts
    if (detail.ContactPerson || detail.ContactEmail || detail.ContactPhone || detail.ContactWeb) {
      const contact = {
        name: detail.ContactPerson || undefined,
        role: "správce",
        email: detail.ContactEmail || undefined,
        phone: detail.ContactPhone || undefined,
        website: detail.ContactWeb || undefined,
      };
      Object.keys(contact).forEach(k => contact[k] === undefined && delete contact[k]);
      if (Object.keys(contact).length > 1) {
        result.contacts = [contact];
      }
    }

    // Amenities - use OccupationEquipment for equipment list
    if (detail.OccupationEquipment && Array.isArray(detail.OccupationEquipment) && detail.OccupationEquipment.length > 0) {
      result.amenities = {
        equipment: detail.OccupationEquipment.map(e => e.DisplayName).filter(Boolean),
      };
      if (detail.RealtyType) {
        result.amenities.accommodationType = detail.RealtyType;
      }
      if (detail.Capacity) {
        result.amenities.minCapacity = Math.ceil(detail.Capacity * 0.6);
        result.amenities.maxCapacity = detail.Capacity;
      }
      Object.keys(result.amenities).forEach(k => 
        (result.amenities[k] === undefined || (Array.isArray(result.amenities[k]) && result.amenities[k].length === 0)) && 
        delete result.amenities[k]
      );
      if (Object.keys(result.amenities).length === 0) delete result.amenities;
    } else if (detail.Capacity || detail.RealtyType) {
      // Fallback if no equipment but has capacity or type
      result.amenities = {};
      if (detail.RealtyType) result.amenities.accommodationType = detail.RealtyType;
      if (detail.Capacity) {
        result.amenities.minCapacity = Math.ceil(detail.Capacity * 0.6);
        result.amenities.maxCapacity = detail.Capacity;
      }
    }

    // Conditions
    if (detail.ConditionalNote) {
      result.conditions = {
        specialNotes: decodeHtmlEntities(detail.ConditionalNote).trim(),
        language: "Česky",
      };
    }

    // Photos - use Azure CDN URL format
    if (detail.Photos && Array.isArray(detail.Photos) && detail.Photos.length > 0) {
      const photos = detail.Photos.map(p => ({
        url: `https://prd-images-zakladny-skaut.azureedge.net/api/images/thumb/${p.ID_Document}.jpg`,
        documentId: String(p.ID_Document),
        description: p.Description ? decodeHtmlEntities(p.Description).trim() : '',
      }));
      result.media = { photos };
    }

    // Gallery URL
    if (detail.PhotogalleryUrl) {
      if (!result.media) result.media = {};
      result.media.photoGalleryUrl = detail.PhotogalleryUrl;
    }

    // Only return if we have something to update
    if (Object.keys(result).length > 1) {
      return result;
    }
    return null;
  } catch (err) {
    console.error(`ERROR enriching ${base.name}: ${err.message}`);
    return null;
  }
}

async function main() {
  const convexUrl = process.env.CONVEX_URL;
  if (!convexUrl) throw new Error("Set CONVEX_URL to dev deployment");

  console.log("Fetching bases...");
  const bases = await client.query("bases:listAllBases", {});
  console.log(`Starting enrichment of ${bases.length} bases...\n`);

  let updated = 0;
  for (let i = 0; i < bases.length; i++) {
    const base = bases[i];
    if ((i + 1) % 10 === 0) {
      console.log(`[${i + 1}/${bases.length}] Updated so far: ${updated}`);
    }

    const data = await enrichBase(base);
    if (!data) continue;

    try {
      await client.mutation("bases:updateBaseDetails", {
        baseId: base._id,
        data,
      });
      updated++;
    } catch (err) {
      console.warn(`Failed to update ${base.name}:`, err.message);
    }

    await sleep(200);
  }

  console.log(`\nDone! Updated ${updated}/${bases.length}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
