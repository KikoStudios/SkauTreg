"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import styles from "./page.module.css";

export default function HomePage() {
  const { isSignedIn } = useAuth();
  const strediskoName =
    process.env.NEXT_PUBLIC_STREDISKO_NAME || "Středisko Bratří Mašinů";
  const dashboardHref = "/home";
  
  // Fetch user's troops to display their logos
  const troops = useQuery(api.troops.listPublic);

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;600;700;800;900&display=swap');
        
        body {
          margin: 0;
          overflow-x: hidden;
        }
      `}</style>

      <div className={styles.page}>
        <header className={styles.topbar}>
          <div className={styles.org}>{strediskoName}</div>
          <img className={styles.brand} src="/logo_skautreg.svg" alt="skaut reg" />
          <div className={styles.headerActions}>
            {isSignedIn ? (
              <Link href={dashboardHref} className={styles.dashboard}>
                <span className={styles.arrow}>➜</span>
                <span>Dashboard</span>
              </Link>
            ) : (
              <>
                <Link href="/sign-in" className={styles.authButton}>
                  Login
                </Link>
                <Link href="/sign-up" className={styles.authButtonPrimary}>
                  Register
                </Link>
              </>
            )}
          </div>
        </header>

        <main className={styles.hero}>
          <div className={styles.heroTitle}>
            <img className={styles.hand} src="/illustrations/hand-wawy.png" alt="" />
            <span className={styles.ahoj}>Ahoj</span>
          </div>
          <div className={styles.heroSubtitle}>vítej ve skautregu pro středisko</div>

          <div className={styles.heroName}>{strediskoName}</div>

          <p className={styles.heroText}>
            Kompletní systém pro správu skautských oddílů. Spravujte členy,
            plánujte výpravy, komunikujte pomocí integrovaného mailového systému (SkautReg Mailing System)
            a organizujte všechno na jednom místě.
          </p>

          <div className={styles.heroBadges} aria-hidden="true">
            {troops && troops.length > 0 ? (
              troops.map((troop) => (
                <img 
                  key={troop._id} 
                  className={styles.badge} 
                  src={troop.logo || "/bages/rover-bage.svg"} 
                  alt={troop.name} 
                />
              ))
            ) : null}
          </div>
        </main>

        <div className={styles.flowerField} aria-hidden="true">
          <img className={`${styles.flower} ${styles.flowerTop} ${styles.field1}`} src="/elements/kruh_maly.svg" alt="" />
          <img className={`${styles.flower} ${styles.flowerTop} ${styles.flowerRight} ${styles.field2}`} src="/elements/kruh_velky.svg" alt="" />
          <img className={`${styles.flower} ${styles.flowerTop} ${styles.flowerBottom} ${styles.field3}`} src="/elements/kruh_maly.svg" alt="" />
        </div>

        <footer className={styles.footer}>
          <div className={styles.footerContent}>
            <Link href="/privacy" className={styles.footerLink}>Zásady ochrany osobních údajů</Link>
            <span className={styles.footerDivider}>•</span>
            <Link href="/tos" className={styles.footerLink}>Podmínky použití</Link>
          </div>
          <div className={styles.footerCopyright}>
            © 2026 SkautReg - Open Source Scout Management System
          </div>
        </footer>
      </div>
    </>
  );
}
