"use client";

import { useEffect, useState } from "react";
import { useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";
import styles from "../app/page.module.css";

type PublicTroop = {
  _id: string;
  name: string;
  logo?: string | null;
};

function StaticBadges() {
  return (
    <>
      <img className={styles.badge} src="/bages/rover-bage.svg" alt="Roveři" />
      <img className={styles.badge} src="/bages/vedouci-bage.svg" alt="Vedoucí" />
      <img className={styles.badge} src="/bages/owner-bage.svg" alt="Vlastník" />
    </>
  );
}

const getInitials = (name?: string) => {
  if (!name?.trim()) return "O";

  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "O"
  );
};

export default function PublicTroopBadges() {
  const convex = useConvex();
  const [troops, setTroops] = useState<PublicTroop[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    void convex
      .query(api.troops.listPublic, {})
      .then((result) => {
        if (!cancelled) setTroops(result);
      })
      .catch(() => {
        // Public troop logos are optional; keep the landing page usable when
        // the Convex deployment is unavailable or temporarily disabled.
        if (!cancelled) setTroops([]);
      });

    return () => {
      cancelled = true;
    };
  }, [convex]);

  if (!troops?.length) return <StaticBadges />;

  return (
    <>
      {troops.slice(0, 4).map((troop) =>
        troop.logo ? (
          <img
            key={troop._id}
            className={styles.badge}
            src={troop.logo}
            alt={troop.name}
          />
        ) : (
          <div
            key={troop._id}
            className={`${styles.badge} ${styles.badgeInitials}`}
            aria-label={troop.name}
            title={troop.name}
          >
            {getInitials(troop.name)}
          </div>
        ),
      )}
      {troops.length > 4 && (
        <div className={styles.badgePlus}>+{troops.length - 4}</div>
      )}
    </>
  );
}
