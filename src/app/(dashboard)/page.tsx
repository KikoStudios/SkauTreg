"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import {
  ChartNoAxesColumn,
  ClipboardList,
  HelpCircle,
  House,
  Lightbulb,
  Search,
  Settings,
  ShieldCheck,
  Tent,
  Users,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import {
  Button,
  Card,
  EmptyStateCard,
  Field,
  PageActions,
  PageContent,
  PageHeader,
  PageTitle,
  StatCard,
  TableScroller,
  TextInput,
} from "../../components/ui";

const helpTopics = [
  {
    Icon: House,
    title: "Správa oddílů",
    description: "Vytvářejte a spravujte své skautské oddíly",
    keywords: ["oddíl", "vytvoření", "správa", "vedoucí"],
  },
  {
    Icon: Users,
    title: "Správa členů",
    description: "Přidávejte členy, upravujte profily a spravujte role",
    keywords: ["člen", "profil", "přidání", "smazání"],
  },
  {
    Icon: Tent,
    title: "Správa výprav",
    description: "Plánujte a organizujte výpravy a tábory",
    keywords: ["výprava", "tábor", "plánování", "datum"],
  },
  {
    Icon: ClipboardList,
    title: "Formuláře a otázky",
    description: "Přidávejte vlastní otázky a formuláře k výpravám",
    keywords: ["formulář", "otázka", "textové pole", "checkbox"],
  },
  {
    Icon: ChartNoAxesColumn,
    title: "Sledování účastníků",
    description: "Sledujte přihlášky a odpovědi na otázky",
    keywords: ["účastník", "přihláška", "odpověď", "export"],
  },
  {
    Icon: Lightbulb,
    title: "Tipy a triky",
    description: "Užitečné tipy pro efektivní řízení oddílu",
    keywords: ["tip", "trik", "optimalizace", "komunikace"],
  },
  {
    Icon: ShieldCheck,
    title: "Bezpečnost a přihlášení",
    description: "Hesla, přihlašování a ochrana účtu",
    keywords: ["heslo", "přihlášení", "obnova", "bezpečnost"],
  },
  {
    Icon: Settings,
    title: "Nastavení a profil",
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
  const dashboardDataReady = troops !== undefined && (troops.length === 0 || (trips !== undefined && members !== undefined));

  useEffect(() => {
    if (dashboardDataReady) window.dispatchEvent(new Event("skautreg:dashboard-ready"));
  }, [dashboardDataReady]);

  const filteredTopics = helpTopics.filter(
    (topic) =>
      topic.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      topic.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      topic.keywords.some((keyword) => keyword.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d}. ${m}. ${y}`;
  };

  return (
    <div>
      <PageHeader>
        <PageTitle>Přehled</PageTitle>
        <PageActions>
          <Button href="/troop" variant="secondary">
            Spravovat oddíly
          </Button>
        </PageActions>
      </PageHeader>

      <PageContent>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          <StatCard href="/troop" label="Vaše oddíly" value={troops?.length || 0} icon={<House size={22} strokeWidth={3} />} />
          <StatCard href="/trips" label="Výpravy" value={trips?.length || 0} icon={<Tent size={22} strokeWidth={3} />} />
          <StatCard href="/members" label="Členové" value={members?.length || 0} icon={<Users size={22} strokeWidth={3} />} />
        </div>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: "900", marginBottom: "1rem" }}>Nejbližší výpravy</h2>
          {trips && trips.length > 0 ? (
            <Card padding="none" style={{ overflow: "hidden" }}>
              <TableScroller>
                <table style={{ width: "100%", minWidth: "720px", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "var(--border-ui)", backgroundColor: "var(--color-primary)" }}>
                      <th style={tableHeadStyle}>Název</th>
                      <th style={tableHeadStyle}>Místo</th>
                      <th style={tableHeadStyle}>Datum</th>
                      <th style={tableHeadStyle}>Stav</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trips.slice(0, 5).map((trip, idx) => (
                      <tr key={trip._id} style={{ borderBottom: idx === Math.min(4, trips.length - 1) ? "none" : "var(--border-ui)" }}>
                        <td style={{ padding: "1rem", fontWeight: "800" }}>
                          <Link href={`/trips/${trip._id}`} style={{ color: "inherit", textDecoration: "underline" }}>
                            {trip.name}
                          </Link>
                        </td>
                        <td style={{ padding: "1rem" }}>{trip.location}</td>
                        <td style={{ padding: "1rem", fontSize: "0.9rem", color: "var(--text-muted)" }}>{formatDate(trip.startDate)}</td>
                        <td style={{ padding: "1rem" }}>
                          <span style={statusBadgeStyle}>Plánuje se</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroller>
            </Card>
          ) : (
            <EmptyStateCard
              title="Žádné výpravy"
              description="Zatím tu nejsou žádné nejbližší výpravy."
              action={
                <Button href="/trips" variant="secondary">
                  Vytvořit výpravu
                </Button>
              }
            />
          )}
        </section>

        <section>
          <h2 style={{ fontSize: "1.125rem", fontWeight: "900", marginBottom: "1rem" }}>Nápověda a tipy</h2>

          {!showHelp ? (
            <Card padding="lg" interactive onClick={() => setShowHelp(true)} style={{ backgroundColor: "var(--color-primary)", textAlign: "center" }}>
              <HelpCircle size={40} strokeWidth={3} style={{ marginBottom: "0.75rem" }} />
              <div style={{ fontSize: "1.1rem", fontWeight: "900", marginBottom: "0.75rem" }}>Potřebujete pomoc?</div>
              <Button type="button" variant="secondary" onClick={() => setShowHelp(true)}>
                Otevřít nápovědu
              </Button>
            </Card>
          ) : (
            <Card padding="lg">
              <Field style={{ marginBottom: "1.5rem" }}>
                <TextInput
                  type="text"
                  placeholder="Hledat: výprava, člen, heslo..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  autoFocus
                />
              </Field>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
                {filteredTopics.length > 0 ? (
                  filteredTopics.map(({ Icon, ...topic }) => (
                    <Card key={topic.title} padding="sm">
                      <Icon size={28} strokeWidth={3} style={{ marginBottom: "0.5rem" }} />
                      <h4 style={{ fontSize: "0.95rem", fontWeight: "900", marginBottom: "0.25rem" }}>{topic.title}</h4>
                      <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0, lineHeight: "1.4", fontWeight: 600 }}>
                        {topic.description}
                      </p>
                    </Card>
                  ))
                ) : (
                  <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "1rem", color: "var(--text-muted)" }}>
                    <Search size={28} strokeWidth={3} style={{ marginBottom: "0.5rem" }} />
                    <p>Žádné výsledky na &quot;{searchTerm}&quot;</p>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "center", marginTop: "1rem", paddingTop: "1rem", borderTop: "var(--border-ui)" }}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowHelp(false);
                    setSearchTerm("");
                  }}
                >
                  Zavřít
                </Button>
              </div>
            </Card>
          )}
        </section>
      </PageContent>
    </div>
  );
}

const tableHeadStyle: CSSProperties = {
  padding: "1rem",
  textAlign: "left",
  fontWeight: "900",
};

const statusBadgeStyle: CSSProperties = {
  display: "inline-block",
  backgroundColor: "var(--color-primary)",
  border: "var(--border-ui)",
  borderRadius: "var(--radius-md)",
  padding: "0.25rem 0.75rem",
  fontWeight: "900",
  fontSize: "0.85rem",
  boxShadow: "var(--shadow-md)",
};
