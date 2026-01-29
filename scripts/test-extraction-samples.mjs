import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient(process.env.CONVEX_URL);

// Copy the extraction function
function extractDetailsFromHtml(html) {
  const result = {};

  // Contact Info
  const contactPerson = html.match(/"ContactPerson":"([^"]*)"/);
  const contactEmail = html.match(/"ContactEmail":"([^"]*)"/);
  const contactPhone = html.match(/"ContactPhone":"([^"]*)"/);
  const contactWeb = html.match(/"ContactWeb":"([^"]*)"/);
  
  if (contactPerson || contactEmail || contactPhone) {
    result.contacts = [{
      name: contactPerson ? contactPerson[1] : undefined,
      role: "správce",
      email: contactEmail ? contactEmail[1] : undefined,
      phone: contactPhone ? contactPhone[1] : undefined,
      website: contactWeb && contactWeb[1] ? contactWeb[1] : undefined,
    }];
  }

  // Location
  const street = html.match(/"Street":"([^"]*)"/);
  const city = html.match(/"City":"([^"]*)"/);
  const postcode = html.match(/"Postcode":"([^"]*)"/);
  
  result.location = {
    address: street ? street[1] : undefined,
    city: city ? city[1] : undefined,
    postalCode: postcode ? postcode[1] : undefined,
    country: "Česká republika"
  };

  // Capacity
  const capacity = html.match(/"Capacity":(\d+)/);
  const capacityNote = html.match(/"CapacityNote":"([^"]*)"/);
  const realtyType = html.match(/"RealtyType":"([^"]*)"/);
  
  result.amenities = {
    accommodationType: realtyType ? realtyType[1] : undefined,
    minCapacity: capacity ? parseInt(capacity[1]) : undefined,
    maxCapacity: capacity ? parseInt(capacity[1]) : undefined,
    description: capacityNote ? capacityNote[1] : undefined,
    equipment: []
  };

  // Extract equipment items
  const equipRegex = /"DisplayName":"([^"]*?)","Description":"([^"]*?)"/g;
  let match;
  const seen = new Set();
  while ((match = equipRegex.exec(html)) !== null) {
    const name = match[1];
    // Only add equipment-like items (not ContactPerson, RealtyType, etc)
    if (name.length < 100 && !name.includes("@") && !seen.has(name) && 
        !/^[A-Z][a-z]+ [a-z]/i.test(name.substring(0, 10))) {
      result.amenities.equipment.push(name);
      seen.add(name);
    }
    if (result.amenities.equipment.length >= 15) break;
  }

  // Pricing (Prices array)
  const pricesMatch = html.match(/"Prices":\[(.*?)\]/s);
  if (pricesMatch && pricesMatch[1].trim()) {
    const priceDescription = pricesMatch[1]
      .split(/},{/)
      .map(p => p.match(/"RentPriceType":"([^"]*)"/) && p.match(/"PricePerNight":"([^"]*)"/))
      .filter(Boolean)
      .map(m => m[1])
      .join(', ');
    
    if (priceDescription) {
      result.pricing = {
        description: priceDescription,
        currencyCode: "CZK"
      };
    }
  }

  // Language
  const languages = html.match(/"OccupationLanguages":\[([^\]]*)\]/);
  if (languages && languages[1]) {
    const langMatch = languages[1].match(/"([^"]+)"/);
    result.conditions = {
      language: langMatch ? langMatch[1] : "Česky"
    };
  } else {
    result.conditions = { language: "Česky" };
  }

  // Special notes / requirements
  const requirements = html.match(/"Requirements":"([^"]*)"/);
  if (requirements && requirements[1]) {
    result.conditions.specialNotes = requirements[1];
  }

  // Media / Photos
  const photoGallery = html.match(/"PhotogalleryUrl":"([^"]*)"/);
  if (photoGallery && photoGallery[1]) {
    result.media = {
      photoGalleryUrl: photoGallery[1]
    };
  }

  return result;
}

// Test on a few bases
const bases = await client.query('bases:listAllBases', {});
console.log(`🧪 Testing extraction on 3 random bases...\n`);

for (let testNum = 0; testNum < 3; testNum++) {
  const testBase = bases[Math.floor(Math.random() * bases.length)];
  console.log(`\n[${testNum + 1}/3] Testing: ${testBase.name}`);
  console.log(`URL: ${testBase.url}`);
  
  const resp = await fetch(testBase.url);
  const html = await resp.text();
  const data = extractDetailsFromHtml(html);
  
  console.log(`✅ Contact: ${data.contacts?.[0]?.name || 'N/A'} <${data.contacts?.[0]?.email || 'N/A'}>`);
  console.log(`✅ Location: ${data.location?.address}, ${data.location?.postalCode} ${data.location?.city}`);
  console.log(`✅ Capacity: ${data.amenities?.minCapacity} osob`);
  console.log(`✅ Equipment: ${data.amenities?.equipment?.length || 0} items (${(data.amenities?.equipment || []).slice(0, 3).join(', ')})`);
  console.log(`✅ Pricing: ${data.pricing?.description || 'Neurčena'}`);
  
  await new Promise(r => setTimeout(r, 300)); // Rate limit
}

console.log('\n✅ Extraction looks good! Ready to run full enrichment.');
