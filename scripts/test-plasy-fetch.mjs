async function test() {
  const bases = await (await fetch("https://zakladny.skaut.cz/api/search")).json();
  const plasy = bases.Items.find(b => b.DisplayName?.includes("Plasy"));
  
  if (!plasy) {
    console.log("Not found. First 5 bases:");
    console.log(bases.Items.slice(0, 5).map(b => ({ name: b.DisplayName, slug: b.Slug })));
    process.exit(1);
  }

  console.log("Found Plasy base:");
  console.log("Name:", plasy.DisplayName);
  console.log("Slug:", plasy.Slug);
  console.log("URL:", `https://zakladny.skaut.cz/${plasy.Slug}`);
  
  const resp = await fetch(`https://zakladny.skaut.cz/${plasy.Slug}`);
  console.log("Status:", resp.status);
  
  if (resp.ok) {
    const html = await resp.text();
    const lines = html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h\d|section)>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .split(/\n+/)
      .map(l => l.trim())
      .filter(Boolean);
    
    console.log("\n--- PAGE CONTENT (first 200 lines) ---");
    lines.slice(0, 200).forEach((line, i) => {
      console.log(`${i}: ${line}`);
    });
  }
}

test().catch(console.error);
