async function inspectBase(zakladnyId) {
  const url = `https://zakladny.skaut.cz/detail/${zakladnyId}`;
  
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "SkautREG-inspector" },
    });
    
    if (!resp.ok) {
      console.error(`Failed to fetch: ${resp.status}`);
      return;
    }
    
    const html = await resp.text();
    const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    
    if (!match) {
      console.error("Could not find __NEXT_DATA__");
      return;
    }
    
    const nextData = JSON.parse(match[1]);
    const detail = nextData.props?.pageProps?.detail;
    
    if (!detail) {
      console.error("Could not find detail");
      return;
    }
    
    console.log("Available fields in detail object:");
    console.log(Object.keys(detail).sort().join('\n'));
    
    console.log("\n\n=== CONDITION-RELATED FIELDS ===");
    const conditionFields = Object.keys(detail).filter(k => 
      k.toLowerCase().includes('condition') || 
      k.toLowerCase().includes('accessibility') ||
      k.toLowerCase().includes('heating') ||
      k.toLowerCase().includes('water') ||
      k.toLowerCase().includes('toilet') ||
      k.toLowerCase().includes('kitchen') ||
      k.toLowerCase().includes('bedding') ||
      k.toLowerCase().includes('restriction')
    );
    
    if (conditionFields.length > 0) {
      conditionFields.forEach(field => {
        console.log(`${field}: ${JSON.stringify(detail[field]).substring(0, 200)}`);
      });
    } else {
      console.log("No condition-related fields found");
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

// Test with first base
inspectBase(41);
