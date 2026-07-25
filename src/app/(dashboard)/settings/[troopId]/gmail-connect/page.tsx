"use client";

import { useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";

export default function GmailConnectPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const troopId = typeof params?.troopId === "string" ? params.troopId : "";
  const returnAction = searchParams?.get("returnAction") === "groups-import" ? "groups-import" : "";

  useEffect(() => {
    if (!troopId) {
      return;
    }
    const query = new URLSearchParams({ troopId });
    if (returnAction) query.set("returnAction", returnAction);
    window.location.replace(`/api/auth/gmail/start?${query.toString()}`);
  }, [troopId, returnAction]);

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-xl font-semibold mb-2">Přesměrování na Google</h1>
      <p className="text-sm text-gray-600">Ověřujeme oprávnění a připravujeme bezpečné propojení…</p>
      {!troopId && <p role="alert">Chybí identifikace oddílu.</p>}
    </main>
  );
}
