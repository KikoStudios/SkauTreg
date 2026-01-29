import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient(process.env.CONVEX_URL);

console.log('📊 Verifying extracted data quality...\n');

const bases = await client.query('bases:listAllBases', {});

// Check 5 random bases
for (let i = 0; i < 5; i++) {
  const base = bases[Math.floor(Math.random() * bases.length)];
  
  console.log(`\n[${i+1}/5] ${base.name}`);
  console.log('─'.repeat(60));
  
  if (base.location) {
    console.log('📍 Location:');
    console.log(`   ${base.location.address}, ${base.location.postalCode} ${base.location.city}`);
  }
  
  if (base.contacts && base.contacts.length > 0) {
    const contact = base.contacts[0];
    console.log('👤 Contact:');
    if (contact.name) console.log(`   Name: ${contact.name}`);
    if (contact.email) console.log(`   Email: ${contact.email}`);
    if (contact.phone) console.log(`   Phone: ${contact.phone}`);
  }
  
  if (base.amenities) {
    console.log('🛏️  Amenities:');
    if (base.amenities.accommodationType) console.log(`   Type: ${base.amenities.accommodationType}`);
    if (base.amenities.minCapacity) console.log(`   Capacity: ${base.amenities.minCapacity} osob`);
    if (base.amenities.equipment && base.amenities.equipment.length > 0) {
      console.log(`   Equipment (${base.amenities.equipment.length} items):`);
      base.amenities.equipment.slice(0, 5).forEach(e => console.log(`     • ${e}`));
    }
    if (base.amenities.description) {
      const note = base.amenities.description.substring(0, 80);
      console.log(`   Note: ${note}${base.amenities.description.length > 80 ? '...' : ''}`);
    }
  }
  
  if (base.pricing && base.pricing.description) {
    console.log('💰 Pricing:');
    console.log(`   ${base.pricing.description}`);
  }
  
  if (base.conditions && base.conditions.language) {
    console.log(`📝 Language: ${base.conditions.language}`);
  }
}

console.log('\n✅ Data extraction verification complete!');
