"use client";

import { Id } from "../../../convex/_generated/dataModel";
import DopravaTicketPage from "./DopravaTicketPage";

export default function TransportTab(props: {
  tripId: Id<"trips">;
  trip: { location: string; startDate: string; endDate?: string | null };
}) {
  return <DopravaTicketPage {...props} />;
}

