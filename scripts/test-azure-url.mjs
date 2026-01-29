// Test if Azure CDN URL format works
const testUrl = "https://prd-images-zakladny-skaut.azureedge.net/api/images/thumb/1668080.jpg";

console.log("Testing image URL:", testUrl);
console.time("Fetch image");

try {
  const resp = await fetch(testUrl);
  console.timeEnd("Fetch image");
  console.log("Status:", resp.status);
  console.log("Content-Type:", resp.headers.get("content-type"));
  console.log("✓ URL works!");
} catch (err) {
  console.log("✗ Error:", err.message);
}
