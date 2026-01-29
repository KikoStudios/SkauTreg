const url = "https://zakladny.skaut.cz/318-klubovna-41-bo-kampelikova-brno";

const resp = await fetch(url);
const html = await resp.text();

// Look for different patterns
console.log("Looking for data patterns...\n");

if (html.includes("pageProps")) {
  console.log("✓ Found 'pageProps'");
  const match = html.match(/pageProps":\s*({[\s\S]*?})\s*}\s*<\/script>/);
  if (match) {
    console.log("✓ Regex matched");
    console.log("Length:", match[1].length);
  } else {
    console.log("✗ Regex failed");
    // Show context around pageProps
    const idx = html.indexOf("pageProps");
    console.log("\nContext around 'pageProps':");
    console.log(html.substring(Math.max(0, idx - 100), idx + 200));
  }
} else {
  console.log("✗ 'pageProps' not found");
}

if (html.includes('__NEXT_DATA__')) {
  console.log("\n✓ Found '__NEXT_DATA__' (Next.js data)");
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (match) {
    console.log("✓ Regex matched");
    const json = JSON.parse(match[1]);
    console.log("Keys:", Object.keys(json).join(", "));
    if (json.props?.pageProps?.detail) {
      console.log("✓ Found detail data");
      console.log("Detail keys:", Object.keys(json.props.pageProps.detail).slice(0, 10).join(", "));
    }
  }
}
