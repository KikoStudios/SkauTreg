import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient(process.env.CONVEX_URL);

const bases = await client.query('bases:listAllBases', {});
const testBase = bases[Math.floor(Math.random() * bases.length)];

console.log('🎯 Testing JSON extraction with:', testBase.name);
console.log('🔗 URL:', testBase.url);

const resp = await fetch(testBase.url);
const html = await resp.text();

// Try to parse embedded JSON
const jsonStart = html.indexOf('"pageProps":{');
if (jsonStart > -1) {
  try {
    const jsonStr = html.substring(jsonStart);
    let braceCount = 0;
    let jsonEnd = 0;
    for (let i = 0; i < jsonStr.length; i++) {
      if (jsonStr[i] === '{') braceCount++;
      if (jsonStr[i] === '}') braceCount--;
      if (braceCount === 0 && i > 20) {
        jsonEnd = i + 1;
        break;
      }
    }
    const fullJson = jsonStr.substring(0, jsonEnd);
    
    // Clean up problematic characters for JSON parsing
    const cleanJson = fullJson
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
      .replace(/\\/g, '\\\\')  // Escape existing backslashes
      .replace(/"/g, '\\"')    // Escape quotes
      .replace(/\\\\"/g, '\\"'); // Fix double-escaped quotes
    
    // Retry with original (safer approach)
    const parsed = JSON.parse('{' + fullJson);
    const detail = parsed.pageProps.detail;
    
    console.log('\n✅ Successfully parsed embedded JSON!');
    console.log('\n📋 Extracted Data:');
    console.log('  Name:', detail.DisplayName);
    console.log('  Type:', detail.RealtyType);
    console.log('  Address:', detail.Street, detail.Postcode, detail.City);
    console.log('  GPS:', detail.GpsLatitude, detail.GpsLongitude);
    console.log('  Contact:', detail.ContactPerson);
    console.log('  Email:', detail.ContactEmail);
    console.log('  Phone:', detail.ContactPhone);
    console.log('  Capacity:', detail.Capacity);
    console.log('  Note:', detail.CapacityNote?.substring(0, 100));
    console.log('  Equipment count:', detail.OccupationEquipment?.length);
    if (detail.OccupationEquipment?.length) {
      console.log('  Equipment:', detail.OccupationEquipment.slice(0, 3).map(e => e.DisplayName).join(', '));
    }
    console.log('  Prices:', detail.Prices?.length || 0, 'items');
    if (detail.Prices?.length > 0) {
      detail.Prices.forEach((p, i) => {
        console.log(`    [${i}]`, p.RentPriceType, '-', p.PricePerNight, p.Currency);
      });
    }
  } catch (err) {
    console.error('❌ Failed to parse JSON:', err.message);
    console.error('At position around:', jsonStr?.substring(jsonEnd - 50, jsonEnd + 50));
  }
} else {
  console.log('❌ Could not find embedded JSON in page');
}
