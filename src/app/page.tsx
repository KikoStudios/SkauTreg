"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

export default function HomePage() {
  const troops = useQuery(api.troops.listPublic);
  const { isSignedIn } = useAuth();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--bg-app)",
        margin: 0,
        padding: 0,
      }}
    >
      {/* Navigation Bar */}
      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1.5rem 2rem",
          borderBottom: "2px solid var(--border-color)",
          backgroundColor: "white",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            fontSize: "1.5rem",
            fontWeight: "900",
          }}
        >
          <img
            src="/logo_skautreg.svg"
            alt="SkauTreg"
            style={{ height: "32px" }}
          />
        </div>

        <div style={{ display: "flex", gap: "1rem" }}>
          {!isSignedIn && (
            <>
              <Link href="/sign-in">
                <button
                  style={{
                    padding: "0.5rem 1.5rem",
                    backgroundColor: "white",
                    border: "2px solid var(--border-color)",
                    borderRadius: "6px",
                    fontWeight: "600",
                    cursor: "pointer",
                    fontSize: "0.95rem",
                    boxShadow: "1px 1px 0 0 #000",
                    transition: "all 0.15s",
                  }}
                  onMouseDown={(e) => {
                    (e.target as HTMLElement).style.boxShadow =
                      "0px 0px 0 0 #000";
                    (e.target as HTMLElement).style.transform =
                      "translate(1px, 1px)";
                  }}
                  onMouseUp={(e) => {
                    (e.target as HTMLElement).style.boxShadow =
                      "1px 1px 0 0 #000";
                    (e.target as HTMLElement).style.transform =
                      "translate(0, 0)";
                  }}
                >
                  Přihlásit se
                </button>
              </Link>
              <Link href="/sign-up">
                <button
                  style={{
                    padding: "0.5rem 1.5rem",
                    backgroundColor: "var(--color-primary)",
                    border: "2px solid var(--border-color)",
                    borderRadius: "6px",
                    fontWeight: "600",
                    cursor: "pointer",
                    fontSize: "0.95rem",
                    boxShadow: "2px 2px 0 0 #000",
                    transition: "all 0.15s",
                    color: "var(--color-primary-text)",
                  }}
                  onMouseDown={(e) => {
                    (e.target as HTMLElement).style.boxShadow =
                      "0px 0px 0 0 #000";
                    (e.target as HTMLElement).style.transform =
                      "translate(2px, 2px)";
                  }}
                  onMouseUp={(e) => {
                    (e.target as HTMLElement).style.boxShadow =
                      "2px 2px 0 0 #000";
                    (e.target as HTMLElement).style.transform =
                      "translate(0, 0)";
                  }}
                >
                  Zaregistrovat se
                </button>
              </Link>
            </>
          )}
          {isSignedIn && (
            <Link href="/home">
              <button
                style={{
                  padding: "0.5rem 1.5rem",
                  backgroundColor: "var(--color-primary)",
                  border: "2px solid var(--border-color)",
                  borderRadius: "6px",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontSize: "0.95rem",
                  boxShadow: "2px 2px 0 0 #000",
                  transition: "all 0.15s",
                  color: "var(--color-primary-text)",
                }}
                onMouseDown={(e) => {
                  (e.target as HTMLElement).style.boxShadow =
                    "0px 0px 0 0 #000";
                  (e.target as HTMLElement).style.transform =
                    "translate(2px, 2px)";
                }}
                onMouseUp={(e) => {
                  (e.target as HTMLElement).style.boxShadow =
                    "2px 2px 0 0 #000";
                  (e.target as HTMLElement).style.transform =
                    "translate(0, 0)";
                }}
              >
                Přejít na dashboard
              </button>
            </Link>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "4rem 2rem",
          textAlign: "center",
          maxWidth: "900px",
          margin: "0 auto",
          width: "100%",
        }}
      >
        {/* Main Heading */}
        <h1
          style={{
            fontSize: "3.5rem",
            fontWeight: "900",
            lineHeight: 1.1,
            marginBottom: "1rem",
            color: "var(--text-main)",
          }}
        >
          Ahoj! 👋
          <br />
          Toto je <span style={{ color: "var(--color-primary-hover)" }}>SkauTreg</span>
        </h1>

        {/* Tagline */}
        <p
          style={{
            fontSize: "1.3rem",
            color: "var(--text-muted)",
            marginBottom: "3rem",
            lineHeight: 1.6,
            maxWidth: "600px",
          }}
        >
          Jednoduchá aplikace pro správu skautských oddílů. Spravujte členy, plánujte výpravy a organizujte všechno na jednom místě.
        </p>

        {/* CTA Button */}
        {!isSignedIn && (
          <Link href="/sign-up">
            <button
              style={{
                padding: "1rem 2.5rem",
                backgroundColor: "var(--color-primary)",
                border: "2px solid var(--border-color)",
                borderRadius: "8px",
                fontWeight: "700",
                cursor: "pointer",
                fontSize: "1.1rem",
                boxShadow: "3px 3px 0 0 #000",
                transition: "all 0.15s",
                color: "var(--color-primary-text)",
              }}
              onMouseDown={(e) => {
                (e.target as HTMLElement).style.boxShadow = "0px 0px 0 0 #000";
                (e.target as HTMLElement).style.transform =
                  "translate(3px, 3px)";
              }}
              onMouseUp={(e) => {
                (e.target as HTMLElement).style.boxShadow = "3px 3px 0 0 #000";
                (e.target as HTMLElement).style.transform =
                  "translate(0, 0)";
              }}
            >
              Začít nyní
            </button>
          </Link>
        )}
      </div>

      {/* Troops Showcase Section */}
      <div
        style={{
          backgroundColor: "white",
          borderTop: "2px solid var(--border-color)",
          padding: "4rem 2rem",
        }}
      >
        <div
          style={{
            maxWidth: "1000px",
            margin: "0 auto",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <p
              style={{
                fontSize: "0.85rem",
                fontWeight: "700",
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                marginBottom: "1rem",
              }}
            >
              Oddíly v systému
            </p>
            <h2
              style={{
                fontSize: "2rem",
                fontWeight: "900",
                marginBottom: "1rem",
                color: "var(--text-main)",
              }}
            >
              Už je tady {troops?.length || 0} oddílů
            </h2>
          </div>

          {/* Troops Grid */}
          {troops && troops.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: "2rem",
                justifyItems: "center",
              }}
            >
              {troops.map((troop) => (
                <div
                  key={troop._id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "1rem",
                  }}
                >
                  {/* Logo Circle */}
                  <div
                    style={{
                      width: "120px",
                      height: "120px",
                      borderRadius: "50%",
                      border: "3px solid var(--border-color)",
                      backgroundColor:
                        troop.accentColor || "var(--color-primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "2px 2px 0 0 rgba(0,0,0,0.1)",
                      overflow: "hidden",
                    }}
                  >
                    {troop.logo ? (
                      <img
                        src={troop.logo}
                        alt={troop.name}
                        style={{
                          width: "90%",
                          height: "90%",
                          objectFit: "contain",
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: "700",
                          textAlign: "center",
                          color: "var(--text-main)",
                          padding: "1rem",
                        }}
                      >
                        {troop.name}
                      </span>
                    )}
                  </div>

                  {/* Troop Name */}
                  <div style={{ textAlign: "center" }}>
                    <p
                      style={{
                        fontWeight: "700",
                        fontSize: "0.95rem",
                        marginBottom: "0.25rem",
                        color: "var(--text-main)",
                      }}
                    >
                      {troop.name}
                    </p>
                    {troop.number && (
                      <p
                        style={{
                          fontSize: "0.8rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        č. {troop.number}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "3rem",
                color: "var(--text-muted)",
              }}
            >
              <p style={{ fontSize: "1.1rem" }}>
                Zatím zde nejsou žádné oddíly. Buďte první!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer
        style={{
          borderTop: "2px solid var(--border-color)",
          padding: "2rem",
          textAlign: "center",
          backgroundColor: "white",
          color: "var(--text-muted)",
          fontSize: "0.9rem",
        }}
      >
        <div style={{ marginBottom: "1rem" }}>
          <Link href="/privacy" style={{ margin: "0 1rem", textDecoration: "underline", color: "var(--text-muted)" }}>
            Ochrana soukromí
          </Link>
          <Link href="/tos" style={{ margin: "0 1rem", textDecoration: "underline", color: "var(--text-muted)" }}>
            Podmínky používání
          </Link>
        </div>
        <p>
          © 2024 SkauTreg. Vytvořeno s ❤️ pro skautské oddíly.
        </p>
      </footer>
    </div>
  );
}
