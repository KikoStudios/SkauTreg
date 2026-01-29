import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient(process.env.CONVEX_URL);

console.log('🔍 Analyzing how to extract photo URLs from ID_Document...\n');

const bases = await client.query('bases:listAllBases', {});

// Look for a base with both PhotogalleryUrl and photos to understand the pattern
let found = 0;
for (const base of bases) {
  if (found >= 2) break;
  
  const resp = await fetch(base.url);
  const html = await resp.text();
  
  // Extract the Photos array
  const photosMatch = html.match(/"Photos":\[(.*?)\](?=,"PhotogalleryUrl")/s);
  const galleryMatch = html.match(/"PhotogalleryUrl":"([^"]*)"/);
  
  if (photosMatch && galleryMatch && photosMatch[1].length > 10) {
    found++;
    console.log(`\n[${found}] ${base.name}`);
    console.log('URL:', base.url);
    
    // Extract photo objects with ID_Document
    const photoRegex = /\{"ID":(\d+),"ID_Document":(\d+),"Description":"([^"]*)"\}/g;
    let photoMatch;
    const photos = [];
    
    while ((photoMatch = photoRegex.exec(photosMatch[1])) !== null) {
      photos.push({
        id: photoMatch[1],
        documentId: photoMatch[2],
        description: photoMatch[3]
      });
    }
    
    console.log(`\nPhotos (${photos.length} total):`);
    photos.forEach((p, i) => {
      console.log(`  [${i+1}] ID_Document: ${p.documentId}, Desc: "${p.description}"`);
    });
    
    console.log(`\nPhotoGalleryUrl: ${galleryMatch[1]}`);
    
    // Try to construct URLs
    console.log('\n💡 Possible photo URL patterns:');
    if (photos.length > 0) {
      const docId = photos[0].documentId;
      console.log(`  https://zamerice.skaut.cz/documents/${docId}`);
      console.log(`  https://zakladny.skaut.cz/document/${docId}`);
      console.log(`  https://zakladny.skaut.cz/api/document/${docId}`);
    }
  }
  
  await new Promise(r => setTimeout(r, 300));
}

console.log(`\n✅ Analysis complete`);
