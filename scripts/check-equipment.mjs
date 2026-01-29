const url = "https://zakladny.skaut.cz/318-klubovna-41-bo-kampelikova-brno";

const resp = await fetch(url);
const html = await resp.text();

const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
const nextData = JSON.parse(match[1]);
const detail = nextData.props?.pageProps?.detail;

console.log("OccupationEquipment:");
console.log(JSON.stringify(detail.OccupationEquipment, null, 2));
