"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import RadyTab from "../../../../../components/RadyTab";
import TroopWorkspaceHeader from "../../../../../components/TroopWorkspaceHeader";
import styles from "./MeetingsPage.module.css";

export default function MeetingsPage() {
  const params = useParams();
  const troopId = params.troopId as Id<"troops">;
  const troop = useQuery(api.troops.getById, { id: troopId });

  if (!troop) return <div className={styles.loading}>Načítám pracovní prostor rad…</div>;

  return (
    <div className={styles.page}>
      <TroopWorkspaceHeader troopId={troopId} troopName={troop.name} current="meetings" title="Rady a zápisy" description="Jedno místo pro porady, dokumentaci výprav a navazující rozhodnutí." note="Dokumentaci spojenou s konkrétní výpravou najdete také přímo v jejím pracovním prostoru. Samostatné rady používejte pro oddílová témata." />
      <section className={styles.content}>
        <RadyTab troopId={troopId} />
      </section>
    </div>
  );
}
