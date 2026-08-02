"use client";

import { Id } from "../../../convex/_generated/dataModel";
import DopravaTicketPage from "./DopravaTicketPage";
import TripTicketSharePanel from "./TripTicketSharePanel";

export default function TransportTab(props: {
  tripId: Id<"trips">;
  trip: { location: string; startDate: string; endDate?: string | null };
}) {
  return <>
    <TripTicketSharePanel tripId={props.tripId} defaultExpiry={props.trip.endDate || props.trip.startDate} />
    <DopravaTicketPage {...props} />
  </>;
}

