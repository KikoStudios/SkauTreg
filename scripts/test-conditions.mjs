import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient(process.env.CONVEX_URL);

console.log('✅ TESTING CONDITIONS & LANGUAGE EXTRACTION:\n');

const bases = await client.query('bases:listAllBases', {});
const basesWithNotes = bases.filter(b => b.conditions?.specialNotes && b.conditions.specialNotes.length > 50).slice(0, 3);

if (basesWithNotes.length === 0) {
  console.log('⚠️ No bases found with detailed special notes yet.');
  console.log('Re-running enrichment to extract conditions...\n');
} else {
  basesWithNotes.forEach((base, i) => {
    console.log(`\n[${i+1}] ${base.name}`);
    console.log('─'.repeat(80));
    
    if (base.conditions) {
      console.log(`📝 LANGUAGE: ${base.conditions.language}`);
      if (base.conditions.specialNotes) {
        const notes = base.conditions.specialNotes;
        console.log(`\n📋 SPECIAL NOTES (${notes.length} chars):`);
        console.log(notes.substring(0, 500));
        if (notes.length > 500) console.log('...[truncated]');
        
        // Check if HTML entities are decoded
        if (notes.includes('&#') || notes.includes('&lt;')) {
          console.log('\n⚠️ WARNING: Still has HTML entities!');
        } else {
          console.log('\n✅ HTML entities properly decoded');
        }
      }
    }
  });
}
