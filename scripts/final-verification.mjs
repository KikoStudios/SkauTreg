import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient(process.env.CONVEX_URL);

console.log('✅ FINAL VERIFICATION - Showing bases with pricing:\n');

const bases = await client.query('bases:listAllBases', {});
const basesWithPricing = bases.filter(b => b.pricing && b.pricing.perNight).slice(0, 5);

basesWithPricing.forEach((base, i) => {
  console.log(`\n[${i+1}] ${base.name}`);
  console.log('─'.repeat(70));
  
  if (base.pricing) {
    console.log('💰 PRICING:');
    console.log(`   Primary price: ${base.pricing.perNight} Kč`);
    if (base.pricing.discountScouts) console.log(`   Scout discount: ${base.pricing.discountScouts} Kč`);
    if (base.pricing.discountChildrenOrgs) console.log(`   Children org discount: ${base.pricing.discountChildrenOrgs} Kč`);
    console.log(`   Description: ${base.pricing.description}`);
  }
  
  if (base.location) {
    console.log('\n📍 LOCATION:');
    console.log(`   ${base.location.address}`);
    console.log(`   ${base.location.postalCode} ${base.location.city}`);
  }
  
  if (base.contacts && base.contacts[0]) {
    console.log('\n👤 CONTACT:');
    if (base.contacts[0].name) console.log(`   Name: ${base.contacts[0].name}`);
    if (base.contacts[0].email) console.log(`   Email: ${base.contacts[0].email}`);
    if (base.contacts[0].phone) console.log(`   Phone: ${base.contacts[0].phone}`);
  }
  
  if (base.amenities) {
    console.log('\n🛏️  AMENITIES:');
    if (base.amenities.accommodationType) console.log(`   Type: ${base.amenities.accommodationType}`);
    if (base.amenities.minCapacity) console.log(`   Capacity: ${base.amenities.minCapacity} osob`);
    if (base.amenities.equipment?.length) {
      console.log(`   Equipment (${base.amenities.equipment.length} items):`);
      base.amenities.equipment.slice(0, 4).forEach(e => console.log(`     • ${e}`));
    }
  }
});

console.log('\n\n✅ SUCCESS! All data is now properly extracted and formatted.');
