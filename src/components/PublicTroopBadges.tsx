"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import styles from "../app/page.module.css";

function StaticBadges() {
  return (
    <>
      <img className={styles.badge} src="/bages/rover-bage.svg" alt="Roveři" />
      <img className={styles.badge} src="/bages/vedouci-bage.svg" alt="Vedoucí" />
      <img className={styles.badge} src="/bages/owner-bage.svg" alt="Vlastník" />
    </>
  );
}

class PublicTroopBadgesBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Public troop badges] Convex data unavailable:", error, info);
  }

  render() {
    return this.state.failed ? <StaticBadges /> : this.props.children;
  }
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

function DynamicPublicTroopBadges() {
  const troops = useQuery(api.troops.listPublic);

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

export default function PublicTroopBadges() {
  return (
    <PublicTroopBadgesBoundary>
      <DynamicPublicTroopBadges />
    </PublicTroopBadgesBoundary>
  );
}
