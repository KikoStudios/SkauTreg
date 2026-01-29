import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient(process.env.CONVEX_URL);

const bases = await client.query('bases:listAllBases', {});
const testBase = bases[Math.floor(Math.random() * bases.length)];

console.log('🎯 Testing extraction with:', testBase.name);
console.log('🔗 URL:', testBase.url);

const resp = await fetch(testBase.url);
const html = await resp.text();

// Try to parse embedded JSON - find the detail object
const detailStart = html.indexOf('"detail":{');
if (detailStart > -1) {
  console.log('✅ Found embedded detail object');
  
  // Find DisplayName
  const nameMatch = html.match(/"DisplayName":"([^"]+)"/);
  console.log('\n📋 Basic Info:');
  console.log('  Name:', nameMatch ? nameMatch[1] : 'N/A');
  
  // Find contact info
  const contactPerson = html.match(/"ContactPerson":"([^"]*)"/) || [, ''];
  const contactEmail = html.match(/"ContactEmail":"([^"]*)"/) || [, ''];
  const contactPhone = html.match(/"ContactPhone":"([^"]*)"/) || [, ''];
  console.log('  Contact:', contactPerson[1]);
  console.log('  Email:', contactEmail[1]);
  console.log('  Phone:', contactPhone[1]);
  
  // Find location
  const street = html.match(/"Street":"([^"]*)"/) || [, ''];
  const city = html.match(/"City":"([^"]*)"/) || [, ''];
  const postcode = html.match(/"Postcode":"([^"]*)"/) || [, ''];
  console.log('\n📍 Location:');
  console.log('  Address:', street[1], postcode[1]);
  console.log('  City:', city[1]);
  
  // Find capacity
  const capacity = html.match(/"Capacity":(\d+)/) || [, ''];
  const capacityNote = html.match(/"CapacityNote":"([^"]*)"/) || [, ''];
  console.log('\n🛏️ Capacity:');
  console.log('  Count:', capacity[1]);
  console.log('  Note:', capacityNote[1]?.substring(0, 100));
  
  // Find equipment
  const equipMatches = html.match(/"DisplayName":"([^"]*?)","Description":"([^"]*)"/g) || [];
  console.log('\n🔧 Equipment (' + equipMatches.length + ' items):');
  equipMatches.slice(0, 5).forEach((match, i) => {
    const nameMatch = match.match(/"DisplayName":"([^"]*)"/);
    if (nameMatch && nameMatch[1].length < 50) {
      console.log('  ' + (i+1) + '. ' + nameMatch[1]);
    }
  });
  
  // Find prices
  const priceMatches = html.match(/"RentPriceType":"([^"]*)","[^"]*":"([^"]*)"/g) || [];
  console.log('\n💰 Prices (' + priceMatches.length + ' items):');
  priceMatches.forEach(match => {
    const parts = match.match(/"RentPriceType":"([^"]*)"/);
    if (parts) {
      console.log('  -', parts[1]);
    }
  });
  
} else {
  console.log('❌ Could not find detail object');
}
