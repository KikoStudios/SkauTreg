import type { Metadata } from "next";
import "./globals.css";


import { ConvexClientProvider } from "./ConvexClientProvider";
import { FeedbackProvider } from "../context/FeedbackContext";
import ErrorModal from "../components/ErrorModal";
import SuccessModal from "../components/SuccessModal";

export const metadata: Metadata = {
  title: "skautREG",
  description: "Light Green Theme UI Kit",
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
          </FeedbackProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
