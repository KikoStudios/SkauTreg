"use client";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Button from "../../components/Button";
import Link from "next/link";
import { useState } from "react";
import Breadcrumbs from "../../components/Breadcrumbs";

const helpTopics = [
  {
    icon: "🏘️",
    title: "Správa Oddílů",
    description: "Vytvářejte a spravujte své skautské oddíly",
    keywords: ["oddíl", "vytvoření", "správa", "vedoucí"],
  },
  {
    icon: "👥",
    title: "Správa Členů",
    description: "Přidávejte členy, upravujte profily a spravujte role",
    keywords: ["člen", "profil", "přidání", "smazání"],
  },
  {
    icon: "🎒",
    title: "Správa Výprav",
    description: "Plánujte a organizujte výpravy a tábory",
    keywords: ["výprava", "tábor", "plánování", "datum"],
  },
  {
    icon: "📋",
    title: "Formuláře & Otázky",
    description: "Přidávejte vlastní otázky a formuláře k výpravám",
    keywords: ["formulář", "otázka", "textové pole", "checkbox"],
  },
  {
    icon: "📊",
    title: "Sledování Účastníků",
    description: "Sledujte přihlášky a odpovědi na otázky",
    keywords: ["účastník", "přihláška", "odpověď", "export"],
  },
  {
    icon: "💡",
    title: "Tipy & Triky",
    description: "Užitečné tipy pro efektivní řízení oddílu",
    keywords: ["tip", "trik", "optimalizace", "komunikace"],
  },
  {
    icon: "🔐",
    title: "Bezpečnost & Přihlášení",
    description: "Hesla, přihlašování a ochrana účtu",
    keywords: ["heslo", "přihlášení", "obnova", "bezpečnost"],
  },
  {
    icon: "⚙️",
    title: "Nastavení & Profil",
    description: "Upravujte svůj profil a předvolby aplikace",
    keywords: ["nastavení", "profil", "preference", "jazyk"],
  },
];

export default function Home() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  const troops = useQuery(api.troops.getByUser);
  const trips = useQuery(
    api.trips.list,
    troops && troops.length > 0 ? { troopId: troops[0]._id } : "skip",
  );
  const members = useQuery(
    api.members.list,
    troops && troops.length > 0 ? { troopId: troops[0]._id } : "skip",
  );

  const filteredTopics = helpTopics.filter(
    (topic) =>
      topic.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      topic.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      topic.keywords.some((k) =>
        k.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
  );

  // Format date helper
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d}. ${m}. ${y}`;
  };

  return (
    <div>
      {/* Header */}
      <div className="headingContainer">
        <Breadcrumbs />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "900", margin: 0 }}>
            Přehled
          </h1>
          <Link href="/troop">
            <Button variant="outline">Spravovat oddíly</Button>
          </Link>
        </div>
      </div>

      <div className="dashboardContent">
        {/* Stats Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
          <div
            style={{
            backgroundColor: "white",
            border: "4px solid #000",
            borderRadius: "12px",
            padding: "1.5rem",
            boxShadow: "6px 6px 0 0 #000",
            transition: "all 0.15s",
            cursor: "default",
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = "translate(3px, 3px)";
            e.currentTarget.style.boxShadow = "2px 2px 0 0 #000";
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = "translate(0, 0)";
            e.currentTarget.style.boxShadow = "6px 6px 0 0 #000";
          }}
        >
          <div style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>🏘️</div>
          <div
            style={{
              fontSize: "0.85rem",
              color: "var(--text-muted)",
              fontWeight: "600",
              marginBottom: "0.75rem",
            }}
          >
            Vaše Oddíly
          </div>
          <div style={{ fontSize: "2.5rem", fontWeight: "900" }}>
            {troops?.length || 0}
          </div>
        </div>
        <div
          style={{
            backgroundColor: "white",
            border: "4px solid #000",
            borderRadius: "12px",
            padding: "1.5rem",
            boxShadow: "6px 6px 0 0 #000",
            transition: "all 0.15s",
            cursor: "default",
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = "translate(3px, 3px)";
            e.currentTarget.style.boxShadow = "2px 2px 0 0 #000";
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = "translate(0, 0)";
            e.currentTarget.style.boxShadow = "6px 6px 0 0 #000";
          }}
        >
          <div style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>🎒</div>
          <div
            style={{
              fontSize: "0.85rem",
              color: "var(--text-muted)",
              fontWeight: "600",
              marginBottom: "0.75rem",
            }}
          >
            Výpravy
          </div>
          <div style={{ fontSize: "2.5rem", fontWeight: "900" }}>
            {trips?.length || 0}
          </div>
        </div>
        <div
          style={{
            backgroundColor: "white",
            border: "4px solid #000",
            borderRadius: "12px",
            padding: "1.5rem",
            boxShadow: "6px 6px 0 0 #000",
            transition: "all 0.15s",
            cursor: "default",
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = "translate(3px, 3px)";
            e.currentTarget.style.boxShadow = "2px 2px 0 0 #000";
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = "translate(0, 0)";
            e.currentTarget.style.boxShadow = "6px 6px 0 0 #000";
          }}
        >
          <div style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>👥</div>
          <div
            style={{
              fontSize: "0.85rem",
              color: "var(--text-muted)",
              fontWeight: "600",
              marginBottom: "0.75rem",
            }}
          >
            Členové
          </div>
          <div style={{ fontSize: "2.5rem", fontWeight: "900" }}>
            {members?.length || 0}
          </div>
        </div>
      </div>

      {/* Recent Trips */}
      <div style={{ marginBottom: "2rem" }}>
        <h2
          style={{
            fontSize: "1.125rem",
            fontWeight: "900",
            marginBottom: "1rem",
          }}
        >
          Nejbližší výpravy
        </h2>
        {trips && trips.length > 0 ? (
          <div
            style={{
              backgroundColor: "white",
              border: "4px solid #000",
              borderRadius: "12px",
              boxShadow: "6px 6px 0 0 #000",
              overflow: "hidden",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr
                  style={{
                    borderBottom: "4px solid #000",
                    backgroundColor: "#86efac",
                  }}
                >
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "left",
                      fontWeight: "700",
                    }}
                  >
                    Název
                  </th>
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "left",
                      fontWeight: "700",
                    }}
                  >
                    Místo
                  </th>
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "left",
                      fontWeight: "700",
                    }}
                  >
                    Datum
                  </th>
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "left",
                      fontWeight: "700",
                    }}
                  >
                    Stav
                  </th>
                </tr>
              </thead>
              <tbody>
                {trips.slice(0, 5).map((trip, idx) => (
                  <tr
                    key={trip._id}
                    style={{
                      borderBottom:
                        idx === Math.min(4, trips.length - 1)
                          ? "none"
                          : "4px solid #000",
                    }}
                  >
                    <td style={{ padding: "1rem", fontWeight: "700" }}>
                      <Link
                        href={`/trips/${trip._id}`}
                        style={{
                          textDecoration: "underline",
                          color: "inherit",
                        }}
                      >
                        {trip.name}
                      </Link>
                    </td>
                    <td style={{ padding: "1rem" }}>{trip.location}</td>
                    <td
                      style={{
                        padding: "1rem",
                        fontSize: "0.9rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      {formatDate(trip.startDate)}
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <span
                        style={{
                          display: "inline-block",
                          backgroundColor: "#86efac",
                          border: "3px solid #000",
                          borderRadius: "8px",
                          padding: "0.25rem 0.75rem",
                          fontWeight: "800",
                          fontSize: "0.85rem",
                          boxShadow: "4px 4px 0 0 #000",
                        }}
                      >
                        Plánuje se
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: "white",
              border: "4px solid #000",
              borderRadius: "12px",
              padding: "2rem",
              textAlign: "center",
              color: "var(--text-muted)",
              boxShadow: "6px 6px 0 0 #000",
            }}
          >
            Žádné výpravy.{" "}
            <Link href="/trips">
              <Button
                variant="outline"
                style={{ display: "inline-block", marginTop: "1rem" }}
              >
                Vytvořit výpravu
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Help Center */}
      <div>
        <h2
          style={{
            fontSize: "1.125rem",
            fontWeight: "900",
            marginBottom: "1rem",
          }}
        >
          Nápověda & Tipy 💡
        </h2>

        {!showHelp ? (
          <div
            onClick={() => setShowHelp(true)}
            style={{
              backgroundColor: "#86efac",
              border: "4px solid #000",
              borderRadius: "12px",
              padding: "2rem",
              boxShadow: "6px 6px 0 0 #000",
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = "translate(4px, 4px)";
              e.currentTarget.style.boxShadow = "2px 2px 0 0 #000";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "translate(0, 0)";
              e.currentTarget.style.boxShadow = "6px 6px 0 0 #000";
            }}
          >
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>
              ❓
            </div>
            <div style={{ fontSize: "1.1rem", fontWeight: "700" }}>
              Potřebujete pomoc?
            </div>
            <div
              style={{
                fontSize: "0.9rem",
                color: "var(--text-main)",
                marginTop: "0.75rem",
              }}
            >
              Klikněte pro otevření hledání →
            </div>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: "white",
              border: "4px solid #000",
              borderRadius: "12px",
              padding: "1.5rem",
              boxShadow: "6px 6px 0 0 #000",
            }}
          >
            {/* Search Input */}
            <div style={{ marginBottom: "1.5rem" }}>
              <input
                type="text"
                placeholder="🔍 Hledat (např: výprava, člen, heslo)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  border: "4px solid #000",
                  borderRadius: "10px",
                  fontSize: "0.95rem",
                  boxShadow: "6px 6px 0 0 #000",
                  fontWeight: "600",
                  boxSizing: "border-box",
                  transition: "all 0.15s",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.boxShadow = "6px 6px 0 0 #000";
                }}
              />
            </div>

            {/* Search Results */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "1rem",
                marginBottom: "1rem",
              }}
            >
              {filteredTopics.length > 0 ? (
                filteredTopics.map((topic, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: "#f9f9f9",
                      border: "4px solid #000",
                      borderRadius: "12px",
                      padding: "1rem",
                      transition: "all 0.15s",
                      cursor: "default",
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = "#f0f0f0";
                      e.currentTarget.style.borderColor = "#86efac";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = "#f9f9f9";
                      e.currentTarget.style.borderColor = "var(--border-color)";
                    }}
                  >
                    <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
                      {topic.icon}
                    </div>
                    <h4
                      style={{
                        fontSize: "0.95rem",
                        fontWeight: "700",
                        marginBottom: "0.25rem",
                      }}
                    >
                      {topic.title}
                    </h4>
                    <p
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--text-muted)",
                        margin: 0,
                        lineHeight: "1.4",
                      }}
                    >
                      {topic.description}
                    </p>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    gridColumn: "1 / -1",
                    textAlign: "center",
                    padding: "1rem",
                    color: "var(--text-muted)",
                  }}
                >
                  <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
                    🔍
                  </div>
                  <p>Žádné výsledky na "{searchTerm}"</p>
                </div>
              )}
            </div>

            {/* Close Button */}
            <div
              style={{
                textAlign: "center",
                marginTop: "1rem",
                paddingTop: "1rem",
                borderTop: "4px solid #000",
              }}
            >
              <button
                onClick={() => {
                  setShowHelp(false);
                  setSearchTerm("");
                }}
                style={{
                  backgroundColor: "white",
                  border: "4px solid #000",
                  borderRadius: "10px",
                  padding: "0.5rem 1.5rem",
                  fontWeight: "700",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  boxShadow: "6px 6px 0 0 #000",
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = "translate(3px, 3px)";
                  e.currentTarget.style.boxShadow = "2px 2px 0 0 #000";
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = "translate(0, 0)";
                  e.currentTarget.style.boxShadow = "6px 6px 0 0 #000";
                }}
              >
                Zavřít
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);
}
