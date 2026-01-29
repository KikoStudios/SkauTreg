import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient(process.env.CONVEX_URL);

console.log('🔍 Analyzing price data structure...\n');

const bases = await client.query('bases:listAllBases', {});

// Look for bases with prices (first 10 we can find)
let found = 0;
for (const base of bases) {
  if (found >= 5) break;
  
  const resp = await fetch(base.url);
  const html = await resp.text();
  
  // Extract the Prices array
  const pricesMatch = html.match(/"Prices":\[(.*?)\](?=,"[A-Z])/s);
  
  if (pricesMatch && pricesMatch[1].length > 10) {
    found++;
    console.log(`\n[${found}] ${base.name}`);
    console.log('URL:', base.url);
    console.log('Prices JSON:');
    
    // Pretty print the prices array
    const pricesStr = '[' + pricesMatch[1] + ']';
    
    // Extract individual fields
    const types = pricesStr.match(/"RentPriceType":"([^"]*)"/g) || [];
    const prices = pricesStr.match(/"PricePerNight":"([^"]*)"/g) || [];
    const currencies = pricesStr.match(/"Currency":"([^"]*)"/g) || [];
    
    console.log('  RentPriceTypes:', types.map(t => t.match(/"RentPriceType":"([^"]*)/)[1]));
    console.log('  Prices:', prices.map(p => p.match(/"PricePerNight":"([^"]*)/)[1]));
    console.log('  Currencies:', currencies.map(c => c.match(/"Currency":"([^"]*)/)[1]));
    
    // Show raw JSON snippet
    console.log('\n  Raw Prices array (first 300 chars):');
    console.log('  ', pricesStr.substring(0, 300) + '...');
  }
  
  await new Promise(r => setTimeout(r, 300));
}

if (found === 0) {
  console.log('❌ Could not find any bases with prices');
  console.log('This might mean the Prices array is always empty on zakladny.skaut.cz');
} else {
  console.log(`\n✅ Found ${found} bases with price data`);
}
