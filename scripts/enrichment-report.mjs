import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient(process.env.CONVEX_URL);

console.log('📊 FINAL ENRICHMENT QUALITY REPORT\n');

const bases = await client.query('bases:listAllBases', {});

// Statistics
let stats = {
  totalBases: bases.length,
  withPricing: 0,
  withContacts: 0,
  withLocation: 0,
  withEquipment: 0,
  withConditions: 0,
  totalEquipmentItems: 0,
  htmlEntitiesInNotes: 0
};

bases.forEach(b => {
  if (b.pricing?.perNight) stats.withPricing++;
  if (b.contacts?.[0]?.email) stats.withContacts++;
  if (b.location?.address && b.location?.city) stats.withLocation++;
  if (b.amenities?.equipment?.length > 0) {
    stats.withEquipment++;
    stats.totalEquipmentItems += b.amenities.equipment.length;
  }
  if (b.conditions?.specialNotes) stats.withConditions++;
  
  // Check for unencoded HTML entities
  if (b.conditions?.specialNotes && 
      (b.conditions.specialNotes.includes('&#') || b.conditions.specialNotes.includes('&lt;') || b.conditions.specialNotes.includes('\\u0026'))) {
    stats.htmlEntitiesInNotes++;
  }
});

console.log('✅ EXTRACTION STATISTICS:');
console.log(`  Total bases: ${stats.totalBases}`);
console.log(`  With pricing: ${stats.withPricing} (${(stats.withPricing*100/stats.totalBases).toFixed(1)}%)`);
console.log(`  With contacts: ${stats.withContacts} (${(stats.withContacts*100/stats.totalBases).toFixed(1)}%)`);
console.log(`  With location: ${stats.withLocation} (${(stats.withLocation*100/stats.totalBases).toFixed(1)}%)`);
console.log(`  With equipment: ${stats.withEquipment} (${(stats.withEquipment*100/stats.totalBases).toFixed(1)}%)`);
console.log(`    Total equipment items: ${stats.totalEquipmentItems}`);
console.log(`  With special notes/conditions: ${stats.withConditions} (${(stats.withConditions*100/stats.totalBases).toFixed(1)}%)`);

console.log(`\n🛡️ DATA QUALITY CHECKS:`);
console.log(`  HTML entities still in notes: ${stats.htmlEntitiesInNotes}`);
if (stats.htmlEntitiesInNotes === 0) {
  console.log(`  ✅ All special notes properly decoded!`);
} else {
  console.log(`  ⚠️ ${stats.htmlEntitiesInNotes} bases still have HTML entities`);
}

// Show a sample
console.log('\n\n📋 SAMPLE BASE WITH FULL DATA:');
const baseSample = bases.find(b => b.pricing?.perNight && b.conditions?.specialNotes && b.amenities?.equipment?.length > 0);
if (baseSample) {
  console.log(`\n${baseSample.name}`);
  console.log('═'.repeat(80));
  
  console.log('\n💰 PRICING:');
  console.log(`  Base: ${baseSample.pricing.perNight} ${baseSample.pricing.currencyCode}`);
  if (baseSample.pricing.discountScouts) console.log(`  Scouts: ${baseSample.pricing.discountScouts} ${baseSample.pricing.currencyCode}`);
  if (baseSample.pricing.discountChildrenOrgs) console.log(`  Children orgs: ${baseSample.pricing.discountChildrenOrgs} ${baseSample.pricing.currencyCode}`);
  
  console.log('\n📍 LOCATION:');
  console.log(`  ${baseSample.location.address}`);
  console.log(`  ${baseSample.location.postalCode} ${baseSample.location.city}`);
  
  console.log('\n👤 CONTACT:');
  const contact = baseSample.contacts?.[0];
  if (contact?.name) console.log(`  Name: ${contact.name}`);
  if (contact?.email) console.log(`  Email: ${contact.email}`);
  if (contact?.phone) console.log(`  Phone: ${contact.phone}`);
  
  console.log('\n🛏️ AMENITIES:');
  console.log(`  Type: ${baseSample.amenities.accommodationType}`);
  console.log(`  Capacity: ${baseSample.amenities.minCapacity} osob`);
  console.log(`  Equipment (${baseSample.amenities.equipment.length}):`);
  baseSample.amenities.equipment.slice(0, 5).forEach(e => console.log(`    • ${e}`));
  
  console.log('\n📝 CONDITIONS:');
  console.log(`  Language: ${baseSample.conditions.language}`);
  if (baseSample.conditions.specialNotes) {
    const notes = baseSample.conditions.specialNotes;
    console.log(`  Special notes (${notes.length} chars):`);
    console.log(`  "${notes.substring(0, 250)}..."`);
  }
}

console.log('\n\n✅ ENRICHMENT COMPLETE!\n');
