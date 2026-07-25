import type { Metadata } from "next";
import "./globals.css";

import { ConvexClientProvider } from "./ConvexClientProvider";
import { FeedbackProvider } from "../context/FeedbackContext";
import ErrorModal from "../components/ErrorModal";
import SuccessModal from "../components/SuccessModal";
import AnalyticsConsent from "../components/AnalyticsConsent";

export const metadata: Metadata = {
  title: "SkauTreg - Správa skautských středisek s mailovým systémem",
  description: "Kompletní systém pro správu skautských oddílů. Spravujte členy, plánujte výpravy, komunikujte pomocí integrovaného mailového systému a organizujte všechno na jednom místě.",
  icons: {
    icon: "/icons/logo-icon.png",
    apple: "/icons/logo-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body suppressHydrationWarning style={{ margin: 0, padding: 0 }}>
        <ConvexClientProvider>
          <FeedbackProvider>
            {children}
            <ErrorModal />
            <SuccessModal />
            <AnalyticsConsent />
          </FeedbackProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
