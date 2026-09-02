"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import DocumentsWorkspace from "../../../../../components/documents/DocumentsWorkspace";
import TroopWorkspaceHeader from "../../../../../components/TroopWorkspaceHeader";
import FeatureGate from "../../../../../components/FeatureGate";

export default function DocumentsPage() {
  const params = useParams();
  const troopId = params.troopId as Id<"troops">;
  const troop = useQuery(api.troops.getById, { id: troopId });
  if (troop === undefined) return <div style={{ padding: "2rem" }}>Načítám Dokumenty…</div>;
  if (troop === null) return <div style={{ padding: "2rem" }}>Oddíl nebyl nalezen.</div>;
  return <FeatureGate feature="collaborativeMeetings"><TroopWorkspaceHeader troopId={troopId} troopName={troop.name} current="meetings" title="Dokumenty" description="Radit se, plánovat, rozhodovat a dotahovat úkoly." /><DocumentsWorkspace troopId={troopId} /></FeatureGate>;
}
