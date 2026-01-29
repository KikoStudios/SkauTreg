import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient(process.env.CONVEX_URL);

console.log('🔍 Analyzing photo gallery structure...\n');

const bases = await client.query('bases:listAllBases', {});

// Look for bases with photos
let found = 0;
for (const base of bases) {
  if (found >= 3) break;
  
  const resp = await fetch(base.url);
  const html = await resp.text();
  
  // Extract the Photos array
  const photosMatch = html.match(/"Photos":\[(.*?)\](?=,"PhotogalleryUrl")/s);
  
  if (photosMatch && photosMatch[1].length > 10) {
    found++;
    console.log(`\n[${found}] ${base.name}`);
    console.log('URL:', base.url);
    
    // Show raw JSON structure
    const photosStr = '[' + photosMatch[1] + ']';
    console.log('\nPhotos JSON (first 500 chars):');
    console.log(photosStr.substring(0, 500));
    
    // Extract individual photo URLs
    const urlMatches = photosMatch[1].match(/"Url":"([^"]*)"/g) || [];
    console.log(`\nFound ${urlMatches.length} photo URLs:`);
    urlMatches.slice(0, 3).forEach((url, i) => {
      const match = url.match(/"Url":"([^"]*)"/);
      if (match) {
        console.log(`  [${i+1}] ${match[1].substring(0, 80)}`);
      }
    });
    
    // Also check for PhotogalleryUrl
    const galleryMatch = html.match(/"PhotogalleryUrl":"([^"]*)"/);
    if (galleryMatch && galleryMatch[1]) {
      console.log(`\nPhotoGalleryUrl: ${galleryMatch[1]}`);
    }
  }
  
  await new Promise(r => setTimeout(r, 300));
}

console.log(`\n\n✅ Found structure for ${found} bases with photos`);
