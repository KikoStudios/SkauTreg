async function test() {
  const url = "https://zakladny.skaut.cz/chata-v-plasich";
  console.log("Fetching:", url);
  
  const resp = await fetch(url);
  const html = await resp.text();
  
  // Extract plain text
  const lines = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h\d|section)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .split(/\n+/)
    .map(l => l.trim())
    .filter(Boolean);

  console.log("\n📄 PAGE CONTENT:");
  lines.forEach((line, i) => {
    if (i < 200) console.log(`${i}: ${line}`);
  });
}

test().catch(console.error);
