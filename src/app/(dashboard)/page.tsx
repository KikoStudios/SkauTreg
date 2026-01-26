"use client";
import Card from "../../components/Card";
import Button from "../../components/Button";
import { useProfileModal } from "../../context/ProfileModalContext";

export default function Home() {
  const { openProfile } = useProfileModal();
  const gettingStartedCards = [
    {
      title: "Welcome aboard",
      description: "Make a Gumroad account.",
      icon: "✌️",
      status: "completed"
    },
    {
      title: "Make an impression",
      description: "Customize your profile.",
      icon: "🖌️",
      status: "completed"
    },
    {
      title: "Showtime",
      description: "Create your first product.",
      icon: "🚀",
      status: "completed"
    },
    {
      title: "Build your tribe",
      description: "Get your first follower.",
      icon: "👨‍👩‍👧‍👦",
      status: "completed"
    },
    {
      title: "Cha-ching",
      description: "Make your first sale.",
      icon: "💸",
      status: "completed"
    },
    {
      title: "Money inbound",
      description: "Get your first pay out.",
      icon: "👏",
      status: "completed"
    },
    {
      title: "Making waves",
      description: "Send out your first email blast.",
      icon: "📰",
      status: "pending"
    },
    {
      title: "Smart move",
      description: "Sign up for Small Bets.",
      icon: "🙌",
      status: "pending"
    },
  ];

  return (
    <div>
      <div className="u-flex u-justify-between u-items-center u-mb-4">
        <h2 className="u-text-lg u-font-bold">Dashboard</h2>
        <div className="u-flex u-gap-2">
          <Button variant="outline">Share</Button>
          <Button onClick={openProfile}>View Profile</Button>
        </div>
      </div>

      {/* Thick separator line - visual separation akin to reference */}
      <div style={{ height: 'var(--border-width)', backgroundColor: 'var(--border-color)', margin: '0 -2rem 2rem -2rem' }} />

      <div className="u-mb-4">
        <div className="u-flex u-justify-between u-items-center u-mb-4">
          <h3 className="u-text-lg u-font-bold">Getting started</h3>
          <span className="u-text-sm u-font-bold" style={{ cursor: 'pointer' }}>Show less ↸</span>
        </div>

        <div className="u-grid-4">
          {gettingStartedCards.map((card, index) => (
            <Card
              key={index}
              title={card.title}
              description={card.description}
              icon={card.icon}
              status={card.status as any}
            />
          ))}
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h3 className="u-text-lg u-font-bold u-mb-4">Best selling</h3>
        {/* Simple Table Representation */}
        <div style={{
          background: 'white',
          border: 'var(--border-width) solid var(--border-color)',
          borderRadius: '8px',
          overflowX: 'auto'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: 'var(--border-width) solid var(--border-color)', background: '#fafafa' }}>
                <th style={{ padding: '1rem', fontSize: '0.9rem' }}>Products</th>
                <th style={{ padding: '1rem', fontSize: '0.9rem' }}>Sales</th>
                <th style={{ padding: '1rem', fontSize: '0.9rem' }}>Revenue</th>
                <th style={{ padding: '1rem', fontSize: '0.9rem' }}>Visits</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '1rem' }}>
                  <div className="u-flex u-items-center u-gap-2">
                    <span style={{ fontSize: '1.2rem' }}>🖼️</span>
                    <span style={{ fontWeight: 500, textDecoration: 'underline' }}>Membership</span>
                  </div>
                </td>
                <td style={{ padding: '1rem' }}>0</td>
                <td style={{ padding: '1rem' }}>$0</td>
                <td style={{ padding: '1rem' }}>2</td>
              </tr>
              <tr style={{ borderTop: 'var(--border-width) solid var(--border-color)' }}>
                <td style={{ padding: '1rem' }}>
                  <div className="u-flex u-items-center u-gap-2">
                    <span style={{ fontSize: '1.2rem' }}>📘</span>
                    <span style={{ fontWeight: 500, textDecoration: 'underline' }}>Web Design Course №1</span>
                  </div>
                </td>
                <td style={{ padding: '1rem' }}>1</td>
                <td style={{ padding: '1rem' }}>$2.34</td>
                <td style={{ padding: '1rem' }}>1</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
