"use client";

import { useEffect } from "react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../../convex/_generated/api";

export default function LegacyRadyRedirect() {
  const router = useRouter();
  const troops = useQuery(api.troops.getByUser);
  useEffect(() => {
    if (troops?.[0]) router.replace(`/troop/${troops[0]._id}/documents`);
  }, [router, troops]);
  if (troops === undefined) return <div style={{ padding: "2rem", color: "#777" }}>Otevírám Dokumenty…</div>;
  if (troops.length === 0) return <div style={{ padding: "2rem" }}>Nejdřív vytvořte Oddíl.</div>;
  return <div style={{ padding: "2rem", color: "#777" }}>Otevírám Dokumenty…</div>;
}
