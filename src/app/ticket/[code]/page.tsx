"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useParams } from "next/navigation";

export default function PublicTicketPage() {
  const params = useParams();
  const code = (params.code as string | undefined)?.toUpperCase() || "";

  const ticket = useQuery(api.publicTickets.getByShareSlug, code ? { shareSlug: code } : "skip");

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/ticket/${encodeURIComponent(code)}`;
  }, [code]);

  if (ticket === undefined) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontWeight: 900 }}>
        Načítám…
      </div>
    );
  }

  if (!ticket) {
    return (
      <div style={{ minHeight: "100vh", padding: "2rem", display: "grid", placeItems: "center" }}>
        <div
          style={{
            width: "min(560px, 95vw)",
            background: "white",
            border: "3px solid #000",
            borderRadius: "12px",
            boxShadow: "6px 6px 0 0 #000",
            padding: "1.5rem",
            textAlign: "center",
          }}
        >
          <div style={{ fontWeight: 900, fontSize: "1.4rem" }}>Odkaz na jízdenku není platný</div>
          <div style={{ marginTop: "0.5rem", fontWeight: 800, color: "#444" }}>
            Požádej organizátora o nový kód.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", padding: "1.25rem", display: "grid", placeItems: "center", background: "#f4f4f5" }}>
      <div
        style={{
          width: "min(680px, 96vw)",
          background: "white",
          border: "3px solid #000",
          borderRadius: "12px",
          boxShadow: "8px 8px 0 0 #000",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "1.25rem 1.25rem 0.75rem 1.25rem", borderBottom: "3px solid #000" }}>
          <div style={{ fontWeight: 900, fontSize: "1.5rem" }}>Jízdenka</div>
          <div style={{ fontWeight: 900, color: "#444", marginTop: "0.25rem" }}>{ticket.name}</div>
        </div>

        <div style={{ padding: "1.25rem", display: "grid", gap: "1rem" }}>
          <div style={{ display: "grid", placeItems: "center" }}>
            {shareUrl ? (
              <img
                src={`/api/qr?size=260&data=${encodeURIComponent(shareUrl)}`}
                alt="QR"
                style={{ width: 260, height: 260, border: "3px solid #000", borderRadius: "12px" }}
              />
            ) : null}
            <div style={{ marginTop: "0.75rem", fontWeight: 900, fontSize: "1.35rem", letterSpacing: "0.06em" }}>
              {code}
            </div>
            <div style={{ marginTop: "0.25rem", fontWeight: 800, color: "#444" }}>
              Naskenuj QR nebo ukaž kód
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
            {ticket.url && (
              <a
                href={ticket.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: "0.9rem 1.2rem",
                  background: "#86efac",
                  border: "3px solid #000",
                  borderRadius: "10px",
                  fontWeight: 900,
                  textDecoration: "none",
                  color: "#000",
                  boxShadow: "4px 4px 0 0 #000",
                  textTransform: "uppercase",
                }}
              >
                Otevřít soubor
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

