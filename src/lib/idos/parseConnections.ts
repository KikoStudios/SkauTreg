import * as cheerio from "cheerio";

export type Stop = {
  time: string;
  station: string;
  platform?: string;
};

export type Segment = {
  vehicleName: string;
  vehicleType: string;
  departureTime: string;
  arrivalTime: string;
  departureStation: string;
  arrivalStation: string;
  stops: Stop[];
};

export type IdosTrip = {
  departureTime: string;
  arrivalTime: string;
  duration: string;
  distance: string;
  transferCount: number;
  price: string;
  priceAdult?: string;
  priceChild?: string;
  priceIsic?: string;
  segments: Segment[];
  shareLink?: string;
  detailLink?: string;
};

function getVehicleType(vehicleName: string): string {
  const name = vehicleName.toLowerCase();

  if (name.startsWith("bus ")) return "Bus";
  if (name.startsWith("trol ")) return "Trolleybus";
  if (name.startsWith("tram ")) return "Tram";
  if (name.includes("metro")) return "Metro";

  return "Train";
}

export function parseConnections(html: string): IdosTrip[] {
  const trips: IdosTrip[] = [];

  try {
    const $ = cheerio.load(html);
    const connectionElements = $("div.box.connection");

    if (connectionElements.length === 0) {
      return [];
    }

    connectionElements.each((_idx, el) => {
      const $connection = $(el);

      const timeElements = $connection.find("p.time");
      const depTime = timeElements.first().text().trim();
      const arrTime = timeElements.last().text().trim();

      const durationText = $connection.find("p.total strong").text().trim();

      const priceMatch = $connection.text().match(/(\d[\d\s]*)\s*(?:KÄ|Kč)/);
      const price = priceMatch ? priceMatch[1].trim().replace(/\s+/g, " ") + " Kč" : "N/A";

      const segments: Segment[] = [];

      $connection.find("h3 span").each((_segIdx, vehicleEl) => {
        const $vehicleSpan = $(vehicleEl);
        const vehicleName = $vehicleSpan.text().trim();

        if (!vehicleName) return;

        const $journeyContainer = $vehicleSpan.closest("div.outside-of-popup, div.journey");

        const $segmentTimes = $journeyContainer.find("p.time");
        const segDepTime = $segmentTimes.first().text().trim();
        const segArrTime = $segmentTimes.last().text().trim();

        const $stationNames = $journeyContainer.find("strong.name");
        const depStation = $stationNames.first().text().trim();
        const arrStation = $stationNames.last().text().trim();

        segments.push({
          vehicleName,
          vehicleType: getVehicleType(vehicleName),
          departureTime: segDepTime,
          arrivalTime: segArrTime,
          departureStation: depStation,
          arrivalStation: arrStation,
          stops: [],
        });
      });

      if (segments.length === 0) return;

      const shareUrl = $connection.attr("data-share-url") || "";
      const detailLink = $connection.find("a.title").first().attr("href") || undefined;

      trips.push({
        departureTime: depTime,
        arrivalTime: arrTime,
        duration: durationText,
        distance: "N/A",
        transferCount: segments.length - 1,
        price,
        segments,
        shareLink: shareUrl || undefined,
        detailLink,
      });
    });

    return trips;
  } catch (error) {
    console.error("Error parsing IDOS HTML:", error);
    return [];
  }
}
