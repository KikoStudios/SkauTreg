import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient(process.env.CONVEX_URL);

// Exact copy of the improved extraction function
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
    if (name.length < 100 && !name.includes("@") && !seen.has(name) && 
        !/^[A-Z][a-z]+ [a-z]/i.test(name.substring(0, 10))) {
      result.amenities.equipment.push(name);
      seen.add(name);
    }
    if (result.amenities.equipment.length >= 15) break;
  }

  // Pricing (Prices array) - IMPROVED with BasePrice/ScoutPrice/ChildPrice
  const pricesMatch = html.match(/"Prices":\[(.*?)\](?=,"[A-Z])/s);
  if (pricesMatch && pricesMatch[1].trim()) {
    const prices = [];
    const priceTexts = pricesMatch[1].split(/},{/).map((p, i) => i === 0 ? p : '{' + p);
    
    for (const priceText of priceTexts) {
      const type = priceText.match(/"OccupationRentPriceType":"([^"]*)"/);
      const base = priceText.match(/"BasePrice":([^,}]*)/);
      const scout = priceText.match(/"ScoutPrice":([^,}]*)/);
      const child = priceText.match(/"ChildPrice":([^,}]*)/);
      
      if (type && (base || scout || child)) {
        const typeName = type[1];
        const baseVal = base ? parseInt(base[1]) : null;
        const scoutVal = scout ? parseInt(scout[1]) : null;
        const childVal = child ? parseInt(child[1]) : null;
        
        let description = typeName;
        if (baseVal !== null) description += `: ${baseVal} Kč`;
        if (scoutVal !== null && scoutVal !== baseVal) description += ` (skauty: ${scoutVal} Kč)`;
        if (childVal !== null && childVal !== baseVal) description += ` (děti: ${childVal} Kč)`;
        
        prices.push({
          type: typeName,
          perNight: baseVal,
          scoutPrice: scoutVal,
          childPrice: childVal,
          description
        });
      }
    }
    
    if (prices.length > 0) {
      result.pricing = {
        perNight: prices[0].perNight,
        discountScouts: prices[0].scoutPrice,
        discountChildrenOrgs: prices[0].childPrice,
        currencyCode: "CZK",
        description: prices.map(p => p.description).join(' | ')
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

// Test on bases with known prices
const bases = await client.query('bases:listAllBases', {});
console.log(`🧪 Testing PRICING extraction...\n`);

let foundWithPrice = 0;
for (const base of bases) {
  if (foundWithPrice >= 3) break;
  
  const resp = await fetch(base.url);
  const html = await resp.text();
  const data = extractDetailsFromHtml(html);
  
  if (data.pricing && data.pricing.description) {
    foundWithPrice++;
    console.log(`\n[${foundWithPrice}] ${base.name}`);
    console.log(`URL: ${base.url}`);
    console.log(`\n💰 PRICING:`);
    console.log(`  Base price: ${data.pricing.perNight} Kč`);
    console.log(`  Scout price: ${data.pricing.discountScouts} Kč`);
    console.log(`  Children org price: ${data.pricing.discountChildrenOrgs} Kč`);
    console.log(`  Description: ${data.pricing.description}`);
    console.log(`\n📋 Other data:`);
    console.log(`  Contact: ${data.contacts?.[0]?.name || 'N/A'}`);
    console.log(`  Location: ${data.location?.address}, ${data.location?.postalCode}`);
    console.log(`  Equipment: ${data.amenities?.equipment?.length || 0} items`);
  }
  
  await new Promise(r => setTimeout(r, 300));
}

console.log(`\n✅ Found ${foundWithPrice} bases with pricing info!`);
